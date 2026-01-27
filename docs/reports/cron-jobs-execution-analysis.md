# Cron Jobs実行状況詳細分析レポート
**作成日時**: 2026-01-27T01:59:42.557Z

## 📊 サマリー

- **総ログ数**: 1,000件
- **全体の成功率**: 98.7%

## 🔄 各Cron Jobの実行状況

| Cron Job | 総リクエスト数 | 成功 | エラー | 警告 | 成功率 |
|----------|----------------|------|--------|------|--------|
| api/cron | 359件 | 346件 | 33件 | 4件 | 96.4% |
| api/x-quote-repost | 277件 | 277件 | 10件 | 4件 | 100.0% |
| api/x-engagement-metrics | 225件 | 225件 | 1件 | 35件 | 100.0% |
| api/promo-stock-monitor | 95件 | 95件 | 0件 | 0件 | 100.0% |
| api/vsl2-last-call | 14件 | 14件 | 0件 | 2件 | 100.0% |
| api/vsl2-free-users | 14件 | 14件 | 0件 | 2件 | 100.0% |
| api/x-quote-repost-metrics | 13件 | 13件 | 1件 | 0件 | 100.0% |
| api/vsl1-reminder | 4件 | 4件 | 0件 | 1件 | 100.0% |
| api/x-post-performance-analysis | 3件 | 3件 | 1件 | 1件 | 100.0% |

## ⚠️ 問題のあるCron Jobs

### api/cron
- **総リクエスト数**: 359件
- **成功**: 346件
- **エラー**: 33件
- **警告**: 4件
- **成功率**: 96.4%

#### エラーの詳細（最初の5件）
1. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:45:04.383Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}

2. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:30:04.699Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}

3. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:15:04.445Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}

4. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:00:04.882Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}

5. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T00:45:04.477Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}

### api/x-quote-repost
- **総リクエスト数**: 277件
- **成功**: 277件
- **エラー**: 10件
- **警告**: 4件
- **成功率**: 100.0%

#### エラーの詳細（最初の5件）
1. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: ❌ Failed to post quote reposts for ko: Assignment to constant variable.

2. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: ❌ Failed to post quote reposts for ko: Assignment to constant variable.

3. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: [Quote Repost Metrics] Completed: 1 successful, 0 failed

4. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: ❌ Failed to post quote reposts for ar: Assignment to constant variable.

5. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: ❌ Failed to post quote reposts for ar: Assignment to constant variable.

### api/x-engagement-metrics
- **総リクエスト数**: 225件
- **成功**: 225件
- **エラー**: 1件
- **警告**: 35件
- **成功率**: 100.0%

#### エラーの詳細（最初の5件）
1. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: Failed: 0/35

### api/x-quote-repost-metrics
- **総リクエスト数**: 13件
- **成功**: 13件
- **エラー**: 1件
- **警告**: 0件
- **成功率**: 100.0%

#### エラーの詳細（最初の5件）
1. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: [Quote Repost Metrics] Completed: 1 successful, 0 failed

### api/x-post-performance-analysis
- **総リクエスト数**: 3件
- **成功**: 3件
- **エラー**: 1件
- **警告**: 1件
- **成功率**: 100.0%

#### エラーの詳細（最初の5件）
1. **Unknown**
   - ステータスコード: Unknown
   - メッセージ: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)

## 🔍 重要な発見

### 1. x-quote-repostエンドポイント
- **総リクエスト数**: 277件
- **成功**: 277件
- **エラー**: 10件
- **成功率**: 100.0%

⚠️ **問題**: エラーが発生しています。

**主なエラー**:
- Assignment to constant variable: 9件

### 2. cron.jsエンドポイント
- **総リクエスト数**: 359件
- **成功**: 346件
- **エラー**: 33件
- **成功率**: 96.4%

⚠️ **問題**: エラーが発生しています。

- GPT APIエラー: 19件

## 💡 推奨事項

1. **エラーの修正**
   - 各Cron Jobのエラーログを確認
   - エラーの原因を特定して修正
   - 特に`Assignment to constant variable`エラーは修正がデプロイされていない可能性があります

2. **Cron Jobsの監視強化**
   - 各Cron Jobの実行状況を定期的に確認
   - エラー率が高いCron Jobを優先的に修正
   - 成功率が90%未満のCron Jobを調査

3. **デバッグログの追加**
   - 各Cron Jobの処理開始時にログを記録
   - エラー発生時に詳細な情報をログに記録
   - 処理完了時に成功/失敗をログに記録
