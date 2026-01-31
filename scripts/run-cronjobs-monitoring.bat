@echo off
REM run-cronjobs-monitoring.bat
REM 14個のCronJobs本番環境監視スクリプトを実行

echo ========================================
echo 14個のCronJobs 本番環境監視
echo ========================================
echo.

cd /d "%~dp0\.."
node scripts/monitor-14-cronjobs-production.js

echo.
echo ========================================
echo 監視完了
echo ========================================
pause
