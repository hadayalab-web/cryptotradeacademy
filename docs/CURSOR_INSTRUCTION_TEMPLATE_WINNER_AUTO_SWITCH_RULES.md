# 🔥 Cursor 指示書（完全版）  
# 勝ちバリアントの自動切り替えルール（意思決定レイヤー）

**目的**: A/B 自動集計で得た **勝ちバリアント** について、「そのまま使う」「A/B を続ける」「1 本化する」を **ルールに基づいて自動で決める**。OS が自分で「winner 固定 / A/B 継続 / ロック」を判断する意思決定レイヤーを追加する。

**前提**:  
- A/B 自動集計が動いており、**x:quote:template_winners** と **x:quote:template_report**（byLang に winner, ctrByVariant, impressionsByVariant 等）が更新されている。  
- getQuoteBodyTemplate(lang, { variant: 'winner' }) で、現状は常に KV の winner を返している。

---

## 1. ゴール（実装後の状態）

- **言語ごとに「どう出すか」** を **ポリシー** で管理する。  
  - **winner**: 勝ちバリアントを常に使う（現状の「winner 参照」と同じ）。  
  - **random**: A/B 継続。ランダムでバリアントを選ぶ。  
  - **locked**: A/B 終了。指定した variantId を常に使う（1 本化）。
- **ルール**（集計ジョブの最後に適用）:  
  - 勝ちバリアントと 2 位の **CTR 差がしきい値以上**（例: 0.5% = 0.005）→ **winner**。  
  - CTR 差がしきい値未満 → **random**（A/B 継続）。  
  - **サンプル不足**（例: 勝ちバリアントのインプレ < 100）→ **random**。  
  - **同一 winner が N 日連続**（例: 30 日）→ **locked**（その言語は A/B 終了、winner を固定）。
- ポリシーを **KV** に保存し、**getQuoteBodyTemplate(lang, { variant: 'winner' })**（または **variant: 'auto'**）が **ポリシーを参照**して、winner / random / locked のどれで返すかを決める。

---

## 2. データモデル

### 2.1 ポリシー（言語ごとの意思決定結果）

- **KV キー**: `x:quote:template_policy`  
- **値**:  
  ```json
  {
    "en": {
      "mode": "winner",
      "variantId": "a",
      "lastWinnerChangeAt": "2026-02-01T00:00:00.000Z",
      "reason": "ctr_gap_above_threshold"
    },
    "ja": {
      "mode": "random",
      "reason": "ctr_gap_below_threshold"
    },
    "es": {
      "mode": "locked",
      "variantId": "b",
      "lockedAt": "2026-02-01T00:00:00.000Z",
      "reason": "winner_stable_30d"
    }
  }
  ```
- **mode**: `"winner"` | `"random"` | `"locked"`  
  - **winner**: 毎回 x:quote:template_winners のその言語の値を参照して body を返す。  
  - **random**: その言語のバリアントからランダムに 1 つ選んで返す。  
  - **locked**: variantId を固定で返す（A/B 終了）。
- **variantId**: locked のとき必須。winner のときは「現在の winner」の記録用（任意）。  
- **lastWinnerChangeAt**: 前回「winner が変わった」日時。同一 winner が N 日続いた判定に使う。  
- **lockedAt**: locked にした日時（監査用）。  
- **reason**: デバッグ・可視化用（ctr_gap_above_threshold / ctr_gap_below_threshold / sample_insufficient / winner_stable_30d）。

### 2.2 ルールのパラメータ（設定可能にしておく）

- **CTR_GAP_THRESHOLD**: 0.005（0.5%）。winner の CTR − 2 位の CTR >= これなら winner モード。  
- **MIN_IMPRESSIONS_WINNER**: 100。勝ちバリアントのインプレがこれ未満なら random（サンプル不足）。  
- **WINNER_STABLE_DAYS**: 30。同一 winner がこの日数続いたら locked にする。

これらは **templateAbAggregator.js** の定数または options で持つ。

### 2.3 getQuoteBodyTemplate の拡張

- **options.variant === 'winner'** または **options.variant === 'auto'** のとき:  
  - **x:quote:template_policy** を get（存在しなければ従来どおり winner を参照）。  
  - その言語の **mode** に応じて:  
    - **winner**: getTemplateWinners()[lang] で body を取得。  
    - **random**: その言語のバリアントからランダムに 1 つ選んで body を取得。  
    - **locked**: policy.variantId で body を取得。  
  - ポリシーが無い・その言語のキーが無い → 従来どおり winner があれば winner、なければ random。

---

## 3. 実装タスク一覧

### 3.1 集計ジョブ内で「ルール適用」ステップを追加

**ファイル**: `services/x/templateAbAggregator.js`

