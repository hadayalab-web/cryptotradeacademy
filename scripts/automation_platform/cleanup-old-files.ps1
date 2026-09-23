# 古いファイル削除スクリプト（cryptosignal-ai以外）

$projectRoot = $PSScriptRoot | Split-Path -Parent
$cryptosignalAiPath = Join-Path $projectRoot "cryptosignal-ai"

Write-Host "=== 古いファイル削除スクリプト ===" -ForegroundColor Cyan
Write-Host "除外フォルダ: cryptosignal-ai" -ForegroundColor Yellow
Write-Host ""

# 削除対象のファイル/フォルダリスト
$itemsToDelete = @()

# 1. アーカイブフォルダ（既にアーカイブ済み）
$archivePath = Join-Path $projectRoot "_archive"
if (Test-Path $archivePath) {
    $itemsToDelete += $archivePath
    Write-Host "[削除対象] アーカイブフォルダ: $_archive" -ForegroundColor Yellow
}

# 2. 一時リポジトリ
$tempRepoPath = Join-Path $projectRoot "temp-database-repo"
if (Test-Path $tempRepoPath) {
    $itemsToDelete += $tempRepoPath
    Write-Host "[削除対象] 一時リポジトリ: temp-database-repo" -ForegroundColor Yellow
}

# 3. ルートディレクトリの一時ファイル
$rootTempFiles = @(
    "execute_organize.py",
    "execute.bat",
    "organize_workspaces.py",
    "run_organize.py",
    "setup_cursor_only.py",
    "setup_cursor.bat",
    "PROJECT_STRUCTURE_ANALYSIS.md",
    "PROJECT_STRUCTURE_CHECK_REPORT.md",
    "PROJECT_STRUCTURE.md"
)

foreach ($file in $rootTempFiles) {
    $filePath = Join-Path $projectRoot $file
    if (Test-Path $filePath) {
        $itemsToDelete += $filePath
        Write-Host "[削除対象] 一時ファイル: $file" -ForegroundColor Yellow
    }
}

# 4. docs/cryptosignal-ai/archive フォルダ（既にアーカイブ済み）
$docsArchivePath = Join-Path $projectRoot "docs\cryptosignal-ai\archive"
if (Test-Path $docsArchivePath) {
    $itemsToDelete += $docsArchivePath
    Write-Host "[削除対象] ドキュメントアーカイブ: docs\cryptosignal-ai\archive" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "削除対象: $($itemsToDelete.Count) 個" -ForegroundColor Cyan
Write-Host ""

# 確認
$confirm = Read-Host "削除を実行しますか？ (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "キャンセルしました。" -ForegroundColor Yellow
    exit 0
}

# 削除実行
$deletedCount = 0
$failedCount = 0

foreach ($item in $itemsToDelete) {
    try {
        if (Test-Path $item) {
            Remove-Item -Path $item -Recurse -Force
            Write-Host "✅ 削除: $item" -ForegroundColor Green
            $deletedCount++
        }
    } catch {
        Write-Host "❌ 削除失敗: $item - $($_.Exception.Message)" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host ""
Write-Host "=== 削除完了 ===" -ForegroundColor Green
Write-Host "削除成功: $deletedCount 個" -ForegroundColor Green
Write-Host "削除失敗: $failedCount 個" -ForegroundColor $(if ($failedCount -gt 0) { "Red" } else { "Green" })
