# GitHub スコープ分析レポート

## 📋 現在の認証状態

### GitHub CLI認証
```
✓ Logged in to github.com account hadayalab-web (keyring)
- Active account: true
- Git operations protocol: https
- Token: gho_************************************
- Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

### 現在のスコープ
- ✅ `gist` - Gistの読み書き
- ✅ `read:org` - 組織情報の読み取り
- ✅ `repo` - リポジトリへの完全アクセス（読み書き）
- ✅ `workflow` - GitHub Actionsワークフローの更新

## 🔍 ワークフローで必要なスコープ分析

### 1. CI Pipeline (`.github/workflows/ci.yml`)
**必要なスコープ:**
- ✅ `repo` - リポジトリのチェックアウト
- ✅ `workflow` - ワークフローの実行

**状態:** ✅ 十分

### 2. Deploy to Vercel (`.github/workflows/deploy-vercel.yml`)
**必要なスコープ:**
- ✅ `repo` - リポジトリのチェックアウト
- ✅ `workflow` - ワークフローの実行
- ✅ `repo:status` - デプロイメントステータスの作成（`repo`スコープに含まれる）
- ✅ `repo_deployment` - GitHub Deployment APIの使用（`repo`スコープに含まれる）

**状態:** ✅ 十分

### 3. Sync with Vercel (`.github/workflows/sync-vercel.yml`)
**必要なスコープ:**
- ✅ `repo` - リポジトリのチェックアウト
- ✅ `repo_deployment` - デプロイメントステータスの更新（`repo`スコープに含まれる）

**状態:** ✅ 十分

### 4. n8n Workflow Executor (`.github/workflows/n8n-workflow-executor.yml`)
**必要なスコープ:**
- ✅ `repo` - リポジトリのチェックアウト
- ✅ `repo:status` - コメントの作成（`repo`スコープに含まれる）
- ✅ `workflow` - ワークフローの実行

**状態:** ✅ 十分

## ⚠️ 過去のエラーについて

### エラーメッセージ
```
error validating token: missing required scope 'read:org'
```

### 原因
提供されたGitHub Personal Access Token (`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`) に `read:org` スコープが含まれていなかった可能性があります。

### 現在の状況
GitHub CLIが自動生成したトークン（`gho_`で始まる）には以下のスコープが含まれており、**すべてのワークフローに必要なスコープが揃っています**：
- `gist`
- `read:org`
- `repo`
- `workflow`

## ✅ 結論

**現在のGitHub CLI認証には、すべてのワークフローに必要なスコープが揃っています。**

### スコープの充足状況

| スコープ | 必要 | 現在 | 状態 |
|---------|------|------|------|
| `repo` | ✅ | ✅ | ✅ 十分 |
| `workflow` | ✅ | ✅ | ✅ 十分 |
| `read:org` | ✅ | ✅ | ✅ 十分 |
| `gist` | ❌ | ✅ | ⚠️ オプション |

### 推奨事項

1. **現在の設定で問題なし**
   - GitHub CLIの自動生成トークンで十分に動作します

2. **Personal Access Tokenを使用する場合**
   - 以下のスコープを選択してください：
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
     - ✅ `read:org` (Read org and team membership)

3. **GitHub Actionsでの動作**
   - GitHub Actionsは自動的に `GITHUB_TOKEN` を提供します
   - このトークンには必要なスコープが自動的に付与されます
   - 追加の設定は不要です

## 📚 参考情報

### GitHub Actionsのデフォルト権限
GitHub Actionsは、ワークフローファイルで `permissions` を指定しない場合、以下のデフォルト権限が付与されます：

```yaml
permissions:
  actions: read
  checks: write
  contents: read
  deployments: write
  id-token: write
  issues: write
  discussions: write
  packages: read
  pages: read
  pull-requests: write
  repository-projects: read
  security-events: write
  statuses: write
```

### ワークフローファイルでの権限指定（オプション）

必要に応じて、ワークフローファイルに明示的に権限を指定できます：

```yaml
permissions:
  contents: read
  deployments: write
  issues: write
  pull-requests: write
```

## 🔧 スコープの確認方法

### GitHub CLIで確認
```powershell
gh auth status
```

### APIで確認
```powershell
gh api user --jq '{login: .login, scopes: .scopes}'
```

### Personal Access Tokenのスコープ確認
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
で作成したトークンのスコープを確認できます。
