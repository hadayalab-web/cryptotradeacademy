# logs_result (3).json 分析レポート
**作成日時**: 2026-01-27T01:55:57.899Z

## 📊 サマリー

- **総ログ数**: 1,000件

## 🔔 Webhookログ

- **GETリクエスト（CRC検証）**: 2件
- **CRC検証成功**: 2件
- **POSTリクエスト（イベント受信）**: 2件
- **いいねイベント**: 0件
- **リツイートイベント**: 0件
- **リプライイベント**: 0件

## 🐦 X APIログ

- **APIリクエスト**: 0件
- **APIレスポンス**: 0件
- **引用リポスト投稿**: 0件
- **ツイート投稿**: 0件
- **エラー**: 0件

⚠️ **警告**: X APIへのリクエストが1件も記録されていません。

考えられる原因:
1. X APIが呼び出されていない（タイミングチェックや制限でスキップされている）
2. ログの取得範囲外（時間範囲の問題）
3. ログが記録されていない

## 📍 エンドポイント別の集計

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/cron
- **リクエスト数**: 359件
- **ステータスコード**: 200: 346

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-quote-repost
- **リクエスト数**: 264件
- **ステータスコード**: 200: 264

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-engagement-metrics
- **リクエスト数**: 225件
- **ステータスコード**: 200: 225

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/promo-stock-monitor
- **リクエスト数**: 95件
- **ステータスコード**: 200: 95

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/vsl2-last-call
- **リクエスト数**: 14件
- **ステータスコード**: 200: 14

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/vsl2-free-users
- **リクエスト数**: 14件
- **ステータスコード**: 200: 14

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-quote-repost-metrics
- **リクエスト数**: 13件
- **ステータスコード**: 200: 13

### cryptotradeacademy.vercel.app/api/x-webhook
- **リクエスト数**: 9件
- **ステータスコード**: 200: 6

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/vsl1-reminder
- **リクエスト数**: 4件
- **ステータスコード**: 200: 4

### cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-post-performance-analysis
- **リクエスト数**: 3件
- **ステータスコード**: 200: 3

## ❌ エラーログ

- **総エラー数**: 46件

### エラーパターン
- **Timeout**: 19件
- **Other**: 16件
- **Failed**: 11件

### 主要なエラー（最初の10件）
1. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/cron
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:45:04.383Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

2. **Unknown**
   - パス: cryptotradeacademy.vercel.app/api/x-webhook
   - メソッド: Unknown
   - ステータスコード: Unknown
   - メッセージ: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

3. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/cron
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:30:04.699Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

4. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/cron
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:15:04.445Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

5. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: ❌ Failed to post quote reposts for ko: Assignment to constant variable.

6. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-quote-repost
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: ❌ Failed to post quote reposts for ko: Assignment to constant variable.

7. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-post-performance-analysis
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

8. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/x-quote-repost-metrics
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: [Quote Repost Metrics] Completed: 1 successful, 0 failed

9. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/cron
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:00:04.882Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

10. **Unknown**
   - パス: cryptotradeacademy-1v1z30uys-hadayalab-projects-projects.vercel.app/api/cron
   - メソッド: Unknown
   - ステータスコード: 200
   - メッセージ: {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T00:45:04.477Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

## ⚠️ 警告ログ

- **総警告数**: 50件

## 🔍 重要な発見

3. **X APIリクエストが0件**
   - X APIが呼び出されていない可能性があります
   - タイミングチェックや制限でスキップされている可能性があります

4. **X API投稿が0件**
   - 実際に投稿が実行されていない可能性があります
   - エラーが発生して投稿に失敗している可能性があります

## 💡 推奨事項

1. **Webhook URLの確認**
   - X API Developer PortalでWebhook URLが正しく登録されているか確認
   - Webhook URLがHTTPSであることを確認
   - Webhook URLが公開アクセス可能であることを確認

2. **イベントサブスクリプションの確認**
   - X API Developer Portalでイベントサブスクリプションが有効になっているか確認
   - 必要なイベントタイプがサブスクライブされているか確認

3. **X API呼び出しの確認**
   - Vercelログで`[X API] 🔵 xApiRequest called`を検索
   - Vercelログで`[Quote Repost] 🔵 About to call postQuoteTweet`を検索
   - タイミングチェックや制限でスキップされていないか確認

4. **エラーログの確認**
   - Vercelログでエラーメッセージを検索
   - X APIエラーの詳細を確認
