# ドローダウン統合戦略の実装

## 目的

**「この市況下で投稿が回れば回るほど、我々のプログラムが渇望され売上が爆増する仕掛け」** を、Grok（Xセンチメント/アルゴリズム）・Gemini（深層心理）・統合分析に基づいて実装した。

---

## 1. 統合の構成

| 要素 | 役割 | 実装箇所 |
|------|------|----------|
| **Grok** | Xアルゴ・センチメント：短文・恐怖＋質問フック・#TrapScore #RiskOff・リプライ率20%↑でアルゴブースト | テンプレートD、drawdownStrategy、Grokプロンプト |
| **Gemini** | 深層心理：損失回避の逆手・バンドワゴン・コントロール感の回復、CTA 3原則 | drawdownStrategy（getDrawdownCTA）、統合プロンプト |
| **仕掛け** | ドローダウン判定 → D 50% 加重・ショートフック付与・統合戦略を Grok プロンプトに注入 | x-quote-repost、config/drawdownStrategy |

---

## 2. 実装内容

### 2.1 ドローダウン判定と加重（config/drawdownStrategy.js）

- **isDrawdown(reportData)**  
  `change24h < -1` または `trapScore < 35` のとき true。市況「荒れ」とみなす。
- **getDrawdownVariantWeight()**  
  バリアント D を 50%、A/B/C を各 17% 前後に設定。ドローダウン時は D が多く出る。
- **pickVariantWithWeight(weightSpec)**  
  上記重みで 1 つ選択。投稿が回るほど防御系メッセージ（D）の露出が増える。
- **getDrawdownHook(lang)**  
  Grok 推奨のショートフック（100–150 字、恐怖＋質問）。6 言語対応。
- **getDrawdownCTA(lang, principle)**  
  Gemini の 3 原則（loss_aversion / bandwagon / control）に基づく CTA 文言。訴求・別コンテンツ用。
- **INTEGRATED_STRATEGY_FOR_PROMPT**  
  Grok＋Gemini＋仕掛けの要約テキスト。Grok のテキスト生成プロンプトに注入する用。

### 2.2 引用リポストでのドローダウン対応（api/x-quote-repost.js）

- **テンプレート利用時（useMinimalRegularTemplates）**
  - `isDrawdown(reportData)` なら **バリアントを重み付きで選択**（D 50%）。
  - ドローダウン時は **getDrawdownHook(lang)** を投稿テキスト先頭に付与し、リプライ誘発→アルゴブーストを狙う。
- **Grok テキスト生成時（generateQuoteRepostTextWithGrok）**
  - `optimizationStrategy` 取得後、`isDrawdown(reportData)` なら **optimizationStrategy.drawdownPrompt = INTEGRATED_STRATEGY_FOR_PROMPT** をセット。
  - Grok が「統合戦略」を読んだ上で引用リポスト文を生成する。

### 2.3 Grok プロンプトへの統合戦略注入（services/grok/client.js）

- **generateQuoteRepostText** 内で、`optimizationStrategy.drawdownPrompt` が存在する場合、既存の optimizationContext の末尾に **そのまま追記**。
- ドローダウン時は「アルゴ（短文・恐怖＋質問・#TrapScore #RiskOff）」「心理（損失回避・バンドワゴン・コントロール感）」「仕掛け（回数↑→渇望・売上）」が Grok に渡り、生成文に反映される。

### 2.4 テンプレート D の強化（Minimal / Regular）

- **バリアント D** に Grok 推奨ハッシュタグ **#TrapScore #RiskOff** を追加（config/quoteRepostTemplatesMinimalOptin.js、quoteRepostTemplatesRegularOptin.js）。
- アルゴで「防御クラスタ」が拡大しやすくする。

---

## 3. フロー（ドローダウン時）

1. **reportData** で `isDrawdown(reportData)` が true になる（例: 24h -2%、trapScore 30）。
2. **テンプレートモード**  
   - バリアントを重み付きで選択 → D が約 50% で選ばれる。  
   - 投稿文の先頭に `getDrawdownHook(lang)` を付与。  
   - テンプレート D は #TrapScore #RiskOff 付き。
3. **Grok 生成モード**  
   - optimizationStrategy に drawdownPrompt（統合戦略）をセット。  
   - Grok が統合戦略を読んで引用リポスト文を生成。
4. **結果**  
   投稿が回るほど「罠スコア／出口マップ／トラップスタンバイ」系のメッセージと CTA が増え、FUD 過熱時のコントラリアン需要に乗り、渇望・クリック・成約につながる設計。

---

## 4. 参照

- Grok 解析: `docs/ai-analysis-results/DRAWDOWN_OPPORTUNITY_GROK_GEMINI_*.md`
- Gemini 解析: `docs/ai-analysis-results/DRAWDOWN_OPPORTUNITY_GEMINI_ONLY_*.md`
- 市況悪化囲い込み戦略: `docs/DRAWDOWN_BEAR_MARKET_ACQUISITION_STRATEGY.md`
- 成約ゼロ回避: `docs/CONVERSION_AT_SCALE_ZERO_AVOIDANCE.md`
- 実装: `config/drawdownStrategy.js`, `api/x-quote-repost.js`, `services/grok/client.js`, `config/quoteRepostTemplatesMinimalOptin.js`, `config/quoteRepostTemplatesRegularOptin.js`
