@echo off
REM run-vercel-logs-analysis.bat
REM Vercel Dashboardのログ結果JSONを分析

echo ========================================
echo Vercel Dashboard ログ結果分析
echo ========================================
echo.

if "%1"=="" (
    echo 使用方法: %0 "ログファイルのパス"
    echo 例: %0 "c:\Users\chiba\Downloads\logs_result (15).json"
    pause
    exit /b 1
)

node scripts/analyze-vercel-logs.js "%1"

echo.
echo ========================================
echo 分析完了
echo ========================================
pause
