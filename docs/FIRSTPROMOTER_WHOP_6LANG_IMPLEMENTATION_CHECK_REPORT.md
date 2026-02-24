# FirstPromoter × Whop 6言語連携 — 実装チェックレポート

**実施日:** 2026-02-24  
**目的:** 6言語（EN/ES/PT/AR/KO/JA）のページごとに FirstPromoter と Whop が正常に連携しているか実装をチェックする。

---

## 1. 全体サマリー

| 項目 | 状態 | 備考 |
|------|------|------|
| Whop 6言語 URL 取得 | ✅ 実装済み | whop-links.js |
| pt / pt-br 正規化 | ✅ 実装済み | normalizeLang で pt→pt-br 変換 |
| Whop Webhook → FirstPromoter track/sale | ✅ 実装済み | api/whop-webhook.js |
| FirstPromoter 招待 URL（DM スカウト用） | ⚠️ 要確認 | 単一 URL + ?lang= 方式のみ |
| アフィリエイトスカウト DM 送信 | ✅ 修正済み | 存在しない affiliateLeadMagnetLinks 依存を削除 |
| 運用側（手動確認） | ⬜ 未実施 | FirstPromoter/Whop ダッシュボード |

---

## 2. コード実装の詳細チェック

### 2.1 Whop 商品 URL（6言語） — ✅ 完了

**ファイル:** `services/telegram/whop-links.js`

| 言語 | getWhopProductUrl | getMinimalVersionCheckoutUrl | 環境変数 |
|------|-------------------|------------------------------|----------|
| en | ✅ | ✅ | WHOP_PRODUCT_URL_EN |
| es | ✅ | ✅ | WHOP_PRODUCT_URL_ES |
| pt-br | ✅ (pt→pt-br 正規化) | ✅ | WHOP_PRODUCT_URL_PTBR |
| ar | ✅ | ✅ | WHOP_PRODUCT_URL_AR |
| ko | ✅ | ✅ | WHOP_PRODUCT_URL_KO |
| ja | ✅ | ✅ | WHOP_PRODUCT_URL_JA |

- `normalizeLang()` で `pt` → `pt-br` を正規化（affiliateScoutConfig の `pt` と互換）
- 有料版（Regular）・無料版（Minimal）それぞれ 6 言語対応済み

### 2.2 Whop Webhook → FirstPromoter — ✅ 完了

**ファイル:** `api/whop-webhook.js`

- **購入イベント対応:** checkout.completed, membership.activated, payment_succeeded, invoice_paid 等
- **ref_id 抽出元:**
  - `metadata.ref_id`
  - `metadata.ref`
  - `referrer_url` の `ref` / `ref_id` パラメータ
- **promo_code 抽出元:** checkout, membership, payment, invoice, metadata
- **6言語共通:** 同一 Webhook エンドポイント。Whop の商品が言語別でもペイロード形式は同一
- **track/sale 送信:** ref_id または promo_code が取得でき、amount > 0 の場合に `services/firstpromoter/trackSale.js` を呼び出し

**Vercel 設定:** `vercel.json` で `api/whop-webhook.js` に `includeFiles: {services/firstpromoter/**}` 設定済み

### 2.3 FirstPromoter 招待 URL（DM スカウト用） — ⚠️ 要確認

**ファイル:** `config/affiliateScoutConfig.js`

```javascript
function getFirstPromoterInviteUrl(lang = "en") {
  const base = process.env.FIRSTPROMOTER_INVITE_URL || "https://firstpromoter.com";
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return base + langParam;
}
```

- **現在:** 単一 `FIRSTPROMOTER_INVITE_URL` + `?lang=xx` 方式のみ
- **未実装:** 言語別 URL（`FIRSTPROMOTER_INVITE_URL_ES` 等）の環境変数サポート
- **確認事項:** FirstPromoter の Signup ページが `?lang=es` 等で言語切り替え可能か運用で確認

### 2.4 DM テンプレート（6言語） — ✅ 完了

**ファイル:** `config/affiliateScoutDmTemplates.js`

- en, es, pt, ar, ko, ja の 6 言語テンプレート実装済み
- プレースホルダー: `{inviteUrl}`, `{whopAffiliateUrl}`, `{handle}`

