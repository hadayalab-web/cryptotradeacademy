# GitHub × Vercel 完全連携ガイド

## 📋 概要

このドキュメントでは、`hadayalab-automation-platform` リポジトリにおけるGitHubとVercelの完全な連携設定について説明します。

## 🎯 連携の目的

- **自動デプロイ**: `main` ブランチへのプッシュ時に自動的にVercelにデプロイ
- **プレビュー環境**: Pull Requestごとにプレビューデプロイメントを作成
- **ステータス同期**: VercelのデプロイメントステータスをGitHubに反映
- **CI/CD統合**: GitHub Actionsによる自動テストとデプロイ

## 🔧 必要な設定

### 1. GitHub Secrets の設定

リポジトリの **Settings → Secrets and variables → Actions** で以下のSecretsを設定してください：

#### 必須Secrets

| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `VERCEL_TOKEN` | Vercel APIトークン | [Vercel Settings → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel組織ID | Vercel Dashboard → Settings → General |
| `VERCEL_PROJECT_ID` | VercelプロジェクトID | Vercel Dashboard → Project Settings → General |

#### Vercel Tokenの取得方法

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. **Settings** → **Tokens** に移動
3. **Create Token** をクリック
4. トークン名を入力（例: `github-actions`）
5. スコープを選択（`Full Account` 推奨）
6. トークンをコピー（**一度しか表示されません**）

#### Vercel組織ID・プロジェクトIDの取得方法

**組織ID:**
1. Vercel Dashboard → **Settings** → **General**
2. **Team ID** または **Organization ID** をコピー

**プロジェクトID:**
1. Vercel Dashboard → プロジェクトを選択
2. **Settings** → **General**
3. **Project ID** をコピー

### 2. Vercelプロジェクトの設定

#### GitHub連携の有効化

1. Vercel Dashboard → プロジェクトを選択
2. **Settings** → **Git**
3. **GitHub** を接続（まだの場合）
4. リポジトリを選択: `hadayalab-web/hadayalab-automation-platform`

#### 環境変数の設定

Vercel Dashboard → **Settings** → **Environment Variables** で以下を設定：

- `NODE_ENV`: `production`（本番環境）
- その他必要な環境変数

## 📁 ワークフローファイル

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**目的**: コードの検証とリント

**トリガー**:
- `main` または `develop` ブランチへのプッシュ
- `main` または `develop` へのPull Request

**実行内容**:
- JSONフォーマットチェック
- JSON構文検証
- Prettierによるコードフォーマットチェック
- セキュリティ監査

### 2. Deploy to Vercel (`.github/workflows/deploy-vercel.yml`)

**目的**: Vercelへの自動デプロイ

**トリガー**:
- `main` ブランチへのプッシュ（`.md`、`docs/`、`.github/` の変更を除く）
- 手動実行（`workflow_dispatch`）

**実行内容**:
- Vercel環境情報の取得
- プロジェクトのビルド
- Vercelへのデプロイ
- Pull Requestへのコメント追加
- GitHub Deployment Statusの作成

### 3. Sync with Vercel (`.github/workflows/sync-vercel.yml`)

**目的**: VercelからのデプロイメントステータスをGitHubに同期

**トリガー**:
- VercelからのWebhook（`repository_dispatch`）
- 手動実行

## 🚀 使用方法

### 自動デプロイ

1. `main` ブランチに変更をプッシュ
2. GitHub Actionsが自動的に実行
3. CIパイプラインが成功すると、Vercelにデプロイ

### 手動デプロイ

1. GitHubリポジトリ → **Actions** タブ
2. **Deploy to Vercel** ワークフローを選択
3. **Run workflow** をクリック
4. 環境（`production` または `preview`）を選択
5. **Run workflow** をクリック

### プレビューデプロイ

Pull Requestを作成すると、自動的にプレビューデプロイメントが作成され、PRにコメントが追加されます。

## 🔍 トラブルシューティング

### デプロイが失敗する

1. **GitHub Secretsの確認**
   - `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID` が正しく設定されているか確認

2. **Vercelプロジェクトの確認**
   - プロジェクトが存在するか確認
   - GitHub連携が有効になっているか確認

3. **ログの確認**
   - GitHub Actionsのログを確認
   - Vercel Dashboardのデプロイメントログを確認

### 環境変数が反映されない

1. Vercel Dashboard → **Settings** → **Environment Variables** で確認
2. 環境（Production、Preview、Development）ごとに設定されているか確認
3. GitHub Actionsで `vercel pull` が実行されているか確認

### デプロイメントステータスが同期されない

1. Vercel Dashboard → **Settings** → **Git** でWebhookが設定されているか確認
2. GitHubリポジトリの **Settings** → **Webhooks** でVercelのWebhookが存在するか確認

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [GitHub Deployments API](https://docs.github.com/en/rest/deployments/deployments)

## 🔐 セキュリティベストプラクティス

1. **Secretsの管理**
   - SecretsはGitHub Secretsで管理
   - `.env` ファイルをリポジトリにコミットしない
   - 定期的にトークンをローテーション

2. **権限の最小化**
   - Vercel Tokenは必要最小限の権限で作成
   - GitHub Actionsの権限を最小限に設定

3. **監査ログ**
   - GitHub Actionsの実行ログを定期的に確認
   - Vercel Dashboardのデプロイメント履歴を確認

## 📝 チェックリスト

デプロイ前に以下を確認してください：

- [ ] GitHub Secretsが正しく設定されている
- [ ] Vercelプロジェクトが作成されている
- [ ] VercelプロジェクトにGitHub連携が設定されている
- [ ] 環境変数がVercelに設定されている
- [ ] CIパイプラインが成功している
- [ ] デプロイワークフローが正常に実行されている
