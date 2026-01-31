# PowerShell script for discovering influencers (EN)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "インフルエンサー発見（EN言語）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variable
$env:XAI_API_KEY = "xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"

Write-Host "環境変数を設定しました" -ForegroundColor Green
Write-Host ""
Write-Host "実行開始..." -ForegroundColor Yellow
Write-Host ""

# Run the script
node scripts/discover-influencers-single-lang-robust.js en 210

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "実行完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "続行するには何かキーを押してください..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
