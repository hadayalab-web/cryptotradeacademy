# API 実装徹底チェックレポート

**実施日:** 2026-02-24  
**対象:** Whop API / Whop Webhook / FirstPromoter API / X API

---

## 1. サマリー

| API | 実装状況 | 主要課題 |
|-----|----------|----------|
| Whop API | ✅ 実装済み | WHOP_API_KEY が .env.example に未記載 |
| Whop Webhook | ✅ 実装済み | 特になし |
| FirstPromoter API | ✅ 実装済み | リトライなし、リード必須の検証 |
| FirstPromoter Webhook | ⚠️ 要確認 | WEBHOOK_SECRET 未設定時の検証スキップ |
| X API | ✅ 実装済み | 特になし |
| X Webhook | ✅ 実装済み | 特になし |

---

## 2. Whop API（REST API）

### 2.1 実装箇所

| ファイル | 役割 |
|----------|------|
| `services/whop/client.js` | Whop API v2 クライアント |
| `services/whop/promo-monitor.js` | プロモコード監視・自動補充 |
| `api/promo-stock-monitor.js` | Cron エンドポイント |

### 2.2 実装内容

- **認証:** `Authorization: Bearer ${WHOP_API_KEY}`
- **ベースURL:** `https://api.whop.com/api/v2`（WHOP_API_BASE_URL で上書き可）
- **実装済みエンドポイント:**
  - `GET/POST /promo_codes`（CRUD）
  - `GET/POST /products`（取得・更新）
  - `GET/POST /plans`
  - `GET/POST /experiences`
  - `GET/POST /memberships`（更新・キャンセル・終了含む）

### 2.3 チェック結果

| 項目 | 状態 | 備考 |
|------|------|------|
| 認証 | ✅ | Bearer トークン |
| エラーハンドリング | ✅ | try/catch、throw |
| タイムアウト | ❌ 未実装 | fetch に timeout なし |
| リトライ | ❌ 未実装 | 429/5xx 時のリトライなし |
| 環境変数 | ⚠️ | WHOP_API_KEY が .env.example に未記載 |
| 呼び出し元 | ✅ | promo-monitor, 各種 scripts |

### 2.4 呼び出し元一覧

- `api/promo-stock-monitor.js` → `monitorPromoCodeStock()` → `services/whop/promo-monitor.js` → `services/whop/client.js`
- `scripts/fetch-latest-whop-pricing.js`
- `scripts/list-whop-products.js`
- `scripts/verify-whop-pricing-changes.js`
- `scripts/fetch-whop-pricing-by-language.js`
- `scripts/test-whop-memberships.js`
- `scripts/track-traffic-sources.js`
- `scripts/update-whop-product-highlights.js`
- `scripts/test-whop-product-api.js`
- `scripts/whop-cli.js`

---

## 3. Whop Webhook

### 3.1 実装箇所

**ファイル:** `api/whop-webhook.js`

### 3.2 実装内容

- **署名検証:** HMAC SHA-256（`x-whop-signature`, `x-whop-timestamp`）
- **リプレイ対策:** タイムスタンプ ±5 分許容
- **タイミング攻撃対策:** `crypto.timingSafeEqual`
- **Raw body:** `raw-body` パッケージで取得（署名検証に必須）
- **購入イベント対応:**
  - checkout.completed, membership.created/renewed/activated, membership_activated
  - payment_succeeded, invoice_paid
- **ref_id 抽出:** metadata.ref_id, metadata.ref, referrer_url の ref/ref_id
- **promo_code 抽出:** checkout, membership, payment, invoice, metadata
- **FirstPromoter 連携:** ref_id または promo_code あり & amount > 0 で track/sale 送信
- **KV 保存:** コンバージョン、ユーザー別、ツイート別、インフルエンサー別統計

### 3.3 チェック結果

