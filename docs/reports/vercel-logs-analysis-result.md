# Vercelログ分析結果

**分析日時**: 2026-01-27T12:52:10.603Z
**ログファイル**: C:\Users\chiba\Downloads\logs_result (7).json
**総ログ数**: 510件

## 📊 サマリー

- **エラー数**: 9件
- **警告数**: 47件

## 📈 ステータスコード別の集計

- **200**: 480件 (94.1%)
- **202**: 21件 (4.1%)
- **unknown**: 9件 (1.8%)

## 🔍 エラーパターン別の集計

- **Other**: 9件

## 🌐 リクエストパス別の集計（上位10件）

- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics**: 258件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-post-free-report**: 57件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/cron**: 32件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-quote-repost**: 25件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-post-minimal-version-cron**: 22件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/monthly-engagement-report**: 15件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-update-influencer-stock**: 14件
- **cryptotradeacademy.vercel.app/api/x-webhook**: 12件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-influencer-report**: 11件
- **cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/promo-stock-monitor**: 10件

## ❌ エラー詳細


### エラー 1

- **タイムスタンプ**: 2026-01-27 12:51:33
- **ステータスコード**: 200
- **リクエストパス**: cryptotradeacademy.vercel.app/api/x-webhook
- **リクエストID**: vwn8m-1769518293090-3c3c2fe7c438
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:51:33",
  "timestampInMs": 1769518293532,
  "requestPath": "cryptotradeacademy.vercel.app/api/x-webhook",
  "requestMethod": "GET",
  "requestQueryString": "crc_token=M2RkODJkZmMtYjlkYi00NmQ4LTk0MGUtM2JjYzkwM2Q4MjQ0&nonce=MTc2OTUxODI5MjkxNA",
  "responseStatusCode": 200,
  "requestId": "vwn8m-1769518293090-3c3c2fe7c438",
  "requestUserAgent": "",
  "environment": "production",
  "branch": "main",
  "vercelCache": "MISS",
  "host": "cryptotradeacademy.vercel.app",
  "deploymentDomain": "cryptotradeacademy.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/x-webhook",
  "level": "error",
  "message": "(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabiliti
```


### エラー 2

- **タイムスタンプ**: 2026-01-27 12:48:51
- **ステータスコード**: 202
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-algorithm-analysis
- **リクエストID**: jngrp-1769518131726-627d52fb03a6
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:48:51",
  "timestampInMs": 1769518131946,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-algorithm-analysis",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 202,
  "requestId": "jngrp-1769518131726-627d52fb03a6",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/x-algorithm-analysis",
  "level": "error",
  "message": "(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATW
```


### エラー 3

- **タイムスタンプ**: 2026-01-27 12:48:50
- **ステータスコード**: 200
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-influencer-report
- **リクエストID**: 6cs9j-1769518130234-c25a28b41559
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:48:50",
  "timestampInMs": 1769518130442,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-influencer-report",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 200,
  "requestId": "6cs9j-1769518130234-c25a28b41559",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/x-influencer-report",
  "level": "error",
  "message": "(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG 
```


### エラー 4

- **タイムスタンプ**: 2026-01-27 12:48:49
- **ステータスコード**: 200
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-post-performance-analysis
- **リクエストID**: hr295-1769518128877-b0e328f44faf
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:48:49",
  "timestampInMs": 1769518129048,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-post-performance-analysis",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 200,
  "requestId": "hr295-1769518128877-b0e328f44faf",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/x-post-performance-analysis",
  "level": "error",
  "message": "(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications.
```


### エラー 5

- **タイムスタンプ**: 2026-01-27 12:49:52
- **ステータスコード**: 200
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **リクエストID**: lgs6n-1769518127561-01b8ce9344f7
- **メッセージ**: [InfluencerPerformance] ✅ Built daily performance for 2026-01-26: {
  "event": "daily_performance_built",
  "date": "2026-01-26",
  "metrics": {
    "totalProcessed": 35,
    "successPosts": 0,
    "failedPosts": 35,
    "successInfluencers": 0,
    "rejectedCount": 0,
    "savedCount": 0
  },
  "errors": {
    "noMapping": 35,
    "invalidUsername": 0,
    "missingImpressions": 0,
    "invalidMetrics": 0,
    "fetchError": 0
  },
  "timestamp": "2026-01-27T12:49:52.490Z"
}

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:49:52",
  "timestampInMs": 1769518192491,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 200,
  "requestId": "lgs6n-1769518127561-01b8ce9344f7",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/x-engagement-metrics",
  "level": "info",
  "message": "[InfluencerPerformance] ✅ Built daily performance for 2026-01-26: {\n  \"event\": \"daily_performance_built\",\n  \"date\": \"2026-01-26\",\n  \"metr
