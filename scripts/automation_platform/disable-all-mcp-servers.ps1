# すべてのMCPサーバーを一時的に無効化
# エラー解決後に再び有効化できるようにバックアップを作成

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "すべてのMCPサーバーを一時的に無効化" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mcpJsonPath = "$env:USERPROFILE\.cursor\mcp.json"

# mcp.jsonが存在するか確認
if (-not (Test-Path $mcpJsonPath)) {
    Write-Host "[INFO] mcp.json not found: $mcpJsonPath" -ForegroundColor Yellow
    Write-Host "[INFO] MCP servers are not configured." -ForegroundColor Yellow
    exit 0
}

# 既存の設定を読み込む
try {
    $mcpConfigJson = Get-Content $mcpJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "[OK] MCP config loaded" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to read mcp.json: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# バックアップを作成
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "$env:USERPROFILE\.cursor\mcp.json.backup.$timestamp.json"
try {
    Copy-Item $mcpJsonPath $backupPath -Force
    Write-Host "[OK] Backup created: $backupPath" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Failed to create backup: $($_.Exception.Message)" -ForegroundColor Yellow
}

# サーバー数を確認
$serverCount = 0
$serverNames = @()
if ($mcpConfigJson.mcpServers) {
    $serverNames = $mcpConfigJson.mcpServers.PSObject.Properties.Name
    $serverCount = $serverNames.Count
}

# すべてのサーバーを無効化（空の設定に置き換え）
$mcpConfig = @{
    mcpServers = @{}
}

if ($serverCount -gt 0) {
    Write-Host "[INFO] Disabling $serverCount MCP server(s):" -ForegroundColor Yellow
    foreach ($name in $serverNames) {
        Write-Host "  - $name" -ForegroundColor Gray
    }
} else {
    Write-Host "[INFO] No MCP servers configured" -ForegroundColor Yellow
    exit 0
}

# 設定ファイルを保存
try {
    $mcpConfigJson = $mcpConfig | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($mcpJsonPath, $mcpConfigJson, [System.Text.UTF8Encoding]::new($false))
    Write-Host "[OK] mcp.json updated: $mcpJsonPath" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to write mcp.json: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "無効化完了" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Cyan
Write-Host "  1. Cursorを完全に再起動してください" -ForegroundColor White
Write-Host "  2. エラーが解決したか確認してください" -ForegroundColor White
Write-Host "  3. 必要に応じて、バックアップファイルから復元してください:" -ForegroundColor White
Write-Host "     $backupPath" -ForegroundColor Gray
Write-Host ""
Write-Host "復元方法:" -ForegroundColor Cyan
Write-Host "  Copy-Item `"$backupPath`" `"$mcpJsonPath`" -Force" -ForegroundColor Gray
Write-Host ""
