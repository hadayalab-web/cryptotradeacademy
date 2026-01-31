# コミット・プッシュ・再デプロイコマンド
**作成日**: 2026-01-30

---

## 🚀 一括実行（推奨）

### PowerShellスクリプトを使用

```powershell
# プロジェクトルートで実行
.\scripts\commit-and-deploy-test.ps1
```

このスクリプトが以下を自動実行します：
1. 変更されたファイルを確認
2. すべての変更をステージング
3. コミット
4. プッシュ
5. Vercelで自動デプロイ開始

---

## 📝 手動実行（ステップバイステップ）

### Step 1: 変更を確認

```powershell
git status
```

### Step 2: すべての変更をステージング

```powershell
git add .
```

### Step 3: コミット

```powershell
git commit -m "feat: CronJobsテスト実行環境の整備

- ドライラン実行テストスケジュール追加
- テスト実行ガイド追加（詳細版・クイックスタート）
- 一括テスト実行スクリプト追加（PowerShell）
- 環境変数チェックレポート追加
- Whop有料版URL確認レポート追加

テスト準備完了: X_POSTING_DRY_RUN=true でテスト実行可能"
```

### Step 4: プッシュ

```powershell
git push origin main
```

### Step 5: Vercelで自動デプロイ確認

1. **Vercel Dashboard** にアクセス
   - https://vercel.com/dashboard

2. **Deployments** タブで確認
   - 最新のデプロイメントが開始されているか確認
   - ステータスが "Building" → "Ready" になるまで待機

---

## 🔧 カスタムコミットメッセージを使用する場合

```powershell
# コミットメッセージをカスタマイズ
git commit -m "あなたのコミットメッセージ"
```

---

## ✅ デプロイ後の確認

### 1. デプロイが成功したか確認

Vercel Dashboard → Deployments → 最新デプロイメントのステータスが "Ready" であることを確認

### 2. 環境変数の確認

Vercel Dashboard → Project Settings → Environment Variables で以下を確認：
- [ ] `X_POSTING_DRY_RUN=true` が設定されている
- [ ] その他の必須環境変数が設定されている

### 3. テスト実行

```powershell
# デプロイ完了後、テストスクリプトを実行
.\scripts\test-all-cronjobs.ps1
```

---

## 🆘 トラブルシューティング

### 問題 1: コミットが失敗する

**原因**: 変更がない、または競合がある

**解決方法**:
```powershell
# 変更を確認
git status

# 競合がある場合は解決
git merge --abort  # マージを中止
# または
git rebase --abort  # リベースを中止
```

### 問題 2: プッシュが失敗する

**原因**: リモートに新しいコミットがある

**解決方法**:
```powershell
# リモートの変更を取得
git pull origin main

# 競合を解決してから再度プッシュ
git push origin main
```

### 問題 3: Vercelでデプロイが開始されない

**原因**: Git連携が設定されていない、またはWebhookが無効

**解決方法**:
1. Vercel Dashboard → Project Settings → Git
2. Git連携が正しく設定されているか確認
3. 手動でデプロイをトリガー:
   - Deployments → "Redeploy" をクリック

---

## 📋 コミット対象ファイル

以下のファイルがコミットされます：

### 新規作成ファイル
- `docs/CRONJOBS_DRY_RUN_TEST_SCHEDULE_2026-01-30.md`
- `docs/CRONJOBS_TEST_EXECUTION_GUIDE_2026-01-30.md`
- `docs/CRONJOBS_TEST_QUICK_START_2026-01-30.md`
- `scripts/test-all-cronjobs.ps1`
- `docs/ENV_VARIABLES_CHECK_REPORT_2026-01-30.md`
- `docs/ENV_VARIABLES_RE_CHECK_REPORT_2026-01-30.md`
- `docs/WHOP_REGULAR_BRIEFING_URLS_VERIFICATION_2026-01-30.md`
- `scripts/commit-and-deploy-test.ps1`
- `docs/COMMIT_AND_DEPLOY_COMMANDS_2026-01-30.md`

### 変更されたファイル（ある場合）
- その他の変更されたファイル

---

## 🎯 実行後の確認事項

- [ ] コミットが成功した
- [ ] プッシュが成功した
- [ ] Vercelでデプロイが開始された
- [ ] デプロイが完了した（ステータス: Ready）
- [ ] 環境変数 `X_POSTING_DRY_RUN=true` が設定されている
- [ ] テストスクリプトが実行可能

---

**最終更新**: 2026-01-30
