# X API Webhook仕様書
**作成日時**: 2026-01-27  
**目的**: X API（旧Twitter API）のWebhook機能の仕様をまとめる

## 📋 概要

X APIのWebhook機能は、**Account Activity API**の一部として提供されています。リアルタイムでアカウントのアクティビティ（いいね、リツイート、リプライなど）を受信できます。

## 🔧 Webhookの設定

### 1. Webhook URLの登録

X API Developer PortalでWebhook URLを登録する必要があります。

**要件**:
- HTTPSエンドポイントである必要がある
- 公開アクセス可能である必要がある（認証は別途実装可能）
- CRC検証に対応している必要がある

### 2. CRC Challenge-Response Check

X APIは、Webhook URLの所有権を確認するために**CRC（Challenge-Response Check）**を実行します。

#### GETリクエスト（CRC検証）

**リクエスト**:
```
GET /api/x-webhook?crc_token=<token>
```

**レスポンス**:
```json
{
  "response_token": "sha256=<encoded_hash>"
}
```

**実装**:
```javascript
function generateCrcResponse(crcToken) {
  // HMAC SHA-256ハッシュを生成
  const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
  hmac.update(crcToken);
  const hash = hmac.digest('base64');
  
  return {
    response_token: `sha256=${hash}`
  };
}
```

**重要**: 
- `X_API_CONSUMER_KEY_SECRET`を使用してハッシュを生成
- レスポンスは`sha256=<hash>`形式である必要がある

## 📨 Webhookイベントの受信

### POSTリクエスト（イベント受信）

X APIは、アカウントのアクティビティが発生した際にPOSTリクエストを送信します。

#### リクエストヘッダー

```
X-Twitter-Webhooks-Signature: <signature>
X-Twitter-Request-Timestamp: <timestamp>
Content-Type: application/json
```

#### リクエストボディ

イベントタイプによって異なります：

**いいねイベント**:
```json
{
  "favorite_events": [
    {
      "favorited_status": {
        "id_str": "1234567890"
      },
      "user": {
        "id_str": "9876543210"
      }
    }
  ]
}
```

**リツイートイベント**:
```json
{
  "retweet_events": [
    {
      "source": {
        "id_str": "1234567890"
      },
      "user": {
        "id_str": "9876543210"
      }
    }
  ]
}
```

**リプライイベント**:
```json
{
  "tweet_create_events": [
    {
      "id_str": "1111111111",
      "in_reply_to_status_id_str": "1234567890",
      "user": {
        "id_str": "9876543210"
      },
      "text": "リプライのテキスト"
    }
  ]
}
```

#### 署名検証

**実装**:
```javascript
function verifyWebhookSignature(signature, body, timestamp) {
  // 署名文字列を構築
  const signatureString = `${timestamp}.${body}`;
  
  // HMAC SHA-256ハッシュを生成
  const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
  hmac.update(signatureString);
  const expectedSignature = hmac.digest('base64');
  
  // 署名を比較
  return signature === expectedSignature;
}
```

**重要**:
- `X-Twitter-Request-Timestamp`とリクエストボディを結合してハッシュを生成
- `X_API_CONSUMER_KEY_SECRET`を使用してハッシュを生成

#### レスポンス

**成功時**:
```json
{
  "received": true
}
```

**エラー時**:
```json
{
  "received": false,
  "error": "Error message"
}
```

**重要**: 
- X APIの要件として、**常に200ステータスコードを返す**必要がある
- エラーが発生しても200を返す（X APIがリトライするため）

## 📊 イベントタイプ

### 1. いいねイベント（Favorite Events）

**イベント構造**:
```javascript
{
  favorite_events: [
    {
      favorited_status: {
        id_str: "1234567890"  // いいねされたツイートID
      },
      user: {
        id_str: "9876543210"  // いいねしたユーザーID
      }
    }
  ]
}
```

**処理例**:
```javascript
async function handleLikeEvent(event) {
  const tweetId = event.favorite_events?.[0]?.favorited_status?.id_str;
  const userId = event.favorite_events?.[0]?.user?.id_str;
  
  // エンゲージメント統計を更新
  await updateEngagementStats(tweetId, 'like');
}
```

### 2. リツイートイベント（Retweet Events）

**イベント構造**:
```javascript
{
  retweet_events: [
    {
      source: {
        id_str: "1234567890"  // リツイートされたツイートID
      },
      user: {
        id_str: "9876543210"  // リツイートしたユーザーID
      }
    }
  ]
}
```

**処理例**:
```javascript
async function handleRetweetEvent(event) {
  const tweetId = event.retweet_events?.[0]?.source?.id_str;
  const userId = event.retweet_events?.[0]?.user?.id_str;
  
  // エンゲージメント統計を更新
  await updateEngagementStats(tweetId, 'retweet');
}
```

