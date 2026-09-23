# Cursor Extensions List Script
# Lists all installed extensions in Cursor

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cursor Installed Extensions" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Try multiple methods to get extensions
$extensions = @()

# Method 1: Try cursor CLI command
Write-Host "[Method 1] Trying cursor --list-extensions..." -ForegroundColor Yellow
try {
    $cursorExts = cursor --list-extensions 2>&1
    if ($cursorExts -and $cursorExts.Count -gt 0) {
        foreach ($ext in $cursorExts) {
            if ($ext -and $ext.Trim()) {
                $extensions += $ext.Trim()
            }
        }
        Write-Host "  Found $($extensions.Count) extensions via cursor CLI" -ForegroundColor Green
    }
} catch {
    Write-Host "  cursor CLI not available or failed" -ForegroundColor Yellow
}

# Method 2: Try code CLI command (VS Code compatible)
if ($extensions.Count -eq 0) {
    Write-Host "[Method 2] Trying code --list-extensions..." -ForegroundColor Yellow
    try {
        $codeExts = code --list-extensions 2>&1
        if ($codeExts -and $codeExts.Count -gt 0) {
            foreach ($ext in $codeExts) {
                if ($ext -and $ext.Trim()) {
                    $extensions += $ext.Trim()
                }
            }
            Write-Host "  Found $($extensions.Count) extensions via code CLI" -ForegroundColor Green
        }
    } catch {
        Write-Host "  code CLI not available or failed" -ForegroundColor Yellow
    }
}

# Method 3: Read from extensions directory
if ($extensions.Count -eq 0) {
    Write-Host "[Method 3] Reading from extensions directory..." -ForegroundColor Yellow
    $extPaths = @(
        "$env:USERPROFILE\.cursor\extensions",
        "$env:APPDATA\Cursor\User\extensions",
        "$env:LOCALAPPDATA\Programs\Cursor\resources\app\extensions"
    )
    
    foreach ($extPath in $extPaths) {
        if (Test-Path $extPath) {
            Write-Host "  Checking: $extPath" -ForegroundColor Cyan
            $dirs = Get-ChildItem $extPath -Directory -ErrorAction SilentlyContinue
            Write-Host "    Found $($dirs.Count) directories" -ForegroundColor White
            
            foreach ($dir in $dirs) {
                $manifestPath = Join-Path $dir.FullName "package.json"
                if (Test-Path $manifestPath) {
                    try {
                        $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
                        if ($manifest.publisher -and $manifest.name) {
                            $extId = "$($manifest.publisher).$($manifest.name)"
                            if (-not $extensions.Contains($extId)) {
                                $extensions += $extId
                            }
                        }
                    } catch {
                        # Skip invalid manifests
                    }
                }
            }
        }
    }
    
    if ($extensions.Count -gt 0) {
        Write-Host "  Found $($extensions.Count) extensions from directories" -ForegroundColor Green
    }
}

# Display results
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Installed Extensions ($($extensions.Count) total)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($extensions.Count -eq 0) {
    Write-Host "No extensions found. This might be because:" -ForegroundColor Yellow
    Write-Host "  1. Extensions are stored in a different location" -ForegroundColor White
    Write-Host "  2. Cursor needs to be restarted" -ForegroundColor White
    Write-Host "  3. Extensions are managed differently in this Cursor installation" -ForegroundColor White
    Write-Host ""
    Write-Host "You can check manually:" -ForegroundColor Yellow
    Write-Host "  - Open Cursor" -ForegroundColor White
    Write-Host "  - Press Ctrl+Shift+X (Extensions view)" -ForegroundColor White
    Write-Host "  - Click '...' menu > 'Show Installed Extensions'" -ForegroundColor White
} else {
    # Sort extensions
    $extensions = $extensions | Sort-Object
    
    # Group by category (if we can identify them)
    Write-Host "All Extensions:" -ForegroundColor Yellow
    Write-Host ""
    
    $index = 1
    foreach ($ext in $extensions) {
        Write-Host "$index. $ext" -ForegroundColor White
        $index++
    }
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "Extension IDs (for reference)" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host ($extensions -join "`n") -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Done" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Save to file
$outputFile = Join-Path $PSScriptRoot "..\docs\CURSOR_INSTALLED_EXTENSIONS_CURRENT.md"
$outputContent = @"
# Cursor Installed Extensions (Current)

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Total**: $($extensions.Count) extensions

## Extension List

"@

foreach ($ext in $extensions) {
    $outputContent += "- $ext`n"
}

$outputContent += @"

## Notes

- This list is generated automatically
- Extensions may be installed but not listed if stored in non-standard locations
- Check Cursor's Extensions view (Ctrl+Shift+X) for the most accurate list

"@

try {
    $outputContent | Set-Content -Path $outputFile -Encoding UTF8
    Write-Host "Saved to: $outputFile" -ForegroundColor Green
} catch {
    Write-Host "Failed to save to file: $($_.Exception.Message)" -ForegroundColor Yellow
}
