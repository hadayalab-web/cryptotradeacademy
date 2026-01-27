# X API Webhookログ取得できない問題の調査
**作成日時**: 2026-01-27  
**問題**: X APIのWebhookについて12時間分のログがまったく取得できない

## 🔍 問題の分析

### 考えられる原因

1. **Webhookイベントが受信されていない**
   - Webhook URLが正しく登録されていない
   - CRC検証が失敗している
   - イベントサブスクリプションが有効になっていない

2. **ログが記録されていない**
   - Vercelログに記録されているが、検索できていない
   - KVストレージに保存されているが、取得方法がない

3. **Webhookイベントが実際に発生していない**
   - いいね、リツイート、リプライが発生していない

## ✅ 実施した修正

### 1. Webhookアクセスログの記録を追加

**`api/x-webhook.js`の修正**:
- すべてのリクエスト（GET/POST）をログに記録
- リクエストの詳細（メソッド、パス、クエリ、ヘッダー）を記録
- KVストレージに保存（7日間保持）

**追加内容**:
```javascript
async function logWebhookAccess(method, req) {
  const logKey = `x:webhook:access:${Date.now()}`;
  const logData = {
    method,
    timestamp: new Date().toISOString(),
    path: req.url,
    query: req.query,
    hasBody: !!req.body,
    headers: {
      'x-twitter-webhooks-signature': req.headers['x-twitter-webhooks-signature'] ? 'present' : 'missing',
      'x-twitter-request-timestamp': req.headers['x-twitter-request-timestamp'] || 'missing',
      'user-agent': req.headers['user-agent'] || 'missing',
    },
  };
  
  if (kv) {
    await kv.set(logKey, logData, { ex: 86400 * 7 });
  }
}
```

### 2. POSTリクエストの詳細ログを追加

**追加内容**:
- POSTリクエストの詳細をログに記録
- 署名検証の結果をログに記録
- イベントタイプをログに記録

### 3. Webhookログ取得APIの作成

**`api/x-webhook-logs.js`の作成**:
- Webhookログを取得するAPIエンドポイント
- 時間範囲を指定してログを取得可能

**使用方法**:
```
GET /api/x-webhook-logs?hours=12
Authorization: Bearer <CRON_SECRET>
```

### 4. Webhookログ取得スクリプトの作成

**`scripts/fetch-x-webhook-logs.js`の作成**:
- コマンドラインからWebhookログを取得可能

**使用方法**:
```bash
node scripts/fetch-x-webhook-logs.js 12
```

## 🔍 デバッグ方法

### 1. Vercelログで確認

以下のログを検索してください：

```
[X Webhook] 🔵 GET request received
[X Webhook] 🔵 POST request received
[X Webhook] 📨 Received webhook event
[X Webhook] ✅ Like event
[X Webhook] ✅ Retweet event
[X Webhook] ✅ Reply event
```

### 2. Webhookログ取得APIで確認

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  "https://your-domain.vercel.app/api/x-webhook-logs?hours=12"
```

### 3. Webhookログ取得スクリプトで確認

```bash
node scripts/fetch-x-webhook-logs.js 12
```

## 📋 確認事項

### 1. Webhook URLの登録確認

X API Developer Portalで以下を確認：
- Webhook URLが正しく登録されているか
- Webhook URLが有効（200ステータスを返す）か
- CRC検証が成功しているか

### 2. イベントサブスクリプションの確認

X API Developer Portalで以下を確認：
- イベントサブスクリプションが有効になっているか
- サブスクライブしているイベントタイプ（いいね、リツイート、リプライ）

### 3. Vercelログの確認

Vercelダッシュボードで以下を確認：
- `/api/x-webhook`へのリクエストが記録されているか
- GETリクエスト（CRC検証）が記録されているか
- POSTリクエスト（イベント受信）が記録されているか

## 🚨 トラブルシューティング

### Webhookイベントが受信されない場合

1. **Webhook URLの確認**
   - X API Developer PortalでWebhook URLを確認
   - Webhook URLがHTTPSであることを確認
   - Webhook URLが公開アクセス可能であることを確認

2. **CRC検証の確認**
   - Vercelログで`[X Webhook] ✅ CRC verification successful`を確認
   - `X_API_CONSUMER_KEY_SECRET`が正しく設定されていることを確認

3. **イベントサブスクリプションの確認**
   - X API Developer Portalでイベントサブスクリプションを確認
   - 必要なイベントタイプがサブスクライブされていることを確認

### ログが記録されない場合

1. **KVストレージの確認**
   - Vercel KVが有効になっていることを確認
   - KVストレージへの書き込み権限があることを確認

2. **ログ取得方法の確認**
   - Webhookログ取得APIを使用してログを取得
   - Webhookログ取得スクリプトを使用してログを取得

## 📊 期待される効果

1. **Webhookアクセスの可視化**
   - すべてのWebhookリクエストがログに記録される
   - リクエストの詳細を確認可能

2. **問題の特定が容易に**
   - Webhookイベントが受信されているか確認可能
   - イベントタイプを確認可能
   - エラーの詳細を確認可能

3. **デバッグの効率化**
   - Webhookログ取得APIで簡単にログを取得可能
   - Webhookログ取得スクリプトでコマンドラインから取得可能

---

**作成日時**: 2026-01-27  
**関連ファイル**: 
- `api/x-webhook.js`
- `api/x-webhook-logs.js`
- `scripts/fetch-x-webhook-logs.js`
- `docs/reports/x-api-webhook-specification.md`
