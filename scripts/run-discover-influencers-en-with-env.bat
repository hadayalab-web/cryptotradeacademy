@echo off
chcp 65001 >nul
echo ========================================
echo インフルエンサー発見（EN言語）
echo ========================================
echo.
echo 環境変数を設定中...
set XAI_API_KEY=xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii
echo.
echo 実行開始...
node scripts/discover-influencers-single-lang-robust.js en 210
echo.
echo ========================================
echo 実行完了
echo ========================================
pause
