# Cursor Extensions Optimization Script
# Remove unnecessary extensions and install recommended ones

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cursor Extensions Optimization" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Remove unnecessary extensions (duplicates and low usage)
$extensionsToRemove = @(
    @{ id = "wayou.vscode-todo-highlight"; name = "TODO Highlight"; reason = "Duplicate of Todo Tree" },
    @{ id = "humao.rest-client"; name = "REST Client"; reason = "Duplicate of Thunder Client" },
    @{ id = "shardulm94.trailing-spaces"; name = "Trailing Spaces"; reason = "Can be handled by Prettier" },
    @{ id = "adpyke.codesnap"; name = "CodeSnap"; reason = "Low usage frequency" },
    @{ id = "vsls-contrib.codetour"; name = "Code Tour"; reason = "Low usage frequency" },
    @{ id = "xyz.local-history"; name = "Local History"; reason = "Can be handled by Git" },
    @{ id = "pflannery.vscode-versionlens"; name = "Version Lens"; reason = "Low usage frequency" },
    @{ id = "aaron-bond.better-comments"; name = "Better Comments"; reason = "Low usage frequency" }
)

# Add recommended extensions (performance improvement)
$extensionsToAdd = @(
    @{ id = "usernamehw.errorlens"; name = "Error Lens"; priority = "High"; reason = "Priority 1 - Required" },
    @{ id = "christian-kohler.path-intellisense"; name = "Path Intellisense"; priority = "High"; reason = "Priority 2" },
    @{ id = "formulahendry.auto-rename-tag"; name = "Auto Rename Tag"; priority = "High"; reason = "Priority 2" },
    @{ id = "dbaeumer.vscode-eslint"; name = "ESLint"; priority = "High"; reason = "Priority 2" },
    @{ id = "esbenp.prettier-vscode"; name = "Prettier"; priority = "High"; reason = "Priority 2" },
    @{ id = "eamodio.gitlens"; name = "GitLens"; priority = "High"; reason = "Priority 2" },
    @{ id = "alefragnani.project-manager"; name = "Project Manager"; priority = "High"; reason = "Priority 2" },
    @{ id = "formulahendry.code-runner"; name = "Code Runner"; priority = "Medium"; reason = "Priority 3" },
    @{ id = "alefragnani.bookmarks"; name = "Bookmarks"; priority = "Medium"; reason = "Priority 3" },
    @{ id = "gruntfuggly.todo-tree"; name = "Todo Tree"; priority = "Medium"; reason = "Priority 3" },
    @{ id = "rangav.vscode-thunder-client"; name = "Thunder Client"; priority = "Medium"; reason = "REST API testing" },
    @{ id = "oderwat.indent-rainbow"; name = "Indent Rainbow"; priority = "Low"; reason = "Indent visualization" },
    @{ id = "wix.vscode-import-cost"; name = "Import Cost"; priority = "Low"; reason = "Import size display" }
)

# 現在インストールされている拡張機能を確認
Write-Host "[Step 1] Checking installed extensions..." -ForegroundColor Yellow
$installedExtensions = @()
try {
    $cursorExts = cursor --list-extensions 2>&1
    if ($cursorExts -and $cursorExts.Count -gt 0) {
        foreach ($ext in $cursorExts) {
            if ($ext -and $ext.Trim()) {
                $installedExtensions += $ext.Trim()
            }
        }
    }
} catch {
    Write-Host "  cursor CLI not available, trying code CLI..." -ForegroundColor Yellow
    try {
        $codeExts = code --list-extensions 2>&1
        if ($codeExts -and $codeExts.Count -gt 0) {
            foreach ($ext in $codeExts) {
                if ($ext -and $ext.Trim()) {
                    $installedExtensions += $ext.Trim()
                }
            }
        }
    } catch {
        Write-Host "  CLI not available, skipping check" -ForegroundColor Yellow
    }
}