```


### エラー 6

- **タイムスタンプ**: 2026-01-27 12:48:45
- **ステータスコード**: 202
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-update-influencer-stock
- **リクエストID**: mqbzm-1769518124781-81c0cb115d2f
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:48:45",
  "timestampInMs": 1769518125040,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-update-influencer-stock",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 202,
  "requestId": "mqbzm-1769518124781-81c0cb115d2f",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/x-update-influencer-stock",
  "level": "error",
  "message": "(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use
```


### エラー 7

- **タイムスタンプ**: 2026-01-27 12:49:03
- **ステータスコード**: 200
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-post-free-report
- **リクエストID**: 28chj-1769518122227-2a1aec9162f6
- **メッセージ**: [User Reply Handler] Failed to get replies for tweet 2016131328832376968: Endpoint must not contain query string. Use options.params instead: /tweets/search/recent?query=conversation_id%3A2016131328832376968&max_results=10&tweet.fields=author_id%2Ccreated_at%2Cpublic_metrics%2Ctext%2Cin_reply_to_user_id&user.fields=username%2Cname&expansions=author_id

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:49:03",
  "timestampInMs": 1769518143645,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-post-free-report",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 200,
  "requestId": "28chj-1769518122227-2a1aec9162f6",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/x-post-free-report",
  "level": "error",
  "message": "[User Reply Handler] Failed to get replies for tweet 2016131328832376968: Endpoint must not contain query string. Use options.params instead: /tweets/se
```


### エラー 8

- **タイムスタンプ**: 2026-01-27 12:48:25
- **ステータスコード**: 200
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/cron
- **リクエストID**: z46v7-1769518105397-65acae8e97fa
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:48:25",
  "timestampInMs": 1769518105939,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/cron",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 200,
  "requestId": "z46v7-1769518105397-65acae8e97fa",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/cron",
  "level": "error",
  "message": "(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not 
```


### エラー 9

- **タイムスタンプ**: 2026-01-27 12:45:08
- **ステータスコード**: 200
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/cron
- **リクエストID**: cb96z-1769517907454-c3b6fa5af292
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.

```json
{
  "projectId": "prj_6dbdPuMICnnZzLbFiU1EY5hnhpRr",
  "TimeUTC": "2026-01-27 12:45:08",
  "timestampInMs": 1769517908140,
  "requestPath": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/cron",
  "requestMethod": "GET",
  "requestQueryString": "",
  "responseStatusCode": 200,
  "requestId": "cb96z-1769517907454-c3b6fa5af292",
  "requestUserAgent": "vercel-cron/1.0",
  "environment": "production",
  "branch": "main",
  "vercelCache": "BYPASS",
  "host": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentDomain": "cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app",
  "deploymentId": "dpl_3Bxq6Ykw9k9i9z8yHdKgQKD42L9f",
  "traceId": "",
  "sessionId": "",
  "type": "function",
  "function": "/api/cron",
  "level": "error",
  "message": "(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not 
```


## ⚠️ 警告詳細


### 警告 1

- **タイムスタンプ**: 2026-01-27 12:51:33
- **リクエストパス**: cryptotradeacademy.vercel.app/api/x-webhook
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)


### 警告 2

- **タイムスタンプ**: 2026-01-27 12:48:51
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-algorithm-analysis
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)


### 警告 3

- **タイムスタンプ**: 2026-01-27 12:48:50
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-influencer-report
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)


### 警告 4

- **タイムスタンプ**: 2026-01-27 12:48:49
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-post-performance-analysis
- **メッセージ**: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)


### 警告 5

- **タイムスタンプ**: 2026-01-27 12:48:48
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **メッセージ**: [X Engagement Metrics] ⚠️ Impressions is still 0 for tweet 2015575666993811921 after 2207.8 minutes - may need investigation


### 警告 6

- **タイムスタンプ**: 2026-01-27 12:48:49
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **メッセージ**: [X Engagement Metrics] ⚠️ Impressions is still 0 for tweet 2015590763946446849 after 2147.8 minutes - may need investigation


### 警告 7

- **タイムスタンプ**: 2026-01-27 12:48:50
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **メッセージ**: [X Engagement Metrics] ⚠️ Impressions is still 0 for tweet 2015676532811788595 after 1807.0 minutes - may need investigation


### 警告 8

- **タイムスタンプ**: 2026-01-27 12:48:52
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **メッセージ**: [X Engagement Metrics] ⚠️ Impressions is still 0 for tweet 2015676537236861133 after 1807.0 minutes - may need investigation


### 警告 9

- **タイムスタンプ**: 2026-01-27 12:48:53
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **メッセージ**: [X Engagement Metrics] ⚠️ Impressions is still 0 for tweet 2015676545184977245 after 1807.0 minutes - may need investigation


### 警告 10

- **タイムスタンプ**: 2026-01-27 12:48:55
- **リクエストパス**: cryptotradeacademy-q7g3rs2gg-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **メッセージ**: [X Engagement Metrics] ⚠️ Impressions is still 0 for tweet 2015676552986452107 after 1807.0 minutes - may need investigation

