# Vercel環境変数設定ガイド - X Webhook用
**作成日時**: 2026-01-28  
**作成者**: AI Assistant

---

## 🔴 問題

XのWebhookリプレイで500エラーが発生しています。原因は、`X_API_CONSUMER_KEY_SECRET`がVercelの環境変数に設定されていないことです。

**注意**: ローカルの`.env`ファイルに設定されていても、Vercelの環境変数には反映されません。

---

## ✅ 解決方法

Vercel Dashboardで環境変数を設定する必要があります。

### 手順1: Vercel Dashboardにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクト `cryptotradeacademy` を選択
3. **Settings** → **Environment Variables** を開く

### 手順2: 環境変数を追加

以下の環境変数を追加してください：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `X_API_CONSUMER_KEY_SECRET` | `5cCFod21lxdxqhoX8NxmdSpcU58Rjz8d5goXriAmth6UOuRVnA` | **Production**, **Preview**, **Development** |

**設定方法**:
1. **Add New** をクリック
2. **Key**: `X_API_CONSUMER_KEY_SECRET` を入力
3. **Value**: `5cCFod21lxdxqhoX8NxmdSpcU58Rjz8d5goXriAmth6UOuRVnA` を入力
4. **Environment**: **Production**, **Preview**, **Development** のすべてにチェック
5. **Save** をクリック

### 手順3: デプロイを再実行（必要に応じて）

環境変数を追加した後、以下のいずれかの方法でデプロイを再実行してください：

1. **自動デプロイ**: 次のコミット・プッシュで自動的にデプロイされます
2. **手動デプロイ**: Vercel Dashboard → **Deployments** → **Redeploy** をクリック

---

## 📋 確認すべき環境変数一覧

以下の環境変数がVercel Dashboardに設定されているか確認してください：

### X API関連（必須）

- ✅ `X_API_CONSUMER_KEY` = `QiMTK7pB0mKMil7TyVjoC9GrT`
- ✅ `X_API_CONSUMER_KEY_SECRET` = `5cCFod21lxdxqhoX8NxmdSpcU58Rjz8d5goXriAmth6UOuRVnA` ← **これが設定されていない可能性**
- ✅ `X_API_ACCESS_TOKEN` = `2012160017974378496-M7DTJfmiKMiFYCKaENCa0d67ER08PR`
- ✅ `X_API_ACCESS_TOKEN_SECRET` = `cgW9cnK8vBPJx6WOXDlAh7dVGdcAjs5hsgdLZyvLkOErO`
- ✅ `X_API_BEARER_TOKEN` = `AAAAAAAAAAAAAAAAAAAAAFE37AEAAAAA5NZhHtdIwREXAWhlVSWNtqXLRWA%3DbFhjMTlyNiwXIp71yWt6oT4ZUj9o6HRBeGitI67l4qVqloVPwW`

### その他の重要な環境変数

- ✅ `CRON_SECRET` = `9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359`
- ✅ `CRYPTOQUANT_API_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `XAI_API_KEY`
- ✅ `GEMINI_API_KEY`
- ✅ `TELEGRAM_BOT_TOKEN`
- ✅ `KV_REST_API_URL`
- ✅ `KV_REST_API_TOKEN`

---

## 🔍 確認方法

### 方法1: Vercel Dashboardで確認

1. Vercel Dashboard → Project → Settings → Environment Variables
2. `X_API_CONSUMER_KEY_SECRET`が表示されているか確認
3. 値が正しいか確認

### 方法2: Vercel CLIで確認

```bash
vercel env ls
```

### 方法3: ログで確認

Vercel Dashboard → Project → Logs で、以下のログを確認：

```
[X Webhook] ❌ CRITICAL: X_API_CONSUMER_KEY_SECRET not set in production
```

このログが表示されている場合、環境変数が設定されていません。

---

## 🚀 設定後の動作確認

環境変数を設定した後、以下の手順で動作確認してください：

1. **Webhookリプレイを再実行**
   - Vercel Dashboard → Project → Webhooks
   - `https://cryptotradeacademy.vercel.app/api/x-webhook` を選択
   - 「Webhookをリプレイ」をクリック

2. **ログを確認**
   - Vercel Dashboard → Project → Logs
   - `[X Webhook] ✅ CRC verification successful` が表示されることを確認

3. **期待される動作**:
   - ✅ 200 OKが返される
   - ✅ CRC検証が成功する
   - ✅ エラーメッセージが表示されない

---

## 📝 まとめ

- **問題**: `X_API_CONSUMER_KEY_SECRET`がVercelの環境変数に設定されていない
- **解決**: Vercel Dashboardで環境変数を設定
- **値**: `5cCFod21lxdxqhoX8NxmdSpcU58Rjz8d5goXriAmth6UOuRVnA`
- **環境**: Production, Preview, Development すべてに設定

---

**作成者**: AI Assistant  
**最終更新**: 2026-01-28
