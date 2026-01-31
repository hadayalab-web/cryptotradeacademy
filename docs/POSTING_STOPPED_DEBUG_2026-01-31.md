# 投稿停止のデバッグガイド

**作成日**: 2026-01-31  
**問題**: 10分前から投稿が停止している

## 考えられる原因

### 1. 時間制限（X_MAX_HOURLY_POSTS: 100/時間）に達した
- **症状**: 1時間に100件の投稿に達すると、その時間内は投稿がスキップされる
- **確認方法**: Vercelログで「Hourly post limit reached」を検索
- **対処法**: 
  - 次の時間（UTC）まで待つ
  - または`X_MAX_HOURLY_POSTS`を増やす（X APIレート制限: Per User 100/15min = 理論上400/時間）

### 2. 時間帯制御（getLanguagesForCurrentHour）
- **症状**: 現在のUTC時刻が`getPeakMapForHour`で定義されていない時間帯の場合、`langs: []`が返され、投稿がスキップされる
- **定義されている時間帯**: UTC 0, 1, 2, 4, 6, 8, 10, 12, 15, 16, 18, 20, 21, 22
- **定義されていない時間帯**: UTC 3, 5, 7, 9, 11, 13, 14, 17, 19, 23
- **確認方法**: Vercelログで「Not quote repost peak time」を検索
- **対処法**: 
  - 定義されている時間帯まで待つ
  - または`getPeakMapForHour`に現在時刻を追加

### 3. ドライランモードが有効
- **症状**: ドライランモードが有効な場合、書き込み操作（POST）がスキップされる
- **確認方法**: 環境変数`X_POSTING_DRY_RUN`を確認
- **対処法**: `X_POSTING_DRY_RUN=false`に設定

### 4. X APIのレート制限に達した
- **症状**: X APIのレート制限（Per User 100/15min）に達した場合、429エラーが返される
- **確認方法**: Vercelログで「Rate limit hit (429)」を検索
- **対処法**: 
  - `x-rate-limit-reset`ヘッダーで指定された時刻まで待つ
  - またはリトライロジックが自動的に処理する

### 5. CronJobの実行エラー
- **症状**: CronJobが実行されていない、またはエラーで失敗している
- **確認方法**: Vercel DashboardでCronJobの実行履歴を確認
- **対処法**: エラーログを確認して修正

## 確認手順

### Step 1: Vercelログを確認
```bash
# 最近のログを確認
# Vercel Dashboard > Logs > Filter: "Quote Repost"
```

### Step 2: 時間制限の状態を確認
```bash
# ログで以下を検索:
# - "Hourly post limit reached"
# - "currentHourlyPostCount"
# - "maxPostsPerHour"
```

### Step 3: 時間帯制御の状態を確認
```bash
# ログで以下を検索:
# - "Not quote repost peak time"
# - "currentHour"
# - "getLanguagesForCurrentHour"
```

### Step 4: ドライランモードの状態を確認
```bash
# 環境変数を確認:
# X_POSTING_DRY_RUN=false
```

### Step 5: X APIのレート制限の状態を確認
```bash
# ログで以下を検索:
# - "Rate limit hit (429)"
# - "x-rate-limit-remaining"
```

## 緊急時の対処法

### 時間制限に達した場合
1. 次の時間（UTC）まで待つ
2. または`X_MAX_HOURLY_POSTS`を一時的に増やす（X APIレート制限内で）

### 時間帯制御でスキップされている場合
1. 定義されている時間帯まで待つ
2. または`getPeakMapForHour`に現在時刻を追加

### X APIのレート制限に達した場合
1. `x-rate-limit-reset`ヘッダーで指定された時刻まで待つ
2. リトライロジックが自動的に処理する

## 参考資料

- [X API Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits)
- `services/x/optimization.js`: `getPeakMapForHour()`関数
- `api/x-quote-repost.js`: 時間制限チェック（2139行目）
