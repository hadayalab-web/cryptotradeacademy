# Vercelデプロイ後12時間分のログ徹底分析レポート
**生成日時**: 2026-01-27T01:38:48.316Z
**分析対象**: logs_result (2).json

## 📊 サマリー

- **総ログ数**: 1000件
- **エラー数**: 44件
- **警告数**: 37件
- **情報ログ**: 919件
- **期間**: 2026-01-26 21:00:44 ～ 2026-01-27 01:35:56

## 📡 X Webhook分析

### CRC Challenge-Response Check
- **総リクエスト数**: 3件
- **最初のリクエスト**: 2026-01-27 01:35:56
- **最後のリクエスト**: 2026-01-27 01:35:55

### POSTリクエスト（Webhookイベント）
- **総リクエスト数**: 0件

### イベントタイプ別
- **いいね**: 0件
- **リツイート**: 0件
- **リプライ**: 0件
- **その他**: 0件

## 🔍 エンドポイント別分析

### cron
- **総リクエスト数**: 345件
- **平均処理時間**: 4824ms
- **エラー数**: 32件

#### HTTPメソッド
- GET: 345件

#### ステータスコード
- 200: 332件

#### エラー詳細（最初の5件）
1. **[2026-01-27 01:30:04]**
   {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:30:04.699Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

2. **[2026-01-27 01:15:04]**
   {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:15:04.445Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

3. **[2026-01-27 01:00:04]**
   {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:00:04.882Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

4. **[2026-01-27 00:45:04]**
   {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T00:45:04.477Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

5. **[2026-01-27 00:30:04]**
   {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T00:30:04.036Z","error":"OpenAI API error: 400","isTimeout":true,"apiKe

### x-quote-repost
- **総リクエスト数**: 289件
- **平均処理時間**: 15974ms
- **エラー数**: 10件

#### HTTPメソッド
- GET: 289件

#### ステータスコード
- 200: 289件

#### エラー詳細（最初の5件）
1. **[2026-01-27 01:00:46]**
   ❌ Failed to post quote reposts for ko: Assignment to constant variable.

2. **[2026-01-27 01:00:48]**
   ❌ Failed to post quote reposts for ko: Assignment to constant variable.

3. **[2026-01-27 00:00:46]**
   ❌ Failed to post quote reposts for ar: Assignment to constant variable.

4. **[2026-01-27 00:00:48]**
   ❌ Failed to post quote reposts for ar: Assignment to constant variable.

5. **[2026-01-26 22:00:47]**
   ❌ Failed to post quote reposts for pt-br: Assignment to constant variable.

### x-engagement-metrics
- **総リクエスト数**: 225件
- **平均処理時間**: 50219ms
- **エラー数**: 0件

#### HTTPメソッド
- GET: 225件

#### ステータスコード
- 200: 225件

### promo-stock-monitor
- **総リクエスト数**: 90件
- **平均処理時間**: 694ms
- **エラー数**: 0件

#### HTTPメソッド
- GET: 90件

#### ステータスコード
- 200: 90件

### vsl2-last-call
- **総リクエスト数**: 14件
- **平均処理時間**: 383ms
- **エラー数**: 0件

#### HTTPメソッド
- GET: 14件

#### ステータスコード
- 200: 14件

### vsl2-free-users
- **総リクエスト数**: 14件
- **平均処理時間**: 415ms
- **エラー数**: 0件

#### HTTPメソッド
- GET: 14件

#### ステータスコード
- 200: 14件

### x-quote-repost-metrics
- **総リクエスト数**: 13件
- **平均処理時間**: 2158ms
- **エラー数**: 0件

#### HTTPメソッド
- GET: 13件

#### ステータスコード
- 200: 13件

### vsl1-reminder
- **総リクエスト数**: 4件
- **平均処理時間**: 543ms
- **エラー数**: 0件

#### HTTPメソッド
- GET: 4件

#### ステータスコード
- 200: 4件

### x-webhook
- **総リクエスト数**: 3件
- **平均処理時間**: 28ms
- **エラー数**: 1件

#### HTTPメソッド
- GET: 3件

#### エラー詳細（最初の5件）
1. **[2026-01-27 01:35:56]**
   (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

### x-post-performance-analysis
- **総リクエスト数**: 3件
- **平均処理時間**: 931ms
- **エラー数**: 1件

#### HTTPメソッド
- GET: 3件

#### ステータスコード
- 200: 3件

#### エラー詳細（最初の5件）
1. **[2026-01-27 01:00:41]**
   (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.pars

## ❌ エラー分析

### 総エラー数: 44件

### よくあるエラー（トップ10）
1. **error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}** (18回)
2. **(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to error** (4回)
3. **❌ Failed to post quote reposts for es: Assignment to constant variable.** (4回)
4. **❌ Failed to post quote reposts for ko: Assignment to constant variable.** (2回)
5. **❌ Failed to post quote reposts for ar: Assignment to constant variable.** (2回)
6. **❌ Failed to post quote reposts for pt-br: Assignment to constant variable.** (2回)
7. **[REGULAR] Error processing language en: integratedOptimization is not defined** (1回)
8. **[REGULAR] Error processing language es: integratedOptimization is not defined** (1回)
9. **[REGULAR] Error processing language pt-br: integratedOptimization is not defined** (1回)
10. **[REGULAR] Error processing language ar: integratedOptimization is not defined** (1回)

### エラー詳細（最初の20件）
1. **[2026-01-27 01:35:56]** x-webhook (GET)
   - Status: N/A
   - (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
   - Request ID: tngtt-1769477755750-272828c421f7

2. **[2026-01-27 01:30:04]** cron (GET)
   - Status: 200
   - {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:30:04.699Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}
   - Request ID: db7d9-1769477403282-1cbd0ef8a8b3

3. **[2026-01-27 01:15:04]** cron (GET)
   - Status: 200
   - {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:15:04.445Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}
   - Request ID: h664x-1769476503307-9efb7b6174f1

4. **[2026-01-27 01:00:46]** x-quote-repost (GET)
   - Status: 200
   - ❌ Failed to post quote reposts for ko: Assignment to constant variable.
   - Request ID: tmczm-1769475644429-39713e1e95c2

5. **[2026-01-27 01:00:48]** x-quote-repost (GET)
   - Status: 200
   - ❌ Failed to post quote reposts for ko: Assignment to constant variable.
   - Request ID: tmczm-1769475644429-39713e1e95c2

6. **[2026-01-27 01:00:41]** x-post-performance-analysis (GET)
   - Status: 200
   - (node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
   - Request ID: zhg57-1769475641255-06f5ff5f6590

7. **[2026-01-27 01:00:04]** cron (GET)
   - Status: 200
   - {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T01:00:04.882Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}
   - Request ID: cwfw6-1769475603308-089edac917fb

8. **[2026-01-27 00:45:04]** cron (GET)
   - Status: 200
   - {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T00:45:04.477Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}
   - Request ID: q6cwq-1769474703301-b8f5cc07443e

9. **[2026-01-27 00:30:04]** cron (GET)
   - Status: 200
   - {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T00:30:04.036Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}
   - Request ID: pldj8-1769473803296-172c282bb3d4

10. **[2026-01-27 00:15:04]** cron (GET)
   - Status: 200
   - {"level":"error","service":"gpt-client","prefix":"analyzeCryptoQuantData","msg":"GPT API failed after retries","time":"2026-01-27T00:15:04.427Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}
   - Request ID: 2vpfv-1769472903166-d58fd3e31d54

11. **[2026-01-27 00:00:46]** x-quote-repost (GET)
   - Status: 200
   - ❌ Failed to post quote reposts for ar: Assignment to constant variable.
   - Request ID: wpg86-1769472044196-97fcfe690338

12. **[2026-01-27 00:00:48]** x-quote-repost (GET)
   - Status: 200
   - ❌ Failed to post quote reposts for ar: Assignment to constant variable.
   - Request ID: wpg86-1769472044196-97fcfe690338

13. **[2026-01-27 00:00:12]** cron (GET)
   - Status: 200
   - {"level":"error","service":"gpt-client","prefix":"generateCryptoQuantAnalysis","msg":"GPT API failed after retries","time":"2026-01-27T00:00:12.833Z","error":"OpenAI API error: 400","isTimeout":true,"apiKeyMasked":"sk-***z4A"}
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

14. **[2026-01-27 00:01:00]** cron (GET)
   - Status: 200
   - [REGULAR] Error processing language en: integratedOptimization is not defined
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

15. **[2026-01-27 00:01:00]** cron (GET)
   - Status: 200
   - [REGULAR] Error processing language es: integratedOptimization is not defined
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

16. **[2026-01-27 00:01:00]** cron (GET)
   - Status: 200
   - [REGULAR] Error processing language pt-br: integratedOptimization is not defined
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

17. **[2026-01-27 00:01:00]** cron (GET)
   - Status: 200
   - [REGULAR] Error processing language ar: integratedOptimization is not defined
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

18. **[2026-01-27 00:01:00]** cron (GET)
   - Status: 200
   - [REGULAR] Error processing language ja: integratedOptimization is not defined
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

19. **[2026-01-27 00:01:00]** cron (GET)
   - Status: 200
   - [REGULAR] Error processing language ko: integratedOptimization is not defined
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

20. **[2026-01-27 00:01:00]** cron (GET)
   - Status: 200
   - [Grok+Gemini Optimizer] Error optimizing MINIMAL for en: optimizeWithGrokAndGemini is not defined
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

## ⏱️ パフォーマンス分析

- **平均処理時間**: 4075ms
- **最大処理時間**: 58589ms
- **遅いリクエスト（>1秒）**: 44件

### 遅いリクエスト（トップ10）
1. **[2026-01-27 00:00:03]** cron (GET)
   - 処理時間: 58589ms
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

2. **[2026-01-27 00:00:03]** cron (GET)
   - 処理時間: 58543ms
   - Request ID: xkjpd-1769472003689-fe07b80e47d8

3. **[2026-01-27 00:00:11]** x-engagement-metrics (GET)
   - 処理時間: 50275ms
   - Request ID: 89bq5-1769472011118-6a634d6dc823

4. **[2026-01-27 00:00:11]** x-engagement-metrics (GET)
   - 処理時間: 50162ms
   - Request ID: 89bq5-1769472011118-6a634d6dc823

5. **[2026-01-26 22:00:44]** x-quote-repost (GET)
   - 処理時間: 43779ms
   - Request ID: xc9pg-1769464844356-1c76edda03c4

6. **[2026-01-26 22:00:44]** x-quote-repost (GET)
   - 処理時間: 43749ms
   - Request ID: xc9pg-1769464844356-1c76edda03c4

7. **[2026-01-26 21:00:44]** x-quote-repost (GET)
   - 処理時間: 5064ms
   - Request ID: spmgr-1769461244466-fbd844631fc5

8. **[2026-01-27 00:00:44]** x-quote-repost (GET)
   - 処理時間: 4910ms
   - Request ID: wpg86-1769472044196-97fcfe690338

9. **[2026-01-27 00:00:44]** x-quote-repost (GET)
   - 処理時間: 4883ms
   - Request ID: wpg86-1769472044196-97fcfe690338

10. **[2026-01-27 01:00:44]** x-quote-repost (GET)
   - 処理時間: 4728ms
   - Request ID: tmczm-1769475644429-39713e1e95c2

## 📋 HTTPメソッド別統計

- **GET**: 1000件

## 📊 ステータスコード別統計

- **2xx**: 984件

## 🔧 推奨事項

### エラー対応
- 44件のエラーが検出されました。エラー詳細を確認し、根本原因を特定してください。

### パフォーマンス改善
- 44件の遅いリクエストが検出されました。最適化を検討してください。

---
**レポート生成日時**: 2026-01-27T01:38:48.323Z