| 項目 | 状態 | 備考 |
|------|------|------|
| 署名検証 | ✅ | 本番では必須、開発時スキップ可能 |
| Raw body | ✅ | raw-body で取得、フォールバックあり |
| 環境変数 | ✅ | WHOP_WEBHOOK_SECRET（.env.example に記載） |
| エラー時レスポンス | ✅ | エラーでも 200 返却（Whop 要件） |
| Vercel 設定 | ✅ | includeFiles: {services/firstpromoter/**} |

### 3.4 依存確認

- **analytics-dashboard:** `api/analytics-dashboard.js` が存在し、`recordConversion` をエクスポート ✅

---

## 4. FirstPromoter API

### 4.1 実装箇所

**ファイル:** `services/firstpromoter/trackSale.js`

### 4.2 実装内容

- **エンドポイント:** `POST https://firstpromoter.com/api/v1/track/sale`
- **認証:** `X-API-KEY` ヘッダー
- **パラメータ:** event_id, amount（必須）、email, uid, ref_id, promo_code, currency, plan

### 4.3 チェック結果

| 項目 | 状態 | 備考 |
|------|------|------|
| API キー | ✅ | FIRSTPROMOTER_API_KEY 未設定時はスキップ |
| 必須パラメータ | ✅ | event_id, amount 必須チェック |
| 通貨 | ✅ | JPY は整数、他はセント |
| レスポンス | ✅ | 200, 204 を成功として扱う |
| リトライ | ❌ 未実装 | ネットワークエラー時のリトライなし |
| タイムアウト | ❌ 未実装 | fetch に timeout なし |

### 4.4 FirstPromoter 仕様メモ

- email または uid のいずれかが推奨（リード紐付け）
- ref_id または promo_code でプロモーター紐付け
- 現在 whop-webhook からは email を渡している ✅

---

## 5. FirstPromoter Webhook

### 5.1 実装箇所

**ファイル:** `api/firstpromoter-webhook.js`

### 5.2 実装内容

- **署名検証:** `x-firstpromoter-signature` または `x-webhook-signature` が WEBHOOK_SECRET と一致
- **WEBHOOK_SECRET 未設定時:** 署名検証をスキップ（⚠️ 本番では危険）
- **処理:** Promoter Accepted / Lead Signup 等を KV に記録

### 5.3 チェック結果

| 項目 | 状態 | 備考 |
|------|------|------|
| 署名検証 | ⚠️ | FIRSTPROMOTER_WEBHOOK_SECRET 未設定時スキップ |
| 本番推奨 | ⚠️ | 本番では必ず WEBHOOK_SECRET を設定 |
| KV 保存 | ✅ | firstpromoter:promoter:* / firstpromoter:events:list |

---

## 6. X API（REST API）

### 6.1 実装箇所

| ファイル | 役割 |
|----------|------|
| `services/x/client.js` | OAuth 1.0a / Bearer 認証、投稿・検索・ユーザー取得 |
| `services/x/dmClient.js` | DM 送信（アフィリエイトスカウト用） |
| `services/x/rateLimitTracker.js` | レート制限記録 |

### 6.2 実装内容

- **認証:**
  - OAuth 1.0a: CONSUMER_KEY, CONSUMER_KEY_SECRET, ACCESS_TOKEN, ACCESS_TOKEN_SECRET
  - Bearer: X_API_BEARER_TOKEN（Search API 用）
- **エンドポイント:** api.twitter.com/2（X_API_BASE_URL で上書き可）
- **実装済み API:**
  - postTweet（投稿）
  - searchTweets / searchPostsRecent（検索）
  - getUserByUsername, getMe（ユーザー）
  - uploadMedia, uploadVideo（メディア）
  - getTrends（トレンド v1.1）
  - DM: `/dm_conversations/with/{id}/messages`（dmClient）

### 6.3 チェック結果

| 項目 | 状態 | 備考 |
|------|------|------|
| OAuth 署名 | ✅ | クエリ含む URL で署名、finalUrl 一致 |
| リトライ | ✅ | 429, 5xx で指数バックオフ、最大 3 回 |
| タイムアウト | ✅ | 30 秒（xApiRequest）、60 秒（メディア） |
| レート制限 | ✅ | recordRateLimit で KV に記録 |
| エラーハンドリング | ✅ | 400/401/403/404 の区別、クレジット不足の可能性ログ |
| 環境変数 | ✅ | .env.example に全変数記載 |

### 6.4 DM 送信（dmClient.js）

- `getUserByUsername` で participant_id 取得
- `xApiRequest('/dm_conversations/with/{id}/messages', { method: 'POST', body: { text } })`
- テキスト 1〜10000 文字

---

## 7. X Webhook（Account Activity API）

### 7.1 実装箇所

**ファイル:** `api/x-webhook.js`

### 7.2 実装内容

- **CRC 検証:** GET 時に crc_token に対して HMAC SHA-256 で response_token 返却
- **署名検証:** `x-twitter-webhooks-signature`, `x-twitter-request-timestamp`
- **Raw body:** `raw-body` パッケージで取得
- **リプレイ対策:** タイムスタンプ ±5 分
- **イベント処理:**
  - favorite_events（いいね）
  - retweet_events（リツイート）
  - tweet_create_events（リプライ、tweet_queue 投入）
  - replay_job_status（署名検証スキップ、200 返却のみ）
- **KV:** ツイート別・インフルエンサー別エンゲージメント統計

### 7.3 チェック結果

| 項目 | 状態 | 備考 |
|------|------|------|
| CRC | ✅ | X_API_CONSUMER_KEY_SECRET 必須 |
| 署名検証 | ✅ | raw body 使用、本番では必須 |
| bodyParser | ✅ | bodyParser: false 推奨（config で設定） |
| ヘッダー名 | ✅ | x-twitter-webhooks-signature 等の揺れに対応 |
| replay_job_status | ✅ | 署名検証スキップ（仕様通り） |

---

## 8. 環境変数一覧（.env.example との整合）

| 変数 | 用途 | .env.example |
|------|------|--------------|
| WHOP_API_KEY | Whop REST API | ❌ 未記載 |
| WHOP_WEBHOOK_SECRET | Whop Webhook 署名 | ✅ |
| WHOP_PRODUCT_URL_* | 言語別商品 URL | コメントなし（whop-links で使用） |
| FIRSTPROMOTER_API_KEY | Track Sale API | ✅ |
| FIRSTPROMOTER_WEBHOOK_SECRET | FP Webhook 署名 | ✅ |
| FIRSTPROMOTER_INVITE_URL | DM 招待 URL | ✅ |
| X_API_BEARER_TOKEN | Search API | ✅ |
| X_API_CONSUMER_KEY | OAuth | ✅ |
| X_API_CONSUMER_KEY_SECRET | OAuth + Webhook CRC/署名 | ✅ |
| X_API_ACCESS_TOKEN | OAuth | ✅ |
| X_API_ACCESS_TOKEN_SECRET | OAuth | ✅ |
| CRON_SECRET | Cron 認証 | ✅ |

---

## 9. 推奨対応

### 優先度高

1. **WHOP_API_KEY を .env.example に追加**
   - promo-monitor / promo-stock-monitor が WHOP_API_KEY を必要とする

2. **FirstPromoter Webhook:** 本番で FIRSTPROMOTER_WEBHOOK_SECRET を必ず設定

### 優先度中

3. **Whop API client:** タイムアウト・リトライの追加（429/5xx 時）
4. **FirstPromoter trackSale:** ネットワークエラー時のリトライ

### 優先度低

5. **Whop updatePromoCode:** Whop API v2 が PATCH を要求する場合は要確認（現在 POST）

---

## 10. vercel.json 設定確認

| API | Cron/Route | includeFiles |
|-----|------------|--------------|
| whop-webhook | なし（Webhook のみ） | services/firstpromoter/** |
| firstpromoter-webhook | なし | なし |
| promo-stock-monitor | vercel.json に cron 未確認 | なし（whop/client が require される） |
| x-webhook | なし | なし |
| affiliate-scout-run | */15 * * * * | config, services/td, services/x, utils |
| cron | 0,6,12,18 時 | api/services, config, services/telegram/messages |

※ promo-stock-monitor は api として存在するが、vercel.json の crons には未登録。外部 Cron または手動呼び出しが必要。
