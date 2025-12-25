# Merge Strategic SSOT and Technical Supplement into Complete SSOT v5.0

$strategicPath = "CryptoTrade Academy - Strategic SSOT v4.0 ULTIMATE.md"
$technicalPath = "CryptoTrade Academy - Technical Supplement v2.0.md"
$outputPath = "CryptoTrade Academy - Complete SSOT v5.0.md"

$strategic = Get-Content $strategicPath -Raw -Encoding UTF8
$technical = Get-Content $technicalPath -Raw -Encoding UTF8

# Find Section 5 in Strategic SSOT (try multiple patterns)
$section5Index = $strategic.IndexOf('## 📖 Section 5:')
if ($section5Index -lt 0) {
    $section5Index = $strategic.IndexOf('Section 5: 参照')
}
if ($section5Index -lt 0) {
    Write-Host "Error: Section 5 not found in Strategic SSOT"
    Write-Host "File length: $($strategic.Length)"
    exit 1
}
Write-Host "Found Section 5 at index: $section5Index"

# Split Strategic SSOT at Section 5
$beforeSection5 = $strategic.Substring(0, $section5Index).TrimEnd()
$afterSection5 = $strategic.Substring($section5Index).TrimStart()

# Clean Technical Supplement header
$techContent = $technical
# Remove header lines
$techContent = $techContent -replace '# 🛠️ CryptoTrade Academy - Technical Supplement v2\.0\s*\n\s*\*\*Version\*\*.*?\*\*\*\s*\n', ''
# Remove Section 0 (positioning section)
$techContent = $techContent -replace '## 📌 Section 0: このドキュメントの位置づけ.*?\*\*\*\s*\n', ''

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

# Update title and version
$beforeSection5 = $beforeSection5 -replace '# 🎯 CryptoTrade Academy - Strategic SSOT v4\.0 ULTIMATE', '# 🎯 CryptoTrade Academy - Complete SSOT v5.0'
$beforeSection5 = $beforeSection5 -replace '\*\*Version\*\*: 4\.0 ULTIMATE', '**Version**: 5.0 COMPLETE - Strategic & Technical統合版'

# Combine all parts
$combined = $beforeSection5 + "`n`n***`n`n" + $techContent.Trim() + "`n`n***`n`n" + $afterSection5

# Update final section reference
$combined = $combined -replace '# 🎯 Strategic SSOT v4\.0 完成', '# 🎯 Complete SSOT v5.0 完成'

# Write output
[System.IO.File]::WriteAllText($outputPath, $combined, [System.Text.Encoding]::UTF8)

Write-Host "Complete SSOT v5.0 created successfully: $outputPath"
Write-Host "Size: $((Get-Item $outputPath).Length) bytes"

