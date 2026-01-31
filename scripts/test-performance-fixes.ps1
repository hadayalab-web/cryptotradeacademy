# パフォーマンス修正後のテストスクリプト
# 504タイムアウト対策の検証

$baseUrl = "https://cryptotradeacademy-l752t3vl8-hadayalab-projects-projects.vercel.app"
$ErrorActionPreference = "Continue"
$endpoints = @(
    @{ Path = "/api/cron"; Name = "Cron (Regular Broadcast)" },
    @{ Path = "/api/x-quote-repost-en?count=1&dry_run=true"; Name = "X Quote Repost EN" },
    @{ Path = "/api/x-quote-repost-ko?count=1&dry_run=true"; Name = "X Quote Repost KO" },
    @{ Path = "/api/x-quote-repost-ja?count=1&dry_run=true"; Name = "X Quote Repost JA" },
    @{ Path = "/api/x-quote-repost-es?count=1&dry_run=true"; Name = "X Quote Repost ES" }
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "パフォーマンス修正後のテスト開始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$results = @()
$successCount = 0
$failureCount = 0

foreach ($endpoint in $endpoints) {
    $url = "$baseUrl$($endpoint.Path)"
    Write-Host "[テスト] $($endpoint.Name)..." -ForegroundColor Yellow
    Write-Host "  URL: $url" -ForegroundColor Gray
    
    $startTime = Get-Date
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 70 -UseBasicParsing
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ 成功 (HTTP $($response.StatusCode), ${duration}秒)" -ForegroundColor Green
            
            # JSONレスポンスを解析
            try {
                $json = $response.Content | ConvertFrom-Json
                if ($json.success -ne $null) {
                    Write-Host "    success: $($json.success)" -ForegroundColor Gray
                }
                if ($json.metrics -ne $null) {
                    Write-Host "    metrics: $($json.metrics | ConvertTo-Json -Compress)" -ForegroundColor Gray
                }
            } catch {
                Write-Host "    (JSON解析スキップ)" -ForegroundColor Gray
            }
            
            $successCount++
            $results += @{
                Name = $endpoint.Name
                Status = "成功"
                StatusCode = $response.StatusCode
                Duration = $duration
            }
        } else {
            Write-Host "  ⚠️ 警告 (HTTP $($response.StatusCode), ${duration}秒)" -ForegroundColor Yellow
            $failureCount++
            $results += @{
                Name = $endpoint.Name
                Status = "警告"
                StatusCode = $response.StatusCode
                Duration = $duration
            }
        }
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        $errorMessage = $_.Exception.Message
        
        if ($errorMessage -like "*504*" -or $errorMessage -like "*Gateway Timeout*") {
            Write-Host "  ❌ 504タイムアウト (${duration}秒)" -ForegroundColor Red
        } elseif ($errorMessage -like "*500*") {
            Write-Host "  ❌ 500エラー: $errorMessage" -ForegroundColor Red
        } else {
            Write-Host "  ❌ エラー: $errorMessage" -ForegroundColor Red
        }
        
        $failureCount++
        $results += @{
            Name = $endpoint.Name
            Status = "失敗"
            StatusCode = "エラー"
            Duration = $duration
            Error = $errorMessage
        }
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "テスト結果サマリー" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "成功: $successCount / $($endpoints.Count)" -ForegroundColor $(if ($successCount -eq $endpoints.Count) { "Green" } else { "Yellow" })
Write-Host "失敗: $failureCount / $($endpoints.Count)" -ForegroundColor $(if ($failureCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

foreach ($result in $results) {
    $color = switch ($result.Status) {
        "成功" { "Green" }
        "警告" { "Yellow" }
        default { "Red" }
    }
    Write-Host "  $($result.Name): $($result.Status) ($($result.StatusCode), $($result.Duration)秒)" -ForegroundColor $color
}

Write-Host ""
Write-Host "期待される結果:" -ForegroundColor Cyan
Write-Host "  - /api/cron: 成功または警告（タイムアウト改善）" -ForegroundColor Gray
Write-Host "  - /api/x-quote-repost-*: すべて成功（並列処理により改善）" -ForegroundColor Gray
