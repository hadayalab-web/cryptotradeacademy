@echo off
chcp 65001 >nul
REM 全言語実行用バッチファイル（環境変数込み）

echo ========================================
echo 全言語実行（840人目標）
echo 環境変数設定済み
echo ========================================
echo.

REM 環境変数の設定
set GITHUB_PERSONAL_ACCESS_TOKENS=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
set CRON_SECRET=9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359
set VERCEL_TOKEN=QU4PnKlo611mYVksqjfNC7Fl
set KV_REST_API_READ_ONLY_TOKEN=AotiAAIgcDE1X4iRkRRJB4nbs9u_WKXO4e3LAV9o8X7a2ZGDQwIcZw
set KV_REST_API_TOKEN=AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI
set KV_REST_API_URL=https://genuine-stork-35682.upstash.io
set KV_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379
set REDIS_URL=rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379
set XAI_API_KEY=xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii
set GEMINI_API_KEY=AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig

echo 環境変数設定完了
echo    - XAI_API_KEY: 設定済み
echo    - KV_REST_API_URL: 設定済み
echo    - KV_REST_API_TOKEN: 設定済み
echo.

echo ========================================
echo 全言語実行開始
echo ========================================
echo.
echo 注意: この処理には時間がかかります（10-30分）
echo 各言語の処理が完了するまで待機してください
echo.

node scripts/emergency-fetch-and-save-all.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo 全言語実行完了
    echo ========================================
    echo.
    echo 次のステップ: KVストック確認
    echo    node scripts/check-kv-stock-status.js
    echo.
) else (
    echo.
    echo ========================================
    echo 実行中にエラーが発生しました
    echo ========================================
    echo.
    echo エラーログを確認してください
    echo ローカルファイルを確認: data\grok-influencers\
    echo 成功した言語のローカルファイルから手動でKVに保存可能
    echo.
)

pause
