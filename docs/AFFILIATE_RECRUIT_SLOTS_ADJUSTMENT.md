# アフィリエイトリクルート スロット調整

EN は別枠（3h×8回・5人ずつ＝40人/日）。スロットは **1日3回のみ**（南米・JA+KO・AR の各時間帯で1回）。

## スロット = 1日3回

| 実行時刻 (UTC) | 時間帯 | 内容 | 本数 |
|----------------|--------|------|------|
| **12:00** | JA+KO | ja 3 + ko 3 | 6 |
| **17:00** | AR | ar 5 | 5 |
| **21:00** | 南米 ES+PT | es 5 + pt 5 | 10 |
| **合計** | | | **21本/日** |

Cron: `0 12,17,21 * * *`（`/api/affiliate-recruit-regions` がこの3回だけ動く）。

## 実装

- `config/affiliateRecruitConfig.js`: `SLOT_BLOCK_HOURS`, `SLOT_BLOCKS`
- `api/affiliate-recruit-regions.js`: 地域別（南米・JA+KO・AR）で上記3時刻に一括送信
