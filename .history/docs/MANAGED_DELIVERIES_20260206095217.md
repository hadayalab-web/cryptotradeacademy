# 運用で管理する配信（2系統だけ）

配信は **次の2系統のみ**。

---

## 1. 無料版（Minimal Version）と有料版（Regular Briefing）の TG 配信ライン

- **有料版（Regular）**: `api/cron.js` — Cron **0,7,22,37,52** 分のうち、**配信枠のときだけ**（UTC 0,6,12,18 時の **:00**）に Regular を配信し、Minimal 用 payload を KV に書き出す。実質 **1日4回**（00:00, 06:00, 12:00, 18:00 UTC）。
- **無料版（Minimal）**: `api/minimal-tg-delivery.js` — **配信枠の 10 分後**に実行。Cron `10 0,6,12,18 * * *` → **1日4回**（00:10, 06:10, 12:10, 18:10 UTC）。KV の payload を読んで 6 言語配信。
- **重要**: 無料版と有料版は **同じタイミングで実行しない**（Regular :00 → Minimal :10）。配信回数は **4 回/日** に最適化済み。

### 配信時刻の最適化（デフォルト UTC）

| 配信 | UTC（1日4回） | JST（+9h） |
|------|----------------|------------|
| Regular | 00:00, 06:00, 12:00, 18:00 | 09:00, 15:00, 21:00, 03:00（翌日） |
| Minimal | 00:10, 06:10, 12:10, 18:10 | 09:10, 15:10, 21:10, 03:10（翌日） |

- **時刻の調整**:  
  - **`REGULAR_DELIVERY_HOURS_UTC`**: 配信する「時」（カンマ区切り、例: `0,6,12,18`）。  
  - **`REGULAR_DELIVERY_MINUTE`**: Regular の「分」（デフォルト `0`）。変更した場合は `vercel.json` の cron にその分を含め、minimal-tg-delivery は **10 分後**（例: Regular :05 → Minimal :15）に合わせること。
- 4h スケジュール: **`REGULAR_SCHEDULE=4h`**。枠を変えた場合は minimal-tg-delivery の schedule を同じ時間帯の **:10** に合わせること。

---

## 2. Grok セールスレターの X 引用リポストライン

- **どこ**: `api/x-quote-repost.js`（共通）、`api/x-quote-repost-{en,es,pt-br,ar,ja,ko}.js`（言語別）
- **Cron**: `/api/x-quote-repost-en` など 6 本 — 毎時 4,9,14,19,24,29 分（5分間隔）

---

## 参照

- 時刻分散: [timeout-avoidance-schedule.md](./timeout-avoidance-schedule.md)
- 定義: `vercel.json` の `crons`
