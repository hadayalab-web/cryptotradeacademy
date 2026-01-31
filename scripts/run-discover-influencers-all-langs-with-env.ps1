# PowerShell script for discovering influencers (All languages)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "インフルエンサー発見（全言語・段階的実行）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variable
$env:XAI_API_KEY = "xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"

Write-Host "環境変数を設定しました" -ForegroundColor Green
Write-Host ""
Write-Host "実行開始（ENから順次実行）..." -ForegroundColor Yellow
Write-Host ""

# Run the orchestrator script
node scripts/discover-influencers-all-langs-stepwise.js

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "全言語の実行完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "続行するには何かキーを押してください..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