Write-Host "  Found $($installedExtensions.Count) installed extensions" -ForegroundColor Green
Write-Host ""

# Step 2: 不要な拡張機能を削除
Write-Host "[Step 2] Removing unnecessary extensions..." -ForegroundColor Yellow
$removedCount = 0
$skippedRemove = 0

foreach ($ext in $extensionsToRemove) {
    if ($installedExtensions -contains $ext.id) {
        Write-Host "  Removing: $($ext.name) ($($ext.id))" -ForegroundColor Yellow
        Write-Host "    Reason: $($ext.reason)" -ForegroundColor Gray
        
        try {
            $result = cursor --uninstall-extension $ext.id 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✓ Removed: $($ext.name)" -ForegroundColor Green
                $removedCount++
            } else {
                # Try code CLI as fallback
                $result = code --uninstall-extension $ext.id 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "    ✓ Removed: $($ext.name)" -ForegroundColor Green
                    $removedCount++
                } else {
                    Write-Host "    ⊙ Already removed or not found: $($ext.name)" -ForegroundColor Cyan
                    $skippedRemove++
                }
            }
        } catch {
            Write-Host "    ✗ Failed to remove: $($ext.name)" -ForegroundColor Red
            Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⊙ Not installed: $($ext.name)" -ForegroundColor Cyan
        $skippedRemove++
    }
    Write-Host ""
}

# Step 3: 必要な拡張機能を追加
Write-Host "[Step 3] Installing recommended extensions..." -ForegroundColor Yellow
$installedCount = 0
$skippedAdd = 0
$failedCount = 0

foreach ($ext in $extensionsToAdd) {
    if ($installedExtensions -contains $ext.id) {
        Write-Host "  ⊙ Already installed: $($ext.name)" -ForegroundColor Cyan
        $skippedAdd++
    } else {
        Write-Host "  Installing: $($ext.name) ($($ext.id))" -ForegroundColor Yellow
        Write-Host "    Priority: $($ext.priority) | Reason: $($ext.reason)" -ForegroundColor Gray
        
        try {
            $result = cursor --install-extension $ext.id 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✓ Installed: $($ext.name)" -ForegroundColor Green
                $installedCount++
            } else {
                # Try code CLI as fallback
                $result = code --install-extension $ext.id 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "    ✓ Installed: $($ext.name)" -ForegroundColor Green
                    $installedCount++
                } else {
                    if ($result -match "already installed" -or $result -match "is already installed") {
                        Write-Host "    ⊙ Already installed: $($ext.name)" -ForegroundColor Cyan
                        $skippedAdd++
                    } else {
                        Write-Host "    ✗ Failed: $($ext.name)" -ForegroundColor Red
                        Write-Host "      Error: $result" -ForegroundColor Red
                        $failedCount++
                    }
                }
            }
        } catch {
            Write-Host "    ✗ Error installing $($ext.name): $($_.Exception.Message)" -ForegroundColor Red
            $failedCount++
        }
    }
    Write-Host ""
}

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Optimization Results" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Removed: $removedCount" -ForegroundColor $(if ($removedCount -gt 0) { "Green" } else { "Gray" })
Write-Host "Skipped (remove): $skippedRemove" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installed: $installedCount" -ForegroundColor $(if ($installedCount -gt 0) { "Green" } else { "Gray" })
Write-Host "Already installed: $skippedAdd" -ForegroundColor Cyan
Write-Host "Failed: $failedCount" -ForegroundColor $(if ($failedCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($failedCount -eq 0 -and $removedCount -ge 0) {
    Write-Host "Optimization completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Restart Cursor" -ForegroundColor White
    Write-Host "  2. Check extension settings" -ForegroundColor White
    Write-Host "  3. Enable Extension Monitor to check resource usage" -ForegroundColor White
} else {
    Write-Host "Some operations failed. Please check the errors above." -ForegroundColor Yellow
}

Write-Host ""
