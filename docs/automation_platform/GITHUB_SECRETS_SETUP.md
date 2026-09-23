# GitHub Secrets 設定ガイド

## 📋 概要

このドキュメントでは、GitHub Actionsで使用するSecretsの設定方法を説明します。

## 🔧 Secretsの設定手順

### 1. リポジトリのSettingsにアクセス

1. GitHubリポジトリのページを開く
2. **Settings** タブをクリック
3. 左サイドバーから **Secrets and variables** → **Actions** を選択

### 2. 新しいSecretを追加

1. **New repository secret** ボタンをクリック
2. **Name** にSecret名を入力
3. **Secret** に値を入力
4. **Add secret** をクリック

## 📝 必要なSecrets一覧

### Vercel連携用

| Secret名 | 説明 | 必須 | 取得方法 |
|---------|------|------|---------|
| `VERCEL_TOKEN` | Vercel APIトークン | ✅ | [Vercel Settings → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel組織ID | ✅ | Vercel Dashboard → Settings → General |
| `VERCEL_PROJECT_ID` | VercelプロジェクトID | ✅ | Vercel Dashboard → Project Settings → General |

### n8n連携用（オプション）

| Secret名 | 説明 | 必須 | 取得方法 |
|---------|------|------|---------|
| `N8N_API_URL` | n8n API URL | ❌ | n8n Dashboard → Settings → API |
| `N8N_API_KEY` | n8n API Key | ❌ | n8n Dashboard → Settings → API |

## 🔑 Vercel Tokenの取得方法

### ステップ1: Vercel Dashboardにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 右上のアカウントアイコンをクリック
3. **Settings** を選択

### ステップ2: Tokenを作成

1. 左サイドバーから **Tokens** を選択
2. **Create Token** ボタンをクリック
3. 以下の情報を入力：
   - **Token Name**: `github-actions`（任意の名前）
   - **Expiration**: 必要に応じて設定（推奨: 90日または無期限）
   - **Scope**: `Full Account` を選択（推奨）
4. **Create Token** をクリック
5. **重要**: 表示されたトークンをコピー（**一度しか表示されません**）

### ステップ3: GitHub Secretsに追加

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. **New repository secret** をクリック
3. **Name**: `VERCEL_TOKEN`
4. **Secret**: コピーしたトークンを貼り付け
5. **Add secret** をクリック

## 🏢 Vercel組織IDの取得方法

### ステップ1: Vercel Dashboardにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 右上のアカウントアイコンをクリック
3. **Settings** を選択

### ステップ2: 組織IDを確認

1. 左サイドバーから **General** を選択
2. **Team ID** または **Organization ID** をコピー
   - 個人アカウントの場合は **User ID** をコピー

### ステップ3: GitHub Secretsに追加

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. **New repository secret** をクリック
3. **Name**: `VERCEL_ORG_ID`
4. **Secret**: コピーした組織IDを貼り付け
5. **Add secret** をクリック

## 📦 VercelプロジェクトIDの取得方法

### ステップ1: プロジェクトを選択

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. デプロイしたいプロジェクトを選択

### ステップ2: プロジェクトIDを確認

1. **Settings** タブをクリック
2. 左サイドバーから **General** を選択
3. **Project ID** をコピー

### ステップ3: GitHub Secretsに追加

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. **New repository secret** をクリック
3. **Name**: `VERCEL_PROJECT_ID`
4. **Secret**: コピーしたプロジェクトIDを貼り付け
5. **Add secret** をクリック

## 🔍 Secretsの確認方法

### GitHub Actionsログで確認

1. GitHubリポジトリ → **Actions** タブ
2. 最新のワークフロー実行をクリック
3. ログを確認（Secretsの値は `***` でマスクされます）

### テスト実行

1. GitHubリポジトリ → **Actions** タブ
2. **Deploy to Vercel** ワークフローを選択
3. **Run workflow** をクリック
4. 実行が成功すれば、Secretsが正しく設定されています

## ⚠️ 注意事項

### セキュリティ

- **Secretsの値は絶対にコミットしない**
- `.env` ファイルをリポジトリにコミットしない
- Secretsは定期的にローテーションすることを推奨

### トークンの有効期限

- Vercel Tokenには有効期限を設定できます
- 有効期限が切れる前に新しいトークンを作成してください
- 無期限トークンを使用する場合は、定期的に確認してください

### 権限

- Vercel Tokenは必要最小限の権限で作成してください
- `Full Account` スコープは強力な権限です。必要に応じて制限してください

## 🔄 Secretsの更新方法

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. 更新したいSecretをクリック
3. **Update** をクリック
4. 新しい値を入力
5. **Update secret** をクリック

## 🗑️ Secretsの削除方法

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. 削除したいSecretをクリック
3. **Delete** をクリック
4. 確認ダイアログで **Delete secret** をクリック

## 📚 参考リンク

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel API Tokens](https://vercel.com/docs/rest-api#authentication)
- [Vercel Dashboard](https://vercel.com/dashboard)
