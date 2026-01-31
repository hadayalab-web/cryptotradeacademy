# ログ分析手順

**作成日**: 2026-01-31  
**目的**: 10分前から投稿が停止している原因を特定

## 手動実行コマンド

PowerShellで以下のコマンドを実行してください：

```powershell
cd c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy
node scripts/analyze-logs-simple.js
```

## 確認すべきポイント

### 1. 時間制限（X_MAX_HOURLY_POSTS: 100/時間）
ログで以下を検索：
- `"Hourly post limit reached"`
- `"currentHourlyPostCount"`
- `"maxPostsPerHour"`

### 2. 時間帯制御（getLanguagesForCurrentHour）
ログで以下を検索：
- `"Not quote repost peak time"`
- `"time_window_check"`
- `"currentHour"`

### 3. UTC 9時台のログ
現在時刻がUTC 9時台の場合、`getPeakMapForHour`で定義されていない時間帯の可能性があります。

**定義されている時間帯**: UTC 0, 1, 2, 4, 6, 8, 10, 12, 15, 16, 18, 20, 21, 22  
**定義されていない時間帯**: UTC 3, 5, 7, 9, 11, 13, 14, 17, 19, 23

### 4. 成功した投稿
ログで以下を検索：
- `"SUCCESSFULLY POSTED"`
- `"posted successfully"`
- `"posted_count"`

## 分析スクリプト

`scripts/analyze-logs-simple.js`を作成しました。このスクリプトは以下を分析します：

1. Quote Repost関連のログを抽出
2. スキップ関連のログを抽出
3. 成功した投稿のログを抽出
4. UTC 9時台のログを抽出

## 推奨事項

スクリプトを実行できない場合は、Vercel Dashboardのログで以下を直接検索してください：

1. **時間制限**: `Hourly post limit`
2. **時間帯制御**: `Not quote repost peak time`
3. **現在時刻**: UTC 9時台の場合、`getPeakMapForHour`に定義がない可能性が高い
