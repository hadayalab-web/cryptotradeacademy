# Vercelトークン作成後の次のステップ

## ✅ 現在の設定

画像から確認できる設定：
- **TOKEN NAME**: `github-actions-hadayalab-automation-platform`
- **SCOPE**: `HadayaLab Projects' projects`（プロジェクトスコープ）
- **EXPIRATION**: `90 Days`（2026年4月9日まで有効）

## 🚀 次のステップ

### ステップ1: トークンを作成

1. **「Create」ボタンをクリック**
2. ⚠️ **重要**: 表示されたトークンを**すぐにコピー**
   - トークンは `vck_` で始まります
   - **一度しか表示されません**

### ステップ2: GitHub Secretsに設定

トークンをコピーしたら、以下のコマンドでGitHub Secretsに設定してください：

```powershell
gh secret set VERCEL_TOKEN --body "vck_YOUR_NEW_TOKEN_HERE" --repo hadayalab-web/hadayalab-automation-platform
```

**例:**
```powershell
gh secret set VERCEL_TOKEN --body "vck_5JSPF6NEHGpepNcpYT0UVRxsitlYsqYEj7If6Kyo7FeYUgdYgb301t6P" --repo hadayalab-web/hadayalab-automation-platform
```

### ステップ3: 動作確認

```powershell
# GitHub Secretsの確認
gh secret list --repo hadayalab-web/hadayalab-automation-platform

# Vercel CLIで確認（オプション）
$env:VERCEL_TOKEN="vck_YOUR_NEW_TOKEN_HERE"
vercel whoami
```

## 📋 チェックリスト

- [ ] 「Create」ボタンをクリック
- [ ] トークンをコピー（`vck_` で始まる）
- [ ] GitHub Secretsに設定
- [ ] 動作確認完了

## ⚠️ 注意事項

### SCOPEについて

現在選択されている `HadayaLab Projects' projects` は、特定のプロジェクトのみにアクセスできるスコープです。

**もしデプロイが失敗する場合:**
- `Full Account` スコープが必要な可能性があります
- その場合は、新しいトークンを作成して `Full Account` を選択してください

### トークンの保存

- ✅ GitHub Secretsに保存（推奨）
- ✅ パスワードマネージャーに保存
- ❌ コードにコミットしない
- ❌ 公開リポジトリに保存しない

## 🔄 古いトークンの処理

既存の `VERCEL_TOKEN` がGitHub Secretsに設定されている場合：
- 新しいトークンで上書きされます
- 古いトークンは自動的に無効になります（Vercel Dashboardで削除することも可能）

## 📚 参考

- [Vercel Token作成ガイド](./VERCEL_TOKEN_CREATION_GUIDE.md)
- [GitHub Secrets設定ガイド](./GITHUB_SECRETS_SETUP.md)
