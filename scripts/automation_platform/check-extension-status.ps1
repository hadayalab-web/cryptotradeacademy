# Check Extension Monitor and Extension Status
# Cursor Extensions Status Check

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cursor Extension Monitor & Status Check" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Extension Monitor Configuration
Write-Host "[1] Extension Monitor Configuration" -ForegroundColor Yellow
$cursorSettingsPath = "$env:APPDATA\Cursor\User\settings.json"
if (Test-Path $cursorSettingsPath) {
    try {
        $settings = Get-Content $cursorSettingsPath -Raw | ConvertFrom-Json
        if ($settings.extensionMonitor -and $settings.extensionMonitor.enabled) {
            Write-Host "  ✓ Extension Monitor: ENABLED" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Extension Monitor: DISABLED" -ForegroundColor Red
            Write-Host "    → Enable in Settings > Application > Experimental" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ⊙ Could not read settings: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⊙ Settings file not found" -ForegroundColor Yellow
}
Write-Host ""

# Check Installed Extensions
Write-Host "[2] Installed Extensions Check" -ForegroundColor Yellow
$extensions = @()
try {
    $extList = code --list-extensions 2>&1
    if ($extList) {
        $extensions = $extList | Where-Object { $_ -and $_.Trim() }
        Write-Host "  ✓ Total installed: $($extensions.Count)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⊙ Could not retrieve extension list via CLI" -ForegroundColor Yellow
}

# Check Key Extensions
Write-Host ""
Write-Host "[3] Key Extensions Status" -ForegroundColor Yellow
$keyExts = @{
    "Error Lens" = "usernamehw.errorlens"
    "GitLens" = "eamodio.gitlens"
    "Prettier" = "esbenp.prettier-vscode"
    "ESLint" = "dbaeumer.vscode-eslint"
    "Import Cost" = "wix.vscode-import-cost"
    "Todo Tree" = "gruntfuggly.todo-tree"
    "Path Intellisense" = "christian-kohler.path-intellisense"
    "Auto Rename Tag" = "formulahendry.auto-rename-tag"
    "Code Runner" = "formulahendry.code-runner"
    "Bookmarks" = "alefragnani.bookmarks"
    "Project Manager" = "alefragnani.project-manager"
    "Thunder Client" = "rangav.vscode-thunder-client"
}

$installedCount = 0
$missingCount = 0

foreach ($name in $keyExts.Keys) {
    $extId = $keyExts[$name]
    if ($extensions -contains $extId) {
        Write-Host "  ✓ $name" -ForegroundColor Green
        $installedCount++
    } else {
        Write-Host "  ✗ $name (not installed)" -ForegroundColor Red
        $missingCount++
    }
}

Write-Host ""
Write-Host "  Summary: $installedCount installed, $missingCount missing" -ForegroundColor $(if ($missingCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

# Check Extension Directories
Write-Host "[4] Extension Directories Check" -ForegroundColor Yellow
$extensionsPath = "$env:USERPROFILE\.cursor\extensions"
if (Test-Path $extensionsPath) {
    $extDirs = Get-ChildItem $extensionsPath -Directory -ErrorAction SilentlyContinue
    Write-Host "  ✓ Found $($extDirs.Count) extension directories" -ForegroundColor Green
    
    # Check for large extensions (potential performance impact)
    Write-Host ""
    Write-Host "  Large Extensions (>10MB):" -ForegroundColor Yellow
    $largeExts = $extDirs | ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        if ($size -gt 10) {
            [PSCustomObject]@{ Name = $_.Name; SizeMB = [math]::Round($size, 2) }
        }
    } | Sort-Object SizeMB -Descending
    
    if ($largeExts) {
        foreach ($ext in $largeExts) {
            Write-Host "    - $($ext.Name): $($ext.SizeMB) MB" -ForegroundColor White
        }
    } else {
        Write-Host "    (none found)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⊙ Extensions directory not found" -ForegroundColor Yellow
}
Write-Host ""

# Check Settings Configuration
Write-Host "[5] Extension Settings Configuration" -ForegroundColor Yellow
if (Test-Path $cursorSettingsPath) {
    try {
        $settings = Get-Content $cursorSettingsPath -Raw | ConvertFrom-Json
        
        $configChecks = @(
            @{ Key = "errorLens.enabled"; Name = "Error Lens Enabled"; Expected = $true },
            @{ Key = "gitlens.codeLens.enabled"; Name = "GitLens CodeLens"; Expected = $false },
            @{ Key = "editor.defaultFormatter"; Name = "Default Formatter"; Expected = "esbenp.prettier-vscode" },
            @{ Key = "editor.formatOnSave"; Name = "Format On Save"; Expected = $true }
        )
        
        foreach ($check in $configChecks) {
            $value = $settings.($check.Key)
            if ($null -ne $value) {
                if ($value -eq $check.Expected) {
                    Write-Host "  ✓ $($check.Name): $value" -ForegroundColor Green
                } else {
                    Write-Host "  ⊙ $($check.Name): $value (expected: $($check.Expected))" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  ⊙ $($check.Name): not configured" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  ⊙ Could not read settings" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Extension Monitor:" -ForegroundColor Yellow
if ($settings.extensionMonitor -and $settings.extensionMonitor.enabled) {
    Write-Host "  Status: ENABLED ✓" -ForegroundColor Green
    Write-Host "  → Open: Ctrl+Shift+P > 'Developer: Open Extension Monitor'" -ForegroundColor White
} else {
    Write-Host "  Status: DISABLED ✗" -ForegroundColor Red
    Write-Host "  → Enable in Settings > Application > Experimental" -ForegroundColor White
}
Write-Host ""
Write-Host "Key Extensions:" -ForegroundColor Yellow
Write-Host "  Installed: $installedCount / $($keyExts.Count)" -ForegroundColor $(if ($installedCount -eq $keyExts.Count) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Restart Cursor if settings were changed" -ForegroundColor White
Write-Host "  2. Open Extension Monitor to check resource usage" -ForegroundColor White
Write-Host "  3. Review large extensions for potential optimization" -ForegroundColor White
Write-Host ""
