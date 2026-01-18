# リード発見システム セットアップガイド

**作成日**: 2026-01-17  
**作成者**: COO (Cursor/Composer 1)

---

## 📋 概要

リード発見自動化システムは、TelegramグループとX（Twitter）からCrypto関連のリードを自動的に発見し、VSL1メッセージを送信するシステムです。

---

## 🔧 セットアップ手順

### 1. 環境変数の確認

以下の環境変数が設定されていることを確認してください：

```bash
# X API設定（必須）
X_API_CONSUMER_KEY=...
X_API_CONSUMER_KEY_SECRET=...
X_API_ACCESS_TOKEN=...
X_API_ACCESS_TOKEN_SECRET=...

# Telegram Bot設定（必須）
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...

# VSLリンク設定（必須）
VSL1_YOUTUBE_LINK=https://youtu.be/OqvqngJOiXc
VSL2_YOUTUBE_LINK=https://youtu.be/fXgVsKhqDjI

# Vercel KV設定（必須）
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_URL=...

# Cron認証（必須）
CRON_SECRET=...
```

環境変数の確認は以下のスクリプトで実行できます：

```bash
node scripts/check-lead-discovery-env.js
```

---

## 📱 Telegramグループ監視の設定

### 方法1: 環境変数でグループIDを設定（推奨）

`.env`ファイルまたはVercelの環境変数に以下を追加：

```bash
# 監視対象TelegramグループID（カンマ区切り）
TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891
TELEGRAM_MONITORED_GROUPS_ES=-1001234567892,-1001234567893
TELEGRAM_MONITORED_GROUPS_PT_BR=-1001234567894,-1001234567895
TELEGRAM_MONITORED_GROUPS_AR=-1001234567896,-1001234567897
TELEGRAM_MONITORED_GROUPS_JA=-1001234567898,-1001234567899
TELEGRAM_MONITORED_GROUPS_KO=-1001234567900,-1001234567901
```

### 方法2: コード内でグループIDを設定

`services/lead-discovery/telegramGroupMonitor.js`の`MONITORED_GROUPS`オブジェクトを編集：

```javascript
const MONITORED_GROUPS = {
  en: [
    '-1001234567890', // 実際のグループID
    '-1001234567891',
  ],
  es: [
    '-1001234567892',
  ],
  // ... 他の言語も同様
};
```

### TelegramグループIDの取得方法

1. **Botをグループに追加**: 監視対象のグループにBotを追加
2. **グループIDを取得**: 
   - Botに `/start` を送信
   - BotのログまたはWebhookでグループIDを確認
   - または、`@userinfobot`などのBotを使用してグループIDを取得

**注意**: グループIDは通常、負の数値（例: `-1001234567890`）です。

### Telegram Bot Webhookの設定

Telegram Bot APIのWebhookを設定して、グループメッセージを受信します：

```bash
# Webhook URLを設定（Vercelデプロイ後）
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.vercel.app/api/telegram-webhook"
```

Webhookエンドポイント（`api/telegram-webhook.js`）でグループメッセージを処理し、`monitorGroupMessage`関数を呼び出します。

---

## 🐦 X API設定

### X API v2の認証

X API v2はOAuth 1.0a User Context認証を使用します。以下の認証情報が必要です：

- `X_API_CONSUMER_KEY`: API Key
- `X_API_CONSUMER_KEY_SECRET`: API Key Secret
- `X_API_ACCESS_TOKEN`: Access Token
- `X_API_ACCESS_TOKEN_SECRET`: Access Token Secret

### X APIのレート制限

- **検索API**: 15分間に180リクエスト（User Context）
- **投稿API**: 15分間に300リクエスト（User Context）
- **トレンドAPI**: 15分間に75リクエスト（v1.1）

リード発見システムは、レート制限を考慮して30分ごとに実行されます。

---

## 🚀 実行方法

### Cronジョブによる自動実行

`vercel.json`に以下のCronジョブが設定されています：

```json
{
  "crons": [
    {
      "path": "/api/lead-discovery",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/lead-discovery/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- **リード発見**: 30分ごと（`/api/lead-discovery`）
- **キュー処理**: 5分ごと（`/api/lead-discovery/process`）

### 手動実行

```bash
# リード発見を実行
curl -X POST "https://your-domain.vercel.app/api/lead-discovery" \
  -H "Authorization: Bearer <CRON_SECRET>"

# キュー処理を実行
curl -X POST "https://your-domain.vercel.app/api/lead-discovery/process" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## 📊 モニタリング

### ダッシュボード

週次ダッシュボード（`/api/lead-discovery/dashboard`）でKPIを確認：

```bash
curl "https://your-domain.vercel.app/api/lead-discovery/dashboard" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### ログ確認

Vercel Dashboard → Project → Logs で実行ログを確認できます。

---

## ⚠️ 注意事項

1. **X APIのレート制限**: 検索頻度が高すぎるとレート制限に達する可能性があります
2. **Telegram Bot制限**: グループメッセージの監視にはBotがグループメンバーである必要があります
3. **スパム対策**: Xへのリプライは適切な間隔を空けて送信してください
4. **プライバシー**: ユーザーのプライバシーを尊重し、適切な同意を得てからDMを送信してください

---

## 🔍 トラブルシューティング

### X APIエラー

- **401 Unauthorized**: 認証情報が正しく設定されているか確認
- **429 Too Many Requests**: レート制限に達しています。実行頻度を下げてください

### Telegram Botエラー

- **403 Forbidden**: Botがグループに追加されているか確認
- **400 Bad Request**: グループIDが正しいか確認

### リードが発見されない

- キーワードが適切に設定されているか確認
- X検索クエリが正しく構築されているか確認
- ログでエラーがないか確認

---

**作成者**: COO (Cursor/Composer 1)  
**最終更新**: 2026-01-17
