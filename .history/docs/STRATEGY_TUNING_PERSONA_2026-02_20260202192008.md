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
- **✅ X 引用リポスト・導線統合**: 無料版（Minimal）と有料版（Regular）を**1投稿に統合**。`QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES=1` 時は常に `config/quoteRepostTemplatesIntegrated.js` の統合テンプレートを使用し、1投稿内で「無料スコア＋Minimal URL」と「有料 CTA（トライアル or PRO 50% OFF）」の両方を出す。ローテーション（minimal_optin/regular_optin の交互）は廃止。
- **✅ ペルソナ決め打ち（CVR・LTV 完璧化）**: `getPersonaPromptContext()` を Grok/Gemini に注入。`contentOptimizer.js` の統合戦略に `persona` を追加し、`grok/client.js` の `generateQuoteRepostText` で最適化戦略あり・なしどちらでもペルソナ文脈をプロンプトに渡す。統合テンプレートのバリアント A に `CORE_PHRASES.price`（価格フレーミング）を追加。→ **CVR・LTV が跳ねる設計**（セクション 6 参照）。
- **✅ SSOT 更新**: `docs/SSOT_TRAP_DEFENSE_BTC.md` の「チューニング済みメッセージテンプレート」冒頭に戦略テーマと本 doc への参照を追記済み。

---

## 5. 関連ファイル一覧

| ファイル                                                                     | 変更内容                                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `config/personaStrategy.js`                                                  | 新規。戦略テーマ・コアフレーズ・セグメント・除外・KPI・価格の語り方                                             |
| `config/quoteRepostTemplatesMinimalOptin.js`                                 | バリアント E 追加、MINIMAL_OPTIN_VARIANTS に E 追加                                                             |
| `services/telegram/whop-links.js`                                            | getRegularTrialCta(lang) 追加                                                                                   |
| `api/x-quote-repost.js`                                                      | getRegularFunnelCta(lang) 追加、Regular 導線で 50% 月$99トライアル CTA；**統合導線**で常に統合テンプレート使用  |
| `config/quoteRepostTemplatesIntegrated.js`                                   | 無料＋有料を1投稿に統合（A〜E）。E=persona CORE_PHRASES.state、A=persona CORE_PHRASES.price（価格フレーミング） |
| `services/x/contentOptimizer.js`                                             | 統合戦略に `persona: getPersonaPromptContext()` を注入                                                          |
| `services/grok/client.js`                                                    | `generateQuoteRepostText` で最適化戦略あり/なしどちらでもペルソナ文脈をプロンプトに渡す                         |
| `docs/SSOT_TRAP_DEFENSE_BTC.md`                                              | ペルソナ駆動メッセージ戦略（戦略テーマ・本 doc 参照）追記                                                       |
| `docs/ai-analysis-results/PERSONA_ANALYSIS_GROK_GEMINI_REVIEW_2026-02-02.md` | 分析要約（参照用）                                                                                              |

---

## 6. CVR・LTV が跳ねるレバー（ペルソナ決め打ち完璧化）

| レバー               | 実装                                                                                                    | CVR/LTV への効き方                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **戦略テーマ一貫**   | `getPersonaPromptContext()` に STRATEGY_THEME + CORE_PHRASES を入れ、Grok・統合戦略・テンプレートで共通 | 認知負荷↓・「この人でいい」と一瞬で思わせる → CVR↑ |
| **価格フレーミング** | 統合テンプレート A に CORE_PHRASES.price（$99＝防御・1回のミス=$10k）を入れる                           | 損失回避＋安さの正当化 → Whop CV↑・LTV↑            |
| **状態言語（E）**    | 統合テンプレート E = CORE_PHRASES.state（含み損・見るだけループ・枠組み）                               | 痛みピーク層に刺さる → オプトイン率↑・CV↑          |
| **トーン統一**       | TONE（共感80%+ロジック20%）をプロンプトに注入                                                           | 責めない＋希望の売りすぎなし → 離脱↓・LTV↑         |
| **セグメント優先**   | getPersonaPromptContext に SEGMENT_PRIORITY（痛みピーク・Z回復）を1行で渡す                             | Grok が狙い打ち文言を出す → インプレ質↑・CVR↑      |

**期待効果（KPI ベース）**: X オプトイン率 5% 維持・向上、Whop CV 2%→3% 程度の改善、LTV $500→$600+ を目指す設計。施策ごとのCV率は Grok の数字で計測して検証。

---

_ペルソナ解析（Grok & Gemini 2026-02）に基づく戦略チューニングを反映済み。CVR・LTV レバーを完璧に接続済み。_
