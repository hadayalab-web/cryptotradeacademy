# Git Push Script - プロキシ設定を無効化してプッシュ

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# プロジェクトディレクトリに移動
cd c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy

# 現在の状態を確認
Write-Host "📊 現在の状態を確認中..." -ForegroundColor Yellow
git status
Write-Host ""

# プッシュするコミットを確認
Write-Host "📝 プッシュするコミット:" -ForegroundColor Yellow
git log --oneline origin/main..HEAD
Write-Host ""

# Gitのローカル設定でプロキシを無効化
Write-Host "🔧 プロキシ設定を無効化中..." -ForegroundColor Yellow
git config --local http.proxy ""
git config --local https.proxy ""
git config --local http.sslVerify true
Write-Host "✅ プロキシ設定を無効化しました" -ForegroundColor Green
Write-Host ""

# 環境変数のプロキシ設定を一時的に無効化
Write-Host "🔧 環境変数のプロキシ設定を一時的に無効化中..." -ForegroundColor Yellow
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""
Write-Host "✅ 環境変数のプロキシ設定を無効化しました" -ForegroundColor Green
Write-Host ""

# プッシュ実行
Write-Host "🚀 GitHubにプッシュ中..." -ForegroundColor Yellow
Write-Host ""
git push origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ プッシュ成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "次のステップ:" -ForegroundColor Cyan
    Write-Host "1. Vercelのデプロイを確認してください" -ForegroundColor White
    Write-Host "2. デプロイ完了後、Cron Jobsの手動Runテストを開始してください" -ForegroundColor White
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ プッシュ失敗" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "代替方法:" -ForegroundColor Yellow
    Write-Host "1. GitHub Desktopを使用してプッシュ" -ForegroundColor White
    Write-Host "2. VS CodeのGit機能を使用してプッシュ" -ForegroundColor White
    Write-Host "3. ネットワーク設定を確認してください" -ForegroundColor White
}
