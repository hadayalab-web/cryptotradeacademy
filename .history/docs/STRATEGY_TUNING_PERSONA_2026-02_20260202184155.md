# 戦略チューニング — ペルソナ解析（Grok & Gemini 2026-02）に基づく実装

**参照レポート**: `docs/ai-analysis-results/PERSONA_ANALYSIS_GROK_GEMINI_REVIEW_2026-02-02.md`  
**作成日**: 2026-02-02

---

## 1. チューニングの目的

- ペルソナ解析（Grok + Gemini）のコンセンサスを**OSの共通言語**としてコードとドキュメントに反映する。
- メッセージ・CTA・セグメント優先・KPI・除外条件を一貫させ、**痛みピーク・即決ミレニアル**を最優先で刺さる設計にする。

---

## 2. 反映した実装

### 2.1 戦略・メッセージの共通定義（config/personaStrategy.js）

- **戦略テーマ**: `Don't Trust Your Gut, Trust the Trap Score` / 感情を捨てろ、データを買え
- **コアフレーズ**: 状態・価格・無料→有料・心理・トライアル（EN/JA）
- **セグメント優先順位**: 痛みピーク・即決ミレニアル > Z世代・初依存回復組 > X世代移行組
- **除外条件**: 損失小・プロ・X非/40代超・希望依存過多・Moon Boys・資金枯渇層
- **KPI 簡易版**: X インプレ10万/週・オプトイン5%、Whop CV2%・LTV $500
- **価格の語り方**: 月$99＝含み損0.2–0.5%・1日トライアル、3ヶ月$237＝矯正プログラム、年額$845＝月$70

**用途**: X投稿・Whop導線・コンテンツのトーンとCTAを一貫させる。他モジュールから `require("../config/personaStrategy")` で参照可能。

### 2.2 Minimal オプトイン用テンプレート追加（config/quoteRepostTemplatesMinimalOptin.js）

- **バリアント E**: 状態言語化＋gut vs data
  - 「含み損で『見るだけ』ループ？多くの人がハマる。ルールなし=都度判断の罠。Trap Scoreでdata vs gut。」
  - 6言語（EN, JA, ES, PT-BR, AR, KO）対応。
- **MINIMAL_OPTIN_VARIANTS**: `["A", "B", "C", "D", "E"]` に拡張。ローテーションで E が選ばれるとペルソナ刺さり型の投稿になる。

### 2.3 有料版（Regular）月$99トライアル CTA（services/telegram/whop-links.js）

- **getRegularTrialCta(lang)**: `{ text, url }` を返す。
  - EN: "Start $99/mo trial (1-day free): [url]"
  - JA: "今すぐ月$99トライアル（1日無料）: [url]"
  - 他言語も同様。X投稿末尾やスレッド最終ツイートで「月$99トライアル」を統一して使うときに利用。

---

## 3. 運用上の指針（分析レビューより）

### 3.1 メッセージの共通化

- 戦略テーマ: 「Don't Trust Your Gut, Trust the Trap Score」
- 価格: 「含み損の0.2%で枠組み」「1日トライアルでリスクゼロ」「1回のミス=$10k vs $99防御」

### 3.2 まず手を付ける施策（優先1セグメント向け）

- 風刺画＋状態言語化のスレッド（「二つの道」「含み損で固まってる？」）
- X 末尾の Whop 直リンク（月$99トライアル）→ `getRegularTrialCta(lang).text` を利用
- 無料オプトイン→Minimal 配信→「Regular で15分 Alert」の DM

### 3.3 KPI の計測

- X: インプレッション/週、オプトイン率
- Whop: CV率、LTV（月額→3ヶ月・年額移行率）
- 施策ごとのCV率は Grok の数字をベースに計測して検証

### 3.4 避けること

- 希望の売りすぎ（「必ず戻る」）
- ターゲットを広げすぎ（損失小・初心者・Moon Boys は除外）
- Whop 導線のステップ増やし・説明の長さ

---

## 4. 反映済み・今後の拡張案

- **✅ X 引用リポスト**: Regular 導線で 50% が `getRegularTrialCta(lang)`（月$99トライアル）、50% が PRO 50% OFF で A/B 訴求。`api/x-quote-repost.js` の `getRegularFunnelCta(lang)` で実装済み。
- **✅ SSOT 更新**: `docs/SSOT_TRAP_DEFENSE_BTC.md` の「チューニング済みメッセージテンプレート」冒頭に戦略テーマと本 doc への参照を追記済み。
- **今後の拡張**: コンテンツオプティマイザー（Grok/Gemini）に `config/personaStrategy.js` の CORE_PHRASES を読み込ませ、生成文のトーンをペルソナに合わせる。

---

## 5. 関連ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `config/personaStrategy.js` | 新規。戦略テーマ・コアフレーズ・セグメント・除外・KPI・価格の語り方 |
| `config/quoteRepostTemplatesMinimalOptin.js` | バリアント E 追加、MINIMAL_OPTIN_VARIANTS に E 追加 |
| `services/telegram/whop-links.js` | getRegularTrialCta(lang) 追加 |
| `api/x-quote-repost.js` | getRegularFunnelCta(lang) 追加、Regular 導線で 50% 月$99トライアル CTA |
| `docs/SSOT_TRAP_DEFENSE_BTC.md` | ペルソナ駆動メッセージ戦略（戦略テーマ・本 doc 参照）追記 |
| `docs/ai-analysis-results/PERSONA_ANALYSIS_GROK_GEMINI_REVIEW_2026-02-02.md` | 分析要約（参照用） |

---

_ペルソナ解析（Grok & Gemini 2026-02）に基づく戦略チューニングを反映済み_
