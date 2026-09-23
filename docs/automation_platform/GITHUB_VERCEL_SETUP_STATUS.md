# GitHub × Vercel 連携設定状況

## ✅ 完了した設定

### GitHub連携
- ✅ GitHub CLI認証済み（hadayalab-web）
- ✅ GitHub Personal Access Token: `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`
- ✅ VERCEL_TOKEN をGitHub Secretsに設定済み（2026-01-09 08:49:49 UTC）
- ✅ リポジトリ確認: `hadayalab-web/hadayalab-automation-platform`

### Vercel連携
- ✅ Vercel CLI認証済み（hadayalab-web）
- ✅ Vercel API Token: `vck_5JSPF6NEHGpepNcpYT0UVRxsitlYsqYEj7If6Kyo7FeYUgdYgb301t6P`
- ⚠️ VERCEL_ORG_ID: 未設定（Vercel Dashboardから取得が必要）
- ⚠️ VERCEL_PROJECT_ID: 未設定（Vercel Dashboardから取得が必要）

## 🔧 必要な追加設定

### 1. Vercel組織ID・プロジェクトIDの取得と設定

Vercel Dashboardから以下を取得して、GitHub Secretsに設定してください：

#### 組織IDの取得方法
1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. **Settings** → **General** に移動
3. **Team ID** または **Organization ID** をコピー

#### プロジェクトIDの取得方法
1. Vercel Dashboardでプロジェクトを選択
2. **Settings** → **General** に移動
3. **Project ID** をコピー

#### GitHub Secretsへの設定

以下のコマンドで設定できます：

```powershell
# 組織IDを設定
gh secret set VERCEL_ORG_ID --body "YOUR_ORG_ID" --repo hadayalab-web/hadayalab-automation-platform

# プロジェクトIDを設定
gh secret set VERCEL_PROJECT_ID --body "YOUR_PROJECT_ID" --repo hadayalab-web/hadayalab-automation-platform
```

または、GitHubのWebインターフェースから：
1. リポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** をクリック
3. 以下を追加：
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

## 📋 設定済みSecrets一覧

| Secret名 | 状態 | 説明 |
|---------|------|------|
| `VERCEL_TOKEN` | ✅ 設定済み | Vercel APIトークン |
| `VERCEL_ORG_ID` | ⚠️ 未設定 | Vercel組織ID（要設定） |
| `VERCEL_PROJECT_ID` | ⚠️ 未設定 | VercelプロジェクトID（要設定） |

## 🚀 次のステップ

1. **Vercel組織ID・プロジェクトIDを取得**
   - Vercel Dashboardから上記の手順で取得

2. **GitHub Secretsに設定**
   - 上記のコマンドまたはWebインターフェースから設定

3. **動作確認**
   - GitHub Actionsワークフローを実行してデプロイをテスト

## 🔍 確認コマンド

### GitHub Secretsの確認
```powershell
gh secret list --repo hadayalab-web/hadayalab-automation-platform
```

### GitHub Actionsワークフローの確認
```powershell
gh workflow list --repo hadayalab-web/hadayalab-automation-platform
```

### Vercel CLIの認証確認
```powershell
vercel whoami
```

## 🚀 自動設定スクリプト

`scripts/setup-github-vercel-secrets.ps1` を使用して、一括でSecretsを設定できます：

```powershell
# 基本設定（VERCEL_TOKENのみ）
.\scripts\setup-github-vercel-secrets.ps1

# 組織IDとプロジェクトIDも含めて設定
.\scripts\setup-github-vercel-secrets.ps1 -VercelOrgId "YOUR_ORG_ID" -VercelProjectId "YOUR_PROJECT_ID"
```

## 📚 参考ドキュメント

- [GitHub × Vercel 完全連携ガイド](./GITHUB_VERCEL_INTEGRATION.md)
- [GitHub Secrets設定ガイド](./GITHUB_SECRETS_SETUP.md)
- [GitHub × Vercel 連携 クイックスタート](./GITHUB_VERCEL_QUICKSTART.md)
