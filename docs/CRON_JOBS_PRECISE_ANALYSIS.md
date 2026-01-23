# 高精度Cron Jobs分析レポート

生成日時: 2026-01-23T07:02:22.883Z

## 📊 分析結果サマリー

- **総実行数**: 284
- **成功**: 230 (80.99%)
- **エラー**: 54 (19.01%)
- **警告**: 0 (0.00%)
- **全体成功率**: 80.99%



---

## 🔍 エラーパターン分析


### 403: 40件
- **影響を受けたCron Jobs**: lead-discovery
- 詳細はコンソール出力を参照してください


### other: 14件
- **影響を受けたCron Jobs**: cron, lead-discovery, lead-discovery-daily-report, lead-discovery-weekly-report, x-quote-repost
- 詳細はコンソール出力を参照してください


---

## 🚨 ブロッキングエラー

**なし** - すべてのブロッキングエラーが解消されました！

---

## 📋 各Cron Jobの詳細分析


### cron
- **実行回数**: 20
- **成功**: 15 (75.00%)
- **エラー**: 5 (25.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":20}

- **エラータイプ**: {"other":5}


- **平均実行時間**: 6154ms
- **最大実行時間**: 6154ms
- **最小実行時間**: 6154ms


**エラーメッセージ:**
1. [binance] Error fetching open interest for BTCUSDT: Binance Futures API error: 451
2. [binance] Error fetching long/short ratio for BTCUSDT: Binance Futures API error: 451
3. [binance] Error fetching 24h ticker for BTCUSDT: Binance Futures API error: 451
4. [binance] Error fetching funding rate for BTCUSDT: Binance Futures API error: 451
5. (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.




### weekly-report
- **実行回数**: 10
- **成功**: 10 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":10}


- **平均実行時間**: 73ms
- **最大実行時間**: 113ms
- **最小実行時間**: 32ms





### vsl1-post
- **実行回数**: 10
- **成功**: 10 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":10}


- **平均実行時間**: 8526ms
- **最大実行時間**: 8605ms
- **最小実行時間**: 8446ms





### vsl2-free-users
- **実行回数**: 4
- **成功**: 4 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":4}


- **平均実行時間**: 482ms
- **最大実行時間**: 505ms
- **最小実行時間**: 458ms





### vsl1-reminder
- **実行回数**: 4
- **成功**: 4 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":4}


- **平均実行時間**: 520ms
- **最大実行時間**: 572ms
- **最小実行時間**: 468ms





### vsl2-last-call
- **実行回数**: 4
- **成功**: 4 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":4}


- **平均実行時間**: 470ms
- **最大実行時間**: 485ms
- **最小実行時間**: 454ms





### promo-stock-monitor
- **実行回数**: 5
- **成功**: 5 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":5}


- **平均実行時間**: 579ms
- **最大実行時間**: 634ms
- **最小実行時間**: 523ms





### monthly-engagement-report
- **実行回数**: 15
- **成功**: 15 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":15}


- **平均実行時間**: 505ms
- **最大実行時間**: 529ms
- **最小実行時間**: 480ms





### lead-discovery
- **実行回数**: 180
- **成功**: 137 (76.11%)
- **エラー**: 43 (23.89%)
- **警告**: 0
- **ステータスコード分布**: {"0":9,"200":171}

- **エラータイプ**: {"403":40,"other":3}


- **平均実行時間**: 17753ms
- **最大実行時間**: 21984ms
- **最小実行時間**: 15541ms


**エラーメッセージ:**
1. (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
2. [X API] Request failed: X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}
3. [X API] Failed to reply to tweet: X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}




### lead-discovery-daily-report
- **実行回数**: 7
- **成功**: 6 (85.71%)
- **エラー**: 1 (14.29%)
- **警告**: 0
- **ステータスコード分布**: {"200":7}

- **エラータイプ**: {"other":1}


- **平均実行時間**: 5202ms
- **最大実行時間**: 5229ms
- **最小実行時間**: 5174ms


**エラーメッセージ:**
1. (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)




### lead-discovery-weekly-report
- **実行回数**: 6
- **成功**: 5 (83.33%)
- **エラー**: 1 (16.67%)
- **警告**: 0
- **ステータスコード分布**: {"200":6}

- **エラータイプ**: {"other":1}


- **平均実行時間**: 11332ms
- **最大実行時間**: 11396ms
- **最小実行時間**: 11268ms


**エラーメッセージ:**
1. (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)




### x-post-free-report
- **実行回数**: 7
- **成功**: 7 (100.00%)
- **エラー**: 0 (0.00%)
- **警告**: 0
- **ステータスコード分布**: {"200":7}


- **平均実行時間**: 1106ms
- **最大実行時間**: 1130ms
- **最小実行時間**: 1082ms





### x-quote-repost
- **実行回数**: 12
- **成功**: 8 (66.67%)
- **エラー**: 4 (33.33%)
- **警告**: 0
- **ステータスコード分布**: {"0":12}

- **エラータイプ**: {"other":4}


- **平均実行時間**: 30ms
- **最大実行時間**: 30ms
- **最小実行時間**: 30ms


**エラーメッセージ:**
1. [Quote Repost] ❌ fetchLatestMarketData is not available
2. [Quote Repost] Module exports: [ 'postFreeReportToX', 'QUOTE_REPOST_TEMPLATES', 'TWEET_TEMPLATES' ]
3. [Quote Repost] ❌ Error fetching market data: getMarketSnapshot is not a function
4. [Quote Repost] ❌ Fallback also failed: getMarketSnapshot is not a function




---

## 🎯 重要Cron Jobsの状態

- ✅ x-post-free-report: エラー率 0.00% (7/7成功)
- ❌ x-quote-repost: エラー率 33.33% (8/12成功)
- ❌ lead-discovery: エラー率 23.89% (137/180成功)
- ⚠️ lead-discovery/process: 実行ログが見つかりません
- ✅ vsl1-post: エラー率 0.00% (10/10成功)
- ✅ vsl2-free-users: エラー率 0.00% (4/4成功)

---

## 🎯 月間$1.8M目標達成への評価


⚠️ **評価: 良好ですが、一部改善が必要です**

- いくつかのCron Jobsでエラーが発生しています
- エラーを修正することで目標達成への道筋が明確になります


---

**生成日時**: 2026-01-23T07:02:22.887Z
