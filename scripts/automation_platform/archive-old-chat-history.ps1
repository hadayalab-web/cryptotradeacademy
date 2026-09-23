# Cursorチャット履歴アーカイブスクリプト
# 古いチャット履歴をアーカイブして、Cursorのパフォーマンスを改善

param(
    [int]$DaysOld = 30,  # 何日前の履歴をアーカイブするか
    [string]$ArchivePath = "$env:APPDATA\Cursor\User\History\Archive"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cursorチャット履歴アーカイブツール" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cursorが実行中か確認
$cursorProcess = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($cursorProcess) {
    Write-Host "⚠️  警告: Cursorが実行中です。" -ForegroundColor Yellow
    Write-Host "   チャット履歴を移動する前に、Cursorを完全に終了してください。" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "それでも続行しますか？ (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "処理をキャンセルしました。" -ForegroundColor Red
        exit
    }
}

# 履歴ディレクトリの確認
$historyPath = "$env:APPDATA\Cursor\User\History"
if (-not (Test-Path $historyPath)) {
    Write-Host "❌ エラー: チャット履歴ディレクトリが見つかりません: $historyPath" -ForegroundColor Red
    exit 1
}

# アーカイブディレクトリの作成
if (-not (Test-Path $ArchivePath)) {
    New-Item -ItemType Directory -Path $ArchivePath -Force | Out-Null
    Write-Host "✅ アーカイブディレクトリを作成しました: $ArchivePath" -ForegroundColor Green
}

# カットオフ日付の計算
$cutoffDate = (Get-Date).AddDays(-$DaysOld)
Write-Host "📅 カットオフ日付: $cutoffDate" -ForegroundColor Cyan
Write-Host "   ($DaysOld 日前より古い履歴をアーカイブします)" -ForegroundColor Cyan
Write-Host ""

# アーカイブ対象の検索
$itemsToArchive = Get-ChildItem $historyPath -Directory | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate }

if ($itemsToArchive.Count -eq 0) {
    Write-Host "✅ アーカイブ対象の履歴はありません。" -ForegroundColor Green
    exit 0
}

Write-Host "📦 アーカイブ対象: $($itemsToArchive.Count) 件" -ForegroundColor Yellow
Write-Host ""

# サイズの計算
$totalSize = ($itemsToArchive | ForEach-Object {
    (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | 
        Measure-Object -Property Length -Sum).Sum
} | Measure-Object -Sum).Sum

Write-Host "📊 合計サイズ: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""

# 確認
Write-Host "以下の履歴をアーカイブします:" -ForegroundColor Yellow
$itemsToArchive | Select-Object -First 10 Name, LastWriteTime | Format-Table -AutoSize
if ($itemsToArchive.Count -gt 10) {
    Write-Host "... 他 $($itemsToArchive.Count - 10) 件" -ForegroundColor Gray
}
Write-Host ""

$confirm = Read-Host "続行しますか？ (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "処理をキャンセルしました。" -ForegroundColor Red
    exit
}

# アーカイブ実行
Write-Host ""
Write-Host "🔄 アーカイブを実行中..." -ForegroundColor Cyan

$archivedCount = 0
$errorCount = 0

foreach ($item in $itemsToArchive) {
    try {
        $destination = Join-Path $ArchivePath $item.Name
        if (Test-Path $destination) {
            # 既に存在する場合は日時を追加
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $destination = Join-Path $ArchivePath "$($item.Name)_$timestamp"
        }
        Move-Item -Path $item.FullName -Destination $destination -Force
        $archivedCount++
        Write-Host "  ✅ $($item.Name)" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ $($item.Name): $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "アーカイブ完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 成功: $archivedCount 件" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "❌ エラー: $errorCount 件" -ForegroundColor Red
}
Write-Host "📦 アーカイブ先: $ArchivePath" -ForegroundColor Cyan
Write-Host ""

# 残りの履歴サイズを表示
$remainingSize = (Get-ChildItem $historyPath -Recurse -File -ErrorAction SilentlyContinue | 
    Measure-Object -Property Length -Sum).Sum
Write-Host "📊 残りの履歴サイズ: $([math]::Round($remainingSize / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "💡 ヒント: アーカイブした履歴は削除せずに保持しておくことを推奨します。" -ForegroundColor Yellow
Write-Host "   必要に応じて、SpecStoryの履歴（.specstory/history/）を確認してください。" -ForegroundColor Yellow
