# 言語整合性安全性分析レポート（2026-01-28）

## 🔒 言語整合性チェックの現状

投稿時に誤った言語で投稿する事故を防ぐため、コード内の言語整合性チェックを分析しました。

## ✅ 実装されている安全対策

### 1. ストック取得時のチェック（第1層）
**場所**: `services/x/influencerStock.js` - `getInfluencersFromStock`

```javascript
// 言語不一致のインフルエンサーを検出・除外
const mismatchedLang = influencers.filter(inf => inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase());
if (mismatchedLang.length > 0) {
  // 言語不一致のインフルエンサーを除外
  influencers = influencers.filter(inf => !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase());
}
// langフィールドがない場合は補完
influencers = influencers.map(inf => ({
  ...inf,
  lang: inf.lang || lang,
}));
```

### 2. 取得後の再チェック（第2層）
**場所**: `api/x-quote-repost.js` - `postQuoteRepostsForLang` (574行目)

```javascript
// 追加の言語整合性チェック
const langMismatched = influencers.filter(inf => inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase());
if (langMismatched.length > 0) {
  // 言語不一致のインフルエンサーを除外
  influencers = influencers.filter(inf => !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase());
}
// langフィールドがない場合は補完
influencers = influencers.map(inf => ({
  ...inf,
  lang: inf.lang || lang,
}));
```

### 3. 投稿ループ内のチェック（第3層）
**場所**: `api/x-quote-repost.js` - 投稿処理ループ (800行目)

```javascript
// 言語不一致のチェック（厳格）
if (influencer.lang && influencer.lang.toLowerCase() !== lang.toLowerCase()) {
  console.error(`⚠️⚠️⚠️ LANGUAGE MISMATCH: Skipping @${influencer.username}`);
  continue; // スキップ
}
// 最終確認: langフィールドを確実に設定
influencer.lang = lang;
```

### 4. 投稿前の最終チェック（第4層）
**場所**: `api/x-quote-repost.js` - 投稿直前 (1025行目)

```javascript
// 投稿前の最終言語整合性チェック（二重チェック）
const finalLang = influencer.lang || lang;
if (finalLang.toLowerCase() !== lang.toLowerCase()) {
  console.error(`⚠️⚠️⚠️ FINAL LANGUAGE MISMATCH: Aborting post`);
  throw new Error(`Language mismatch: influencer lang (${finalLang}) does not match post lang (${lang})`);
}
```

### 5. テキスト生成時の言語パラメータ
**場所**: `api/x-quote-repost.js` - `generateQuoteRepostTextWithGrok` (855行目)

```javascript
// langパラメータを明示的に渡す
quoteText = await generateQuoteRepostTextWithGrok(lang, influencer, reportData);
```

**場所**: `services/grok/client.js` - `generateQuoteRepostText` (491行目)

```javascript
async function generateQuoteRepostText(
  lang = "en",  // デフォルト値あり
  influencerTweet,
  reportData = null,
  ...
)
```

## ⚠️ 潜在的なリスクポイント

### 1. ローテーション選択時の言語チェック
**場所**: `services/x/influencerRotation.js` - `selectInfluencersWithRotation`

- **現状**: ローテーション選択時には言語チェックが明示的に行われていない
- **リスク**: 言語不一致のインフルエンサーが選択される可能性（低）
- **対策**: 第2層のチェックで既にフィルタリングされているため、リスクは低い

### 2. フォールバック選択時の言語チェック
**場所**: `api/x-quote-repost.js` - `selectInfluencersForImpressionTarget` (628行目)

- **現状**: フォールバック選択時には言語チェックが明示的に行われていない
- **リスク**: 言語不一致のインフルエンサーが選択される可能性（低）
- **対策**: 第2層のチェックで既にフィルタリングされているため、リスクは低い

### 3. テキスト生成時の言語パラメータ
**場所**: `api/x-quote-repost.js` - `generateQuoteRepostTextWithGrok` (855行目)

- **現状**: `lang`パラメータは明示的に渡されている
- **リスク**: 低い（`lang`パラメータは関数の引数から取得）

## 🔧 推奨される追加対策

### 1. ローテーション選択時の言語チェック追加
`services/x/influencerRotation.js`の`selectInfluencersWithRotation`で、選択前に言語フィルタリングを追加：

```javascript
// 言語不一致のインフルエンサーを除外
const langFiltered = influencers.filter(inf => 
  !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase()
);
```

### 2. フォールバック選択時の言語チェック追加
`api/x-quote-repost.js`のフォールバック選択で、選択前に言語フィルタリングを追加：

```javascript
// 言語不一致のインフルエンサーを除外
const langFiltered = influencers.filter(inf => 
  !inf.lang || inf.lang.toLowerCase() === lang.toLowerCase()
);
const fallbackSelected = selectInfluencersForImpressionTarget(langFiltered, lang);
```

### 3. テキスト生成時の言語検証
`generateQuoteRepostTextWithGrok`で、`lang`パラメータと`influencer.lang`の整合性を確認：

```javascript
// 言語整合性の最終確認
if (influencer.lang && influencer.lang.toLowerCase() !== lang.toLowerCase()) {
  throw new Error(`Language mismatch in text generation: influencer lang (${influencer.lang}) does not match post lang (${lang})`);
}
```

## 📊 安全性評価

### 現在の安全性レベル: **高** ✅

- **4層のチェック**: ストック取得時、取得後、投稿ループ内、投稿直前
- **エラー処理**: 言語不一致時はスキップまたはエラーをスロー
- **ログ出力**: 言語不一致が検出された場合は警告ログを出力

### 潜在的なリスク: **低** ⚠️

- ローテーション選択時とフォールバック選択時に言語チェックが明示的に行われていない
- ただし、第2層のチェックで既にフィルタリングされているため、実際のリスクは低い

## ✅ 結論

現在の実装では、**4層の言語整合性チェック**が実装されており、誤った言語で投稿する事故を防ぐ仕組みが整っています。

ただし、より堅牢にするために、以下の追加対策を推奨します：

1. ローテーション選択時の言語チェック追加
2. フォールバック選択時の言語チェック追加
3. テキスト生成時の言語検証追加

これらの対策により、言語整合性の安全性がさらに向上します。
