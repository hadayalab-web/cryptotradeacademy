@echo off
REM ENのみテスト実行用バッチファイル

echo ========================================
echo ENのみテスト実行（210人目標）
echo ========================================
echo.

REM 環境変数の確認
if "%XAI_API_KEY%"=="" (
    echo ❌ XAI_API_KEYが設定されていません
    echo 💡 環境変数を設定してください:
    echo    set XAI_API_KEY=your-api-key
    pause
    exit /b 1
)

echo ✅ XAI_API_KEY: 設定済み
echo.

REM KV環境変数の確認
if "%KV_REST_API_URL%"=="" (
    echo ⚠️ KV_REST_API_URLが設定されていません
    echo 💡 KV保存が失敗する可能性があります
    echo.
)

if "%KV_REST_API_TOKEN%"=="" (
    echo ⚠️ KV_REST_API_TOKENが設定されていません
    echo 💡 KV保存が失敗する可能性があります
    echo.
)

echo ========================================
echo テスト実行開始
echo ========================================
echo.

node scripts/test-fetch-and-save-en-only.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ テスト成功！
    echo ========================================
    echo.
    echo 💡 次のステップ: 全言語実行
    echo    node scripts/grok-fetch-and-save-influencers.js
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ テスト失敗
    echo ========================================
    echo.
    echo 💡 エラーログを確認してください
    echo.
)

pause
