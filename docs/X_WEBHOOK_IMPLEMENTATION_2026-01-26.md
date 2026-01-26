# X API Webhook実装完了
**作成日時**: 2026-01-26  
**実装内容**: リアルタイムエンゲージメント追跡用のWebhookエンドポイント

---

## 🎯 実装概要

X APIのWebhookエンドポイント（`/api/x-webhook`）を実装しました。これにより、**リアルタイムでエンゲージメント（いいね、リツイート、リプライ）を追跡**できるようになります。

---

## 📁 実装ファイル

### `api/x-webhook.js`

**機能**:
- **CRC Challenge-Response Check**: Webhook URLの所有権検証（GETリクエスト）
- **Webhookイベント受信**: いいね、リツイート、リプライイベントの処理（POSTリクエスト）
- **署名検証**: Webhookリクエストの署名検証（セキュリティ）
- **エンゲージメント統計**: KVストレージにリアルタイムで統計を保存
- **バズ投稿検知**: エンゲージメントが100件を超えた場合に自動検知

---

## 🔧 実装内容

### 1. CRC Challenge-Response Check

X APIがWebhook URLの所有権を確認するために送信するCRCトークンを検証します。

**実装**:
```javascript
function generateCrcResponse(crcToken) {
  // HMAC SHA-256ハッシュを生成
  const hmac = crypto.createHmac('sha256', X_API_CONSUMER_KEY_SECRET);
  hmac.update(crcToken);
  const hash = hmac.digest('base64');
  
  return { response_token: `sha256=${hash}` };
}
```

### 2. Webhookイベント処理

**対応イベント**:
- **いいねイベント** (`favorite_events`)
- **リツイートイベント** (`retweet_events`)
- **リプライイベント** (`tweet_create_events` with `in_reply_to_status_id_str`)

**処理フロー**:
1. イベントを受信
2. KVストレージに保存（7日間保持）
3. エンゲージメント統計を更新
4. バズ投稿を検知（エンゲージメント100件以上）

### 3. エンゲージメント統計

**保存形式**:
```javascript
{
  likes: 0,
  retweets: 0,
  replies: 0,
  lastUpdated: "2026-01-26T12:00:00.000Z"
}
```

**保存場所**: `x:webhook:stats:${tweetId}`（30日間保持）

### 4. バズ投稿検知

エンゲージメントが100件を超えた場合、自動的にバズ投稿として検知します。

**検知条件**:
- 総エンゲージメント（いいね + リツイート + リプライ）≥ 100件

**保存場所**: `x:webhook:viral:${tweetId}`（7日間保持）

---

## 🚀 セットアップ手順

### 1. 環境変数の確認

以下の環境変数が設定されていることを確認してください：

```bash
X_API_CONSUMER_KEY_SECRET=your_consumer_secret
```

### 2. Webhook URLの登録

X Developer Consoleで以下のURLを登録してください：

```
https://your-domain.vercel.app/api/x-webhook
```

**注意**: 
- `your-domain`を実際のVercelデプロイメントURLに置き換えてください
- HTTPSエンドポイントである必要があります

### 3. Webhookの有効化

X Developer ConsoleでWebhookを有効化すると、X APIが自動的にCRC Challenge-Response Checkを実行します。

---

## 📊 データ構造

### Webhookイベントデータ

**いいねイベント**:
```json
{
  "favorite_events": [{
    "favorited_status": {
      "id_str": "1234567890"
    },
    "user": {
      "id_str": "9876543210"
    }
  }]
}
```

**リツイートイベント**:
```json
{
  "retweet_events": [{
    "source": {
      "id_str": "1234567890"
    },
    "user": {
      "id_str": "9876543210"
    }
  }]
}
```

**リプライイベント**:
```json
{
  "tweet_create_events": [{
    "id_str": "1111111111",
    "in_reply_to_status_id_str": "1234567890",
    "user": {
      "id_str": "9876543210"
    },
    "text": "Reply text here"
  }]
}
```

---

## 💰 コスト削減効果

### 現在のポーリング方式

| 項目 | コスト |
|------|--------|
| **メトリクス取得** | 100投稿/日 × 1回/日 × $0.005 = **$0.50/日** |
| **月間コスト** | **$15** |

### Webhook方式

| 項目 | コスト |
|------|--------|
| **Webhook受信** | **無料**（イベント通知は無料） |
| **月間コスト** | **$0** |

**節約額**: **月$15**（年間$180）

---

## 🎯 活用シナリオ

### シナリオ1: リアルタイムエンゲージメント追跡

- いいね、リツイート、リプライが発生したときに**即座に通知**
- 高エンゲージメント投稿を**リアルタイムで検知**
- ポーリング不要 → **APIコスト削減**

### シナリオ2: バズ投稿の自動検知

- エンゲージメントが100件を超えたときに**自動検知**
- KVストレージにバズ投稿として記録
- フォローアップ投稿を実行可能（将来実装）

### シナリオ3: エンゲージメント統計のリアルタイム更新

- 各投稿のエンゲージメント統計を**リアルタイムで更新**
- ダッシュボードやレポートで即座に反映

---

## ⚠️ 注意事項

### 1. Account Activity APIが必要

X APIのWebhookは**Account Activity API**を使用します。これは**Enterprise Tier**が必要な場合があります。

### 2. 署名検証

本番環境では、Webhookリクエストの署名検証を有効にすることを推奨します。

### 3. エラーハンドリング

X APIの要件により、エラーが発生しても**200ステータスを返す**必要があります。

---

## 📝 今後の拡張

### Phase 1: フォローアップ投稿の自動実行

バズ投稿を検知したときに、自動的にフォローアップ投稿を実行する機能を追加。

### Phase 2: DM機能の実装

DM受信イベントを処理し、VSL2配信をX DM経由で実装。

### Phase 3: スパム検知の早期警告

ミュート、ブロック、スパム報告イベントを処理し、早期警告システムを構築。

---

**実装完了**: 2026-01-26
