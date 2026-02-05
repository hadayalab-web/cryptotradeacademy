# タイムアウト回避：実行時刻の分散方針

**方針**: 重いジョブを「時間ずらし」で同時実行させず、Vercel の 504 / 60s タイムアウトを回避する。

**運用で管理する配信は次の3つのみ** → 詳細は [MANAGED_DELIVERIES.md](./MANAGED_DELIVERIES.md)
1. 無料版（Minimal Version）の TG 配信 … `/api/cron` 内
2. 有料版（Regular Briefing）の TG 配信 … `/api/cron` 内
3. Grok セールスレターの X 引用リポスト … `/api/x-quote-repost-*`（6言語）

---

## 1. 分散ルール

- 同一分に複数の重い Cron を走らせない。
- 主 Cron は 7, 22, 37, 52 分。引用リポストは 4, 9, 14, 19, 24, 29 分で 5 分間隔。

---

## 2. 現在のスケジュール（UTC）

| 分 | ジョブ | 備考 |
|----|--------|------|
| 4 | `/api/x-quote-repost-en` | 毎時、60s |
| 7 | `/api/cron` | 300s（無料版TG・有料版TG） |
| 9 | `/api/x-quote-repost-es` | 毎時、60s |
| 14 | `/api/x-quote-repost-pt-br` | 毎時、60s |
| 19 | `/api/x-quote-repost-ar` | 毎時、60s |
| 22 | `/api/cron` | 300s |
| 24 | `/api/x-quote-repost-ja` | 毎時、60s |
| 29 | `/api/x-quote-repost-ko` | 毎時、60s |
| 37 | `/api/cron` | 300s |
| 52 | `/api/cron` | 300s |
| 8:00 UTC | `/api/x-post-minimal-version` | 1日1回、120s（無料版X） |

---

## 3. 変更内容の要約

- **cron**: `7,22,37,52 * * * *`（15 分間隔、引用リポと被らない）。
- **x-post-minimal-version**: `0 8 * * *`（1日1回）。
- **引用リポスト 6 言語**: 4, 9, 14, 19, 24, 29 分（5 分間隔）。
