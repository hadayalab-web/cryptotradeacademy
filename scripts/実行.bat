@echo off
chcp 65001 >nul
node scripts/emergency-fetch-and-save-all.js
pause
