# Enable Extension Monitor and Configure Extension Settings
# Cursor Extensions Optimization

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cursor Extension Monitor & Settings Configuration" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Cursor settings file path
$cursorSettingsPath = "$env:APPDATA\Cursor\User\settings.json"
$settingsDir = Split-Path $cursorSettingsPath -Parent

# Ensure settings directory exists
if (-not (Test-Path $settingsDir)) {
    Write-Host "[INFO] Creating settings directory: $settingsDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
}

# Read existing settings or create new
$settings = @{}
if (Test-Path $cursorSettingsPath) {
    Write-Host "[INFO] Reading existing settings..." -ForegroundColor Yellow
    try {
        $settingsJson = Get-Content $cursorSettingsPath -Raw -Encoding UTF8
        $settings = $settingsJson | ConvertFrom-Json -AsHashtable
        Write-Host "[OK] Settings loaded" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Failed to parse settings, creating new: $($_.Exception.Message)" -ForegroundColor Yellow
        $settings = @{}
    }
} else {
    Write-Host "[INFO] Settings file not found, creating new one..." -ForegroundColor Yellow
}

Write-Host ""

# Step 1: Enable Extension Monitor
Write-Host "[Step 1] Enabling Extension Monitor..." -ForegroundColor Yellow

if (-not $settings.ContainsKey("extensionMonitor")) {
    $settings["extensionMonitor"] = @{}
}
if (-not $settings["extensionMonitor"].ContainsKey("enabled")) {
    $settings["extensionMonitor"]["enabled"] = $true
} else {
    $settings["extensionMonitor"]["enabled"] = $true
}

Write-Host "  ✓ Extension Monitor: Enabled" -ForegroundColor Green
Write-Host ""

# Step 2: Configure Error Lens
Write-Host "[Step 2] Configuring Error Lens..." -ForegroundColor Yellow

$errorLensSettings = @{
    "errorLens.enabled" = $true
    "errorLens.enabledDiagnosticLevels" = @("error", "warning")
    "errorLens.followCursor" = "activeLine"
    "errorLens.delay" = 500
}

foreach ($key in $errorLensSettings.Keys) {
    $settings[$key] = $errorLensSettings[$key]
    Write-Host "  ✓ $key = $($errorLensSettings[$key])" -ForegroundColor Green
}
Write-Host ""

# Step 3: Configure GitLens (Performance Optimization)
Write-Host "[Step 3] Configuring GitLens (Performance Optimization)..." -ForegroundColor Yellow

$gitLensSettings = @{
    "gitlens.codeLens.enabled" = $false
    "gitlens.currentLine.enabled" = $false
    "gitlens.hovers.enabled" = $true
    "gitlens.statusBar.enabled" = $true
    "gitlens.advanced.messages" = @{
        "suppressCommitHasNoPreviousCommitWarning" = $true
        "suppressCommitNotFoundWarning" = $true
        "suppressFileNotUnderSourceControlWarning" = $true
    }
}

foreach ($key in $gitLensSettings.Keys) {
    if ($gitLensSettings[$key] -is [Hashtable]) {
        $settings[$key] = $gitLensSettings[$key]
    } else {
        $settings[$key] = $gitLensSettings[$key]
    }
    Write-Host "  ✓ $key = $($gitLensSettings[$key])" -ForegroundColor Green
}
Write-Host ""

# Step 4: Configure Prettier
Write-Host "[Step 4] Configuring Prettier..." -ForegroundColor Yellow

$prettierSettings = @{
    "editor.defaultFormatter" = "esbenp.prettier-vscode"
    "editor.formatOnSave" = $true
    "editor.formatOnPaste" = $false
    "prettier.requireConfig" = $false
}

foreach ($key in $prettierSettings.Keys) {
    $settings[$key] = $prettierSettings[$key]
    Write-Host "  ✓ $key = $($prettierSettings[$key])" -ForegroundColor Green
}
Write-Host ""

# Step 5: Configure ESLint
Write-Host "[Step 5] Configuring ESLint..." -ForegroundColor Yellow

$eslintSettings = @{
    "editor.codeActionsOnSave" = @{
        "source.fixAll.eslint" = $true
    }
    "eslint.validate" = @("javascript", "javascriptreact", "typescript", "typescriptreact")
    "eslint.format.enable" = $true
}

