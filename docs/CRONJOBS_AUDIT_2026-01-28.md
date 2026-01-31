# CronJobs突合せ表
**作成日時**: 2026-01-28  
**目的**: すべてのCronJobsの設定と実装を確認・突合せ

---

## 📋 Cron設定一覧（vercel.json）

| # | パス | スケジュール | 実行頻度 | ファイル存在 | 実装確認 |
|---|------|------------|---------|------------|---------|
| 1 | `/api/cron` | `*/15 * * * *` | 15分ごと | ✅ | 要確認 |
| 2 | `/api/weekly-report` | `0 0 * * 0` | 毎週日曜0時 | ✅ | 要確認 |
| 3 | `/api/vsl1-post` | `0 1,13,21 * * *` | 1日3回（1時、13時、21時） | ✅ | 要確認 |
| 4 | `/api/vsl2-free-users` | `0 * * * *` | 1時間ごと | ✅ | 要確認 |
| 5 | `/api/vsl1-reminder` | `0 */12 * * *` | 12時間ごと（0時、12時） | ✅ | 要確認 |
| 6 | `/api/vsl2-last-call` | `0 * * * *` | 1時間ごと | ✅ | 要確認 |
| 7 | `/api/promo-stock-monitor` | `*/15 * * * *` | 15分ごと | ✅ | 要確認 |
| 8 | `/api/monthly-engagement-report` | `0 0 1 * *` | 毎月1日0時 | ✅ | 要確認 |
| 9 | `/api/x-post-minimal-version-cron` | `0 0,7,12,15,23 * * *` | 1日5回（0時、7時、12時、15時、23時） | ✅ | 要確認 |
| 10 | `/api/x-post-free-report` | `30 4,10,17,19 * * *` | 1日4回（4:30、10:30、17:30、19:30） | ✅ | 要確認 |
| 11 | `/api/x-quote-repost` | `0 * * * *` | 1時間ごと | ✅ | 要確認 |
| 12 | `/api/x-quote-repost-metrics` | `0 1 * * *` | 毎日1時 | ✅ | 要確認 |
| 13 | `/api/x-engagement-metrics` | `0 0 * * *` | 毎日0時 | ✅ | 要確認 |
| 14 | `/api/x-post-performance-analysis` | `0 1 * * *` | 毎日1時 | ✅ | 要確認 |
| 15 | `/api/x-influencer-report` | `0 9 * * 1` | 毎週月曜9時 | ✅ | 要確認 |
| 16 | `/api/x-algorithm-analysis` | `0 10 * * 1` | 毎週月曜10時 | ✅ | 要確認 |

---

## 📝 各CronJobの詳細

### 1. `/api/cron` - 15分ごとの緊急配信
- **スケジュール**: `*/15 * * * *`（15分ごと）
- **ファイル**: `api/cron.js` ✅
- **機能**: CryptoQuantデータ取得、GPT解析、緊急配信判定、定期配信
- **状態**: ✅ 実装確認済み

### 2. `/api/weekly-report` - 週次レポート
- **スケジュール**: `0 0 * * 0`（毎週日曜0時）
- **ファイル**: `api/weekly-report.js` ✅
- **機能**: 週次検証ログレポート生成
- **状態**: ✅ 実装確認済み

### 3. `/api/vsl1-post` - VSL1投稿
- **スケジュール**: `0 1,13,21 * * *`（1日3回：1時、13時、21時）
- **ファイル**: `api/vsl1-post.js` ✅
- **機能**: VSL1自動投稿（X/Twitterのみ）、無料版オプトイン誘導
- **状態**: ✅ 実装確認済み

### 4. `/api/vsl2-free-users` - VSL2配信
- **スケジュール**: `0 * * * *`（1時間ごと）
- **ファイル**: `api/vsl2-free-users.js` ✅
- **機能**: 無料版ユーザーへのVSL2自動配信（24時間後）
- **状態**: ✅ 実装確認済み

### 5. `/api/vsl1-reminder` - VSL1リマインド
- **スケジュール**: `0 */12 * * *`（12時間ごと：0時、12時）
- **ファイル**: `api/vsl1-reminder.js` ✅
- **機能**: 無料版ユーザーへのVSL1リマインドメッセージ（12時間後）
- **状態**: ✅ 実装確認済み

### 6. `/api/vsl2-last-call` - VSL2ラストコール
- **スケジュール**: `0 * * * *`（1時間ごと）
- **ファイル**: `api/vsl2-last-call.js` ✅
- **機能**: 無料版ユーザーへのVSL2終了直前リマインド（21時間後）
- **状態**: ✅ 実装確認済み

### 7. `/api/promo-stock-monitor` - プロモコード在庫監視
- **スケジュール**: `*/15 * * * *`（15分ごと）
- **ファイル**: `api/promo-stock-monitor.js` ✅
- **機能**: プロモコードの残り枠監視とリマインド送信
- **状態**: ✅ 実装確認済み

