@echo off
cd /d "%~dp0\.."
node scripts\analyze_logs.js
pause
