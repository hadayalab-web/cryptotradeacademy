# Whop サポートへの質問（アフィリエイト紹介元の紐づけ）

**使い方:** Whop のサポートチャット（whop.com 右下のオレンジのチャットアイコン）または [Help Center](https://help.whop.com/en/) から問い合わせる際に、下記をコピペして送る。

---

## 実装済み: ref 付きチェックアウト入口

- **API:** `GET /api/whop-checkout?ref=REQUIRED&lang=en&plan=monthly`
- **処理:** `ref` を受け取り、Whop の `createCheckoutSession` で `metadata: { ref, ref_id }` を付与してセッション作成 → 返却された `purchase_url` に 302 リダイレクト。
- **運用:** FirstPromoter の「Default Referral Link URL」を `https://あなたのドメイン/api/whop-checkout` に設定。FirstPromoter が自動で `?ref=xxx` を付与する。
- **環境変数:** `WHOP_API_KEY` 必須。**6言語×3プラン**なら `WHOP_CHECKOUT_PLAN_ID_${LANG}_${PLAN}` のパターンで18個（例: `WHOP_CHECKOUT_PLAN_ID_EN_MONTHLY`, `WHOP_CHECKOUT_PLAN_ID_JA_QUARTERLY`）。Whop「チェックアウト・リンク」で各プランの ⋯ から plan_xxx をコピーして設定。未設定の組み合わせは `WHOP_CHECKOUT_PLAN_ID` や Product ID による解決にフォールバック。
- **Webhook:** 既存の `api/whop-webhook.js` が `metadata.ref` / `metadata.ref_id` を読んで FirstPromoter に `track/sale` で送っているため、このAPI経由の成約はアフィリに紐づく。

---

## Whop サポート回答（公式）

> You can track things like UTMs via **checkout session metadata**: when you create a session with **`whopSdk.payments.createCheckoutSession()`**, pass your values in the **`utm`** property, and that metadata will be available later via the created session, via webhook events (the metadata is included), or by retrieving the session through the API.
>
> For passing an **affiliate/referral ID**, the recommended approach is to **attach it to the checkout session metadata/UTM at session creation**, rather than relying on Whop automatically capturing arbitrary query params from the product/checkout URL.
>
> For the exact webhook payload schemas, all webhook schemas are documented in the [API Reference](https://docs.whop.com/api-reference/); you can jump straight to the hook docs like [Payment Succeeded](https://docs.whop.com/api-reference/payments/payment-succeeded).

### 実装への示唆

| 項目 | 内容 |
|------|------|
| **ref を Webhook で受け取る** | チェックアウト**作成時**に `createCheckoutSession()` の `utm`（または metadata）に `ref` / `ref_id` を渡す必要がある。商品ページURLのクエリを自動では拾わない。 |
| **現状** | 当方では `createCheckoutSession` を呼んでおらず、Whop の通常の商品ページ→チェックアウトフローのみ。そのため Webhook に ref が入っていない可能性が高い。 |
| **対応案** | (A) **自前でチェックアウトセッション作成 API を用意する**: アフィリエイトリンクを「当方のエンドポイント?ref=xxx」にし、その API が `whopSdk.payments.createCheckoutSession({ ..., utm: { ref: ref } })` を実行してリダイレクトURLを返す。ユーザーはそのURLで決済し、Webhook に metadata/utm が含まれる。(B) **プロモコード方式**: アフィリエイトごとにプロモコードを発行し、適用時に Webhook の `promo_code` で紐づける（既存コードで取得済み）。 |
| **スキーマ確認** | [API Reference](https://docs.whop.com/api-reference/) → 各リソースの "hook" ページ（例: Payment Succeeded）でペイロード項目を確認。 |

---

## 英文（コピペ用）

```
Hi,

We use Whop webhooks (e.g. payment.succeeded, membership.activated) to attribute sales to our affiliates via a third-party tool (FirstPromoter). To do that we need to know **which referrer or affiliate** led the customer to the checkout.

Could you please confirm:

1. **Does the checkout or payment webhook payload include any of the following?**
   - `referrer_url` (the URL the customer came from when they started checkout), or
   - `metadata` (e.g. custom key-value such as `ref`, `ref_id`, or UTM params like `utm_source`) that we can pass when sending the user to the product/checkout page?

2. **If we want to pass a referral ID (e.g. ref=abc123) from the product page URL to the webhook**, what is the recommended way?
   - Does Whop capture query parameters from the initial product/checkout URL and include them in the webhook payload (e.g. in `metadata` or `referrer_url`)?
   - Or do we need to use a specific Whop feature (e.g. promo codes, or a custom field) to attach the referrer ID to the checkout?

3. **Where can we find the exact webhook payload schema** for events like `payment.succeeded` or checkout-completed, including all optional fields like `referrer_url` and `metadata`?

Our goal: when a customer buys after clicking an affiliate’s link, we need to receive that affiliate’s identifier in the webhook so we can send it to our affiliate platform. Any documentation or example payload would be very helpful.

Thank you.
```

---

## 日本語（参考）

> 私たちは Whop の Webhook（payment.succeeded や membership.activated など）を受信し、第三者ツール（FirstPromoter）でアフィリエイトに売上を紐づけています。そのために、**どの紹介元・アフィリエイトが顧客をチェックアウトに導いたか**を知る必要があります。
>
> 以下を確認させてください：
>
> 1. チェックアウトまたは決済の Webhook ペイロードに、`referrer_url`（顧客がチェックアウトを始めたときの元URL）や、`metadata`（ref / ref_id や utm_source などのカスタムキー）は含まれますか？
> 2. 商品ページURLから紹介ID（例: ref=abc123）を Webhook まで渡したい場合、推奨される方法はありますか？Whop は商品/チェックアウトURLのクエリパラメータを取得して Webhook に含めますか？それともプロモコード等の別機能を使う必要がありますか？
> 3. payment.succeeded やチェックアウト完了の **Webhook ペイロードの正確なスキーマ**（referrer_url や metadata などのオプション項目含む）はどこで確認できますか？
>
> 目的：アフィリエイトのリンクから購入した顧客について、Webhook でアフィリエイト識別子を受け取り、アフィリエイトプラットフォームに送りたいです。ドキュメントやペイロード例があれば助かります。

---

## 問い合わせ先

- **ライブチャット:** [whop.com](https://whop.com) を開き、画面右下のオレンジのチャットアイコンをクリック
- **Help Center:** https://help.whop.com/en/
- **開発者ダッシュボード:** https://whop.com/dashboard/developer （Webhook 設定・Secret 確認）
