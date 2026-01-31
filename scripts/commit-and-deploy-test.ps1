# commit-and-deploy-test.ps1
# テスト関連ファイルをコミット・プッシュ・再デプロイ

Write-Host "🚀 テスト関連ファイルのコミット・プッシュ・再デプロイ" -ForegroundColor Green
Write-Host "=" * 80

# ステップ1: 変更されたファイルを確認
Write-Host "`n📋 Step 1: 変更されたファイルを確認" -ForegroundColor Cyan
git status --short

# ステップ2: 追加するファイルを確認
Write-Host "`n📋 Step 2: 追加するファイル" -ForegroundColor Cyan
$filesToAdd = @(
    "docs/CRONJOBS_DRY_RUN_TEST_SCHEDULE_2026-01-30.md",
    "docs/CRONJOBS_TEST_EXECUTION_GUIDE_2026-01-30.md",
    "docs/CRONJOBS_TEST_QUICK_START_2026-01-30.md",
    "scripts/test-all-cronjobs.ps1",
    "docs/ENV_VARIABLES_CHECK_REPORT_2026-01-30.md",
    "docs/ENV_VARIABLES_RE_CHECK_REPORT_2026-01-30.md",
    "docs/WHOP_REGULAR_BRIEFING_URLS_VERIFICATION_2026-01-30.md"
)

foreach ($file in $filesToAdd) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $file (見つかりません)" -ForegroundColor Yellow
    }
}

# ステップ3: すべての変更をステージング
Write-Host "`n📋 Step 3: 変更をステージング" -ForegroundColor Cyan
git add .

# ステップ4: コミット
Write-Host "`n📋 Step 4: コミット" -ForegroundColor Cyan
$commitMessage = @"
feat: CronJobsテスト実行環境の整備

- ドライラン実行テストスケジュール追加
- テスト実行ガイド追加（詳細版・クイックスタート）
- 一括テスト実行スクリプト追加（PowerShell）
- 環境変数チェックレポート追加
- Whop有料版URL確認レポート追加

テスト準備完了: X_POSTING_DRY_RUN=true でテスト実行可能
"@

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ コミット成功" -ForegroundColor Green
} else {
    Write-Host "  ❌ コミット失敗" -ForegroundColor Red
    exit 1
}

# ステップ5: プッシュ
Write-Host "`n📋 Step 5: プッシュ" -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ プッシュ成功" -ForegroundColor Green
    Write-Host "`n🎉 コミット・プッシュ完了！" -ForegroundColor Green
    Write-Host "   Vercelで自動デプロイが開始されます" -ForegroundColor Cyan
    Write-Host "`n💡 次のステップ:" -ForegroundColor Yellow
    Write-Host "   1. Vercel Dashboardでデプロイ状況を確認" -ForegroundColor Gray
    Write-Host "   2. 環境変数 X_POSTING_DRY_RUN=true を設定" -ForegroundColor Gray
    Write-Host "   3. デプロイ完了後、テストスクリプトを実行: .\scripts\test-all-cronjobs.ps1" -ForegroundColor Gray
} else {
    Write-Host "  ❌ プッシュ失敗" -ForegroundColor Red
    exit 1
}
