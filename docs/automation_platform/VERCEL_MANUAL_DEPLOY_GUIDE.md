# Vercel手動デプロイガイド - cryptotradeacademy

**作成日**: 2026-01-15  
**目的**: 新しいプロジェクト名（cryptotradeacademy）でVercelに手動デプロイ

---

## 📋 前提条件

- ✅ Vercel CLIがインストール済み（バージョン 48.9.0）
- ✅ Gitリポジトリがプッシュ済み
- ✅ プロジェクトフォルダ: `cryptotradeacademy`

---

## 🚀 手動デプロイ手順

### 1. Vercel CLIにログイン

```bash
cd C:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy
vercel login
```

**手順**:
1. ブラウザが開きます
2. Vercelアカウントでログイン
3. 認証が完了すると、CLIに戻ります

### 2. プロジェクトをリンク（新規プロジェクト作成）

```bash
vercel link
```

**設定内容**:
- **Set up and deploy**: `Y`
- **Which scope**: 自分のアカウントまたはチームを選択
- **Link to existing project**: `N`（新規プロジェクトを作成）
- **What's your project's name**: `cryptotradeacademy`
- **In which directory is your code located**: `./`（現在のディレクトリ）
- **Want to override the settings**: `N`（デフォルト設定を使用）

**注意**: 既存のプロジェクト（`cryptosignal-ai`）にリンクしないように注意してください。

### 3. 環境変数の設定

プロジェクトが作成されたら、環境変数を設定します。

#### 方法1: Vercel Dashboardで設定（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト `cryptotradeacademy` を選択
3. **Settings** → **Environment Variables** を開く
4. 以下の環境変数を追加：

**必須環境変数**:
- `CRYPTOQUANT_API_KEY`
- `GROK_API_KEY` または `XAI_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`

**VSL関連**:
- `VSL1_YOUTUBE_LINK=https://youtu.be/zdLFYwFJQd4`
- `VSL2_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw`
- `VSL_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw`

**Vercel KV関連**:
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

**各環境変数に対して**:
- **Environment**: Production, Preview, Development（すべてにチェック）

#### 方法2: Vercel CLIで設定（オプション）

```bash
# 例: CRYPTOQUANT_API_KEYを設定
vercel env add CRYPTOQUANT_API_KEY production preview development
# 値を入力（プロンプトが表示されます）
```

### 4. 本番環境にデプロイ

```bash
vercel --prod
```

**または、package.jsonのスクリプトを使用**:

```bash
npm run deploy
```

**デプロイの確認**:
- デプロイが完了すると、URLが表示されます
- 例: `https://cryptotradeacademy.vercel.app`

### 5. GitHub連携の設定（オプション）

自動デプロイを有効にする場合：

1. Vercel Dashboard → **Settings** → **Git**
2. **Connect Git Repository** をクリック
3. GitHubリポジトリを選択（`hadayalab-web/cryptosignal-ai`）
4. **Production Branch**: `main` に設定
5. **Automatic Deployments**: 有効化

**注意**: Gitリポジトリ名が `cryptosignal-ai` のままでも、Vercelプロジェクト名は `cryptotradeacademy` になります。

### 6. Cronジョブの確認

`vercel.json` に設定されているCronジョブが自動的に設定されます：

1. Vercel Dashboard → **Settings** → **Cron Jobs**
2. 以下のCronジョブが表示されていることを確認：
   - `/api/cron` - `*/15 * * * *`（15分ごと）
   - `/api/weekly-report` - `0 0 * * 0`（毎週日曜日）
   - `/api/vsl1-post` - `0 9,21 * * *`（1日2回）
   - `/api/vsl2-free-users` - `0 * * * *`（1時間ごと）
   - `/api/vsl1-reminder` - `0 */12 * * *`（12時間ごと）
   - `/api/vsl2-last-call` - `0 * * * *`（1時間ごと）

### 7. Vercel KVの設定（必要に応じて）

既存のKVを使用する場合：

1. Vercel Dashboard → **Storage**
2. 既存のKVを選択、または新しいKVを作成
3. 環境変数に以下を追加：
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

---

## 🧪 動作確認

### 1. APIエンドポイントのテスト

```bash
# Prepare APIのテスト（デバッグモード）
curl "https://cryptotradeacademy.vercel.app/api/prepare?debug=local"

# Cron APIのテスト（デバッグモード）
curl "https://cryptotradeacademy.vercel.app/api/cron?debug=local"
```

**期待されるレスポンス**:
```json
{
  "success": true,
  "message": "Content prepared successfully"
}
```

### 2. デプロイログの確認

1. Vercel Dashboard → **Deployments** → 最新のデプロイ
2. **Functions** タブを開く
3. 各APIエンドポイントのログを確認
4. エラーがないことを確認

### 3. Telegramメッセージの確認

- 定期配信（4時間ごと）が正常に動作することを確認
- VSL配信が正常に動作することを確認

---

## ⚠️ トラブルシューティング

### エラー: "No existing credentials found"

**解決方法**:
```bash
vercel login
```

### エラー: "Project already exists"

**解決方法**:
- 既存のプロジェクトにリンクする場合は `vercel link` で既存プロジェクトを選択
- 新しいプロジェクト名を使用する場合は、別の名前を指定

### エラー: "Environment variable not found"

**解決方法**:
1. Vercel Dashboardで環境変数が設定されているか確認
2. 環境変数を再保存（保存後に再デプロイが自動実行される）
3. デプロイログで環境変数が読み込まれているか確認

### Cronジョブが動作しない

**解決方法**:
1. Vercel Dashboard → **Settings** → **Cron Jobs** でCronジョブが設定されているか確認
2. `vercel.json` のCron設定が正しいか確認
3. デプロイが完了しているか確認（Cronジョブはデプロイ後に設定される）

---

## 📝 チェックリスト

### デプロイ前
- [ ] Vercel CLIにログイン
- [ ] プロジェクトをリンク（新規プロジェクト作成）
- [ ] 環境変数を設定（旧プロジェクトからコピー）

### デプロイ後
- [ ] デプロイが成功することを確認
- [ ] APIエンドポイントが正常に動作することを確認
- [ ] Cronジョブが設定されていることを確認
- [ ] Vercel KVが設定されていることを確認（必要に応じて）
- [ ] GitHub連携を設定（オプション）
- [ ] Telegramメッセージ配信が正常に動作することを確認

---

## 🎯 次のステップ

1. **旧プロジェクトの削除**（オプション）
   - 新しいプロジェクトが正常に動作することを確認後
   - Vercel Dashboard → 旧プロジェクト → **Settings** → **Delete Project**

2. **Gitリポジトリ名の変更**（オプション）
   - GitHubでリポジトリ名を `cryptosignal-ai` から `cryptotradeacademy` に変更
   - Vercel Dashboard → **Settings** → **Git** でリポジトリを再リンク

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: 📋 **手動デプロイ準備完了**
