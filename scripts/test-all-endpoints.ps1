# 一括テストスクリプト（修正後のエンドポイント検証）
# 作成日時: 2026-01-31

$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

Write-Host "🚀 修正後の一括テスト開始" -ForegroundColor Green
Write-Host "=" * 80

$testResults = @()

# テスト1: /api/cron（モジュールパスエラー修正の確認）
Write-Host "`n[1/5] テスト: /api/cron" -ForegroundColor Cyan
try {
    $response = curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
        -H "Authorization: Bearer $CRON_SECRET" `
        -H "Content-Type: application/json" `
        -s -w "`nHTTP_STATUS:%{http_code}" 2>&1
    
    $status = ($response | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
    $body = ($response -join "`n") -replace "HTTP_STATUS:\d+", "" | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($status -eq "200") {
        Write-Host "  ✅ 成功 (HTTP $status)" -ForegroundColor Green
        if ($body.success -ne $null) {
            Write-Host "    - success: $($body.success)" -ForegroundColor Gray
        }
        $testResults += @{ Endpoint = "/api/cron"; Status = $status; Success = $true; Message = "モジュールパスエラー修正確認" }
    } else {
        Write-Host "  ❌ 失敗 (HTTP $status)" -ForegroundColor Red
        if ($body.error) {
            Write-Host "    - Error: $($body.error)" -ForegroundColor Red
        }
        $testResults += @{ Endpoint = "/api/cron"; Status = $status; Success = $false; Message = "エラー発生" }
    }
} catch {
    Write-Host "  ❌ 例外発生: $_" -ForegroundColor Red
    $testResults += @{ Endpoint = "/api/cron"; Status = "ERROR"; Success = $false; Message = "例外: $_" }
}
Start-Sleep -Seconds 2

# テスト2: /api/x-quote-repost-en（success判定ロジック修正の確認）
Write-Host "`n[2/5] テスト: /api/x-quote-repost-en" -ForegroundColor Cyan
try {
    $response = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
        -H "Authorization: Bearer $CRON_SECRET" `
        -H "Content-Type: application/json" `
        -s -w "`nHTTP_STATUS:%{http_code}" 2>&1
    
    $status = ($response | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
    $body = ($response -join "`n") -replace "HTTP_STATUS:\d+", "" | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($status -eq "200") {
        $successStatus = if ($body.success) { "✅" } else { "⚠️" }
        Write-Host "  $successStatus HTTP $status, success: $($body.success)" -ForegroundColor $(if ($body.success) { "Green" } else { "Yellow" })
        
        if ($body.metrics) {
            Write-Host "    - dry_run_count: $($body.metrics.dry_run_count)" -ForegroundColor Gray
            Write-Host "    - success_count: $($body.metrics.success_count)" -ForegroundColor Gray
            Write-Host "    - total_results: $($body.metrics.total_results)" -ForegroundColor Gray
        }
        
        if ($body.results -and $body.results.Count -gt 0) {
            $dryRunResults = $body.results | Where-Object { $_.dryRun -eq $true }
            $actualSuccess = $body.results | Where-Object { $_.success -eq $true -and $_.dryRun -ne $true }
            Write-Host "    - dryRun成功: $($dryRunResults.Count)件" -ForegroundColor Gray
            Write-Host "    - 実際の投稿成功: $($actualSuccess.Count)件" -ForegroundColor Gray
        }
        
        $testResults += @{ Endpoint = "/api/x-quote-repost-en"; Status = $status; Success = $body.success; Message = "success判定ロジック確認" }
    } elseif ($status -eq "504") {
        Write-Host "  ⚠️  タイムアウト (HTTP $status)" -ForegroundColor Yellow
        $testResults += @{ Endpoint = "/api/x-quote-repost-en"; Status = $status; Success = $false; Message = "タイムアウト" }
    } else {
        Write-Host "  ❌ 失敗 (HTTP $status)" -ForegroundColor Red
        if ($body.error) {
            Write-Host "    - Error: $($body.error)" -ForegroundColor Red
        }
        $testResults += @{ Endpoint = "/api/x-quote-repost-en"; Status = $status; Success = $false; Message = "エラー発生" }
    }
} catch {
    Write-Host "  ❌ 例外発生: $_" -ForegroundColor Red
    $testResults += @{ Endpoint = "/api/x-quote-repost-en"; Status = "ERROR"; Success = $false; Message = "例外: $_" }
}
Start-Sleep -Seconds 2

# テスト3: /api/x-quote-repost-ko
Write-Host "`n[3/5] テスト: /api/x-quote-repost-ko" -ForegroundColor Cyan
try {
    $response = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
        -H "Authorization: Bearer $CRON_SECRET" `
        -H "Content-Type: application/json" `
        -s -w "`nHTTP_STATUS:%{http_code}" 2>&1
    
    $status = ($response | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
    
    if ($status -eq "200") {
        Write-Host "  ✅ 成功 (HTTP $status)" -ForegroundColor Green
        $testResults += @{ Endpoint = "/api/x-quote-repost-ko"; Status = $status; Success = $true; Message = "正常動作" }
    } elseif ($status -eq "504") {
        Write-Host "  ⚠️  タイムアウト (HTTP $status)" -ForegroundColor Yellow
        $testResults += @{ Endpoint = "/api/x-quote-repost-ko"; Status = $status; Success = $false; Message = "タイムアウト" }
    } else {
        Write-Host "  ❌ 失敗 (HTTP $status)" -ForegroundColor Red
        $testResults += @{ Endpoint = "/api/x-quote-repost-ko"; Status = $status; Success = $false; Message = "エラー発生" }
    }
} catch {
    Write-Host "  ❌ 例外発生: $_" -ForegroundColor Red
    $testResults += @{ Endpoint = "/api/x-quote-repost-ko"; Status = "ERROR"; Success = $false; Message = "例外: $_" }
}
Start-Sleep -Seconds 2

# テスト4: /api/x-quote-repost-ja
Write-Host "`n[4/5] テスト: /api/x-quote-repost-ja" -ForegroundColor Cyan
try {
    $response = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
        -H "Authorization: Bearer $CRON_SECRET" `
        -H "Content-Type: application/json" `
        -s -w "`nHTTP_STATUS:%{http_code}" 2>&1
    
    $status = ($response | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
    
    if ($status -eq "200") {
        Write-Host "  ✅ 成功 (HTTP $status)" -ForegroundColor Green
        $testResults += @{ Endpoint = "/api/x-quote-repost-ja"; Status = $status; Success = $true; Message = "正常動作" }
    } elseif ($status -eq "504") {
        Write-Host "  ⚠️  タイムアウト (HTTP $status)" -ForegroundColor Yellow
        $testResults += @{ Endpoint = "/api/x-quote-repost-ja"; Status = $status; Success = $false; Message = "タイムアウト" }
    } else {
        Write-Host "  ❌ 失敗 (HTTP $status)" -ForegroundColor Red
        $testResults += @{ Endpoint = "/api/x-quote-repost-ja"; Status = $status; Success = $false; Message = "エラー発生" }
    }
} catch {
    Write-Host "  ❌ 例外発生: $_" -ForegroundColor Red
    $testResults += @{ Endpoint = "/api/x-quote-repost-ja"; Status = "ERROR"; Success = $false; Message = "例外: $_" }
}
Start-Sleep -Seconds 2

# テスト5: /api/x-quote-repost-es（追加確認）
Write-Host "`n[5/5] テスト: /api/x-quote-repost-es" -ForegroundColor Cyan
try {
    $response = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es" `
        -H "Authorization: Bearer $CRON_SECRET" `
        -H "Content-Type: application/json" `
        -s -w "`nHTTP_STATUS:%{http_code}" 2>&1
    
    $status = ($response | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
    
    if ($status -eq "200") {
        Write-Host "  ✅ 成功 (HTTP $status)" -ForegroundColor Green
        $testResults += @{ Endpoint = "/api/x-quote-repost-es"; Status = $status; Success = $true; Message = "正常動作" }
    } elseif ($status -eq "504") {
        Write-Host "  ⚠️  タイムアウト (HTTP $status)" -ForegroundColor Yellow
        $testResults += @{ Endpoint = "/api/x-quote-repost-es"; Status = $status; Success = $false; Message = "タイムアウト" }
    } else {
        Write-Host "  ❌ 失敗 (HTTP $status)" -ForegroundColor Red
        $testResults += @{ Endpoint = "/api/x-quote-repost-es"; Status = $status; Success = $false; Message = "エラー発生" }
    }
} catch {
    Write-Host "  ❌ 例外発生: $_" -ForegroundColor Red
    $testResults += @{ Endpoint = "/api/x-quote-repost-es"; Status = "ERROR"; Success = $false; Message = "例外: $_" }
}

# 結果サマリー
Write-Host "`n" + "=" * 80
Write-Host "📊 テスト結果サマリー" -ForegroundColor Cyan
Write-Host "=" * 80

$successCount = ($testResults | Where-Object { $_.Success -eq $true }).Count
$totalCount = $testResults.Count

foreach ($result in $testResults) {
    $icon = if ($result.Success) { "✅" } else { "❌" }
    $color = if ($result.Success) { "Green" } else { "Red" }
    Write-Host "$icon $($result.Endpoint): HTTP $($result.Status) - $($result.Message)" -ForegroundColor $color
}

Write-Host "`n合計: $successCount/$totalCount 成功" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })
Write-Host "=" * 80

if ($successCount -eq $totalCount) {
    Write-Host "✅ すべてのテストが成功しました！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  一部のテストが失敗しました。ログを確認してください。" -ForegroundColor Yellow
    exit 1
}
