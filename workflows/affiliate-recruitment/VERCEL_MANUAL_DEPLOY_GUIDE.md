# Vercel手動デプロイガイド

**作成日**: 2026-01-10  
**方法**: 手動デプロイ + 手動環境変数設定

---

## ✅ この方法で問題ありません

手動デプロイと環境変数の手動設定は、以下の理由で推奨される方法です：

1. **環境変数の確認が容易**: デプロイ前にすべての環境変数を確認できる
2. **デバッグが簡単**: 問題が発生した場合、原因を特定しやすい
3. **段階的なデプロイ**: 一度にすべてをデプロイせず、段階的に進められる

---

## 🚀 デプロイ手順

### Step 1: GitHubにプッシュ（既に完了）

```bash
# 既にGitHubにプッシュ済み
git push origin main
```

### Step 2: Vercelでプロジェクトを作成

1. **Vercelダッシュボードにログイン**
   - https://vercel.com にアクセス
   - GitHubアカウントでログイン

2. **新しいプロジェクトを作成**
   - 「Add New...」→「Project」をクリック
   - GitHubリポジトリを選択: `hadayalab-web/affiliate-recruitment-workflow`
   - または、リポジトリをインポート

3. **プロジェクト設定**
   - **Root Directory**: `workflows/affiliate-recruitment` を指定
   - **Framework Preset**: なし（またはOther）
   - **Build Command**: `npm run type-check`（または空欄）
   - **Output Directory**: なし（API Routesのみの場合）
   - **Install Command**: `npm install`

### Step 3: 環境変数の設定

**重要**: デプロイ前に環境変数を設定してください。

1. **環境変数設定画面を開く**
   - プロジェクト設定画面で「Settings」→「Environment Variables」を開く

2. **以下の環境変数を追加**

   ```env
   # 🔴 必須（すべて設定が必要）
   XAI_API_KEY=xai_xxx
   OPENAI_API_KEY=sk-xxx
   GEMINI_API_KEY=xxx
   
   # 🔴 Telegram送信機能（必須）
   TELEGRAM_BOT_TOKEN_EN=xxx
   TELEGRAM_BOT_TOKEN_AR=xxx
   TELEGRAM_BOT_TOKEN_KO=xxx
   TELEGRAM_BOT_TOKEN_JA=xxx
   TELEGRAM_BOT_TOKEN_ES=xxx
   TELEGRAM_BOT_TOKEN_PT_BR=xxx
   
   # 🔴 Resend送信機能（必須）
   RESEND_API_KEY=re_xxx
   
   # 🟢 オプション
   WHOP_API_KEY=whop_xxx
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. **環境変数の適用範囲を選択**
   - Production: ✅
   - Preview: ✅（必要に応じて）
   - Development: ✅（必要に応じて）

4. **保存**
   - 各環境変数を追加後、「Save」をクリック

### Step 4: デプロイ実行

1. **デプロイボタンをクリック**
   - 「Deploy」ボタンをクリック
   - または、GitHubにプッシュすると自動デプロイされる（GitHub連携している場合）

2. **デプロイの完了を待つ**
   - ビルドログを確認
   - エラーがないか確認

### Step 5: デプロイ後の確認

1. **デプロイログの確認**
   - エラーがないか確認
   - ビルドが成功しているか確認

2. **環境変数の確認**
   - 「Settings」→「Environment Variables」で設定済みか確認

3. **Function Logsの確認**
   - 「Deployments」→「Functions」→「View Function Logs」でログを確認

---

## 📋 環境変数チェックリスト

デプロイ前に、以下の環境変数がすべて設定されているか確認してください：

- [ ] `XAI_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `TELEGRAM_BOT_TOKEN_EN`
- [ ] `TELEGRAM_BOT_TOKEN_AR`
- [ ] `TELEGRAM_BOT_TOKEN_KO`
- [ ] `TELEGRAM_BOT_TOKEN_JA`
- [ ] `TELEGRAM_BOT_TOKEN_ES`
- [ ] `TELEGRAM_BOT_TOKEN_PT_BR`
- [ ] `RESEND_API_KEY`
- [ ] `WHOP_API_KEY`（使用する場合）
- [ ] `NEXT_PUBLIC_APP_URL`（使用する場合）

---

## 🔍 デプロイ後のテスト

### 1. 環境変数の動作確認

デプロイ後、以下のエンドポイントで環境変数が正しく設定されているか確認：

```bash
# API Routeで環境変数チェック（実装が必要な場合）
curl https://your-project.vercel.app/api/check-env
```

### 2. ワークフローの動作確認

```bash
# 統合ワークフローの実行テスト
curl -X POST https://your-project.vercel.app/api/workflows/affiliate-integrated \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "whopProductId": "test_product",
    "sendTelegramDM": false,
    "sendEmail": false
  }'
```

---

## ⚠️ 注意事項

### 1. Root Directoryの設定

**重要**: Vercelでプロジェクトを作成する際、Root Directoryを`workflows/affiliate-recruitment`に設定してください。

設定方法：
1. プロジェクト設定画面で「Settings」→「General」を開く
2. 「Root Directory」を`workflows/affiliate-recruitment`に設定
3. 「Save」をクリック

### 2. ビルドコマンド

このプロジェクトはAPI Routesのみの場合、ビルドコマンドは不要です。空欄のままにしてください。

### 3. 環境変数の機密性

- 環境変数はVercelダッシュボードでのみ設定してください
- `.env`ファイルをGitHubにコミットしないでください
- 環境変数の値は機密情報として扱ってください

---

## 🐛 トラブルシューティング

### エラー: "Missing required environment variables"

**原因**: 環境変数が設定されていない

**解決方法**:
1. Vercelダッシュボードで環境変数を確認
2. すべての必須環境変数が設定されているか確認
3. 環境変数の適用範囲（Production/Preview/Development）を確認

### エラー: "Function timeout"

**原因**: 関数の実行時間がVercelの制限を超えている

**解決方法**:
1. Vercel Proプランにアップグレード（60秒制限）
2. または、処理を分割して非同期化

### エラー: "Module not found"

**原因**: 依存関係が不足している

**解決方法**:
1. `package.json`の`dependencies`を確認
2. `npm install`が正しく実行されているか確認

---

## ✅ デプロイ準備完了

以下の準備が完了していれば、デプロイ可能です：

- ✅ コードがGitHubにプッシュ済み
- ✅ 環境変数のリストが準備済み
- ✅ Vercelアカウントが準備済み

**この方法で問題ありません。手動デプロイを進めてください。**

---

**最終更新**: 2026-01-10
