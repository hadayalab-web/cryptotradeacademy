@echo off
REM X投稿関連CronJobs ドライランテスト実行バッチファイル

echo ========================================
echo X投稿関連CronJobs ドライランテスト開始
echo ========================================
echo.

cd /d "%~dp0\.."
node scripts/test-x-posting-cronjobs.js

echo.
echo ========================================
echo テスト完了
echo ========================================
pause
