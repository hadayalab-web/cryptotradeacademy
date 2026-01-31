# テストコマンド一覧（修正後）
**作成日時**: 2026-01-31

---

## 🚀 一括テストスクリプト（推奨）

### PowerShellスクリプト実行
```powershell
.\scripts\test-all-endpoints.ps1
```

### ワンライナー版（コピペ用）
```powershell
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"; $CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"; Write-Host "🚀 修正後の一括テスト開始" -ForegroundColor Green; Write-Host "=" * 80; Write-Host "`n[1/5] テスト: /api/cron" -ForegroundColor Cyan; $response1 = curl.exe -X GET "$VERCEL_URL/api/cron?force=true" -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -s -w "`nHTTP_STATUS:%{http_code}"; $status1 = ($response1 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value; if ($status1 -eq "200") { Write-Host "  ✅ 成功 (HTTP $status1)" -ForegroundColor Green } else { Write-Host "  ❌ 失敗 (HTTP $status1)" -ForegroundColor Red }; Start-Sleep -Seconds 2; Write-Host "`n[2/5] テスト: /api/x-quote-repost-en" -ForegroundColor Cyan; $response2 = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -s -w "`nHTTP_STATUS:%{http_code}"; $status2 = ($response2 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value; if ($status2 -eq "200") { Write-Host "  ✅ 成功 (HTTP $status2)" -ForegroundColor Green } elseif ($status2 -eq "504") { Write-Host "  ⚠️  タイムアウト (HTTP $status2)" -ForegroundColor Yellow } else { Write-Host "  ❌ 失敗 (HTTP $status2)" -ForegroundColor Red }; Start-Sleep -Seconds 2; Write-Host "`n[3/5] テスト: /api/x-quote-repost-ko" -ForegroundColor Cyan; $response3 = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -s -w "`nHTTP_STATUS:%{http_code}"; $status3 = ($response3 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value; if ($status3 -eq "200") { Write-Host "  ✅ 成功 (HTTP $status3)" -ForegroundColor Green } elseif ($status3 -eq "504") { Write-Host "  ⚠️  タイムアウト (HTTP $status3)" -ForegroundColor Yellow } else { Write-Host "  ❌ 失敗 (HTTP $status3)" -ForegroundColor Red }; Start-Sleep -Seconds 2; Write-Host "`n[4/5] テスト: /api/x-quote-repost-ja" -ForegroundColor Cyan; $response4 = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -s -w "`nHTTP_STATUS:%{http_code}"; $status4 = ($response4 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value; if ($status4 -eq "200") { Write-Host "  ✅ 成功 (HTTP $status4)" -ForegroundColor Green } elseif ($status4 -eq "504") { Write-Host "  ⚠️  タイムアウト (HTTP $status4)" -ForegroundColor Yellow } else { Write-Host "  ❌ 失敗 (HTTP $status4)" -ForegroundColor Red }; Start-Sleep -Seconds 2; Write-Host "`n[5/5] テスト: /api/x-quote-repost-es" -ForegroundColor Cyan; $response5 = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es" -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -s -w "`nHTTP_STATUS:%{http_code}"; $status5 = ($response5 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value; if ($status5 -eq "200") { Write-Host "  ✅ 成功 (HTTP $status5)" -ForegroundColor Green } elseif ($status5 -eq "504") { Write-Host "  ⚠️  タイムアウト (HTTP $status5)" -ForegroundColor Yellow } else { Write-Host "  ❌ 失敗 (HTTP $status5)" -ForegroundColor Red }; Write-Host "`n✅ テスト完了" -ForegroundColor Green
```

---

## 📋 個別テストコマンド

### 1. /api/cron（モジュールパスエラー修正の確認）
```powershell
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**期待結果**: HTTP 200、モジュールパスエラーが発生しない

---

### 2. /api/x-quote-repost-en（success判定ロジック修正の確認）
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**期待結果**: 
- HTTP 200
- `success: true`（dryRunの場合も）
- `dry_run_count`メトリクスが含まれる

---

### 3. /api/x-quote-repost-ko
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**期待結果**: HTTP 200

---

### 4. /api/x-quote-repost-ja
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**期待結果**: HTTP 200（504タイムアウトが発生しない）

---

### 5. /api/x-quote-repost-es
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**期待結果**: HTTP 200

---

## 🔍 詳細確認コマンド

### JSONレスポンスを整形して表示
```powershell
$response = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" -s

$response | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### success判定の詳細確認
```powershell
$response = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" -s | ConvertFrom-Json

Write-Host "success: $($response.success)"
Write-Host "dry_run_count: $($response.metrics.dry_run_count)"
Write-Host "success_count: $($response.metrics.success_count)"
Write-Host "total_results: $($response.metrics.total_results)"
```

---

## ✅ 確認ポイント

### 1. モジュールパスエラーの解消
- `/api/cron`が正常に動作する
- `Cannot find module '../shared/contentFilters'`エラーが発生しない

### 2. success判定ロジックの修正
- `dryRun: true`の場合も`success: true`が返される
- `dry_run_count`メトリクスが正しく記録される

### 3. タイムアウトの改善
- 504タイムアウトが発生しない（または大幅に減少）
- タイムアウトチェックが5秒に短縮され、より多くの処理が実行される

---

## 📊 テスト結果の記録

テスト結果を記録する場合は、以下のコマンドを使用：

```powershell
.\scripts\test-all-endpoints.ps1 | Tee-Object -FilePath "test-results-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').txt"
```
