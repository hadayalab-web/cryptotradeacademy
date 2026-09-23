# Cursor Extensions Installer Script
# Install performance-enhancing extensions

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cursor Extensions - Performance Enhancement Set" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Extension list
$extensions = @(
    @{ id = "usernamehw.errorlens"; name = "Error Lens"; priority = "High" },
    @{ id = "eamodio.gitlens"; name = "GitLens"; priority = "High" },
    @{ id = "christian-kohler.path-intellisense"; name = "Path Intellisense"; priority = "High" },
    @{ id = "formulahendry.auto-rename-tag"; name = "Auto Rename Tag"; priority = "Medium" },
    @{ id = "oderwat.indent-rainbow"; name = "Indent Rainbow"; priority = "Medium" },
    @{ id = "wix.vscode-import-cost"; name = "Import Cost"; priority = "Medium" },
    @{ id = "gruntfuggly.todo-tree"; name = "Todo Tree"; priority = "Medium" },
    @{ id = "rangav.vscode-thunder-client"; name = "Thunder Client"; priority = "Low" },
    @{ id = "dbaeumer.vscode-eslint"; name = "ESLint"; priority = "High" },
    @{ id = "esbenp.prettier-vscode"; name = "Prettier"; priority = "High" },
    @{ id = "streetsidesoftware.code-spell-checker"; name = "Code Spell Checker"; priority = "Low" },
    @{ id = "yzhang.markdown-all-in-one"; name = "Markdown All in One"; priority = "Low" }
)

$installed = 0
$skipped = 0
$failed = 0

foreach ($ext in $extensions) {
    Write-Host "[$($ext.priority)] Installing $($ext.name)..." -ForegroundColor Yellow
    
    try {
        $result = code --install-extension $ext.id 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Installed: $($ext.name)" -ForegroundColor Green
            $installed++
        } else {
            # 既にインストール済みの可能性
            if ($result -match "already installed" -or $result -match "is already installed") {
                Write-Host "  ⊙ Already installed: $($ext.name)" -ForegroundColor Cyan
                $skipped++
            } else {
                Write-Host "  ✗ Failed: $($ext.name)" -ForegroundColor Red
                Write-Host "    Error: $result" -ForegroundColor Red
                $failed++
            }
        }
    } catch {
        Write-Host "  ✗ Error installing $($ext.name): $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Installation Results" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installed: $installed" -ForegroundColor Green
Write-Host "Already installed: $skipped" -ForegroundColor Cyan
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All extensions installed successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart Cursor" -ForegroundColor Cyan
    Write-Host "2. Check extension settings" -ForegroundColor Cyan
    Write-Host "3. See docs/setup/CURSOR_EXTENSIONS_PERFORMANCE.md for details" -ForegroundColor Cyan
} else {
    Write-Host "Some extensions failed to install" -ForegroundColor Yellow
    Write-Host "Please install them manually" -ForegroundColor Yellow
}

Write-Host ""

