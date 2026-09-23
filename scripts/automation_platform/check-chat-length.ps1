# Cursor チャット履歴サイズチェックスクリプト
# 長いチャットがクラッシュの原因になっていないか確認

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cursor チャット履歴サイズチェック" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$historyPath = "$env:APPDATA\Cursor\User\History"

if (-not (Test-Path $historyPath)) {
    Write-Host "[ERROR] チャット履歴ディレクトリが見つかりません" -ForegroundColor Red
    Write-Host "  Path: $historyPath" -ForegroundColor Gray
    exit 1
}

Write-Host "[INFO] チャット履歴を分析中..." -ForegroundColor Yellow
Write-Host ""

# チャット履歴ディレクトリを取得
$chatDirs = Get-ChildItem $historyPath -Directory -ErrorAction SilentlyContinue

if (-not $chatDirs) {
    Write-Host "[INFO] チャット履歴が見つかりませんでした" -ForegroundColor Yellow
    exit 0
}

# 各チャットのサイズを計算
$chatSizes = $chatDirs | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | 
             Measure-Object -Property Length -Sum).Sum
    $fileCount = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count
    
    [PSCustomObject]@{
        Name = $_.Name
        SizeMB = [math]::Round($size / 1MB, 2)
        FileCount = $fileCount
        LastWriteTime = $_.LastWriteTime
    }
} | Sort-Object LastWriteTime -Descending

# 結果を表示
Write-Host "最新のチャット履歴（上位10件）:" -ForegroundColor Cyan
Write-Host ""

$largeChats = @()
$totalSize = 0

foreach ($chat in $chatSizes | Select-Object -First 10) {
    $totalSize += $chat.SizeMB
    
    # 警告レベルを判定
    $warning = ""
    if ($chat.SizeMB -gt 10) {
        $warning = " ⚠️ 大きい"
        $largeChats += $chat
    } elseif ($chat.SizeMB -gt 5) {
        $warning = " ⚡ 注意"
    }
    
    Write-Host "  $($chat.Name)" -ForegroundColor White
    Write-Host "    サイズ: $($chat.SizeMB) MB | ファイル数: $($chat.FileCount) | 更新: $($chat.LastWriteTime)$warning" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "統計情報" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  総チャット数: $($chatSizes.Count)" -ForegroundColor White
Write-Host "  最新10件の合計サイズ: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White
Write-Host "  大きなチャット（>10MB）: $($largeChats.Count) 件" -ForegroundColor $(if ($largeChats.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

# 推奨事項
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "推奨事項" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($largeChats.Count -gt 0) {
    Write-Host "⚠️  大きなチャット履歴が見つかりました:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($chat in $largeChats) {
        Write-Host "  - $($chat.Name): $($chat.SizeMB) MB" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "推奨アクション:" -ForegroundColor Cyan
    Write-Host "  1. 重要な内容を保存（SpecStoryまたはMarkdown）" -ForegroundColor White
    Write-Host "  2. 新しいチャットを開始" -ForegroundColor White
    Write-Host "  3. 古いチャットは必要に応じて@で参照" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✅ チャット履歴のサイズは正常範囲内です" -ForegroundColor Green
    Write-Host ""
}

Write-Host "一般的な推奨事項:" -ForegroundColor Cyan
Write-Host "  - 50回以上のやり取りで新しいチャットを開始" -ForegroundColor White
Write-Host "  - コンテキスト使用量が80%を超えたら新しいチャットを検討" -ForegroundColor White
Write-Host "  - 重要な内容は必ず保存してからリセット" -ForegroundColor White
Write-Host ""
