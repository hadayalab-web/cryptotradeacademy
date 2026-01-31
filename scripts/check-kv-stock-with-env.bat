@echo off
REM KVストック状態確認用バッチファイル（環境変数込み）

echo ========================================
echo KVストック状態確認
echo ========================================
echo.

REM 環境変数の設定
set KV_REST_API_READ_ONLY_TOKEN=AotiAAIgcDE1X4iRkRRJB4nbs9u_WKXO4e3LAV9o8X7a2ZGDQwIcZw
set KV_REST_API_TOKEN=AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI
set KV_REST_API_URL=https://genuine-stork-35682.upstash.io
set KV_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379
set REDIS_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379

echo ✅ KV環境変数設定完了
echo.

node scripts/check-kv-stock-status.js

pause
