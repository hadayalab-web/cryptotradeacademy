# FirstPromoter × Whop 6言語連携チェックレポート

**作成日:** 2026-02-21  
**目的:** 6言語（EN/ES/PT/AR/KO/JA）のページごとに FirstPromoter と Whop が正常に連携しているか実装をチェックする。

---

## 1. 連携フロー概要

```
[アフィリエイター] → {{promotion.referral_link}}（FirstPromoter 発行）
    → [購入者] クリック → Whop 商品ページ（言語別）
        → チェックアウト（ref_id / promo_code 含む）
            → Whop Webhook → api/whop-webhook.js
                → FirstPromoter track/sale API
```

---

## 2. コード実装状況（✅ 実装済み）

### 2.1 Whop 商品 URL（6言語）

| 言語 | ソース | URL |
|------|--------|-----|
| en | `services/telegram/whop-links.js` | `https://whop.com/trapdefence/btc-regular-en/` |
| es | 同上 | `https://whop.com/trapdefence/btc-regular-es/` |
| pt | 同上（pt-br） | `https://whop.com/trapdefence/btc-regular-pt/` |
| ar | 同上 | `https://whop.com/trapdefence/btc-regular-ar/` |
| ko | 同上 | `https://whop.com/trapdefence/btc-regular-ko/` |
| ja | 同上 | `https://whop.com/trapdefence/btc-regular-ja/` |

**環境変数で上書き可:** `WHOP_PRODUCT_URL_EN`, `_ES`, `_PTBR`, `_AR`, `_KO`, `_JA`

### 2.2 Whop Webhook → FirstPromoter

- **api/whop-webhook.js**
  - 購入イベント（checkout.completed, membership.activated, payment_succeeded, invoice_paid 等）を受信
  - `metadata.ref_id` / `metadata.ref` / referrer URL の `ref` / `ref_id` を取得
  - `checkout.promo_code` または `metadata.promo_code` を取得
  - **ref_id または promo_code が取得でき、amount > 0 の場合** → `services/firstpromoter/trackSale.js` で track/sale 送信
  - **6言語すべて同じ Webhook エンドポイント**。Whop の商品が言語別でも Webhook ペイロード形式は同一の想定 ✅

### 2.3 FirstPromoter 招待 URL（DM スカウト用）

- **config/affiliateScoutConfig.js** の `getFirstPromoterInviteUrl(lang)`
  - 現在: `FIRSTPROMOTER_INVITE_URL` + `?lang=xx`（en 以外）
  - 言語別 URL 未実装（`FIRSTPROMOTER_INVITE_URL_EN` 等の env は .env.example に記載なし）

---

## 3. 要確認項目（ダッシュボード・運用）

### 3.1 FirstPromoter 側（手動確認必須）

| # | 確認項目 | 状態 | 担当 |
|---|----------|------|------|
| 1 | **6キャンペーン**（Trap Defence EN / ES / PT / AR / KO / JA）が作成されているか | ⬜ 未確認 | 運用 |
| 2 | **各キャンペーンの Signup URL** が言語に応じて正しく設定されているか | ⬜ 未確認 | 運用 |
| 3 | **各キャンペーンの referral link 先**（Destination URL）が、対応する Whop 商品ページを指しているか | ⬜ 未確認 | 運用 |

**推奨マッピング:**
- EN キャンペーン → `https://whop.com/trapdefence/btc-regular-en/`
- ES キャンペーン → `https://whop.com/trapdefence/btc-regular-es/`
- PT キャンペーン → `https://whop.com/trapdefence/btc-regular-pt/`
- AR キャンペーン → `https://whop.com/trapdefence/btc-regular-ar/`
- KO キャンペーン → `https://whop.com/trapdefence/btc-regular-ko/`
- JA キャンペーン → `https://whop.com/trapdefence/btc-regular-ja/`

### 3.2 Whop 側（手動確認必須）

| # | 確認項目 | 状態 | 担当 |
|---|----------|------|------|
| 4 | **各言語の商品ページ**で、URL の `ref` パラメータがチェックアウトまで引き継がれるか | ⬜ 未確認 | 運用/開発 |
| 5 | **DEFEND50** プロモコードが 6 商品すべてで有効か | ⬜ 未確認 | 運用 |
| 6 | **Company Webhook** の送信先が `https://{your-domain}/api/whop-webhook` で正しく設定されているか | ⬜ 未確認 | 運用 |
| 7 | **WHOP_WEBHOOK_SECRET** が Vercel に設定され、署名検証が有効か | ⬜ 未確認 | 運用 |

### 3.3 環境変数

| 変数 | 用途 | 必須 |
|------|------|------|
| `FIRSTPROMOTER_API_KEY` | track/sale API 認証 | ✅ |
| `WHOP_WEBHOOK_SECRET` | Whop Webhook 署名検証 | ✅ 本番 |
| `FIRSTPROMOTER_INVITE_URL` | DM スカウト招待 URL のベース | 推奨 |

---

## 4. テスト購入で検証すべきこと

1. **各言語**（EN/ES/PT/AR/KO/JA）で、アフィリエイターの ref リンク経由で商品ページにアクセス
2. チェックアウトで **DEFEND50** を入力し、テスト購入を完了
3. **Vercel Logs** で `[Whop Webhook] ✅ FirstPromoter track/sale sent` が出ているか確認
4. **FirstPromoter ダッシュボード**で、該当プロモーターに売上・報酬が紐付いているか確認

---

## 5. 言語コードの差異（pt vs pt-br）— ✅ 修正済み

| 箇所 | 使用値 |
|------|--------|
| affiliateScoutConfig.js (AFFILIATE_SCOUT_LANGS) | `pt` |
| whop-links.js (SUPPORTED_LANGS) | `pt-br` |
| promo-monitor.js | `pt-br` |

**対応済み:** `services/telegram/whop-links.js` の `normalizeLang` で `pt` を `pt-br` に正規化する処理を追加。`getWhopProductUrl("pt")` は正しく PT 用 Whop URL を返す。

---

## 6. チェックリスト（実施順）

- [ ] FirstPromoter で 6 キャンペーン存在確認
- [ ] 各キャンペーンの Destination URL が正しい Whop 商品ページを指すか確認
- [ ] Whop 各商品ページで ref パラメータが checkout まで渡るか確認
- [ ] 1 言語以上でテスト購入し、FirstPromoter に track/sale が届くか確認
- [x] pt / pt-br のマッピングを whop-links.js で修正 ✅
