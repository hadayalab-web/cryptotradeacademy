# X Webhook環境変数設定ガイド
**作成日時**: 2026-01-26  
**目的**: X Webhookが正しく動作するためのVercel環境変数設定

---

## 🔑 必要な環境変数

X Webhookエンドポイント（`api/x-webhook.js`）が正しく動作するために、以下の環境変数が必要です：

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `X_API_CONSUMER_KEY_SECRET` | X API Consumer Secret（Webhook署名検証用） | X Developer Console |

**注意**: `X_API_CONSUMER_KEY_SECRET`は、X APIのOAuth認証でも使用されるため、既に設定されている場合は追加の設定は不要です。

---

## 📋 Vercelでの設定手順

### 1. X Developer ConsoleでConsumer Secretを確認

1. [X Developer Console](https://developer.twitter.com/) にアクセス
2. プロジェクトを選択
3. **Keys and tokens** タブに移動
4. **Consumer Keys** セクションで **Consumer Secret** を確認
   - 表示されていない場合は **Regenerate** をクリックして生成

### 2. Vercel Dashboardで環境変数を設定

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. `cryptotradeacademy` プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を追加：

   **Key**: `X_API_CONSUMER_KEY_SECRET`  
   **Value**: X Developer Consoleで取得したConsumer Secret  
   **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Save** をクリック

### 3. 再デプロイの確認

環境変数を追加すると、自動的に再デプロイが実行されます。

1. Vercel Dashboard → **Deployments** で最新のデプロイを確認
2. ステータスが **Ready** になるまで待機（通常1-2分）

---

## ✅ 動作確認

### 1. CRC検証のテスト

X Developer ConsoleでWebhookの **Test CRC** ボタンをクリックするか、以下のコマンドでテスト：

```bash
curl "https://cryptotradeacademy.vercel.app/api/x-webhook?crc_token=test123"
```

**期待されるレスポンス**:
```json
{
  "response_token": "sha256=..."
}
```

### 2. Webhookイベントの確認

実際にXでいいねやリツイートが発生した際に、Vercel Dashboard → **Deployments** → 最新のデプロイ → **Functions** → ログで以下が確認できます：

```
[X Webhook] ✅ Like event: tweetId=..., userId=...
[X Webhook] ✅ Retweet event: tweetId=..., userId=...
[X Webhook] ✅ Reply event: tweetId=..., userId=...
```

---

## 🔧 トラブルシューティング

### 問題1: CRC検証が失敗する

**エラーメッセージ**: `{"error": "CRC verification failed"}`

**原因**: `X_API_CONSUMER_KEY_SECRET`が設定されていない、または値が間違っている

**解決策**:
1. Vercel Dashboardで`X_API_CONSUMER_KEY_SECRET`が正しく設定されているか確認
2. X Developer ConsoleのConsumer Secretと一致しているか確認
3. 環境変数を更新後、再デプロイを実行

### 問題2: Webhookイベントが受信されない

**原因**: Webhookが有効化されていない、または環境変数が設定されていない

**解決策**:
1. X Developer ConsoleでWebhookのステータスが「有効」になっているか確認
2. Vercel Dashboardで`X_API_CONSUMER_KEY_SECRET`が設定されているか確認
3. Vercel Dashboardのログでエラーがないか確認

---

## 📝 関連ドキュメント

- [X Webhook 404エラー修正ガイド](./X_WEBHOOK_404_ERROR_FIX_2026-01-26.md)
- [X Webhook実装ドキュメント](./X_WEBHOOK_IMPLEMENTATION_2026-01-26.md)

---

**最終更新**: 2026-01-26
