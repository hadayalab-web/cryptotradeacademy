@echo off
REM インフルエンサーストック更新スクリプト（環境変数設定付き）
REM 使用方法: このファイルを編集してXAI_API_KEYを設定するか、
REM 環境変数として設定してから実行してください

cd /d "%~dp0\.."

REM 環境変数が設定されていない場合の警告
if "%XAI_API_KEY%"=="" (
    echo ========================================
    echo ⚠️  XAI_API_KEY環境変数が設定されていません
    echo ========================================
    echo.
    echo 以下のいずれかの方法で環境変数を設定してください:
    echo.
    echo 方法1: このバッチファイルを編集してXAI_API_KEYを設定
    echo 方法2: PowerShellで一時的に設定:
    echo    $env:XAI_API_KEY="your-api-key-here"
    echo.
    echo 方法3: システム環境変数として設定（永続的）
    echo.
    echo 現在のXAI_API_KEY: %XAI_API_KEY%
    echo.
    pause
    exit /b 1
)

echo ========================================
echo インフルエンサーストック更新（全言語）
echo ========================================
echo.
node scripts/update-influencer-stock.js --all
echo.
pause
