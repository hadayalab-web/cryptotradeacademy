# -*- coding: utf-8 -*-
"""Merge Strategic SSOT v4.0 and Technical Supplement v2.0 into Complete SSOT v5.0"""

import sys
import os

def merge_ssot():
    strategic_path = "CryptoTrade Academy - Strategic SSOT v4.0 ULTIMATE.md"
    technical_path = "CryptoTrade Academy - Technical Supplement v2.0.md"
    output_path = "CryptoTrade Academy - Complete SSOT v5.0.md"

    # Read files with UTF-8 encoding
    with open(strategic_path, 'r', encoding='utf-8') as f:
        strategic = f.read()

    with open(technical_path, 'r', encoding='utf-8') as f:
        technical = f.read()

    print(f"Strategic SSOT size: {len(strategic)} chars")
    print(f"Technical Supplement size: {len(technical)} chars")

    # Find Section 5 in Strategic SSOT
    section5_marker = '## 📖 Section 5:'
    section5_index = strategic.find(section5_marker)

    if section5_index < 0:
        print("ERROR: Section 5 marker not found in Strategic SSOT")
        return False

    print(f"Found Section 5 at index: {section5_index}")

    # Split Strategic SSOT at Section 5
    before_section5 = strategic[:section5_index].rstrip()
    after_section5 = strategic[section5_index:].lstrip()

    # Update title and version in beforeSection5
    before_section5 = before_section5.replace(
        '# 🎯 CryptoTrade Academy - Strategic SSOT v4.0 ULTIMATE',
        '# 🎯 CryptoTrade Academy - Complete SSOT v5.0'
    )
    before_section5 = before_section5.replace(
        '**Version**: 4.0 ULTIMATE - 木下ロジック①②完全統合 + イベント駆動実装',
        '**Version**: 5.0 COMPLETE - Strategic & Technical統合版'
    )

    # Clean Technical Supplement
    # Remove header lines (find where Section 1 starts)
    tech_section1_start = technical.find('## 📂 Section 1:')
    if tech_section1_start < 0:
        tech_section1_start = 0

    tech_content = technical[tech_section1_start:]

    # Renumber Technical Supplement sections
    tech_content = tech_content.replace('## 📂 Section 1:', '## 📂 Section 5:')
    tech_content = tech_content.replace('## 🔧 Section 2:', '## 🔧 Section 6:')
    tech_content = tech_content.replace('## 🔌 Section 3:', '## 🔌 Section 7:')
    tech_content = tech_content.replace('## ⚙️ Section 4:', '## ⚙️ Section 8:')
    tech_content = tech_content.replace('## 🎯 Section 5:', '## 🎯 Section 9:')
    tech_content = tech_content.replace('## 📊 Section 6:', '## 📊 Section 10:')
    tech_content = tech_content.replace('## 🚫 Section 7:', '## 🚫 Section 11:')
    tech_content = tech_content.replace('## ✅ Section 8:', '## 📖 Section 12:')

    # Renumber remaining Strategic SSOT sections
    after_section5 = after_section5.replace('## 📖 Section 5:', '## 📖 Section 13:')
    after_section5 = after_section5.replace('# 🎯 Strategic SSOT v4.0 完成', '# 🎯 Complete SSOT v5.0 完成')

    # Combine all parts
    combined = before_section5 + "\n\n***\n\n" + tech_content.strip() + "\n\n***\n\n" + after_section5

    # Write output with UTF-8 encoding
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(combined)

    # Verify output
    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        with open(output_path, 'r', encoding='utf-8') as f:
            lines = len(f.readlines())
        print(f"SUCCESS: Complete SSOT v5.0 created")
        print(f"Output file: {output_path}")
        print(f"Size: {size} bytes")
        print(f"Lines: {lines}")
        return True
    else:
        print("ERROR: Output file not created")
        return False

if __name__ == '__main__':
    success = merge_ssot()
    sys.exit(0 if success else 1)









