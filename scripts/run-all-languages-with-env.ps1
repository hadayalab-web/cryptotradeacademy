# PowerShellスクリプト: 全言語実行（環境変数込み）

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "全言語実行（840人目標）" -ForegroundColor Cyan
Write-Host "環境変数設定済み" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 環境変数の設定
$env:GITHUB_PERSONAL_ACCESS_TOKENS = "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"
$env:CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"
$env:VERCEL_TOKEN = "QU4PnKlo611mYVksqjfNC7Fl"
$env:KV_REST_API_READ_ONLY_TOKEN = "AotiAAIgcDE1X4iRkRRJB4nbs9u_WKXO4e3LAV9o8X7a2ZGDQwIcZw"
$env:KV_REST_API_TOKEN = "AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI"
$env:KV_REST_API_URL = "https://genuine-stork-35682.upstash.io"
$env:KV_URL = "rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379"
$env:REDIS_URL = "rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379"
$env:XAI_API_KEY = "xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"
$env:GEMINI_API_KEY = "AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig"

Write-Host "環境変数設定完了" -ForegroundColor Green
Write-Host "   - XAI_API_KEY: 設定済み" -ForegroundColor Green
Write-Host "   - KV_REST_API_URL: 設定済み" -ForegroundColor Green
Write-Host "   - KV_REST_API_TOKEN: 設定済み" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "全言語実行開始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "注意: この処理には時間がかかります（10-30分）" -ForegroundColor Yellow
Write-Host "各言語の処理が完了するまで待機してください" -ForegroundColor Yellow
Write-Host ""

node scripts/emergency-fetch-and-save-all.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "全言語実行完了" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "次のステップ: KVストック確認" -ForegroundColor Cyan
    Write-Host "   node scripts/check-kv-stock-status.js" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "実行中にエラーが発生しました" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "エラーログを確認してください" -ForegroundColor Yellow
    Write-Host "ローカルファイルを確認: data\grok-influencers\" -ForegroundColor Yellow
    Write-Host "成功した言語のローカルファイルから手動でKVに保存可能" -ForegroundColor Yellow
    Write-Host ""
}

Read-Host "続行するには Enter キーを押してください"
