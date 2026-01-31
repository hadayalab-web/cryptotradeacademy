# PowerShellスクリプト: 緊急 - Grokから760人を再取得してKVに保存

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "緊急: Grokから760人を再取得してKVに保存" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# すべての環境変数を設定
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
$env:OPENAI_API_KEY = "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"

Write-Host "環境変数設定完了" -ForegroundColor Green
Write-Host "   - XAI_API_KEY: 設定済み" -ForegroundColor Green
Write-Host "   - KV_REST_API_URL: 設定済み" -ForegroundColor Green
Write-Host "   - KV_REST_API_TOKEN: 設定済み" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Grokから6言語すべてのインフルエンサーを取得開始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "目標: 840人（EN:210, ES:168, PT-BR:168, AR:112, JA:98, KO:84）" -ForegroundColor Yellow
Write-Host "実行時間: 10-30分（Grok APIの呼び出し時間による）" -ForegroundColor Yellow
Write-Host ""

# 実行
node scripts/emergency-fetch-and-save-all.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "実行完了" -ForegroundColor Green
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
    Write-Host ""
}

Write-Host "続行するには Enter キーを押してください" -ForegroundColor Gray
Read-Host
