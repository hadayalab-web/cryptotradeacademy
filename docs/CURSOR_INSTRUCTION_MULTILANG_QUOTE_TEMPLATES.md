# 🔥 Cursor 指示書（完全版）  
# 多言語 2 行テンプレ（世界観 × ローカライズ）

**目的**: 引用リポストの **fallback 本文** を、言語ごとに「市場心理・文化・短文」に最適化した **2 行テンプレ** で統一し、CTR と世界観を 6 言語で最大化する。

**前提**:  
- sanitize レイヤーで「2行＋空行＋URL」が固定済み。  
- 現在の fallback は `CORE_PHRASES.state[lang]`（personaStrategy）の 1 ブロックを sanitize して 2 行にしている。  
- 本指示で **専用 2 行テンプレ** を導入し、fallback 時はこちらを優先して使う。

---

## 1. ゴール（実装後の状態）

- **言語別 2 行テンプレ** を 1 か所で管理（EN / ES / PT-BR / AR / KO / JA）。
- 各言語の **トーン**:
  - **EN**: 既存の「just watching loop → framework」を維持（ベースライン）。
  - **ES**: スペイン語圏の市場心理に合わせた **短い警告文**（含み損・見るだけの罠）。
  - **PT-BR**: ブラジルのトレーダー文化に合わせた **短文**（損失・枠組み）。
  - **AR**: アラビア語圏の **市場警告**（短く刺す）。
  - **KO**: 韓国の投機文化に合わせた **短文**（ループ・出口）。
  - **JA**: 日本の「**短く刺す**」2 行（含み損・見るだけ・枠組み）。
- fallback 時は **getQuoteBodyTemplate(lang)** で 2 行テキストを取得 → sanitize → buildQuoteForYouTubeOgp。  
  未定義の言語は `CORE_PHRASES.state[lang]` または EN にフォールバック。

---

## 2. データモデル（2 行テンプレ 1 件）

- **形式**: 本文は **2 行まで**（`\n` で結合）。sanitize を通すので 3 行以上は先頭 2 行のみ使う。
- **格納**: `config/quoteRepostBodyTemplates.js` に `QUOTE_BODY_TEMPLATES = { en, es, "pt-br", ar, ko, ja }`。  
  各キーは **文字列**（`"line1\nline2"`）または **配列**（`["line1", "line2"]`）。配列の場合は `join("\n")` で結合。
- **取得**: `getQuoteBodyTemplate(lang)` → 該当言語の 2 行文字列。なければ `CORE_PHRASES.state[lang]` または `CORE_PHRASES.state.en`。

---

## 3. 実装タスク一覧

### 3.1 config/quoteRepostBodyTemplates.js を新規作成

- **QUOTE_BODY_TEMPLATES**: 上記の形式で 6 言語を定義。
  - 内容は「含み損・見るだけ・枠組みで抜ける」の世界観を保ちつつ、各言語のトーンに合わせる。
  - 既存の `CORE_PHRASES.state` をベースにしつつ、ES/PT-BR/AR/KO/JA は **短く刺す** ように調整可能。
- **getQuoteBodyTemplate(lang)**:  
  `(QUOTE_BODY_TEMPLATES[normalizedLang] || CORE_PHRASES.state[lang] || CORE_PHRASES.state.en)` を返す。  
  値が配列なら `join("\n")` して返す。

### 3.2 api/x-quote-repost.js の fallback でテンプレを優先

- **SALES_LETTER_LANGS 内で Grok 失敗時**  
  `CORE_PHRASES.state` の代わりに **getQuoteBodyTemplate(lang)** で fallback 本文を取得 → sanitize → buildQuoteForYouTubeOgp。
- **SALES_LETTER_LANGS 外**  
 同様に **getQuoteBodyTemplate(lang)** を優先。未定義なら従来どおり `CORE_PHRASES.state[lang] || CORE_PHRASES.state.en`。
- **セカンダリー先頭処理** で body がない場合のデフォルト（EN）も、`getQuoteBodyTemplate("en")` に統一してよい。

### 3.3 後方互換

- `quoteRepostBodyTemplates.js` で某言語を未定義にした場合、getQuoteBodyTemplate が CORE_PHRASES.state にフォールバックするため、既存挙動を壊さない。

---

## 4. 完了条件

- [x] `config/quoteRepostBodyTemplates.js` が存在し、QUOTE_BODY_TEMPLATES と getQuoteBodyTemplate(lang) が定義されている。
- [x] x-quote-repost.js の fallback 経路（Grok 失敗時・SALES_LETTER_LANGS 外）で getQuoteBodyTemplate(lang) が使われている。
- [x] 各言語のテンプレは 2 行以内で、sanitize 後も「2行＋空行＋URL」の形になる。
- [x] 未定義言語では CORE_PHRASES.state または EN にフォールバックする。

---

## 5. まとめ

- **世界観 × ローカライズ**: 同じ「Trap Defence」メッセージを、ES/PT-BR/AR/KO/JA で短文・市場警告・トレーダー文化に合わせて最適化する。
- **CTR**: 2 行に統一した上で言語別トーンを効かせ、クリック率を押し上げる。
- **保守性**: 2 行テンプレは 1 ファイルに集約し、今後の文言変更・A/B テストがしやすい。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、多言語 2 行テンプレが実装できる。
