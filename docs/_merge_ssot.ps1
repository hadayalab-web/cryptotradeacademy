# Merge Strategic SSOT and Technical Supplement into Complete SSOT v5.0
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$strategicPath = "CryptoTrade Academy - Strategic SSOT v4.0 ULTIMATE.md"
$technicalPath = "CryptoTrade Academy - Technical Supplement v2.0.md"
$outputPath = "CryptoTrade Academy - Complete SSOT v5.0.md"

# Read files with UTF8 encoding
$strategic = [System.IO.File]::ReadAllText((Resolve-Path $strategicPath), [System.Text.Encoding]::UTF8)
$technical = [System.IO.File]::ReadAllText((Resolve-Path $technicalPath), [System.Text.Encoding]::UTF8)

Write-Host "Strategic SSOT size: $($strategic.Length) chars"
Write-Host "Technical Supplement size: $($technical.Length) chars"

# Find Section 5 in Strategic SSOT
$section5Marker = '## 📖 Section 5:'
$section5Index = $strategic.IndexOf($section5Marker)

if ($section5Index -lt 0) {
    Write-Host "ERROR: Section 5 marker not found"
    Write-Host "Searching for alternative patterns..."
    $alt1 = $strategic.IndexOf('Section 5:')
    Write-Host "Found 'Section 5:' at: $alt1"
    exit 1
}

Write-Host "Found Section 5 at index: $section5Index"

# Split Strategic SSOT at Section 5
$beforeSection5 = $strategic.Substring(0, $section5Index).TrimEnd()
$afterSection5 = $strategic.Substring($section5Index).TrimStart()

# Update title and version in beforeSection5
$beforeSection5 = $beforeSection5 -replace '# 🎯 CryptoTrade Academy - Strategic SSOT v4\.0 ULTIMATE', '# 🎯 CryptoTrade Academy - Complete SSOT v5.0'
$beforeSection5 = $beforeSection5 -replace '\*\*Version\*\*: 4\.0 ULTIMATE - 木下ロジック①②完全統合 \+ イベント駆動実装', '**Version**: 5.0 COMPLETE - Strategic & Technical統合版'

# Clean Technical Supplement
# Find where actual content starts (after header and Section 0)
$techStart = $technical.IndexOf('## 📂 Section 1:')
if ($techStart -lt 0) {
    $techStart = 0
}
$techContent = $technical.Substring($techStart)

# Renumber Technical Supplement sections
$techContent = $techContent -replace '## 📂 Section 1:', '## 📂 Section 5:'
$techContent = $techContent -replace '## 🔧 Section 2:', '## 🔧 Section 6:'
$techContent = $techContent -replace '## 🔌 Section 3:', '## 🔌 Section 7:'
$techContent = $techContent -replace '## ⚙️ Section 4:', '## ⚙️ Section 8:'
$techContent = $techContent -replace '## 🎯 Section 5:', '## 🎯 Section 9:'
$techContent = $techContent -replace '## 📊 Section 6:', '## 📊 Section 10:'
$techContent = $techContent -replace '## 🚫 Section 7:', '## 🚫 Section 11:'
$techContent = $techContent -replace '## ✅ Section 8:', '## 📖 Section 12:'

# Renumber remaining Strategic SSOT sections
$afterSection5 = $afterSection5 -replace '## 📖 Section 5:', '## 📖 Section 13:'
$afterSection5 = $afterSection5 -replace '# 🎯 Strategic SSOT v4\.0 完成', '# 🎯 Complete SSOT v5.0 完成'

# Combine all parts
$combined = $beforeSection5 + "`n`n***`n`n" + $techContent.Trim() + "`n`n***`n`n" + $afterSection5

# Write output with UTF8 encoding
[System.IO.File]::WriteAllText((Resolve-Path .).Path + "\" + $outputPath, $combined, [System.Text.Encoding]::UTF8)

$outputFile = Get-Item $outputPath -ErrorAction SilentlyContinue
if ($outputFile) {
    Write-Host "SUCCESS: Complete SSOT v5.0 created"
    Write-Host "Output file: $($outputFile.FullName)"
    Write-Host "Size: $($outputFile.Length) bytes"
    Write-Host "Lines: $((Get-Content $outputFile.FullName | Measure-Object -Line).Lines)"
} else {
    Write-Host "ERROR: Output file not created"
}





