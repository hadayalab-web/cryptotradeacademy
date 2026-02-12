# BuzzWeave Engine 集中投下結果回収レイヤー

実施日: 2026-02-12  
対象: `buzzweave_post_log` テーブル、`insertBuzzweavePostLog`、`api/buzzweave-metrics-poll.js`

---

## 1. 概要

「集中投下の結果を市場から回収するレイヤー」を追加。投稿時にログを保存し、後続で X API から public_metrics を取得して紐づけ、将来的な学習（clusterScore 係数調整・言語別クラスタ重み・buzzSummary/clusterPsych/insight パターン別成果）に使える構造を用意した。

---

## 2. 保存内容（投稿時）

| カラム | 説明 |
|--------|------|
| slot_lang | スロット言語 |
| cluster_label | クラスタラベル（etf, fud, price_surge, regulation, meme, other） |
| cluster_score | 集中投下スコア |
| candidate_tweet_id | 引用元ツイートID |
| engagement_score | 事前スコア（候補選定時） |
| posted_at | 投稿日時（UTC） |
| our_tweet_id | 自分が投稿した引用リポストのID |
| slot_mode | minimal / regular |
| buzz_summary | バズ要約（パターン別成果分析用） |
| cluster_psych | 市場心理（同上） |
| trap_defence_insight | Trap Defence 洞察（同上） |
| danger_label | 危険度分類（whale_trap / neutral / educational） |
| used_mode | 投稿モード（trap_defence_warning / neutral_insight / educational_boost） |

---

## 3. 後続ポーリングで紐づける項目

| カラム | 説明 |
|--------|------|
| our_impressions | 自投稿のインプレッション |
| our_likes | いいね数 |
| our_retweets | リツイート数 |
| our_quotes | 引用数 |
| our_replies | リプライ数 |
| metrics_fetched_at | 取得日時 |

---

## 4. 将来学習に使う構造

- **clusterScore の係数調整**: `cluster_score` と `our_impressions` / `our_likes` 等の相関から最適係数を推定
- **言語別クラスタ重み**: `slot_lang` × `cluster_label` でグループ化し、`our_impressions` 等の平均・中央値を比較
- **buzzSummary / clusterPsych / insight パターン別成果**: `buzz_summary`, `cluster_psych`, `trap_defence_insight` のパターンごとに `our_impressions` 等を集計して A/B 分析

---

## 5. ファイル一覧

| ファイル | 役割 |
|----------|------|
| `docs/supabase-buzzweave-post-log.sql` | テーブル定義（単独実行用） |
| `docs/supabase-tweet-metrics-schema.sql` | メインスキーマに buzzweave_post_log を追加 |
| `utils/supabase.js` | `insertBuzzweavePostLog`, `updateBuzzweavePostLogWithMetrics`, `fetchBuzzweavePostLogsPendingMetrics` |
| `services/td/buzzWeaveEngine.js` | 投稿成功時に `insertBuzzweavePostLog` を呼び出し |
| `api/buzzweave-metrics-poll.js` | public_metrics ポーリング API |

---

## 6. ポーリング API

**エンドポイント**: `GET /api/buzzweave-metrics-poll`

**クエリ**:
- `limit` (default: 20): 処理件数
- `minAgeMinutes` (default: 5): 投稿後これ以上経過したもののみ（X API 反映待ち）

**運用**: Vercel Cron または外部 Cron（cron-job.org 等）で、例: 15分毎に呼び出す。

---

## 7. テーブル作成

Supabase SQL Editor で以下を実行:

```sql
-- docs/supabase-buzzweave-post-log.sql の内容
-- または docs/supabase-tweet-metrics-schema.sql の buzzweave_post_log 部分
```
