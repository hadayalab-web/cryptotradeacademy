@echo off
REM 緊急: Grokが集めた760人のリストを復旧

echo ========================================
echo 🚨 緊急: Grokが集めたインフルエンサーリスト復旧
echo ========================================
echo.

REM 環境変数の設定
set KV_REST_API_TOKEN=AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI
set KV_REST_API_URL=https://genuine-stork-35682.upstash.io
set KV_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379
set REDIS_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379

echo ✅ KV環境変数設定完了
echo.

echo ========================================
echo 復旧処理開始
echo ========================================
echo.

node scripts/emergency-recover-influencers.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ 復旧処理完了
    echo ========================================
    echo.
    echo 💡 次のステップ: KVストック確認
    echo    node scripts/check-kv-stock-status.js
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 復旧処理失敗
    echo ========================================
    echo.
    echo 💡 エラーログを確認してください
    echo 💡 ローカルファイルを確認: data\grok-influencers\
    echo.
)

pause
