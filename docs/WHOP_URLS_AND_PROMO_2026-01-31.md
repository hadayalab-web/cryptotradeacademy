# Whop URL・プロモコード一覧（2026-01-31）

コードベースに反映済み。環境変数で上書き可能。

---

## 有料版（Regular Briefing）

| 言語 | URL |
|------|-----|
| EN | https://whop.com/trapdefence/btc-regular-en/ |
| ES | https://whop.com/trapdefence/btc-regular-es/ |
| AR | https://whop.com/trapdefence/btc-regular-ar/ |
| PT | https://whop.com/trapdefence/btc-regular-pt/ |
| KO | https://whop.com/trapdefence/btc-regular-ko/ |
| JA | https://whop.com/trapdefence/btc-regular-ja/ |

**環境変数**: `WHOP_PRODUCT_URL_EN`, `WHOP_PRODUCT_URL_ES`, `WHOP_PRODUCT_URL_AR`, `WHOP_PRODUCT_URL_PTBR`, `WHOP_PRODUCT_URL_KO`, `WHOP_PRODUCT_URL_JA`

---

## 無料版（Minimal Version）チェックアウトリンク

| 言語 | URL |
|------|-----|
| EN | https://whop.com/checkout/plan_9zf3nrYeweovV |
| ES | https://whop.com/checkout/plan_pukjeWHXVbEBK |
| PT | https://whop.com/checkout/plan_wyK2xZcXtsMAV |
| AR | https://whop.com/checkout/plan_wREBLF9wriihy |
| KO | https://whop.com/checkout/plan_BYB0OUOWBrLem |
| JA | https://whop.com/checkout/plan_3hbsrgte6pCma |

**環境変数**: `WHOP_MINIMAL_CHECKOUT_URL_EN`, `WHOP_MINIMAL_CHECKOUT_URL_ES`, … (言語別)

---

## プロモコード

| 種別 | 値 | 用途 |
|------|-----|------|
| **プロモコード（ユーザー入力）** | **defend50** | URL クエリ `?promo=defend50`、表示用 |
| **プロモID（Whop API）** | **promo_x94YP6In0f1C** | 残り枠監視など API 用（任意） |

**環境変数**:
- `WHOP_PROMO_CODE` … プロモコード（デフォルト: defend50）
- `WHOP_PROMO_CODE_ID` … Whop プロモID（例: promo_x94YP6In0f1C）

---

## 実装箇所

- **有料版URL**: `services/telegram/whop-links.js`（DEFAULT_WHOP_URLS）, `services/whop/promo-monitor.js`
- **無料版URL**: `services/telegram/whop-links.js`（getMinimalVersionCheckoutUrl 内）
- **プロモコード**: `services/telegram/whop-links.js`（getPromoCode, DEFAULT_PROMO_CODE）, `services/whop/promo-monitor.js`（PROMO_CODE）
