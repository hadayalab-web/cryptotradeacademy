@echo off
cd /d "%~dp0\.."
echo ========================================
echo インフルエンサーストック更新（全言語）
echo ========================================
echo.
node scripts/update-influencer-stock.js --all
echo.
pause
