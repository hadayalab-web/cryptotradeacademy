@echo off
REM Grokのすべてのレスポンスファイルを確認

echo ========================================
echo Grokレスポンスファイル確認
echo ========================================
echo.

if not exist "data\grok-influencers" (
    echo ❌ data\grok-influencers ディレクトリが存在しません
    echo 💡 まだ実行されていないか、実行が失敗しています
    pause
    exit /b 1
)

echo ✅ ディレクトリ存在確認: data\grok-influencers
echo.

dir /b data\grok-influencers\*.json 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ JSONファイルが見つかりません
    pause
    exit /b 1
)

echo.
echo ========================================
echo 最新ファイルを分析
echo ========================================
echo.

REM ENの最新ファイルを分析
echo [EN] 最新ファイルを分析中...
node scripts/analyze-grok-response.js en
echo.

pause
