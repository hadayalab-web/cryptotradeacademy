# 運用で管理する配信（この3つだけ）

配信の運用では **次の3種だけ** を管理すればよい。

---

## 1. 無料版（Minimal Version）の TG 配信

- **どこ**: `api/cron.js` 内（定期枠で無料版 Telegram 送信）
- **Cron**: `/api/cron` — `7,22,37,52 * * * *`（15分間隔）
- **無料版 X 投稿**: `/api/x-post-minimal-version` — `0 8 * * *`（1日1回）※無料版の一部

---

## 2. 有料版（Regular Briefing）の TG 配信

- **どこ**: `api/cron.js` 内（定期枠で有料版 Telegram 送信）
- **Cron**: 上記と同じ `/api/cron`

---

## 3. Grok セールスレターの X 引用リポスト

- **どこ**: `api/x-quote-repost.js`（共通）、`api/x-quote-repost-{en,es,pt-br,ar,ja,ko}.js`（言語別エントリ）
- **Cron**: `/api/x-quote-repost-en` など 6 本 — 毎時 4,9,14,19,24,29 分（5分間隔）

---

## 参照

- Cron 一覧・時刻分散: [timeout-avoidance-schedule.md](./timeout-avoidance-schedule.md)
- 定義元: `vercel.json` の `crons`
