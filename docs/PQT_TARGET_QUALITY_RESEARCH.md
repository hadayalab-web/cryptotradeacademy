# 引用リポスト・ターゲット投稿の品質向上 研究

**目的**: Grok や既存ドキュメントの「しばり」に依存せず、文献・アルゴリズム知見に基づき、PQT の**引用先として質の高い投稿**を選ぶロジックを設計する。

---

## 1. 既存ロジックの整理（コード準拠）

| 段階 | 内容 | 根拠の出所 |
|------|------|------------|
| 検索 | (bitcoin OR btc OR crypto) + (etf OR halving)、recency、15→30分ウィンドウ | クエリ設計 |
| 通過条件 | passesQuoteQualityPattern（長さ≥20、URL≤2、ブロックリスト） | ヒューリスティック |
| 最低インタラクション | MIN_REPLY_RETWEET_SUM, MIN_TOTAL_INTERACTIONS | 閾値 |
| 動的中央値 | engagementScore ≥ median×1.2 相当 | 相対フィルタ |
| Fisherman | **hype キーワード含有** かつ **engagementScore ≥ 500** | キーワードリスト＋閾値 |
| 上位% | 上位 5〜10%（デフォルト 8%）のみ | 固定% |
| 2〜7分ウィンドウ | 投稿から 2〜7分のものを優先、なければ全スロット | 時間窓 |
| ソート | likesPer10min 降順 | いいね速度 |
| Tier | 90th velocity + CTR / 70–90th / その他、Tier3 cap 2 | パーセンタイル＋実績 |
| 多様性 | 同一作者 1、同一クラスタ 40% まで | 分散 |

**課題**: (1) hype キーワードは「煽り」検出には有効だが、「私たちの引用が刺さる相手」と必ずしも一致しない。(2) 2〜7分は極端に狭く、アルゴリズムは**60分**までが重要という知見とずれる。(3) エンゲージメントの**種類**（リプライ重視）がスコアに反映されていない。(4) 仕手師スコアの velocity 以外がほぼ固定値 0.5 で未使用。

---

## 2. 文献・実務知見の要約

### 2.1 初動とアルゴリズム

- **最初の 60 分**でランキングが大きく決まる（X の二段階ランキング）。
- **対数スケール**: 1 回目 RT ≫ 2 回目 ≫ 4 回目… なので、**初動の速度**が重要。
- **エンゲージメントの重み**（相対）: リプライ（作者の返信あり）> リプライ > プロフィールクリック > RT > いいね。会話（リプライ）が強い。

→ **「総エンゲージメント」より「単位時間あたりのエンゲージメント（velocity）」と「リプライの有無・多さ」を効かせる**。

### 2.2 引用リポストの効果

- **付加価値のあるコメント**を付けた引用は、単なる拡散よりエンゲージメントが伸びやすい。
- **オーディエンスの期待と一貫**したコメントが重要（私たちは「Trap Defence・構造・リスク」で一貫）。

→ **ターゲットは「私たちの角度（構造・リスク・防御）が自然に噛み合う話題」である方がよい**。= **トピック適合（BTC/ETH/トレード/リスク/ボラティリティ）**。

### 2.3 品質と数のトレードオフ

- スポンサー投稿の研究: **参加しやすいインフルエンサーほど効果が低い**傾向。**効果を考慮した選定**で 13–55% 改善。
- つまり **「バズっている」だけでは不十分で、「私たちのメッセージと相性が良い」シグナルを入れる**と CVR/CTR が伸びる。

→ **engagement に加え、「トピック適合」「議論喚起（リプライ多め）」をスコアに組み込む**。

---

## 3. 提案する品質シグナル（新ロジックの軸）

