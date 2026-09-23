# Cursor Cache Cleanup Script
# Cleans up old logs, cache files, and temporary files

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cursor Cache Cleanup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Cursor directories
$cursorAppData = "$env:APPDATA\Cursor"
$cursorLocalAppData = "$env:LOCALAPPDATA\Cursor"
$cursorUserProfile = "$env:USERPROFILE\.cursor"

$totalSizeFreed = 0
$filesDeleted = 0

function Get-FolderSize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-ChildItem -Path $Path -Recurse -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum).Sum
        return $size
    }
    return 0
}

function Format-Size {
    param([long]$Size)
    if ($Size -ge 1GB) {
        return "{0:N2} GB" -f ($Size / 1GB)
    } elseif ($Size -ge 1MB) {
        return "{0:N2} MB" -f ($Size / 1MB)
    } elseif ($Size -ge 1KB) {
        return "{0:N2} KB" -f ($Size / 1KB)
    } else {
        return "$Size bytes"
    }
}

function Clean-Directory {
    param(
        [string]$Path,
        [string]$Description,
        [string[]]$ExcludePatterns = @()
    )
    
    if (-not (Test-Path $Path)) {
        Write-Host "[SKIP] $Description - Directory not found" -ForegroundColor Yellow
        return 0, 0
    }
    
    Write-Host "[CLEAN] $Description..." -ForegroundColor Yellow
    Write-Host "  Path: $Path" -ForegroundColor Gray
    
    $beforeSize = Get-FolderSize -Path $Path
    $beforeCount = (Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue).Count
    
    try {
        # Clean up cache directories
        $cacheDirs = @("Cache", "CachedData", "GPUCache", "ShaderCache", "logs", "log")
        foreach ($cacheDir in $cacheDirs) {
            $cachePath = Join-Path $Path $cacheDir
            if (Test-Path $cachePath) {
                Write-Host "  Removing: $cacheDir" -ForegroundColor Gray
                Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        
        # Clean up old log files (older than 7 days)
        $logFiles = Get-ChildItem -Path $Path -Recurse -File -Filter "*.log" -ErrorAction SilentlyContinue | 
                    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
        foreach ($logFile in $logFiles) {
            Write-Host "  Removing old log: $($logFile.Name)" -ForegroundColor Gray
            Remove-Item -Path $logFile.FullName -Force -ErrorAction SilentlyContinue
            $filesDeleted++
        }
        
        # Clean up temporary files
        $tempFiles = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue | 
                     Where-Object { 
                         $_.Extension -in @(".tmp", ".temp", ".cache") -or
                         $_.Name -like "*.tmp" -or
                         $_.Name -like "*.cache"
                     }
        foreach ($tempFile in $tempFiles) {
            Write-Host "  Removing temp file: $($tempFile.Name)" -ForegroundColor Gray
            Remove-Item -Path $tempFile.FullName -Force -ErrorAction SilentlyContinue
            $filesDeleted++
        }
        
        # Clean up old extension host logs
        $extHostLogs = Get-ChildItem -Path $Path -Recurse -File -Filter "*exthost*.log" -ErrorAction SilentlyContinue | 
                       Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
        foreach ($extHostLog in $extHostLogs) {
            Write-Host "  Removing extension host log: $($extHostLog.Name)" -ForegroundColor Gray
            Remove-Item -Path $extHostLog.FullName -Force -ErrorAction SilentlyContinue
            $filesDeleted++
        }
        
        $afterSize = Get-FolderSize -Path $Path
        $sizeFreed = $beforeSize - $afterSize
        $totalSizeFreed += $sizeFreed
        
        Write-Host "  Freed: $(Format-Size -Size $sizeFreed)" -ForegroundColor Green
        Write-Host "  Files deleted: $filesDeleted" -ForegroundColor Green
        
        return $sizeFreed, $filesDeleted
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return 0, 0
    }
}

# Check if Cursor is running
$cursorProcesses = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($cursorProcesses) {
    Write-Host "[WARNING] Cursor is currently running!" -ForegroundColor Yellow
    Write-Host "Some cache files may be locked. Close Cursor for best results." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

# Clean up directories
Write-Host "Starting cleanup..." -ForegroundColor Cyan
Write-Host ""

# AppData\Cursor
Clean-Directory -Path $cursorAppData -Description "Cursor AppData"

# LocalAppData\Cursor
Clean-Directory -Path $cursorLocalAppData -Description "Cursor LocalAppData"

# .cursor directory (MCP configs are kept)
$cursorUserPath = $cursorUserProfile
if (Test-Path $cursorUserPath) {
    Write-Host "[CLEAN] Cursor User Profile..." -ForegroundColor Yellow
    Write-Host "  Path: $cursorUserPath" -ForegroundColor Gray
    
    # Only clean cache, not config files
    $cachePath = Join-Path $cursorUserPath "cache"
    if (Test-Path $cachePath) {
        $beforeSize = Get-FolderSize -Path $cachePath
        Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
        $afterSize = 0
        $sizeFreed = $beforeSize
        $totalSizeFreed += $sizeFreed
        Write-Host "  Freed: $(Format-Size -Size $sizeFreed)" -ForegroundColor Green
    }
}

# Clean up workspace storage (old workspace data)
$workspaceStorage = Join-Path $cursorAppData "User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    Write-Host "[CLEAN] Workspace Storage..." -ForegroundColor Yellow
    $workspaces = Get-ChildItem -Path $workspaceStorage -Directory -ErrorAction SilentlyContinue
    foreach ($workspace in $workspaces) {
        # Clean workspaces not accessed in 30 days
        if ($workspace.LastWriteTime -lt (Get-Date).AddDays(-30)) {
            $size = Get-FolderSize -Path $workspace.FullName
            Remove-Item -Path $workspace.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $totalSizeFreed += $size
            $filesDeleted++
            Write-Host "  Removed old workspace: $($workspace.Name)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total size freed: $(Format-Size -Size $totalSizeFreed)" -ForegroundColor Green
Write-Host "Total files deleted: $filesDeleted" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Cursor to apply changes" -ForegroundColor Cyan
Write-Host "2. Run this script weekly to keep cache clean" -ForegroundColor Cyan
Write-Host ""




























