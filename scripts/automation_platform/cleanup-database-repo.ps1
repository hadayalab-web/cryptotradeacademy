# cryptotradeacademy-database リポジトリのクリーンアップスクリプト
# CSVファイル以外を削除

$repoPath = "temp-db-repo"
$csvFiles = @()

# CSVファイルをリストアップ
Write-Host "📋 CSVファイルを確認中..." -ForegroundColor Cyan
Get-ChildItem -Path $repoPath -Recurse -File -Filter *.csv | ForEach-Object {
    $csvFiles += $_.FullName
    Write-Host "  ✅ $($_.Name)" -ForegroundColor Green
}

Write-Host "`n📊 合計: $($csvFiles.Count) 個のCSVファイル" -ForegroundColor Yellow

# CSV以外のファイルを削除（.gitkeepとREADME.mdは除外）
Write-Host "`n🗑️  CSV以外のファイルを削除中..." -ForegroundColor Cyan
$deletedCount = 0
Get-ChildItem -Path $repoPath -Recurse -File | Where-Object {
    $_.Extension -ne '.csv' -and 
    $_.Name -ne '.gitkeep' -and 
    $_.Name -ne 'README.md' -and
    $_.Name -ne '.gitignore'
} | ForEach-Object {
    Write-Host "  ❌ 削除: $($_.FullName)" -ForegroundColor Red
    Remove-Item -Path $_.FullName -Force
    $deletedCount++
}

Write-Host "`n✅ 削除完了: $deletedCount 個のファイル" -ForegroundColor Green
Write-Host "📋 残存ファイル: CSVファイル $($csvFiles.Count) 個 + README.md + .gitkeep" -ForegroundColor Yellow