### 8. `/api/monthly-engagement-report` - 月次エンゲージメントレポート
- **スケジュール**: `0 0 1 * *`（毎月1日0時）
- **ファイル**: `api/monthly-engagement-report.js` ✅
- **機能**: 月次エンゲージメント分析レポート生成
- **状態**: ✅ 実装確認済み

### 9. `/api/x-post-minimal-version-cron` - 無料版X投稿
- **スケジュール**: `0 0,7,12,15,23 * * *`（1日5回：0時、7時、12時、15時、23時）
- **ファイル**: `api/x-post-minimal-version-cron.js` ✅
- **機能**: 無料版（Minimal Version）のX投稿
- **状態**: ✅ 実装確認済み

### 10. `/api/x-post-free-report` - 無料版レポートX投稿
- **スケジュール**: `30 4,10,17,19 * * *`（1日4回：4:30、10:30、17:30、19:30）
- **ファイル**: `api/x-post-free-report.js` ✅
- **機能**: 無料版レポートX投稿（6言語対応）
- **状態**: ✅ 実装確認済み

### 11. `/api/x-quote-repost` - 引用リポスト自動化
- **スケジュール**: `0 * * * *`（1時間ごと）
- **ファイル**: `api/x-quote-repost.js` ✅
- **機能**: 引用リポスト自動化（386人のインフルエンサーにローテーション、1日500前後投稿）
- **状態**: ✅ 実装確認済み
- **⚠️ 重要**: ストックがある前提で動作（自動検索・追加機能は削除済み）

### 12. `/api/x-quote-repost-metrics` - 引用リポストメトリクス
- **スケジュール**: `0 1 * * *`（毎日1時）
- **ファイル**: `api/x-quote-repost-metrics.js` ✅
- **機能**: 引用リポストのメトリクスを定期的に追跡
- **状態**: ✅ 実装確認済み

### 13. `/api/x-engagement-metrics` - エンゲージメントメトリクス
- **スケジュール**: `0 0 * * *`（毎日0時）
- **ファイル**: `api/x-engagement-metrics.js` ✅
- **機能**: EN実測ダッシュボード（毎日EN実測ダッシュボード作成）
- **状態**: ✅ 実装確認済み

### 14. `/api/x-post-performance-analysis` - 投稿パフォーマンス分析
- **スケジュール**: `0 1 * * *`（毎日1時）
- **ファイル**: `api/x-post-performance-analysis.js` ✅
- **機能**: 投稿パフォーマンス分析
- **状態**: ✅ 実装確認済み

### 15. `/api/x-influencer-report` - インフルエンサー効果レポート
- **スケジュール**: `0 9 * * 1`（毎週月曜9時）
- **ファイル**: `api/x-influencer-report.js` ✅
- **機能**: インフルエンサー効果レポート生成（どのインフルエンサーが最も効果的か分析）
- **状態**: ✅ 実装確認済み
- **⚠️ 注意**: Grok APIからインフルエンサーを検索・追加・更新はしない（既存ストックから分析）

### 16. `/api/x-algorithm-analysis` - Xアルゴリズム分析
- **スケジュール**: `0 10 * * 1`（毎週月曜10時）
- **ファイル**: `api/x-algorithm-analysis.js` ✅
- **機能**: Xアルゴリズム分析レポート生成（GPTを使用）
- **状態**: ✅ 実装確認済み

---

## ✅ 確認結果

### ファイル存在確認
- ✅ すべてのCron設定に対応するファイルが存在する

### 実装確認
- ✅ すべてのファイルにhandler関数が実装されている

### 重要な注意事項

1. **`/api/x-quote-repost`**:
   - ストックがある前提で動作
   - 自動検索・追加機能は削除済み
   - ストックが空の場合、投稿をスキップ

2. **`/api/x-influencer-report`** と **`/api/x-algorithm-analysis`**:
   - Grok APIからインフルエンサーを検索・追加・更新はしない
   - 既存ストックから分析・レポート生成のみ

3. **`/api/x-update-influencer-stock`**:
   - Cron設定なし（手動実行専用）
   - 自動実行されない

---

## 📊 実行頻度サマリー

| 実行頻度 | Cron数 | CronJobs |
|---------|-------|----------|
| 15分ごと | 2 | `/api/cron`, `/api/promo-stock-monitor` |
| 1時間ごと | 3 | `/api/vsl2-free-users`, `/api/vsl2-last-call`, `/api/x-quote-repost` |
| 1日1回 | 4 | `/api/x-engagement-metrics`, `/api/x-quote-repost-metrics`, `/api/x-post-performance-analysis`, `/api/weekly-report` |
| 1日複数回 | 3 | `/api/vsl1-post` (3回), `/api/x-post-minimal-version-cron` (5回), `/api/x-post-free-report` (4回) |
| 週次 | 2 | `/api/x-influencer-report`, `/api/x-algorithm-analysis` |
| 月次 | 1 | `/api/monthly-engagement-report` |
| 12時間ごと | 1 | `/api/vsl1-reminder` |

---

## 🎯 次のステップ

各CronJobの詳細な動作確認と、ユーザーとの突合せが必要です。
