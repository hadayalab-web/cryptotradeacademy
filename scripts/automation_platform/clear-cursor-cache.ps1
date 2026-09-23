# Cursorキャッシュクリアスクリプト
# Cursorのキャッシュをクリアしてパフォーマンスを改善

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cursorキャッシュクリアツール" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cursorが実行中か確認
$cursorProcess = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($cursorProcess) {
    Write-Host "⚠️  警告: Cursorが実行中です。" -ForegroundColor Yellow
    Write-Host "   キャッシュをクリアする前に、Cursorを完全に終了してください。" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "それでも続行しますか？ (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "処理をキャンセルしました。" -ForegroundColor Red
        exit
    }
}

# キャッシュディレクトリのパス
$cachePaths = @(
    "$env:APPDATA\Cursor\Cache",
    "$env:LOCALAPPDATA\Cursor\Cache"
)

$totalSize = 0
$clearedCount = 0

foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
        # サイズの計算
        $size = (Get-ChildItem $cachePath -Recurse -File -ErrorAction SilentlyContinue | 
            Measure-Object -Property Length -Sum).Sum
        $totalSize += $size
        
        Write-Host "📂 $cachePath" -ForegroundColor Cyan
        Write-Host "   サイズ: $([math]::Round($size / 1MB, 2)) MB" -ForegroundColor Gray
        
        # 確認
        $confirm = Read-Host "   このキャッシュをクリアしますか？ (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            try {
                Remove-Item "$cachePath\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "   ✅ クリア完了" -ForegroundColor Green
                $clearedCount++
            }
            catch {
                Write-Host "   ❌ エラー: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "処理完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 合計サイズ: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "✅ クリアしたキャッシュ: $clearedCount 件" -ForegroundColor Green
Write-Host ""
Write-Host "💡 ヒント: Cursorを再起動すると、キャッシュが再生成されます。" -ForegroundColor Yellow
