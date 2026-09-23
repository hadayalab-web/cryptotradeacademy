# GitHub × Vercel 連携 クイックスタート

## 🚀 5分で始める

### ステップ1: Vercel Tokenを取得（2分）

1. [Vercel Dashboard](https://vercel.com/account/tokens) にアクセス
2. **Create Token** をクリック
3. トークン名を入力（例: `github-actions`）
4. トークンをコピー（**一度しか表示されません**）

### ステップ2: Vercel組織ID・プロジェクトIDを取得（1分）

**組織ID:**
- Vercel Dashboard → **Settings** → **General** → **Team ID** をコピー

**プロジェクトID:**
- Vercel Dashboard → プロジェクトを選択 → **Settings** → **General** → **Project ID** をコピー

### ステップ3: GitHub Secretsを設定（2分）

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. 以下の3つのSecretsを追加：

| Secret名 | 値 |
|---------|-----|
| `VERCEL_TOKEN` | ステップ1で取得したトークン |
| `VERCEL_ORG_ID` | ステップ2で取得した組織ID |
| `VERCEL_PROJECT_ID` | ステップ2で取得したプロジェクトID |

## ✅ 動作確認

### 自動デプロイのテスト

1. `main` ブランチに変更をプッシュ
2. GitHubリポジトリ → **Actions** タブを確認
3. **Deploy to Vercel** ワークフローが実行されることを確認
4. 実行が成功すれば完了！

### 手動デプロイのテスト

1. GitHubリポジトリ → **Actions** タブ
2. **Deploy to Vercel** ワークフローを選択
3. **Run workflow** をクリック
4. 環境を選択（`production` または `preview`）
5. **Run workflow** をクリック

## 📚 詳細ドキュメント

- **[GitHub × Vercel 完全連携ガイド](./GITHUB_VERCEL_INTEGRATION.md)** - 詳細な設定と使用方法
- **[GitHub Secrets設定ガイド](./GITHUB_SECRETS_SETUP.md)** - Secretsの詳細な設定方法

## ⚠️ トラブルシューティング

### デプロイが失敗する場合

1. **GitHub Secretsが正しく設定されているか確認**
   - `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID` がすべて設定されているか

2. **Vercelプロジェクトが存在するか確認**
   - Vercel Dashboardでプロジェクトが存在するか確認

3. **ログを確認**
   - GitHub Actionsのログを確認してエラーメッセージを確認

詳細は [GitHub × Vercel 完全連携ガイド](./GITHUB_VERCEL_INTEGRATION.md) のトラブルシューティングセクションを参照してください。
