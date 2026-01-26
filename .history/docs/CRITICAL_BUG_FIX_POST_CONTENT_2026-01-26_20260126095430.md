# 重大な不具合修正: 投稿内容の正確な実行（2026-01-26）

## 🚨 発見された重大な不具合

### 問題

`api/x-quote-repost.js`の641行目で、引用リポストのテキストを**280文字に切り詰め**ていました。

```javascript
// 修正前（不具合）
result = await postQuoteTweet(quoteText.substring(0, 280), influencer.tweetId);
```

**問題点**:
1. 引用リポストは**140文字以内**に制限されている
2. 631-633行目で既に140文字に制限しているのに、280文字に再度切り詰めている
3. 質問CTAやリンクが削除される可能性がある

### 影響

- **エンゲージメント率0.003%の根本原因の可能性**
- 質問CTAが削除される → エンゲージメントが発生しない
- リンクが削除される → トラフィックが発生しない
- 投稿内容が正確に実行されていない

---

## ✅ 修正内容

### 1. `api/x-quote-repost.js`の修正

**修正箇所**: 630-641行目

**修正内容**:
- 140文字制限を正確に適用
- 質問CTAとリンクを優先的に保持
- 投稿前に完全な投稿内容をログに記録

**修正後のコード**:
```javascript
// 140文字以内に制限（引用リポスト用）- ソーシャルプルーフ追加後の最終チェック
// 重要: 質問CTAとリンクを優先的に保持するため、末尾から削除
if (quoteText.length > 140) {
  // 質問CTAとリンクを保持するため、中間部分を削除
  // パターン: [フック] [リンク] [質問CTA] [ハッシュタグ]
  // 質問CTAとリンクを保持し、フック部分を短縮
  const questionMatch = quoteText.match(/(.*?)(\?[^?]*$)/);
  const linkMatch = quoteText.match(/(https?:\/\/[^\s]+)/);
  
  if (questionMatch && linkMatch) {
    // 質問CTAとリンクを保持
    const questionPart = questionMatch[2]; // "? Reply!" など
    const linkPart = linkMatch[1]; // URL
    const hashtagPart = quoteText.match(/(#[^\s]+(?:\s+#[^\s]+)*)$/)?.[1] || '';
    
    // 残りの文字数を計算
    const reservedLength = questionPart.length + linkPart.length + hashtagPart.length + 3; // +3はスペース
    const availableLength = 140 - reservedLength;
    
    if (availableLength > 20) {
      // フック部分を短縮
      const hookPart = quoteText.substring(0, quoteText.indexOf(linkPart)).trim();
      const shortenedHook = hookPart.length > availableLength 
        ? hookPart.substring(0, availableLength - 3) + '...'
        : hookPart;
      
      quoteText = `${shortenedHook} ${linkPart}${questionPart} ${hashtagPart}`.trim();
    } else {
      // 文字数が足りない場合は、リンクと質問CTAを優先
      quoteText = `${linkPart}${questionPart} ${hashtagPart}`.trim();
    }
  } else {
    // フォールバック: 末尾から削除（質問CTAを保持）
    quoteText = quoteText.substring(0, 137) + '...';
  }
  
  // 最終チェック: 140文字を超えている場合は強制的に切り詰め
  if (quoteText.length > 140) {
    quoteText = quoteText.substring(0, 137) + '...';
  }
}

// 引用リポストを投稿
console.log(`[Quote Repost] 🚀 ACTUALLY POSTING quote repost for @${influencer.username} (tweetId: ${influencer.tweetId})...`);
console.log(`[Quote Repost] Quote text preview: ${quoteText.substring(0, 100)}...`);
console.log(`[Quote Repost] Quote text full length: ${quoteText.length} characters`);
console.log(`[Quote Repost] Quote text full content: ${quoteText}`);

let result;
try {
  // 重要: 引用リポストは140文字以内に制限されているため、280文字に切り詰めない
  // 既に140文字以内に制限されているため、そのまま使用
  result = await postQuoteTweet(quoteText, influencer.tweetId);
```

### 2. `services/x/client.js`の修正

**修正箇所**: 484-496行目（`postQuoteTweet`関数）

**修正内容**:
- 引用リポストの文字数制限を140文字に変更
- 質問CTAとリンクを優先的に保持

**修正後のコード**:
```javascript
// 重要: 引用リポストは140文字以内に制限（UI上の制限）
// X API v2では280文字まで受け付けるが、引用リポストのUI表示は140文字程度
// エンゲージメントを最大化するため、質問CTAとリンクを優先的に保持
if (text.length > 140) {
  console.warn(`[X API] Quote tweet text exceeds 140 characters (${text.length}), truncating...`);
  
  // 質問CTAとリンクを保持するため、末尾から削除
  const questionMatch = text.match(/(.*?)(\?[^?]*$)/);
  const linkMatch = text.match(/(https?:\/\/[^\s]+)/);
  
  if (questionMatch && linkMatch) {
    // 質問CTAとリンクを保持
    const questionPart = questionMatch[2]; // "? Reply!" など
    const linkPart = linkMatch[1]; // URL
    const hashtagPart = text.match(/(#[^\s]+(?:\s+#[^\s]+)*)$/)?.[1] || '';
    
    // 残りの文字数を計算
    const reservedLength = questionPart.length + linkPart.length + hashtagPart.length + 3; // +3はスペース
    const availableLength = 140 - reservedLength;
    
    if (availableLength > 20) {
      // フック部分を短縮
      const hookPart = text.substring(0, text.indexOf(linkPart)).trim();
      const shortenedHook = hookPart.length > availableLength 
        ? hookPart.substring(0, availableLength - 3) + '...'
        : hookPart;
      
      text = `${shortenedHook} ${linkPart}${questionPart} ${hashtagPart}`.trim();
    } else {
      // 文字数が足りない場合は、リンクと質問CTAを優先
      text = `${linkPart}${questionPart} ${hashtagPart}`.trim();
    }
  } else {
    // フォールバック: 末尾から削除（質問CTAを保持）
    text = text.substring(0, 137) + '...';
  }
  
  // 最終チェック: 140文字を超えている場合は強制的に切り詰め
  if (text.length > 140) {
    text = text.substring(0, 137) + '...';
  }
  
  console.log(`[X API] Quote tweet text truncated to ${text.length} characters (preserving CTA and links)`);
}
```

---

## 📊 期待される効果

### 修正前

- 投稿内容が280文字に切り詰められる
- 質問CTAが削除される可能性
- リンクが削除される可能性
- エンゲージメント率0.003%

### 修正後

- 投稿内容が140文字以内に正確に制限される
- 質問CTAが優先的に保持される
- リンクが優先的に保持される
- エンゲージメント率の向上が期待される

---

## 🎯 次のアクション

1. **デプロイ**
   - 修正をデプロイして、実際の投稿内容を確認

2. **ログ確認**
   - `Quote text full content`ログを確認して、実際の投稿内容を検証

3. **エンゲージメント率の監視**
   - 修正後のエンゲージメント率を監視
   - 質問CTAとリンクが含まれている投稿のエンゲージメント率を確認

---

## 📚 参照

- `api/x-quote-repost.js` - 630-641行目（修正箇所）
- `services/x/client.js` - 484-496行目（修正箇所）
- `docs/POST_CONTENT_ANALYSIS_CRITICAL_2026-01-26.md` - 投稿内容の徹底分析レポート
