@echo off
echo ========================================
echo Grokから取得してJSON/CSV保存 + Gitコミット
echo ========================================
echo.

REM 環境変数設定
set XAI_API_KEY=xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii

echo ステップ1: Grokから取得してJSON/CSV保存
node scripts/save-influencers-to-json-csv.js

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 保存失敗
    pause
    exit /b 1
)

echo.
echo ステップ2: Gitにコミット
git add data/influencers/
git commit -m "Update influencers data - %date% %time%"

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ コミット失敗（変更がない可能性があります）
)

echo.
echo ステップ3: Gitにプッシュ
git push

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ プッシュ失敗
)

echo.
echo ========================================
echo 完了
echo ========================================
echo.
echo 💡 Vercelで自動デプロイされます
echo 💡 デプロイ後、api/x-quote-repost-from-file.js が使用されます
echo.
pause
