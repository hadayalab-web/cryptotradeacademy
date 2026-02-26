# アフィリエイトリクルート スロット調整

EN は別枠（`/api/affiliate-recruit-en`）。地域別は `/api/affiliate-recruit-regions` で **1日5回**（各言語 1 時間帯・各 10 件目標）。

## スロット = 1日5回（各言語 1 本）

| 実行時刻 (UTC) | 言語 | 目標本数 |
|----------------|------|----------|
| **12:00** | ja | 10 |
| **13:00** | ko | 10 |
| **17:00** | ar | 10 |
| **21:00** | es | 10 |
| **22:00** | pt | 10 |

**Cron:** `0 12,13,17,21,22 * * *`（`/api/affiliate-recruit-regions`）。**22 を含めること。** 含めないと PT が実行されない。

## 実装

- `config/affiliateRecruitConfig.js`: `SLOT_BLOCK_HOURS`, `SLOT_BLOCKS`
- `api/affiliate-recruit-regions.js`: `mode=slot` で上記 5 時刻のいずれかに実行
- `vercel.json`: `affiliate-recruit-regions` の schedule に **12, 13, 17, 21, 22** すべて必要
