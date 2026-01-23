# 緊急: Cron Jobs分析レポート

生成日時: 2026-01-23T06:34:03.758Z

## 🚨 緊急状況

Cron Jobsが正常に稼働しないと、月間$1.8M目標達成が不可能になり、破産のリスクがあります。

---

## 📊 分析結果サマリー

- **総実行数**: 214
- **成功**: 126 (58.9%)
- **エラー**: 9 (4.2%)
- **全体成功率**: 58.9%

---

## 🚨 ブロッキングエラー


### ❌ x-quote-repost

**エラー 1:**
- ステータスコード: 500
- エラーメッセージ: `/var/task/api/x-quote-repost.js:345
    const dailyPostCount = await getDailyPostCount(dateString);
          ^

SyntaxError: Identifier 'dailyPostCount' has already been declared
    at wrapSafe (node:internal/modules/cjs/loader:1691:18)
    at Module._compile (node:internal/modules/cjs/loader:1734:20)
    at Object..js (node:internal/modules/cjs/loader:1893:10)
    at Module.load (node:internal/modules/cjs/loader:1480:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1299:12)
   `


**エラー 2:**
- ステータスコード: 500
- エラーメッセージ: ``


**エラー 3:**
- ステータスコード: 500
- エラーメッセージ: ``



---

## 📋 各Cron Jobの詳細


### cron
- 実行回数: 41
- 成功: 41 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":41}



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
- 実行回数: 11
- 成功: 7 (63.6%)
- エラー: 0 (0.0%)
- ステータスコード: {"0":4,"200":7}



### monthly-engagement-report
- 実行回数: 15
- 成功: 15 (100.0%)
- エラー: 0 (0.0%)
- ステータスコード: {"200":15}



### lead-discovery
- 実行回数: 92
- 成功: 11 (12.0%)
- エラー: 6 (6.5%)
- ステータスコード: {"0":81,"200":11}

**エラーメッセージ:**
1. [X API] Request failed: X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}
2. [X API] Failed to reply to tweet: X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}
3. [X Lead Discovery] Failed to send reply to tweet 1812345678901234598: X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}
4. [X Lead Discovery] Error details: {
  tweetId: '1812345678901234598',
  username: 'ExchangeHack',
  lang: 'en',
  errorType: 'Error',
  errorMessage: 'X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}',
  errorStack: 'Error: X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}\n' +
  
5. [X Lead Discovery] ❌ Failed to reply VSL1 to lead: {
  tweetId: '1812345678901234598',
  username: 'ExchangeHack',
  lang: 'en',
  errorType: 'Error',
  errorMessage: 'X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","status":403}',
  errorStack: 'Error: X API Error: 403 - {"detail":"You attempted to reply to a Tweet that is deleted or not visible to you.","type":"about:blank","title":"Forbidden","sta
6. [Lead Discovery] ❌ Failed to send VSL1 to perfect match lead: @ExchangeHack (tweetId: 1812345678901234598)



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
- 実行回数: 3
- 成功: 0 (0.0%)
- エラー: 3 (100.0%)
- ステータスコード: {"500":3}

**エラーメッセージ:**
1. /var/task/api/x-quote-repost.js:345
    const dailyPostCount = await getDailyPostCount(dateString);
          ^

SyntaxError: Identifier 'dailyPostCount' has already been declared
    at wrapSafe (node:internal/modules/cjs/loader:1691:18)
    at Module._compile (node:internal/modules/cjs/loader:1734:20)
    at Object..js (node:internal/modules/cjs/loader:1893:10)
    at Module.load (node:internal/modules/cjs/loader:1480:32)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1299:12)
   



---

## 🎯 重要Cron Jobsの状態

- ✅ x-post-free-report: エラー率 0.0%
- ❌ x-quote-repost: エラー率 100.0%
- ❌ lead-discovery: エラー率 6.5%
- ⚠️ lead-discovery/process: 実行ログが見つかりません
- ✅ vsl1-post: エラー率 0.0%
- ✅ vsl2-free-users: エラー率 0.0%

---

## 💡 緊急修正アクション


### 1. ブロッキングエラーの修正（最優先）
- x-quote-repost: エラーを確認して即座に修正


### 2. 重要Cron Jobsの確認
- x-post-free-report: ✅ 正常
- x-quote-repost: エラーを修正
- lead-discovery: エラーを修正
- lead-discovery/process: 実行ログを確認
- vsl1-post: ✅ 正常
- vsl2-free-users: ✅ 正常

---

**生成日時**: 2026-01-23T06:34:03.773Z
