# Whop 6言語 × FirstPromoter 実装タスク

DM スカウトテスト完了後に実施する。

---

## 前提

| 言語 | Whop 商品 | DM スカウト | FirstPromoter |
|------|-----------|-------------|----------------|
| en | WHOP_PRODUCT_URL_EN | ✅ | 招待URL |
| es | WHOP_PRODUCT_URL_ES | ✅ | 招待URL |
| pt | WHOP_PRODUCT_URL_PTBR | ✅ | 招待URL |
| ar | WHOP_PRODUCT_URL_AR | ✅ | 招待URL |
| ko | WHOP_PRODUCT_URL_KO | ✅ | 招待URL |
| ja | WHOP_PRODUCT_URL_JA | ✅ | 招待URL |

---

## 1. FirstPromoter 側タスク

### 1.1 招待 URL（Signup link）

- [ ] **単一URL + ?lang= 方式**: `FIRSTPROMOTER_INVITE_URL` を 1 つ設定し、`?lang=es` 等で言語切り替え。FirstPromoter がサポートしているか確認。
- [ ] **言語別キャンペーン/リンク方式**: 言語ごとに別 Signup リンクが必要な場合は、FirstPromoter で 6 キャンペーン作成し、各 Signup リンクを取得。

### 1.2 環境変数（当方）

現在は `getFirstPromoterInviteUrl(lang)` が `base + ?lang=xx` を返す。
言語別リンクが必要なら:

```
FIRSTPROMOTER_INVITE_URL_EN=https://...
FIRSTPROMOTER_INVITE_URL_ES=https://...
FIRSTPROMOTER_INVITE_URL_PT=https://...
FIRSTPROMOTER_INVITE_URL_AR=https://...
FIRSTPROMOTER_INVITE_URL_KO=https://...
FIRSTPROMOTER_INVITE_URL_JA=https://...
```

未設定時は `FIRSTPROMOTER_INVITE_URL` + `?lang=` にフォールバック。

---

## 2. ランディング / 商品ページでの ref_id 受け渡し

購入者がアフィリエイターの ref 付き URL 経由で来た場合、Whop checkout の `metadata` または `referrer` に `ref_id` を載せる必要がある。

- [ ] 各言語の Whop 商品ページ / ランディングで、URL の `ref` パラメータを checkout まで引き継ぐ実装を確認
- [ ] またはプロモコード方式: 言語別プロモコードを FirstPromoter と Whop に登録し、アフィリエイターごとに割り当て

---

## 3. whop-webhook → track/sale

`api/whop-webhook.js` はすでに `membership_activated`, `payment_succeeded`, `invoice_paid` 等に対応済み。
`metadata.ref_id` または `checkout.promo_code` が取れれば自動で FirstPromoter に track/sale 送信。

- [ ] テスト購入で ref_id が Webhook ペイロードに含まれるか検証
- [ ] 6 言語すべてで同様に動作するか確認（Whop の商品が言語別でも Webhook 形式は同一想定）

---

## 4. 担当者チェックリスト

| # | タスク | 担当 |
|---|--------|------|
| 1 | FirstPromoter で 6 言語分の招待/Signup 設定を確認 | 運用 |
| 2 | 必要なら言語別 Invite URL を環境変数に追加 | 開発 |
| 3 | 各言語の Whop 商品ページで ref 受け渡しを確認 | 運用/開発 |
| 4 | テスト購入で track/sale 連携を検証 | 運用 |
