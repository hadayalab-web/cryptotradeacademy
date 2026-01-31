# CronJobs削除レポート
**作成日時**: 2026-01-28  
**目的**: レポート・分析系CronJobsを削除し、X投稿とTG配信関連のみ残す

---

## 🗑️ 削除したCronJobs（7件）

### 1. `/api/x-engagement-metrics`
- **スケジュール**: `0 0 * * *`（毎日0時）
- **機能**: EN実測ダッシュボード（毎日EN実測ダッシュボード作成）
- **削除理由**: レポート・分析系のため削除

### 2. `/api/x-quote-repost-metrics`
- **スケジュール**: `0 1 * * *`（毎日1時）
- **機能**: 引用リポストのメトリクスを定期的に追跡
- **削除理由**: レポート・分析系のため削除

### 3. `/api/x-post-performance-analysis`
- **スケジュール**: `0 1 * * *`（毎日1時）
- **機能**: 投稿パフォーマンス分析
- **削除理由**: レポート・分析系のため削除

### 4. `/api/weekly-report`
- **スケジュール**: `0 0 * * 0`（毎週日曜0時）
- **機能**: 週次検証ログレポート生成
- **削除理由**: レポート・分析系のため削除

### 5. `/api/x-influencer-report`
- **スケジュール**: `0 9 * * 1`（毎週月曜9時）
- **機能**: インフルエンサー効果レポート生成
- **削除理由**: レポート・分析系のため削除

### 6. `/api/x-algorithm-analysis`
- **スケジュール**: `0 10 * * 1`（毎週月曜10時）
- **機能**: Xアルゴリズム分析レポート生成
- **削除理由**: レポート・分析系のため削除

### 7. `/api/monthly-engagement-report`
- **スケジュール**: `0 0 1 * *`（毎月1日0時）
- **機能**: 月次エンゲージメント分析レポート生成
- **削除理由**: レポート・分析系のため削除

---

## ✅ 残したCronJobs（8件）

### 有料版（Regular Briefing）TG配信
1. **`/api/cron`** - `*/15 * * * *`（15分ごと）
   - 緊急配信・定期配信（有料版Regular Briefing）

### X投稿関連（4件）
2. **`/api/vsl1-post`** - `0 1,13,21 * * *`（1日3回：1時、13時、21時）
   - VSL1自動投稿（X/Twitterのみ）

3. **`/api/x-post-minimal-version-cron`** - `0 0,7,12,15,23 * * *`（1日5回）
   - 無料版（Minimal Version）のX投稿

4. **`/api/x-post-free-report`** - `30 4,10,17,19 * * *`（1日4回）
   - 無料版レポートX投稿（6言語対応）

5. **`/api/x-quote-repost`** - `0 * * * *`（1時間ごと）
   - 引用リポスト自動化（386人のインフルエンサーにローテーション、1日500前後投稿）

### TG DM関連（3件）
6. **`/api/vsl2-free-users`** - `0 * * * *`（1時間ごと）
   - 無料版ユーザーへのVSL2自動配信（24時間後）

7. **`/api/vsl1-reminder`** - `0 */12 * * *`（12時間ごと：0時、12時）
   - 無料版ユーザーへのVSL1リマインドメッセージ（12時間後）

8. **`/api/vsl2-last-call`** - `0 * * * *`（1時間ごと）
   - 無料版ユーザーへのVSL2終了直前リマインド（21時間後）

### その他（1件）
9. **`/api/promo-stock-monitor`** - `*/15 * * * *`（15分ごと）
   - プロモコードの残り枠監視とリマインド送信（VSL2に関連）

---

## 📊 削除前後の比較

| カテゴリ | 削除前 | 削除後 | 削除数 |
|---------|--------|--------|--------|
| 有料版TG配信 | 1 | 1 | 0 |
| X投稿関連 | 4 | 4 | 0 |
| TG DM関連 | 3 | 3 | 0 |
| プロモコード監視 | 1 | 1 | 0 |
| レポート・分析系 | 7 | 0 | **7** |
| **合計** | **16** | **9** | **7** |

---

## ✅ 確認事項

### 削除されたファイル
以下のファイルは残っていますが、Cron設定から削除されました：
- `api/x-engagement-metrics.js`
- `api/x-quote-repost-metrics.js`
- `api/x-post-performance-analysis.js`
- `api/weekly-report.js`
- `api/x-influencer-report.js`
- `api/x-algorithm-analysis.js`
- `api/monthly-engagement-report.js`

**注意**: ファイル自体は削除していません。必要に応じて手動実行は可能です。

---

## 🎯 最終的なCron設定

**残ったCronJobs（9件）**:
1. `/api/cron` - 有料版TG配信（15分ごと）
2. `/api/vsl1-post` - VSL1投稿（1日3回）
3. `/api/x-post-minimal-version-cron` - 無料版X投稿（1日5回）
4. `/api/x-post-free-report` - 無料版レポートX投稿（1日4回）
5. `/api/x-quote-repost` - 引用リポスト（1時間ごと）
6. `/api/vsl2-free-users` - VSL2配信（1時間ごと）
7. `/api/vsl1-reminder` - VSL1リマインド（12時間ごと）
8. `/api/vsl2-last-call` - VSL2ラストコール（1時間ごと）
9. `/api/promo-stock-monitor` - プロモコード監視（15分ごと）
