# Vercelプロジェクト一からセットアップ手順

**プロジェクト**: `cryptotradeacademy-lp-ja`  
**作成日**: 2026-01-09

---

## 📋 前提条件

- ✅ `.env`ファイルに必要な環境変数が設定済み
- ✅ Vercel CLIがインストール済み（`npm i -g vercel`）
- ✅ Vercelアカウントにログイン済み

---

## 🚀 セットアップ手順

### 1. プロジェクトディレクトリに移動

```powershell
cd hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja
```

### 2. 既存のVercel設定をクリーンアップ（存在する場合）

```powershell
# .vercelディレクトリを削除
if (Test-Path .vercel) {
    Remove-Item -Recurse -Force .vercel
    Write-Host "✅ .vercelディレクトリを削除しました"
}
```

### 3. Vercelプロジェクトを作成・リンク

```powershell
# 対話的にプロジェクトを作成
vercel link

# 質問への回答:
# - Set up and deploy? → Y
# - Which scope? → デフォルト（Enter）
# - Link to existing project? → N（新規作成）
# - Project name? → cryptotradeacademy-lp-ja
# - Directory? → .（Enter）
```

または、自動で作成：

```powershell
vercel link --yes
```

### 4. 環境変数をVercelに設定

#### 方法1: PowerShellスクリプトを使用（推奨）

```powershell
# 親ディレクトリから実行
cd C:\Users\chiba\hadayalab-automation-platform
.\scripts\setup-vercel-project-from-scratch.ps1
```

#### 方法2: 手動で設定

`.env`ファイルから必要な環境変数を読み込み、Vercelに設定：

```powershell
# 必要な環境変数リスト
$envVars = @{
    "XAI_API_KEY" = "xai_xxx"
    "OPENAI_API_KEY" = "sk-xxx"
    "WHOP_API_KEY" = "whop_xxx"
    "TELEGRAM_BOT_TOKEN_EN" = "xxx"
    "TELEGRAM_BOT_TOKEN_AR" = "xxx"
    "TELEGRAM_BOT_TOKEN_KO" = "xxx"
    "TELEGRAM_BOT_TOKEN_JA" = "xxx"
    "TELEGRAM_BOT_TOKEN_ES" = "xxx"
    "TELEGRAM_BOT_TOKEN_PT_BR" = "xxx"
    "RESEND_API_KEY" = "re_xxx"
    "NEXT_PUBLIC_APP_URL" = "https://cryptotradeacademy-lp-ja.vercel.app"
}

$environments = @("production", "preview", "development")

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    foreach ($env in $environments) {
        echo $value | vercel env add $key $env
    }
}
```

### 5. ビルドテスト（ローカル）

```powershell
npm install
npm run build
```

### 6. デプロイ

```powershell
# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod
```

---

## ✅ 確認事項

### デプロイ後の確認

1. **デプロイURLを確認**
   ```powershell
   vercel inspect
   ```

2. **環境変数の確認**
   ```powershell
   vercel env ls production
   ```

3. **APIエンドポイントの動作確認**
   ```powershell
   # ヘルスチェック
   curl https://cryptotradeacademy-lp-ja.vercel.app/api/workflows/affiliate-integrated
   ```

---

## 🔧 トラブルシューティング

### ビルドエラーが発生する場合

1. **依存関係の確認**
   ```powershell
   npm install
   ```

2. **TypeScriptエラーの確認**
   ```powershell
   npm run build
   ```

3. **環境変数の確認**
   ```powershell
   npm run check-env
   ```

### デプロイエラーが発生する場合

1. **Vercel CLIのバージョン確認**
   ```powershell
   vercel --version
   ```

2. **ログイン状態の確認**
   ```powershell
   vercel whoami
   ```

3. **プロジェクトリンクの確認**
   ```powershell
   cat .vercel/project.json
   ```

---

## 📝 次のステップ

1. ✅ デプロイ完了
2. ✅ 環境変数の設定確認
3. ⏭️ ワークフローAPIの動作テスト
4. ⏭️ 本番環境での動作確認