### 2.5 アフィリエイトスカウト API — ✅ 修正済み

**ファイル:** `api/affiliate-scout-run.js`

- **修正内容:** 存在しない `config/affiliateLeadMagnetLinks` の require および `minimalTgLink` の参照を削除
- **理由:** `fillScoutDmTemplate` は `minimalTgLink` をテンプレートに含めていないため不要

---

## 3. 運用側で確認すべき項目

### 3.1 FirstPromoter ダッシュボード

| # | 確認項目 | 担当 |
|---|----------|------|
| 1 | 6 キャンペーン（EN/ES/PT/AR/KO/JA）が作成されているか | 運用 |
| 2 | 各キャンペーンの Destination URL が対応する Whop 商品ページを指しているか | 運用 |
| 3 | `{{promotion.referral_link}}` 経由で各言語の Whop 商品ページに誘導されるか | 運用 |

**推奨 Destination URL マッピング:**

| キャンペーン | Destination URL |
|-------------|------------------|
| EN | https://whop.com/trapdefence/btc-regular-en/ |
| ES | https://whop.com/trapdefence/btc-regular-es/ |
| PT | https://whop.com/trapdefence/btc-regular-pt/ |
| AR | https://whop.com/trapdefence/btc-regular-ar/ |
| KO | https://whop.com/trapdefence/btc-regular-ko/ |
| JA | https://whop.com/trapdefence/btc-regular-ja/ |

### 3.2 Whop ダッシュボード

| # | 確認項目 | 担当 |
|---|----------|------|
| 4 | 各言語の商品ページで、URL の `ref` パラメータがチェックアウトまで引き継がれるか | 運用/開発 |
| 5 | DEFEND50 プロモコードが 6 商品すべてで有効か | 運用 |
| 6 | Company Webhook の送信先が `https://{domain}/api/whop-webhook` で正しく設定されているか | 運用 |
| 7 | WHOP_WEBHOOK_SECRET が Vercel に設定され、署名検証が有効か | 運用 |

### 3.3 環境変数（Vercel）

| 変数 | 必須 | 用途 |
|------|------|------|
| FIRSTPROMOTER_API_KEY | ✅ | track/sale API 認証 |
| WHOP_WEBHOOK_SECRET | ✅ 本番 | Whop Webhook 署名検証 |
| FIRSTPROMOTER_INVITE_URL | 推奨 | DM スカウト招待 URL のベース |

---

## 4. 推奨対応（優先順）

### 優先度高: affiliate-scout-run の修正 — ✅ 完了

`config/affiliateLeadMagnetLinks.js` が存在せず、DM テンプレートで `minimalTgLink` を使用していないため、該当 import と呼び出しを削除済み

### 優先度中: 言語別 FirstPromoter 招待 URL（必要に応じて）

FirstPromoter の Signup ページが `?lang=` で言語切り替えできない場合、環境変数で言語別 URL をサポートする:

```
FIRSTPROMOTER_INVITE_URL_EN=https://...
FIRSTPROMOTER_INVITE_URL_ES=https://...
...
```

### 優先度低: テスト購入での検証

1. 各言語でアフィリエイターの ref リンク経由で商品ページにアクセス
2. チェックアウトで DEFEND50 を入力しテスト購入
3. Vercel Logs で `[Whop Webhook] ✅ FirstPromoter track/sale sent` を確認
4. FirstPromoter ダッシュボードで売上・報酬が紐付いているか確認

---

## 5. 連携フロー図

```
[アフィリエイター] → {{promotion.referral_link}}（FirstPromoter 発行）
    → [購入者] クリック → Whop 商品ページ（言語別）
        → チェックアウト（ref_id / promo_code 含む）
            → Whop Webhook → api/whop-webhook.js
                → FirstPromoter track/sale API
```

**当コードベースの責務:**
- Whop 商品 URL の言語別提供（`whop-links.js`）✅
- Webhook 受信・ref_id 抽出・FirstPromoter 送信（`whop-webhook.js`）✅
- DM スカウト時の招待 URL 提供（`affiliateScoutConfig.js`）⚠️
- **Whop 商品ページでの ref 受け渡し:** Whop ダッシュボード／商品ページの設定。当コードでは制御不可
