@echo off
REM 緊急: インフルエンサーストック再構築スクリプト（環境変数設定付き）

cd /d "%~dp0\.."

REM 環境変数を設定
set KV_REST_API_URL=https://genuine-stork-35682.upstash.io
set KV_REST_API_TOKEN=AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI
set KV_REST_API_READ_ONLY_TOKEN=AotiAAIgcDE1X4iRkRRJB4nbs9u_WKXO4e3LAV9o8X7a2ZGDQwIcZw
set KV_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379
set REDIS_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379

REM XAI_API_KEYの確認
if "%XAI_API_KEY%"=="" (
    echo ========================================
    echo ❌ エラー: XAI_API_KEYが設定されていません
    echo ========================================
    echo.
    echo 以下のいずれかの方法でXAI_API_KEYを設定してください:
    echo.
    echo 方法1: このバッチファイルを編集して、以下の行を追加:
    echo    set XAI_API_KEY=あなたのXAI_API_KEY
    echo.
    echo 方法2: コマンドプロンプトで設定してから実行:
    echo    set XAI_API_KEY=あなたのXAI_API_KEY
    echo    scripts\emergency-rebuild-influencer-stock.bat
    echo.
    echo 方法3: PowerShellで設定してから実行:
    echo    $env:XAI_API_KEY="あなたのXAI_API_KEY"
    echo    scripts\emergency-rebuild-influencer-stock.bat
    echo.
    pause
    exit /b 1
)

echo ========================================
echo 🚨 緊急: インフルエンサーストック再構築
echo ========================================
echo.
echo ⚠️  注意: このスクリプトは全言語のストックを再構築します
echo    既存のストックが上書きされる可能性があります
echo.
echo ✅ XAI_API_KEY: 設定済み
echo.
pause

node scripts/emergency-rebuild-influencer-stock.js

echo.
pause
