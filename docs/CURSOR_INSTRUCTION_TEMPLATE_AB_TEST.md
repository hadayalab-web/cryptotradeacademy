# 🔥 Cursor 指示書（完全版）  
# 多言語テンプレ A/B テスト

**目的**: 引用リポストの **2 行テンプレ** を言語ごとに **複数バリアント** で出し分けし、どの文言が CTR を最大化するかを計測できるようにする。  
「世界観は統一しつつ、言語ごとに最適な刺さり方」をデータで選べるようにする。

**前提**:  
- `config/quoteRepostBodyTemplates.js` で 6 言語の 2 行テンプレを一元管理済み。  
- fallback 時は `getQuoteBodyTemplate(lang)` で 1 件取得 → sanitize → 投稿。  
- 投稿結果は `results` に push され、必要に応じて KV や Webhook と連携している。

---

## 1. ゴール（実装後の状態）

- **言語ごとに複数バリアント**（A / B、必要なら C 以上）を定義できる。
- 投稿時に **ランダム（または設定）で 1 バリアントを選択**し、その **variantId** を記録する。
- 記録した **lang + variantId + tweetId + 時刻** を後からインプレッション・エンゲージメントと突き合わせ、**言語別の勝ちバリアント** を判定できる。
- 既存の「1 テンプレのみ」の言語はそのまま動き、バリアント未指定時は **variantId: 'default'** として扱う（後方互換）。

---

## 2. データモデル

### 2.1 テンプレの形（config）

- **単一テンプレ（従来）**: `QUOTE_BODY_TEMPLATES[lang] = "line1\nline2"` → 1 件だけなら variantId は `'default'` または `'a'`。
- **複数バリアント（A/B）**:  
  `QUOTE_BODY_TEMPLATES[lang] = { a: "line1\nline2", b: "line1'\nline2'" }`  
  または  
  `QUOTE_BODY_TEMPLATES[lang] = [ "line1\nline2", "line1'\nline2'" ]`  
  → キーまたはインデックスを variantId として記録（`'a'`/`'b'` または `'0'`/`'1'`）。

### 2.2 取得 API

- **getQuoteBodyTemplate(lang, options)**  
  - `options.variant`: `'random'` | `'a'` | `'b'` | 未指定  
  - 返却: **`{ body: string, variantId: string }`**  
  - 未定義言語・未定義バリアントは従来どおり CORE_PHRASES.state / EN にフォールバックし、variantId は `'default'`。

### 2.3 記録（投稿結果・任意で KV）

- 投稿結果オブジェクトに **templateVariant** を追加（例: `results.push({ ..., templateVariant: variantId })`）。
- （任意）KV に `x:quote:template_log` または 1 投稿ごとのキーで **lang, variantId, tweetId, timestamp** を保存し、後で Webhook のインプレッションと結合して分析する。

---

## 3. 実装タスク一覧

### 3.1 config/quoteRepostBodyTemplates.js の拡張

- **QUOTE_BODY_TEMPLATES** の形を拡張する。  
  - 値が **文字列** のとき: 従来どおり 1 件。variantId は `'default'`。  
  - 値が **配列** のとき: `[ "bodyA", "bodyB" ]`。variantId は `'0'`, `'1'`, ...。  
  - 値が **オブジェクト** のとき: `{ a: "bodyA", b: "bodyB" }`。variantId は `'a'`, `'b'`。  
- **getQuoteBodyTemplate(lang, options)**  
  - 第 2 引数 `options = {}` を追加。  
  - `options.variant === 'random'` のとき: その言語のバリアントからランダムに 1 件選択。  
  - `options.variant === 'a'` / `'b'` / `'0'` / `'1'` など: 指定バリアントを返す。  
  - 返却を **`{ body, variantId }`** に変更。既存の「文字列だけ返す」呼び出しは **`getQuoteBodyTemplate(lang).body` または .body の存在チェックで後方互換** するか、呼び出し側をすべて `{ body, variantId }` 受け取りに変更する（推奨: 呼び出し側を変更して明示的に .body を使う）。

### 3.2 api/x-quote-repost.js の変更

- **getQuoteBodyTemplate(lang)** を **getQuoteBodyTemplate(lang, { variant: 'random' })** に変更（fallback 経路・セカンダリー先頭の EN 含む）。
- 返り値の **body** を本文として sanitize → buildQuoteForYouTubeOgp に渡す。
- **templateVariant** を投稿結果に含める。  
  - 例: `earlyResults.push({ ..., templateVariant: variantId })`、`results.push({ ..., templateVariant: variantId })`。  
  - セカンダリー先頭処理でテンプレを使った場合も同様に **templateVariant** を付与。

### 3.3 （任意）KV へのログ

- 投稿成功時に **lang, variantId, tweetId, timestamp** を KV に追記（リストまたはキー `x:quote:template:{tweetId}`）。  
  Webhook でインプレッションが取れている場合、tweetId で突き合わせて「言語 × バリアント」ごとの CTR を集計できる。

### 3.4 後方互換

- 既存の「言語ごとに 1 テンプレのみ」の場合は、getQuoteBodyTemplate が **body + variantId: 'default'** を返す。  
  config をいじらずにデプロイしても、従来どおり 1 件だけ選ばれ、variantId だけ付く。

---

## 4. 完了条件

- [ ] getQuoteBodyTemplate(lang, options) が `{ body, variantId }` を返す。options.variant で 'random' / 指定キーに対応。
- [ ] QUOTE_BODY_TEMPLATES が「文字列 | 配列 | オブジェクト」のいずれかで定義でき、1 件のときは variantId が 'default'（または 'a'）になる。
- [ ] x-quote-repost.js の fallback およびセカンダリー先頭で、getQuoteBodyTemplate(..., { variant: 'random' }) を使い、結果に templateVariant を付けている。
- [ ] （任意）投稿成功時に KV に lang / variantId / tweetId / timestamp を記録している。

---

## 5. 運用イメージ

- まずは **EN や JA など 1 言語だけ** で 2 バリアント（A/B）を定義し、variantId の記録まで動かす。
- Webhook や X API でインプレッション・クリックが取れれば、**言語 × variantId** で集計し、勝ちバリアントを決める。
- 勝ちバリアントが分かったら、config の「デフォルト」をそのバリアントに寄せる、または A/B をやめて 1 本化する、という流れが取れる。

---

## 6. まとめ

- **テンプレは「最適化の余地が最も大きいレイヤー」**。A/B テストを入れることで、6 言語それぞれで CTR を最大化する文言をデータで選べる。
- 設計は「複数バリアント対応 + variantId 記録」にし、分析は既存のインプレッション・エンゲージメントと tweetId で結合する形にすると、OS の拡張性を保ったまま A/B テストが可能になる。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、多言語テンプレの A/B テスト基盤が実装できる。