- **applyTemplatePolicy(aggregationResult, options)** を新規実装。  
  - 入力: aggregateTemplateAbResults() の戻り値（byLang, winners）、および **前回の x:quote:template_policy**（あれば）。  
  - 各言語について:  
    1. サンプル不足（勝ちバリアントの impressions < MIN_IMPRESSIONS_WINNER）→ mode: **random**, reason: sample_insufficient。  
    2. そうでない場合、CTR 差を計算（winner の CTR − 2 位の CTR）。2 位が無い場合は差 = 無限とみなす。  
    3. CTR 差 >= CTR_GAP_THRESHOLD → mode: **winner**, variantId: winner, reason: ctr_gap_above_threshold。lastWinnerChangeAt は「前回ポリシーで winner が同じならそのまま、変わっていれば今日」。  
    4. CTR 差 < CTR_GAP_THRESHOLD → mode: **random**, reason: ctr_gap_below_threshold。  
    5. （オプション）前回から lastWinnerChangeAt を参照し、同一 winner が WINNER_STABLE_DAYS 日続いている → mode: **locked**, variantId: winner, lockedAt: 今日, reason: winner_stable_30d。  
  - 出力: 言語ごとの **mode, variantId, lastWinnerChangeAt, lockedAt, reason**。  
  - これを **x:quote:template_policy** に保存する。
- 集計ジョブの流れ: **aggregateTemplateAbResults()** → **x:quote:template_winners** と **x:quote:template_report** を保存 → **getTemplatePolicy()** で前回ポリシー取得 → **applyTemplatePolicy(...)** → **x:quote:template_policy** を保存。

### 3.2 ポリシー取得 API の追加

**ファイル**: `services/x/templateAbAggregator.js`（または専用の policy モジュール）

- **getTemplatePolicy()**: KV の **x:quote:template_policy** を get して返す。無ければ `{}`。

### 3.3 getQuoteBodyTemplate でポリシーを参照

**ファイル**: `config/quoteRepostBodyTemplates.js`

- **options.variant === 'winner'** のとき（**'auto'** も同義としてよい）:  
  - getTemplatePolicy() でポリシーを取得。  
  - 該当 lang の mode に応じて:  
    - **winner**: getTemplateWinners()[lang] の variantId で body を取得。  
    - **random**: 既存の getQuoteBodyTemplate(lang, { variant: 'random' }) と同様。  
    - **locked**: policy[lang].variantId で body を取得。  
  - ポリシーが無い・キーが無い → 従来どおり getTemplateWinners()[lang] があればその body、なければ random。

### 3.4 可視化レポートにポリシーを含める（任意）

**ファイル**: `api/x-template-winner-report.js`

- レスポンスに **policy** を追加。getTemplatePolicy() の結果をそのまま返す。  
- ダッシュボードで「この言語は A/B 継続 / winner 固定 / 1 本化」が一目で分かるようにする。

### 3.5 後方互換

- **x:quote:template_policy** が無い、または某言語のキーが無い場合は、従来どおり **winner** を参照する（現状の「常に winner」と同じ挙動）。  
- ルールを切る（ポリシーを全言語 random にする、または集計ジョブで applyTemplatePolicy をスキップする）オプションを用意してもよい。

---

## 4. 完了条件

- [ ] applyTemplatePolicy(aggregationResult, options) が実装され、CTR 差・サンプル数・同一 winner 日数に基づいて mode（winner / random / locked）を決め、x:quote:template_policy に保存している。
- [ ] getTemplatePolicy() が KV からポリシーを返す。
- [ ] getQuoteBodyTemplate(lang, { variant: 'winner' }) がポリシーの mode に従い、winner / random / locked のいずれかで body を返す。
- [ ] ポリシー未設定時は従来どおり winner 参照（後方互換）。
- [ ] （任意）可視化 API のレスポンスに policy が含まれる。

---

## 5. 運用イメージ

- 毎日、集計ジョブが **集計 → winners 保存 → ルール適用 → ポリシー保存** の順で実行される。  
- ある言語で「winner が 0.5% 以上差で勝っている」→ その言語は **winner** モードになり、常に勝ちバリアントが使われる。  
- 「差が小さい」→ **random** のまま A/B 継続。  
- 「30 日間同じ winner」→ **locked** になり、その言語は A/B 終了して 1 本化。  
- 人間は可視化 API で「どの言語が winner / random / locked か」を確認し、必要なら閾値や日数を調整する。

---

## 6. まとめ

- **勝ちバリアントの自動切り替えルール** により、OS が「CTR 差・サンプル・安定日数」に基づいて **winner 固定 / A/B 継続 / 1 本化** を判断する。  
- ポリシーを KV に持ち、getQuoteBodyTemplate がそれを参照する設計にすることで、「集計」「可視化」「投稿時の選択」が一貫する。  
- Trap Defence OS の **意思決定レイヤー** が完成し、自律型の拡散 OS としてさらに進化する。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、勝ちバリアントの自動切り替えルールが実装できる。