foreach ($key in $eslintSettings.Keys) {
    if ($eslintSettings[$key] -is [Hashtable]) {
        $settings[$key] = $eslintSettings[$key]
    } else {
        $settings[$key] = $eslintSettings[$key]
    }
    Write-Host "  ✓ $key configured" -ForegroundColor Green
}
Write-Host ""

# Step 6: Configure Import Cost
Write-Host "[Step 6] Configuring Import Cost..." -ForegroundColor Yellow

$importCostSettings = @{
    "importCost.smallPackageSize" = 50
    "importCost.mediumPackageSize" = 100
    "importCost.showCalculatingDecoration" = $false
}

foreach ($key in $importCostSettings.Keys) {
    $settings[$key] = $importCostSettings[$key]
    Write-Host "  ✓ $key = $($importCostSettings[$key])" -ForegroundColor Green
}
Write-Host ""

# Step 7: Configure Todo Tree
Write-Host "[Step 7] Configuring Todo Tree..." -ForegroundColor Yellow

$todoTreeSettings = @{
    "todo-tree.regex.regex" = "((//|#|<!--|;|/\\*|^)\\s*($TAGS)|^\\s*- \\[ \\])"
    "todo-tree.highlights.customHighlight" = @{
        "TODO" = @{
            "icon" = "check"
            "type" = "text"
        }
        "FIXME" = @{
            "icon" = "flame"
            "type" = "text"
        }
    }
}

foreach ($key in $todoTreeSettings.Keys) {
    if ($todoTreeSettings[$key] -is [Hashtable]) {
        $settings[$key] = $todoTreeSettings[$key]
    } else {
        $settings[$key] = $todoTreeSettings[$key]
    }
    Write-Host "  ✓ $key configured" -ForegroundColor Green
}
Write-Host ""

# Step 8: Performance Optimization Settings
Write-Host "[Step 8] Configuring Performance Optimization Settings..." -ForegroundColor Yellow

$performanceSettings = @{
    "files.watcherExclude" = @{
        "**/.git/objects/**" = $true
        "**/.git/subtree-cache/**" = $true
        "**/node_modules/**" = $true
        "**/.hg/store/**" = $true
        "**/dist/**" = $true
        "**/build/**" = $true
    }
    "search.exclude" = @{
        "**/node_modules" = $true
        "**/bower_components" = $true
        "**/*.code-search" = $true
        "**/dist" = $true
        "**/build" = $true
        "**/.git" = $true
    }
    "extensions.ignoreRecommendations" = $false
    "extensions.autoCheckUpdates" = $true
    "extensions.autoUpdate" = $false
}

foreach ($key in $performanceSettings.Keys) {
    if ($performanceSettings[$key] -is [Hashtable]) {
        $settings[$key] = $performanceSettings[$key]
    } else {
        $settings[$key] = $performanceSettings[$key]
    }
    Write-Host "  ✓ $key configured" -ForegroundColor Green
}
Write-Host ""

# Save settings
Write-Host "[Step 9] Saving settings..." -ForegroundColor Yellow

try {
    # Convert hashtable to JSON with proper formatting
    $jsonContent = $settings | ConvertTo-Json -Depth 10
    
    # Write to file with UTF-8 encoding (without BOM)
    [System.IO.File]::WriteAllText($cursorSettingsPath, $jsonContent, [System.Text.UTF8Encoding]::new($false))
    
    Write-Host "[OK] Settings saved to: $cursorSettingsPath" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to save settings: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configured Settings:" -ForegroundColor Cyan
Write-Host "  ✓ Extension Monitor: Enabled" -ForegroundColor White
Write-Host "  ✓ Error Lens: Configured" -ForegroundColor White
Write-Host "  ✓ GitLens: Optimized for performance" -ForegroundColor White
Write-Host "  ✓ Prettier: Set as default formatter" -ForegroundColor White
Write-Host "  ✓ ESLint: Auto-fix on save enabled" -ForegroundColor White
Write-Host "  ✓ Import Cost: Configured" -ForegroundColor White
Write-Host "  ✓ Todo Tree: Configured" -ForegroundColor White
Write-Host "  ✓ Performance: File watcher and search optimized" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Restart Cursor to apply all settings" -ForegroundColor White
Write-Host "  2. Open Extension Monitor: Ctrl+Shift+P > 'Developer: Open Extension Monitor'" -ForegroundColor White
Write-Host "  3. Check extension resource usage" -ForegroundColor White
Write-Host ""
