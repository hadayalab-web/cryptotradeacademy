# test-all-cronjobs.ps1
# すべてのCronJobsを一括テスト実行（ドライランモード）

param(
    [string]$VercelUrl = "",
    [string]$CronSecret = ""
)

# 環境変数から取得、またはデフォルト値を使用
if ([string]::IsNullOrEmpty($VercelUrl)) {
    $VercelUrl = $env:VERCEL_URL
    if ([string]::IsNullOrEmpty($VercelUrl)) {
        $VercelUrl = "https://cryptotradeacademy.vercel.app"
    }
}

if ([string]::IsNullOrEmpty($CronSecret)) {
    $CronSecret = $env:CRON_SECRET
    if ([string]::IsNullOrEmpty($CronSecret)) {
        Write-Host "⚠️  CRON_SECRETが設定されていません" -ForegroundColor Yellow
        Write-Host "   環境変数 CRON_SECRET を設定するか、-CronSecret パラメータを指定してください" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "🚀 CronJobs 一括テスト開始" -ForegroundColor Green
Write-Host "=" * 80
Write-Host "📍 Vercel URL: $VercelUrl" -ForegroundColor Cyan
Write-Host "🔑 CRON_SECRET: $($CronSecret.Substring(0, [Math]::Min(20, $CronSecret.Length)))..." -ForegroundColor Cyan
Write-Host "=" * 80

$endpoints = @(
    @{ path = "/api/cron?force=true"; name = "Trap Defence BTC配信"; phase = "Phase 1" },
    @{ path = "/api/vsl1-post"; name = "VSL1自動投稿"; phase = "Phase 2" },
    @{ path = "/api/x-post-minimal-version-cron"; name = "無料版X投稿"; phase = "Phase 2" },
    @{ path = "/api/x-post-free-report"; name = "無料版レポートX投稿"; phase = "Phase 2" },
    @{ path = "/api/x-quote-repost-en"; name = "引用リポスト EN"; phase = "Phase 2" },
    @{ path = "/api/x-quote-repost-es"; name = "引用リポスト ES"; phase = "Phase 2" },
    @{ path = "/api/x-quote-repost-pt-br"; name = "引用リポスト PT-BR"; phase = "Phase 2" },
    @{ path = "/api/x-quote-repost-ar"; name = "引用リポスト AR"; phase = "Phase 2" },
    @{ path = "/api/x-quote-repost-ja"; name = "引用リポスト JA"; phase = "Phase 2" },
    @{ path = "/api/x-quote-repost-ko"; name = "引用リポスト KO"; phase = "Phase 2" },
    @{ path = "/api/vsl2-free-users"; name = "VSL2自動配信"; phase = "Phase 3" },
    @{ path = "/api/vsl1-reminder"; name = "VSL1リマインド"; phase = "Phase 3" },
    @{ path = "/api/vsl2-last-call"; name = "VSL2終了直前リマインド"; phase = "Phase 3" },
    @{ path = "/api/promo-stock-monitor"; name = "プロモコード在庫監視"; phase = "Phase 4" }
)

$results = @()
$currentPhase = ""

foreach ($endpoint in $endpoints) {
    # Phaseが変わったら区切りを表示
    if ($currentPhase -ne $endpoint.phase) {
        if ($currentPhase -ne "") {
            Write-Host ""
        }
        Write-Host "`n📋 $($endpoint.phase)" -ForegroundColor Magenta
        Write-Host "-" * 80
        $currentPhase = $endpoint.phase
    }
    
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
            
            # レスポンスにdryRunが含まれているか確認（X投稿関連の場合）
            if ($endpoint.path -match "x-quote-repost|vsl1-post|x-post") {
                if ($responseBody -match '"dryRun"\s*:\s*true') {
                    Write-Host "   🧪 ドライランモード: 有効" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠️  ドライランモードの確認ができませんでした" -ForegroundColor Yellow
                }
            }
            
            $results += @{ 
                name = $endpoint.name
                status = "✅ 成功"
                httpStatus = $httpStatus
                duration = $duration
                phase = $endpoint.phase
            }
        } elseif ($httpStatus -eq "401") {
            Write-Host "   ❌ 認証エラー (HTTP $httpStatus)" -ForegroundColor Red
            Write-Host "      CRON_SECRETが正しく設定されていない可能性があります" -ForegroundColor Yellow
            $results += @{ 
                name = $endpoint.name
                status = "❌ 認証エラー"
                httpStatus = $httpStatus
                phase = $endpoint.phase
            }
        } else {
            Write-Host "   ⚠️  警告 (HTTP $httpStatus)" -ForegroundColor Yellow
            Write-Host "      レスポンス: $($responseBody.Substring(0, [Math]::Min(200, $responseBody.Length)))" -ForegroundColor Gray
            $results += @{ 
                name = $endpoint.name
                status = "⚠️  警告"
                httpStatus = $httpStatus
                phase = $endpoint.phase
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
            phase = $endpoint.phase
        }
    }
}

# 結果サマリー
Write-Host "`n" + "=" * 80
Write-Host "📊 テスト結果サマリー" -ForegroundColor Green
Write-Host "=" * 80

$phaseResults = @{}
foreach ($result in $results) {
    if (-not $phaseResults.ContainsKey($result.phase)) {
        $phaseResults[$result.phase] = @()
    }
    $phaseResults[$result.phase] += $result
}

foreach ($phase in $phaseResults.Keys | Sort-Object) {
    Write-Host "`n$phase" -ForegroundColor Magenta
    foreach ($result in $phaseResults[$phase]) {
        $durationStr = if ($result.duration) { " (${duration}秒)" } else { "" }
        Write-Host "  $($result.status) $($result.name) - HTTP $($result.httpStatus)$durationStr"
    }
}

Write-Host "`n" + "=" * 80
$successCount = ($results | Where-Object { $_.status -eq "✅ 成功" }).Count
$totalCount = $results.Count
$successRate = [Math]::Round(($successCount / $totalCount) * 100, 1)

Write-Host "合計: $successCount/$totalCount 成功 ($successRate%)" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })

if ($successCount -eq $totalCount) {
    Write-Host "`n🎉 すべてのテストが成功しました！" -ForegroundColor Green
    Write-Host "   次のステップ: バグがなければ本番環境移行を検討してください" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  一部のテストが失敗しました" -ForegroundColor Yellow
    Write-Host "   ログを確認してバグを修正してください" -ForegroundColor Yellow
}

Write-Host "`n💡 ヒント:" -ForegroundColor Cyan
Write-Host "   - Vercel Dashboardでログを確認: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "   - ドライランモード確認: X_POSTING_DRY_RUN=true が設定されているか確認" -ForegroundColor Gray
Write-Host "   - 詳細なログは各エンドポイントの Functions タブで確認できます" -ForegroundColor Gray
