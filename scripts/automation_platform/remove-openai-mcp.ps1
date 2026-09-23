# Remove old 'openai' MCP server configuration
Write-Host "=== Removing old 'openai' MCP configuration ===" -ForegroundColor Cyan
Write-Host ""

$mcpJsonPath = "$env:USERPROFILE\.cursor\mcp.json"

if (-not (Test-Path $mcpJsonPath)) {
    Write-Host "[INFO] MCP config file not found" -ForegroundColor Yellow
    exit 0
}

try {
    $mcpConfigJson = Get-Content $mcpJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $mcpConfig = @{ mcpServers = @{} }
    
    if ($mcpConfigJson.mcpServers) {
        foreach ($key in $mcpConfigJson.mcpServers.PSObject.Properties.Name) {
            $mcpConfig.mcpServers[$key] = $mcpConfigJson.mcpServers.$key
        }
    }
    
    $removed = $false
    if ($mcpConfig.mcpServers.ContainsKey("openai")) {
        Write-Host "[INFO] Removing 'openai' configuration..." -ForegroundColor Yellow
        $mcpConfig.mcpServers.Remove("openai")
        $removed = $true
    }
    
    if ($removed) {
        $jsonConfig = @{ mcpServers = @{} }
        foreach ($key in $mcpConfig.mcpServers.Keys) {
            $jsonConfig.mcpServers[$key] = $mcpConfig.mcpServers[$key]
        }
        $jsonConfig | ConvertTo-Json -Depth 10 | Set-Content $mcpJsonPath -Encoding UTF8
        Write-Host "[OK] MCP config updated" -ForegroundColor Green
    } else {
        Write-Host "[INFO] 'openai' not found, no changes needed" -ForegroundColor Green
    }
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next: Restart Cursor" -ForegroundColor Cyan
