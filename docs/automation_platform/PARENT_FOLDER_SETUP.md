# 親フォルダ設定完了レポート

## 📋 プロジェクトの位置づけ

`hadayalab-automation-platform`は**親フォルダ / 戦略本部**として機能します。

### 役割
- ✅ GitHub Actionsワークフローの管理（SSOT）
- ✅ 戦略ドキュメントの管理
- ✅ プロジェクト間連携の統括
- ❌ **Vercelへの直接デプロイは不要**

### 実際のデプロイ対象
- `cryptosignal-ai/` - Vercelにデプロイ済み（複数のプロジェクト）
- `hadayalab-website-dev/` - サブプロジェクトがVercelにデプロイ

## ✅ GitHub × Vercel連携設定状況

### 設定済みSecrets
- ✅ `VERCEL_TOKEN`: `QU4PnKlo611mYVksqjfNC7Fl`
- ✅ `VERCEL_ORG_ID`: `team_xt4QX682x1umlb7A8P1ozNQt`
- ⚠️ `VERCEL_PROJECT_ID`: **不要**（親フォルダはデプロイしないため）

### 設定の目的
これらのSecretsは、以下の目的で使用されます：
1. **Vercel API制御**: サブプロジェクトのデプロイメントを制御
2. **ワークフロー連携**: GitHub ActionsからVercel APIを呼び出し
3. **デプロイメントステータス**: VercelのデプロイメントステータスをGitHubに同期

## 🔧 ワークフローの調整

### 現在のワークフロー
`.github/workflows/deploy-vercel.yml`は、親フォルダ自体をデプロイしようとしています。

### 推奨対応
親フォルダ自体をデプロイする必要がないため、以下のいずれかを選択：

1. **ワークフローを無効化**（推奨）
   - 親フォルダはデプロイしないため、このワークフローは不要

2. **ワークフローを修正**
   - サブプロジェクトのデプロイメントを制御するワークフローに変更
   - または、Vercel APIを呼び出すだけのワークフローに変更

3. **ワークフローを削除**
   - 完全に不要な場合は削除

## 📚 既存のプロジェクト連携

### cryptosignal-ai
- Vercelプロジェクト: 複数存在（`cryptosignal-ai`, `cryptosignal-ai-ja`, `cryptosignal-ai-es`など）
- GitHub連携: `hadayalab-web/cryptosignal-ai`
- デプロイ: 各プロジェクトが独立してデプロイ

### hadayalab-website-dev
- サブプロジェクトがVercelにデプロイ
- 各サブプロジェクトが独立したVercelプロジェクト

## ✅ 設定完了チェックリスト

- [x] GitHub CLI認証済み
- [x] VERCEL_TOKEN設定済み
- [x] VERCEL_ORG_ID設定済み
- [x] 親フォルダの役割を理解
- [ ] 不要なワークフローの調整（オプション）

## 🎯 次のステップ

親フォルダとしての設定は完了しています。必要に応じて：

1. **ワークフローの調整**: `deploy-vercel.yml`を無効化または削除
2. **サブプロジェクトの連携**: 各サブプロジェクトが独立してVercelにデプロイ
3. **GitHub Actionsの活用**: CI/CD、ワークフロー実行など

## 📚 参考ドキュメント

- [GitHub × Vercel 完全連携ガイド](./GITHUB_VERCEL_INTEGRATION.md)
- [hadayalab-automation-platform SSOT](./Strategy/ssot/hadayalab-automation-platform-SSOT.md)
