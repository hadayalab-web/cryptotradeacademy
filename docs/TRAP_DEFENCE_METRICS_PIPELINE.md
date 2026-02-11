# Trap Defence OS: 実測データ収集パイプライン

## 概要

- **Webhook** → tweet_create_events 受信時に `tweet_queue` に投入
- **x-metrics-fetcher** → 5分ごとに未処理キューを取得し、X API `/2/tweets/:id` で public_metrics 取得 → `tweet_metrics` に保存
- **Vidalytics** → stub 実装（API 情報が揃い次第、CTR 取得を追加）

## セットアップ

### 1. Supabase スキーマ

`docs/supabase-tweet-metrics-schema.sql` を Supabase SQL Editor で実行。

### 2. 環境変数

Vercel に以下を設定:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Cron

`/api/x-metrics-fetcher` は 5分ごとに自動実行（vercel.json の crons）。

### 4. 手動実行

```bash
curl "https://your-domain.vercel.app/api/x-metrics-fetcher"
```

## テーブル

- **tweet_queue**: Webhook が投入。tweet_id, lang, vid_link_kind
- **tweet_metrics**: 実測データ。impressions, likes, retweets, quotes, replies, vid_clicks など
