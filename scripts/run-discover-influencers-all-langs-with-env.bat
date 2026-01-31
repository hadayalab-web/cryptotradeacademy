@echo off
chcp 65001 >nul
echo ========================================
echo インフルエンサー発見（全言語・段階的実行）
echo ========================================
echo.
echo 環境変数を設定中...
set XAI_API_KEY=xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii
echo.
echo 実行開始（ENから順次実行）...
echo.
node scripts/discover-influencers-all-langs-stepwise.js
echo.
echo ========================================
echo 全言語の実行完了
echo ========================================
pause
