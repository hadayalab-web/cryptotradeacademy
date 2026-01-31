@echo off
chcp 65001 >nul
echo ========================================
echo インフルエンサー発見（EN言語）
echo ========================================
node scripts/discover-influencers-single-lang-robust.js en 210
pause