| シグナル | 意味 | 実装の方向 |
|----------|------|------------|
| **Engagement velocity** | 投稿経過時間あたりのエンゲージメント。初動が速いほどアルゴリズムに拾われやすい。 | engagementScore / max(1, age_minutes)。または likesPer10min を「全インタラクション per 10min」に拡張。 |
| **Reply weight** | アルゴリズムはリプライを重く見る。議論・会話が起きている投稿は伸びやすい。 | score = like×0.5 + RT×1 + quote×2 + **reply×4** など、リプライを強調した重み。 |
| **Rising window** | 初動 60 分が重要。2–7 分だけだと外れる投稿が多い。 | 「2–30 分」または「2–60 分」を「rising」とし、その中で velocity 降順。2–7 分は「最優先」にしてもよい。 |
| **Topic fit** | Trap Defence の文脈と合う話題（BTC/ETH/トレード/リスク/ボラティリティ） | 本文に BTC, ETH, crypto, trading, risk, volatility, support, resistance 等を含むか。0–1 のスコア。 |
| **Hype は「一要素」に** | 煽りは伸びやすいが、私たちの付加価値と相性が良いとは限らない。 | Fisherman（hype）を「必須」から「ボーナス」にし、velocity + reply weight + topic fit の合成スコアでランク。または hype あり＋topic fit を「最優先」にする。 |

---

## 4. 実装方針（コード・ドキュメントのしばりは無視）

1. **新モジュール `quoteTargetQuality.js`**  
   - `engagementVelocityScore(post, nowMs)` … 経過分あたりのエンゲージメント。  
   - `algorithmWeightedScore(metrics)` … リプライ重視の重み付け。  
   - `topicFitScore(text)` … 私たちのニッチ（BTC/ETH/トレード/リスク）との適合度 0–1。  
   - `quoteTargetQualityScore(candidate, nowMs)` … velocity・algorithm 重み・topic fit（と必要なら hype ボーナス）の合成。  

2. **スロット選定の変更**  
   - Fisherman を「必須」にしないオプションを設ける。  
   - 候補を **quoteTargetQualityScore** でソートし、上位から cap まで採用。  
   - 「2–7 分」を「2–30 分」や「2–60 分」に拡張するオプションを環境変数で切り替え可能に。  

3. **ブロックリスト・通過条件**  
   - 既存の QUOTE_QUALITY_BLOCKLIST を維持しつつ、エンゲージメントベイト（「いいねしてフォロー」等）を追加。  
   - 必要なら「リンクだらけ」「宣伝だけ」を検出する簡易ヒューリスティックを追加。  

4. **ログ**  
   - 採用したスロットについて **velocity / algorithmWeighted / topicFit / 合成スコア** をログに出し、後から検証できるようにする。  

これにより、「Grok がデタラメに言った」前提のしばりを外し、**研究とアルゴリズム知見に基づいた新しいロジック**で引用ターゲットの品質を上げる。

---

## 5. 実装済みモジュールと切り替え

| ファイル | 内容 |
|----------|------|
| **services/td/quoteTargetQuality.js** | `algorithmWeightedScore`, `engagementVelocityScore`, `topicFitScore`, `hypeBonus`, `quoteTargetQualityScore`, `selectByQualityScore`。 |

**環境変数**

- **BUZZWEAVE_USE_QUALITY_SCORE_SELECTION** = `true` または `1`  
  - Fisherman（hype 必須）＋上位 8% の代わりに、**品質スコアでソートした上位 cap 件**を採用。  
  - 「rising」ウィンドウは **2分〜BUZZWEAVE_RISING_WINDOW_MAX_SEC 秒**（デフォルト 420 = 7分）。60分にしたい場合は `BUZZWEAVE_RISING_WINDOW_MAX_SEC=3600`。
- **BUZZWEAVE_RISING_WINDOW_MAX_SEC**  
  - 品質スコア選定時、投稿から何秒以内を「rising」とするか。デフォルト 420（7分）。3600 で 60 分。

通常運用（未設定）のままなら従来どおり Fisherman＋2–7分＋Tier。**品質スコア選定を試すときだけ**上記を有効にする。
