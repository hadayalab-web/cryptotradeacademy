================================================================================
Vercel Logs詳細分析レポート
CEO向けサマリー
================================================================================

## 📊 エグゼクティブサマリー

- **総リクエスト数**: 435件
- **検出されたCron Jobs数**: 15個
- **X Webhookリクエスト数**: 6件
- **エラー発生数**: 35件

### ステータスコード別サマリー
- **成功 (200)**: 141件 (32.4%)
- **エラー (400+)**: 30件 (6.9%)

## 🔄 Cron Jobs実行状況（17個）

### /api/cron
- **実行回数**: 12回
- **成功率**: 0.0%
- **ステータス分布**: {500: 12}
- **⚠️ エラー数**: 12件
  - [2026-01-28 05:10:54] Fallback to EN templates. lang=ja error=Cannot find module '../shared/contentFilters'
Require stack:
  - [2026-01-28 05:10:54] 
  - [2026-01-28 05:10:54] 

### /api/monthly-engagement-report
- **実行回数**: 15回
- **成功率**: 100.0%
- **ステータス分布**: {200: 15}

### /api/promo-stock-monitor
- **実行回数**: 15回
- **成功率**: 100.0%
- **ステータス分布**: {200: 15}

### /api/vsl1-post
- **実行回数**: 13回
- **成功率**: 100.0%
- **ステータス分布**: {200: 13}

### /api/vsl1-reminder
- **実行回数**: 5回
- **成功率**: 100.0%
- **ステータス分布**: {200: 5}

### /api/vsl2-free-users
- **実行回数**: 7回
- **成功率**: 100.0%
- **ステータス分布**: {200: 7}

### /api/vsl2-last-call
- **実行回数**: 8回
- **成功率**: 100.0%
- **ステータス分布**: {200: 8}

### /api/weekly-report
- **実行回数**: 10回
- **成功率**: 100.0%
- **ステータス分布**: {200: 10}

### /api/x-algorithm-analysis
- **実行回数**: 8回
- **成功率**: 0.0%
- **ステータス分布**: {202: 8}
- **⚠️ エラー数**: 1件
  - [2026-01-28 05:11:17] (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to error

### /api/x-engagement-metrics
- **実行回数**: 256回
- **成功率**: 0.0%
- **ステータス分布**: {0: 256}

### /api/x-influencer-report
- **実行回数**: 11回
- **成功率**: 100.0%
- **ステータス分布**: {200: 11}
- **⚠️ エラー数**: 1件
  - [2026-01-28 05:11:16] (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to error

### /api/x-post-free-report
- **実行回数**: 11回
- **成功率**: 100.0%
- **ステータス分布**: {200: 11}

### /api/x-post-minimal-version-cron
- **実行回数**: 23回
- **成功率**: 100.0%
- **ステータス分布**: {200: 23}

### /api/x-post-performance-analysis
- **実行回数**: 9回
- **成功率**: 100.0%
- **ステータス分布**: {200: 9}
- **⚠️ エラー数**: 1件
  - [2026-01-28 05:11:15] (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to error

### /api/x-quote-repost
- **実行回数**: 21回
- **成功率**: 38.1%
- **ステータス分布**: {200: 8, 504: 13}
- **⚠️ エラー数**: 13件
  - [2026-01-28 05:11:11] [KV] ✅ KVインスタンス初期化成功（@vercel/kv）
  - [2026-01-28 05:11:11] [Quote Repost] ========================================
  - [2026-01-28 05:11:11] [Quote Repost] Cron job triggered at 2026-01-28T05:11:11.677Z

## 🔗 X Webhook分析

- **総リクエスト数**: 6件
- **ステータスコード**: {200: 6}
- **メソッド**: {'GET': 6}
- **⚠️ エラー数**: 1件

### Webhook時間帯別分布（UTC）
- 05:00 UTC: 6件

## ⚠️ エラー分析

- **総エラー数**: 35件

### パス別エラー（上位10件）
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-quote-repost: 13件
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/cron: 6件
- cryptotradeacademy-77htgnuk4-hadayalab-projects-projects.vercel.app/api/cron: 6件
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/: 4件
- cryptotradeacademy.vercel.app/api/x-webhook: 1件
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-algorithm-analysis: 1件
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-influencer-report: 1件
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-post-performance-analysis: 1件
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/vsl1-post: 1件
- cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/favicon.ico: 1件

### ステータスコード別エラー
- 200: 4件
- 202: 1件
- 404: 5件
- 500: 12件
- 504: 13件

### 主要エラー（最初の10件）
1. [2026-01-28 05:12:08] cryptotradeacademy.vercel.app/api/x-webhook
   ステータス: 200
   メッセージ: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

2. [2026-01-28 05:11:17] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-algorithm-analysis
   ステータス: 202
   メッセージ: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

3. [2026-01-28 05:11:16] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-influencer-report
   ステータス: 200
   メッセージ: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

4. [2026-01-28 05:11:15] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-post-performance-analysis
   ステータス: 200
   メッセージ: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

5. [2026-01-28 05:11:11] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   ステータス: 504
   メッセージ: [KV] ✅ KVインスタンス初期化成功（@vercel/kv）

6. [2026-01-28 05:11:11] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   ステータス: 504
   メッセージ: [Quote Repost] ========================================

7. [2026-01-28 05:11:11] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   ステータス: 504
   メッセージ: [Quote Repost] Cron job triggered at 2026-01-28T05:11:11.677Z

8. [2026-01-28 05:11:11] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   ステータス: 504
   メッセージ: [Quote Repost] 🔵 RunId: qr-1769577071676-jihad0l

9. [2026-01-28 05:11:11] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   ステータス: 504
   メッセージ: [Quote Repost] 🔵 Git SHA: 3850d7a60af38766cc6036c67303741ec24ada95

10. [2026-01-28 05:11:11] cryptotradeacademy-ixn0lvzlf-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   ステータス: 504
   メッセージ: [Quote Repost] 🔵 Build Time: unknown

## 💡 推奨事項

### 高エラー率のCron Jobs（要確認）
- **/api/cron**: エラー率 100.0% (12件)
- **/api/x-quote-repost**: エラー率 61.9% (13件)
- **/api/x-algorithm-analysis**: エラー率 12.5% (1件)
- **/api/x-post-performance-analysis**: エラー率 11.1% (1件)
- **/api/x-influencer-report**: エラー率 9.1% (1件)

### 実行されていないCron Jobs（要確認）
- /api/x-quote-repost-metrics
- /api/x-update-influencer-stock
