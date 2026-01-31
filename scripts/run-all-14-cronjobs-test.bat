@echo off
REM run-all-14-cronjobs-test.bat
REM 14個すべてのCronJobsをドライランで一括テスト実行

echo ========================================
echo 14個すべてのCronJobs ドライランテスト
echo ========================================
echo.

node scripts/test-all-14-cronjobs.js

echo.
echo ========================================
echo テスト完了
echo ========================================
pause
