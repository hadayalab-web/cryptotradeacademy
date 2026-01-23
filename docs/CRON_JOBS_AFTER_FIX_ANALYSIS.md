# 修正後のCron Jobs分析レポート

生成日時: 2026-01-23T06:40:54.868Z

## 📊 分析結果サマリー

- **総実行数**: 190
- **成功**: 169 (88.9%)
- **エラー**: 4 (2.1%)
- **全体成功率**: 88.9%

---

## 📊 修正前後の比較

### 修正前（logs_result.json）
- **x-quote-repost**: エラー率 100.0% (3/3失敗) - SyntaxError
- **lead-discovery**: エラー率 6.5% (6/92失敗) - 403エラー
- **全体成功率**: 58.9%

### 修正後（logs_result (1).json）
- **x-post-free-report**: エラー率 0.0% (7/7成功)
- **x-quote-repost**: エラー率 33.3% (0/12成功)
- **lead-discovery**: エラー率 0.0% (77/86成功)
- **lead-discovery/process**: 実行ログが見つかりません
- **vsl1-post**: エラー率 0.0% (10/10成功)
- **vsl2-free-users**: エラー率 0.0% (4/4成功)
- **全体成功率**: 88.9%

---

## ✅ 修正結果


### lead-discovery
- 修正前: 6.5% エラー率
- 修正後: 0.0% エラー率
- ステータス: ✅ 修正成功


---

## 🚨 ブロッキングエラー


### ❌ x-quote-repost

**エラー 1:**
- ステータスコード: 0
- エラーメッセージ: `[Quote Repost] Stack: TypeError: fetchLatestMarketData is not a function
    at Object.handler (/var/task/api/x-quote-repost.js:398:26)
    at r (/opt/rust/nodejs.js:2:15580)
    at Server.<anonymous> (/opt/rust/nodejs.js:2:11600)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Server.<anonymous> (/opt/rust/nodejs.js:17:9988)`



---

## 📋 各Cron Jobの詳細


### cron
- 実行回数: 20
- 成功: 20 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":20}



### weekly-report
- 実行回数: 10
- 成功: 10 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":10}



### vsl1-post
- 実行回数: 10
- 成功: 10 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":10}



### vsl2-free-users
- 実行回数: 4
- 成功: 4 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":4}



### vsl1-reminder
- 実行回数: 4
- 成功: 4 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":4}



### vsl2-last-call
- 実行回数: 4
- 成功: 4 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":4}



### promo-stock-monitor
- 実行回数: 5
- 成功: 5 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":5}



### monthly-engagement-report
- 実行回数: 15
- 成功: 15 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":15}



### lead-discovery
- 実行回数: 86
- 成功: 77 (89.5%)
- エラー: 0 (0.0%)
- ステータスコード: {"0":9,"200":77}



### lead-discovery-daily-report
- 実行回数: 7
- 成功: 7 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":7}



### lead-discovery-weekly-report
- 実行回数: 6
- 成功: 6 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":6}



### x-post-free-report
- 実行回数: 7
- 成功: 7 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":7}



### x-quote-repost
- 実行回数: 12
- 成功: 0 (0.0%)
- エラー: 4 (33.3%)
- ステータスコード: {"0":12}

**エラーメッセージ:**
1. [Quote Repost] ========================================
2. [Quote Repost] ❌ Handler error: fetchLatestMarketData is not a function
3. [Quote Repost] Stack: TypeError: fetchLatestMarketData is not a function
    at Object.handler (/var/task/api/x-quote-repost.js:398:26)
    at r (/opt/rust/nodejs.js:2:15580)
    at Server.<anonymous> (/opt/rust/nodejs.js:2:11600)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Server.<anonymous> (/opt/rust/nodejs.js:17:9988)



---

## 🎯 月間$1.8M目標達成への評価


⚠️ **評価: 一部改善が必要です**

- いくつかのCron Jobsでエラーが発生しています
- エラーを修正することで目標達成への道筋が明確になります


---

**生成日時**: 2026-01-23T06:40:54.870Z