### 3. リプライイベント（Reply Events）

**イベント構造**:
```javascript
{
  tweet_create_events: [
    {
      id_str: "1111111111",  // リプライツイートID
      in_reply_to_status_id_str: "1234567890",  // リプライ先のツイートID
      user: {
        id_str: "9876543210"  // リプライしたユーザーID
      },
      text: "リプライのテキスト"
    }
  ]
}
```

**処理例**:
```javascript
async function handleReplyEvent(event) {
  const replyEvents = event.tweet_create_events.filter(
    e => e.in_reply_to_status_id_str
  );
  
  for (const reply of replyEvents) {
    const tweetId = reply.in_reply_to_status_id_str;
    const userId = reply.user.id_str;
    
    // エンゲージメント統計を更新
    await updateEngagementStats(tweetId, 'reply');
  }
}
```

## 🔐 セキュリティ

### 1. 署名検証

**推奨**: 本番環境では署名検証を必須にする

```javascript
if (signature && timestamp) {
  const body = JSON.stringify(req.body);
  const isValid = verifyWebhookSignature(signature, body, timestamp);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
}
```

### 2. タイムスタンプ検証

**推奨**: リプレイ攻撃を防ぐためにタイムスタンプを検証

```javascript
const requestTimestamp = parseInt(timestamp);
const currentTimestamp = Math.floor(Date.now() / 1000);
const timeDiff = Math.abs(currentTimestamp - requestTimestamp);

// 5分以内のリクエストのみ許可
if (timeDiff > 300) {
  return res.status(401).json({ error: 'Request too old' });
}
```

## 📝 実装例（完全版）

```javascript
const crypto = require('crypto');

const X_API_CONSUMER_KEY_SECRET = process.env.X_API_CONSUMER_KEY_SECRET;

// CRC検証
function generateCrcResponse(crcToken) {
  const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
  hmac.update(crcToken);
  const hash = hmac.digest('base64');
  return { response_token: `sha256=${hash}` };
}

// 署名検証
function verifyWebhookSignature(signature, body, timestamp) {
  const signatureString = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
  hmac.update(signatureString);
  const expectedSignature = hmac.digest('base64');
  return signature === expectedSignature;
}

// Webhookハンドラー
async function handler(req, res) {
  // GET: CRC検証
  if (req.method === 'GET') {
    const crcToken = req.query.crc_token;
    if (!crcToken) {
      return res.status(400).json({ error: 'Missing crc_token' });
    }
    const response = generateCrcResponse(crcToken);
    return res.status(200).json(response);
  }

  // POST: イベント受信
  if (req.method === 'POST') {
    const signature = req.headers['x-twitter-webhooks-signature'];
    const timestamp = req.headers['x-twitter-request-timestamp'];
    
    // 署名検証
    if (signature && timestamp) {
      const body = JSON.stringify(req.body);
      const isValid = verifyWebhookSignature(signature, body, timestamp);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;

    // イベント処理
    if (event.favorite_events) {
      await handleLikeEvent(event);
    }
    if (event.retweet_events) {
      await handleRetweetEvent(event);
    }
    if (event.tweet_create_events) {
      const replies = event.tweet_create_events.filter(e => e.in_reply_to_status_id_str);
      if (replies.length > 0) {
        await handleReplyEvent(event);
      }
    }

    // 常に200を返す
    return res.status(200).json({ received: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

## 🔍 トラブルシューティング

### 1. CRC検証が失敗する

**原因**:
- `X_API_CONSUMER_KEY_SECRET`が正しく設定されていない
- ハッシュアルゴリズムが間違っている（SHA-256である必要がある）

**解決策**:
- 環境変数を確認
- ハッシュ生成ロジックを確認

### 2. Webhookイベントが受信されない

**原因**:
- Webhook URLが正しく登録されていない
- イベントサブスクリプションが有効になっていない
- 署名検証が失敗している

**解決策**:
- X API Developer PortalでWebhook設定を確認
- イベントサブスクリプションを確認
- 署名検証ロジックを確認

### 3. 署名検証が失敗する

**原因**:
- リクエストボディの文字列化方法が間違っている
- タイムスタンプの形式が間違っている

**解決策**:
- `JSON.stringify(req.body)`を使用してボディを文字列化
- タイムスタンプは文字列のまま使用

## 📚 参考資料

- [X API Account Activity API Documentation](https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/overview)
- [Webhook Configuration Guide](https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/guides/webhook-configuration)
- [Getting Started with Webhooks](https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/guides/getting-started-with-webhooks)

---

**作成日時**: 2026-01-27  
**関連ファイル**: 
- `api/x-webhook.js`
- `docs/reports/x-api-not-working-investigation.md`
