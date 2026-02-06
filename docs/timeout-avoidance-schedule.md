# タイムアウト回避：実行時刻の分散方針

**方針**: 重いジョブを「時間ずらし」で同時実行させず、Vercel の 504 / 60s タイムアウトを回避する。

**運用で管理する配信は2系統のみ** → 詳細は [MANAGED_DELIVERIES.md](./MANAGED_DELIVERIES.md)
1. 無料版・有料版の TG 配信ライン … 無料版は `/api/minimal-tg-delivery`（別時刻）、有料版は `/api/cron`
2. Grok セールスレターの X 引用リポストライン … `/api/x-quote-repost-*`（6言語）

---

## 1. 分散ルール

- 同一分に複数の重い Cron を走らせない。
- 主 Cron は 7, 22, 37, 52 分。引用リポストは 4, 9, 14, 19, 24, 29 分で 5 分間隔。

---

## 2. 現在のスケジュール（UTC）

### TG 配信（最適化済み）

- **有料版（Regular）**: `/api/cron` は **0,7,22,37,52 分**に毎時実行。実際に配信するのは **UTC 0,6,12,18 時の :00** のみ（1日4回）。そのときに Minimal 用 payload を KV に書き出し。`REGULAR_DELIVERY_MINUTE` で「分」を変更可能（デフォルト 0）。
- **無料版（Minimal）**: `/api/minimal-tg-delivery` は **10 0,6,12,18 * * *** → **00:10, 06:10, 12:10, 18:10 UTC**（1日4回、Regular の 10 分後）。

### 引用リポスト（毎時）

| 分 | ジョブ | 備考 |
|----|--------|------|
| 0 | `/api/cron` | 配信枠時のみ有料版＋KV 書き出し（0,6,12,18 時の :00） |
| 4 | `/api/x-quote-repost-en` | 毎時、60s |
| 7 | `/api/cron` | 枠外は軽いチェックのみ |
| 9 | `/api/x-quote-repost-es` | 毎時、60s |
| 10 | `/api/minimal-tg-delivery` | 0,6,12,18 時のみ（無料版 6 言語） |
| 14 | `/api/x-quote-repost-pt-br` | 毎時、60s |
| 19 | `/api/x-quote-repost-ar` | 毎時、60s |
| 22 | `/api/cron` | 300s |
| 24 | `/api/x-quote-repost-ja` | 毎時、60s |
| 29 | `/api/x-quote-repost-ko` | 毎時、60s |
| 37 | `/api/cron` | 300s |
| 52 | `/api/cron` | 300s |

---

## 3. 要約

- **cron**: `0,7,22,37,52 * * * *`。**配信は 0,6,12,18 時の :00 のみ**（`REGULAR_DELIVERY_HOURS_UTC` / `REGULAR_DELIVERY_MINUTE` または `REGULAR_SCHEDULE=4h` で変更可）。
- **minimal-tg-delivery**: `10 0,6,12,18 * * *`（1日4回、Regular の 10 分後）。
- **引用リポスト 6 言語**: 4, 9, 14, 19, 24, 29 分（5 分間隔）。
