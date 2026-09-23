# Vercel APIトークン作成ガイド

## 📋 概要

このガイドでは、Vercel APIトークンを作成する手順を説明します。このトークンは、GitHub ActionsからVercelにデプロイする際に必要です。

## 🚀 トークン作成手順

### ステップ1: Vercel Dashboardにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 右上のアカウントアイコンをクリック
3. **Settings** を選択

### ステップ2: Tokensセクションに移動

1. 左サイドバーから **Tokens** を選択
   - または、**Settings** → **Tokens** に直接移動

### ステップ3: 新しいトークンを作成

1. **「Create Token」** セクションで以下を入力：

   #### TOKEN NAME（トークン名）
   - **推奨名**: `github-actions` または `hadayalab-automation-platform`
   - **説明**: 他のトークンと区別するための一意の名前
   - **例**: `github-actions-hadayalab-automation-platform`

   #### SCOPE（スコープ）
   - **推奨**: **「Full Account」** を選択
   - **説明**: 
     - `Full Account`: アカウント全体への完全なアクセス（推奨）
     - `Read Only`: 読み取り専用アクセス
     - `Deployments Only`: デプロイメントのみ

   #### EXPIRATION（有効期限）
   - **推奨**: **「Never expires」** または **「90 days」**
   - **説明**:
     - `Never expires`: 無期限（セキュリティリスクあり）
     - `90 days`: 90日で期限切れ（推奨）
     - `Custom`: カスタム日付を選択

2. **「Create」** ボタンをクリック

### ステップ4: トークンをコピー

⚠️ **重要**: トークンは**一度しか表示されません**

1. 表示されたトークンをコピー
   - トークンは `vck_` で始まります
   - 例: `vck_5JSPF6NEHGpepNcpYT0UVRxsitlYsqYEj7If6Kyo7FeYUgdYgb301t6P`

2. **安全な場所に保存**
   - パスワードマネージャーに保存
   - または、GitHub Secretsに直接設定（推奨）

## 🔧 GitHub Secretsへの設定

### 方法1: GitHub CLIで設定（推奨）

```powershell
gh secret set VERCEL_TOKEN --body "vck_YOUR_TOKEN_HERE" --repo hadayalab-web/hadayalab-automation-platform
```

### 方法2: GitHub Webインターフェースで設定

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** をクリック
3. **Name**: `VERCEL_TOKEN`
4. **Secret**: コピーしたトークンを貼り付け
5. **Add secret** をクリック

## ✅ 動作確認

### Vercel CLIで確認

```powershell
# 環境変数として設定
$env:VERCEL_TOKEN="vck_YOUR_TOKEN_HERE"
vercel whoami
```

### GitHub Actionsで確認

1. GitHubリポジトリ → **Actions** タブ
2. **Deploy to Vercel** ワークフローを実行
3. ログで認証が成功しているか確認

## 🔐 セキュリティベストプラクティス

### 1. トークンの管理

- ✅ **推奨**: 有効期限を設定（90日など）
- ✅ **推奨**: 定期的にトークンをローテーション
- ❌ **禁止**: トークンをコードにコミットしない
- ❌ **禁止**: トークンを公開リポジトリに保存しない

### 2. スコープの最小化

- 可能な限り最小限のスコープを選択
- `Full Account` が必要な場合のみ使用

### 3. トークンの監視

- Vercel Dashboard → **Settings** → **Tokens** で定期的に確認
- 使用されていないトークンは削除

## 🗑️ トークンの削除

### 古いトークンを削除する場合

1. Vercel Dashboard → **Settings** → **Tokens**
2. 削除したいトークンの右側の三点リーダー（`...`）をクリック
3. **Delete** を選択
4. 確認ダイアログで **Delete** をクリック

⚠️ **注意**: トークンを削除すると、そのトークンを使用しているすべてのサービスが動作しなくなります。

## 📋 チェックリスト

トークン作成時の確認事項：

- [ ] トークン名が一意で分かりやすい
- [ ] 適切なスコープを選択（`Full Account` 推奨）
- [ ] 有効期限を設定（`90 days` 推奨）
- [ ] トークンをコピーして安全な場所に保存
- [ ] GitHub Secretsに設定済み
- [ ] 動作確認が完了

## 🔍 トラブルシューティング

### エラー: "The specified token is not valid"

**原因**: トークンが無効または期限切れ

**対応**:
1. Vercel Dashboardでトークンの有効期限を確認
2. 新しいトークンを作成
3. GitHub Secretsを更新

### エラー: "You don't have permission"

**原因**: トークンのスコープが不足

**対応**:
1. 新しいトークンを作成
2. `Full Account` スコープを選択
3. GitHub Secretsを更新

### トークンが見つからない

**原因**: トークンをコピーし忘れた、または失った

**対応**:
1. 古いトークンを削除
2. 新しいトークンを作成
3. すぐにGitHub Secretsに設定

## 📚 参考リンク

- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Vercel Dashboard - Tokens](https://vercel.com/account/tokens)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
