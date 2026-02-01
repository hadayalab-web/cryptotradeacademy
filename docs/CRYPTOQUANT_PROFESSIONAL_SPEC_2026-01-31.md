# CryptoQuant Professional プラン仕様チェック（2026-01-31）

出典: [CryptoQuant Pricing](https://cryptoquant.com/pricing)（2026年1月時点）

## Professional プラン 公式仕様

| 項目 | 仕様 |
|------|------|
| **価格** | $99/月（年払い時は月額換算で割引） |
| **API** | Raw data API 利用可能 |
| **API Limits** | **20 req/min**（1分あたり20リクエスト） |
| **API Resolution** | **Up to 1 day**（1日まで。hour/block は Premium のみ） |
| **Historic Data (API)** | **1 year**（1年間。Full History は Premium のみ） |
| **License** | Personal use only（個人利用のみ） |
| Chart Resolution | Up to 1 block（チャート用。API解像度とは別） |
| Chart CSV Download | Day Resolution Only |

※ Premium は 800 req/min、API Resolution: Up to 1 block、Historic Data: Full History。

---

## 当リポジトリとの整合

### 1. API 制限 20 req/min

- **`services/cryptoquant/rateLimiter.js`**
  - `RATE_LIMIT_PER_MINUTE = 20`（Professional）
  - KV 不調時フォールバック: `LOCAL_MIN_RATE_LIMIT_PER_MINUTE = 10`
- **判定**: 公式の 20 req/min に合わせて制限している。

### 2. API Resolution: Up to 1 day

- **`services/cryptoquant/highResolution.js`**
  - `DEFAULT_WINDOWS = ['day']`（Professional または未指定時）
  - Premium/Enterprise 時のみ `['hour', '4hour', 'day']`
- **判定**: Professional では **day のみ** 使用しており、公式の「Up to 1 day」に準拠。

### 3. Historic Data (API): 1 year

- 取得 `limit` は 7（Professional）または 24（Premium）で、いずれも 1 年以内の範囲。
- **判定**: 1 年を超える履歴は要求していない。

### 4. その他

- **`services/cryptoquant/client.js`**: `CRYPTOQUANT_PLAN` デフォルト `'professional'`、CONCURRENCY=1（Professional）。
- **重複呼び出し削減**（前回対応）: highRes を先に取得し deep で再利用するため、定期枠あたり CQ API は **3 呼び出し** に収まり、20 req/min 内に余裕がある。

---

## 結論

- **API Limits**: 20 req/min を rateLimiter で遵守。
- **API Resolution**: Professional では day のみ使用（hour/4hour は使わない）。
- **Historic Data**: 1 年以内の範囲で limit を指定しており問題なし。

現状の実装は CryptoQuant Professional の公式仕様に沿っている。
