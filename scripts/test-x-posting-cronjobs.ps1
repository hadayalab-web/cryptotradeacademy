# test-x-posting-cronjobs.ps1
# X投稿関連のCronJobsをドライランで一括テスト実行

param(
    [string]$VercelUrl = "https://cryptotradeacademy.vercel.app",
    [string]$CronSecret = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"
)

Write-Host "🚀 X投稿関連CronJobs ドライランテスト開始" -ForegroundColor Green
Write-Host "=" * 80
Write-Host "📍 Vercel URL: $VercelUrl" -ForegroundColor Cyan
Write-Host "🔑 CRON_SECRET: $($CronSecret.Substring(0, [Math]::Min(20, $CronSecret.Length)))..." -ForegroundColor Cyan
Write-Host "=" * 80

# X投稿関連のエンドポイントのみ
$endpoints = @(
    @{ path = "/api/vsl1-post"; name = "VSL1自動投稿" },
    @{ path = "/api/x-post-minimal-version-cron"; name = "無料版X投稿" },
    @{ path = "/api/x-post-free-report"; name = "無料版レポートX投稿" },
    @{ path = "/api/x-quote-repost-en"; name = "引用リポスト EN" },
    @{ path = "/api/x-quote-repost-es"; name = "引用リポスト ES" },
    @{ path = "/api/x-quote-repost-pt-br"; name = "引用リポスト PT-BR" },
    @{ path = "/api/x-quote-repost-ar"; name = "引用リポスト AR" },
    @{ path = "/api/x-quote-repost-ja"; name = "引用リポスト JA" },
    @{ path = "/api/x-quote-repost-ko"; name = "引用リポスト KO" }
)

$results = @()

foreach ($endpoint in $endpoints) {
    Write-Host "`n🔍 テスト実行: $($endpoint.name)" -ForegroundColor Cyan
    Write-Host "   URL: $VercelUrl$($endpoint.path)"
    
    try {
        $startTime = Get-Date
        
        # curlコマンドを実行
        $response = curl.exe -X GET "$VercelUrl$($endpoint.path)" `
            -H "Authorization: Bearer $CronSecret" `
            -H "Content-Type: application/json" `
            -s -w "`nHTTP_STATUS:%{http_code}" `
            2>&1
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        # HTTPステータスコードを抽出
        $statusMatch = $response | Select-String -Pattern "HTTP_STATUS:(\d+)"
        $httpStatus = if ($statusMatch) { 
            $statusMatch.Matches[0].Groups[1].Value 
        } else { 
            "unknown" 
        }
        
        # レスポンス本文を取得（HTTP_STATUS行を除く）
        $responseBody = ($response | Where-Object { $_ -notmatch "HTTP_STATUS" }) -join "`n"
        
        if ($httpStatus -eq "200") {
            Write-Host "   ✅ 成功 (HTTP $httpStatus, ${duration}秒)" -ForegroundColor Green
            
            # レスポンスにdryRunが含まれているか確認
            if ($responseBody -match '"dryRun"\s*:\s*true') {
                Write-Host "   🧪 ドライランモード: 有効" -ForegroundColor Green
            } elseif ($responseBody -match '"dryRun"\s*:\s*false') {
                Write-Host "   ⚠️  警告: ドライランモードが無効です！" -ForegroundColor Red
            } else {
                Write-Host "   ⚠️  ドライランモードの確認ができませんでした" -ForegroundColor Yellow
            }
            
            $results += @{ 
                name = $endpoint.name
                status = "✅ 成功"
                httpStatus = $httpStatus
                duration = $duration
                dryRun = $responseBody -match '"dryRun"\s*:\s*true'
            }
        } elseif ($httpStatus -eq "401") {
            Write-Host "   ❌ 認証エラー (HTTP $httpStatus)" -ForegroundColor Red
            Write-Host "      CRON_SECRETが正しく設定されていない可能性があります" -ForegroundColor Yellow
            $results += @{ 
                name = $endpoint.name
                status = "❌ 認証エラー"
                httpStatus = $httpStatus
            }
        } else {
            Write-Host "   ⚠️  警告 (HTTP $httpStatus)" -ForegroundColor Yellow
            Write-Host "      レスポンス: $($responseBody.Substring(0, [Math]::Min(200, $responseBody.Length)))" -ForegroundColor Gray
            $results += @{ 
                name = $endpoint.name
                status = "⚠️  警告"
                httpStatus = $httpStatus
            }
        }
        
        # レート制限対策（1秒待機）
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "   ❌ エラー: $_" -ForegroundColor Red
        $results += @{ 
            name = $endpoint.name
            status = "❌ エラー"
            error = $_.ToString()
        }
    }
}

# 結果サマリー
Write-Host "`n" + "=" * 80
Write-Host "📊 テスト結果サマリー" -ForegroundColor Green
Write-Host "=" * 80

foreach ($result in $results) {
    $durationStr = if ($result.duration) { " (${duration}秒)" } else { "" }
    $dryRunStr = if ($result.dryRun) { " [🧪 ドライラン有効]" } else { "" }
    Write-Host "  $($result.status) $($result.name) - HTTP $($result.httpStatus)$durationStr$dryRunStr"
}

Write-Host "`n" + "=" * 80
$successCount = ($results | Where-Object { $_.status -eq "✅ 成功" }).Count
$dryRunCount = ($results | Where-Object { $_.dryRun -eq $true }).Count
$totalCount = $results.Count
$successRate = [Math]::Round(($successCount / $totalCount) * 100, 1)

Write-Host "合計: $successCount/$totalCount 成功 ($successRate%)" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })
Write-Host "ドライランモード: $dryRunCount/$totalCount 有効" -ForegroundColor $(if ($dryRunCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($successCount -eq $totalCount -and $dryRunCount -eq $totalCount) {
    Write-Host "`n🎉 すべてのX投稿CronJobsが正常に動作し、ドライランモードが有効です！" -ForegroundColor Green
} elseif ($successCount -eq $totalCount) {
    Write-Host "`n⚠️  すべてのテストは成功しましたが、一部でドライランモードが無効です" -ForegroundColor Yellow
    Write-Host "   Vercel Dashboardで X_POSTING_DRY_RUN=true が設定されているか確認してください" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  一部のテストが失敗しました" -ForegroundColor Yellow
    Write-Host "   ログを確認してバグを修正してください" -ForegroundColor Yellow
}

Write-Host "`n💡 ヒント:" -ForegroundColor Cyan
Write-Host "   - Vercel Dashboardでログを確認: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "   - ドライランモード確認: X_POSTING_DRY_RUN=true が設定されているか確認" -ForegroundColor Gray
Write-Host "   - 詳細なログは各エンドポイントの Functions タブで確認できます" -ForegroundColor Gray
