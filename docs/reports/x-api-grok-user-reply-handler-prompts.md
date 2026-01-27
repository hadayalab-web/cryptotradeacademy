# X API Grok質問プロンプト - User Reply Handlerエラー修正

**作成日時**: 2026-01-27  
**エラー内容**: `Endpoint must not contain query string. Use options.params instead`

---

## 質問1: X API v2 `/tweets/search/recent`エンドポイントの正しい使用方法

**プロンプト**:

```
X API v2の`/tweets/search/recent`エンドポイントを使用して、特定のツイートのリプライを取得したいです。

現在の実装では以下のエラーが発生しています：
```
Endpoint must not contain query string. Use options.params instead: /tweets/search/recent?query=conversation_id%3A2016131328832376968&max_results=10&tweet.fields=author_id%2Ccreated_at%2Cpublic_metrics%2Ctext%2Cin_reply_to_user_id&user.fields=username%2Cname&expansions=author_id
```

現在のコード：
```javascript
const params = new URLSearchParams({
  query: `conversation_id:${tweetId}`,
  max_results: Math.min(Math.max(10, maxResults), 100).toString(),
  'tweet.fields': 'author_id,created_at,public_metrics,text,in_reply_to_user_id',
  'user.fields': 'username,name',
  expansions: 'author_id',
});

const response = await xApiRequest(`/tweets/search/recent?${params.toString()}`, {
  method: 'GET',
});
```

質問：
1. `/tweets/search/recent`エンドポイントでクエリパラメータを渡す正しい方法を教えてください。
2. `options.params`を使用する場合の正しい実装方法を教えてください。
3. OAuth 1.0a User Context認証を使用している場合、クエリパラメータの署名方法に注意点はありますか？
```

---

## 質問2: OAuth 1.0a署名とクエリパラメータの関係

**プロンプト**:

```
X API v2の`/tweets/search/recent`エンドポイントをOAuth 1.0a User Context認証で使用する際、クエリパラメータを`options.params`として渡す場合のOAuth署名について質問です。

現在の実装では、エンドポイントURLにクエリ文字列を含めるとエラーが発生します：
```
Endpoint must not contain query string. Use options.params instead
```

質問：
1. OAuth 1.0a署名を生成する際、`options.params`で渡されたクエリパラメータは署名に含める必要がありますか？
2. 署名対象URLには、エンドポイントパス（`/tweets/search/recent`）のみを使用するべきか、それともクエリパラメータを含めた完全なURLを使用するべきですか？
3. `options.params`を使用する場合の推奨実装パターンを教えてください。
```

---

## 質問3: `/tweets/search/recent`エンドポイントの`conversation_id`クエリの使用方法

**プロンプト**:

```
X API v2の`/tweets/search/recent`エンドポイントを使用して、特定のツイートのリプライを取得したいです。

使用したいクエリ：
- `conversation_id:${tweetId}` - 特定のツイートのリプライを取得
- `max_results: 10` - 最大10件のリプライを取得
- `tweet.fields: author_id,created_at,public_metrics,text,in_reply_to_user_id` - ツイートフィールド
- `user.fields: username,name` - ユーザーフィールド
- `expansions: author_id` - ユーザー情報の展開

質問：
1. `conversation_id`クエリを使用してリプライを取得する正しい方法を教えてください。
2. これらのパラメータを`options.params`として渡す場合の正しい形式を教えてください。
3. 配列形式のパラメータ（`tweet.fields`など）はどのように渡すべきですか？
```

---

## 質問4: エラーメッセージの意味と修正方法

**プロンプト**:

```
X API v2の`/tweets/search/recent`エンドポイントを呼び出す際、以下のエラーが発生しています：

```
Endpoint must not contain query string. Use options.params instead: /tweets/search/recent?query=conversation_id%3A2016131328832376968&max_results=10&tweet.fields=author_id%2Ccreated_at%2Cpublic_metrics%2Ctext%2Cin_reply_to_user_id&user.fields=username%2Cname&expansions=author_id
```

このエラーメッセージは、エンドポイントURLにクエリ文字列を含めず、`options.params`オブジェクトとして渡すべきであることを示しています。

質問：
1. このエラーの原因を詳しく説明してください。
2. 正しい実装方法をコード例で示してください。
3. OAuth 1.0a認証を使用する場合、`options.params`で渡されたパラメータは自動的に署名に含まれますか？
```

---

## 質問5: 実装例の確認

**プロンプト**:

```
X API v2の`/tweets/search/recent`エンドポイントを使用して、特定のツイートのリプライを取得する正しい実装を確認したいです。

現在の実装（エラーが発生）：
```javascript
const params = new URLSearchParams({
  query: `conversation_id:${tweetId}`,
  max_results: Math.min(Math.max(10, maxResults), 100).toString(),
  'tweet.fields': 'author_id,created_at,public_metrics,text,in_reply_to_user_id',
  'user.fields': 'username,name',
  expansions: 'author_id',
});

const response = await xApiRequest(`/tweets/search/recent?${params.toString()}`, {
  method: 'GET',
});
```

質問：
1. この実装を`options.params`を使用する形式に修正してください。
2. OAuth 1.0a User Context認証を使用する場合の完全な実装例を提供してください。
3. エラーハンドリングとリトライロジックを含めた推奨実装を教えてください。
```

---

## 参考情報

### エラーが発生しているコード
- **ファイル**: `services/x/userReplyHandler.js`
- **行**: 34行目
- **関数**: `getTweetReplies`

### エラーメッセージ
```
[User Reply Handler] Failed to get replies for tweet 2016131328832376968: Endpoint must not contain query string. Use options.params instead: /tweets/search/recent?query=conversation_id%3A2016131328832376968&max_results=10&tweet.fields=author_id%2Ccreated_at%2Cpublic_metrics%2Ctext%2Cin_reply_to_user_id&user.fields=username%2Cname&expansions=author_id
```

### 現在の実装
```javascript
// services/x/userReplyHandler.js (34行目)
const response = await xApiRequest(`/tweets/search/recent?${params.toString()}`, {
  method: 'GET',
});
```

### 期待される実装
```javascript
// options.paramsを使用する形式
const response = await xApiRequest('/tweets/search/recent', {
  method: 'GET',
  params: {
    query: `conversation_id:${tweetId}`,
    max_results: Math.min(Math.max(10, maxResults), 100),
    'tweet.fields': 'author_id,created_at,public_metrics,text,in_reply_to_user_id',
    'user.fields': 'username,name',
    expansions: 'author_id',
  },
});
```

---

## 次のステップ

1. X APIのGrokに上記のプロンプトを投げる
2. Grokの回答を確認
3. 回答に基づいて実装を修正
4. 修正後の動作を確認
