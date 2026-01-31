@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo Vercel Logs詳細分析を実行します
echo ========================================
echo.
python scripts\analyze_vercel_logs.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo エラーが発生しました。Pythonがインストールされているか確認してください。
    pause
)
