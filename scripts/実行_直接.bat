@echo off
echo ========================================
echo 緊急: Grokから760人を再取得してKVに保存
echo ========================================
echo.
echo 実行中...
echo.

node scripts/emergency-fetch-and-save-all.js

echo.
echo ========================================
echo 実行完了
echo ========================================
echo.
pause
