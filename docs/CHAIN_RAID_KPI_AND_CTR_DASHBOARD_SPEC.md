# CHAIN_RAID KPI ログ・リアルタイム CTR ダッシュボード・相関分析 仕様

## 1. chain_raid_post_kpi（1ポスト単位）

CHAIN_RAID を撃つたびに 1 行必ず残す。**PK = post_id。メトリクス更新は複数回行うため UPSERT（ON CONFLICT DO UPDATE）で上書きする。**

| カラム | 型 | 説明 |
|--------|-----|------|
| post_id | TEXT | X 投稿 ID（**PK**） |
| quoted_tweet_id | TEXT | 釣り師ポスト ID |
| lang | TEXT | en/es/pt/ar/ko/ja |
| burst_factor | NUMERIC | KIBA の最終値 |
| fusion_score | NUMERIC | **0〜1**。KIBA×CQ 統合スコア |
| cq_snapshot_ts | BIGINT | 参照した cq:latest timestamp |
| impressions | BIGINT | X API |
| link_clicks | BIGINT | Vidalytics |
| replies, reposts, bookmarks | INT | X メトリクス |
| er | NUMERIC | (replies+reposts+bookmarks)/impressions。**impressions=0 のときは NULL** |
| ctr | NUMERIC | link_clicks/impressions。**impressions=0 のときは NULL**。ビューでは COALESCE(ctr,0) 可 |
| post_timing | INT | 投稿 **UTC** hour |
| media_type | TEXT | **保存値: gif/video/image/none**。X API の場合は animated_gif→gif, video→video, photo→image に変換 |
| fusion_score_bin | TEXT | **fusion_score 0〜1 前提**: 0.8+ / 0.6-0.8 / <0.6 |
| cluster_id | TEXT | **BotNet クラスタ ID**（v4.3 と統一。釣り師クラスタは fishermen:cluster KV） |
| poll_yes, poll_no | INT | CHAIN Poll 結果 |
| demo_views, tg_joins, subs | INT | Vidalytics / TG |

## 2. view_lang_ctr_realtime（過去24h）

- **cvr_tg**: tg_joins / demo_views。**demo_views=0 のときは NULL**（ビューで CASE WHEN SUM(demo_views)>0 のみ除算）。
- **ROI 定義**: 言語別サブスク価格（price_per_sub）ベース。`roi = (SUM(subs) * price_per_sub_lang) / COUNT(*)`。対象期間: 過去24h。粒度: 言語別・1投稿あたり平均収益（USD）。**price_per_sub**: EN=99, ES=89, AR=79, PT=87, KO=95, JA=95（リスト価格。初月50%オフは別途考慮）。

```sql
SELECT lang, avg_ctr, cvr_tg, roi
FROM view_lang_ctr_realtime
ORDER BY roi DESC;
```

## 3. view_cluster_ctr_stats

- **corr_burst_ctr / corr_botnet_ctr**: **chain_raid_post_kpi の生データ**を cluster_id, lang で GROUP BY したうえで、そのグループ内の行に対して `CORR(burst_factor, ctr)` / `CORR(botnet_density, ctr)` を計算する。集計後の avg 同士の相関ではない。
- **cluster_size**: fishermen_count
- **cluster_id**: BotNet クラスタ ID（botnet_cluster_id を優先）

## 4. 運用ルール

- CTR < 5% のパターンは停止
- corr_burst_ctr 高いクラスタへの投稿頻度 2x → **実装**: KIBA のキュー重みを 2x、または 1h あたり投稿上限を 2x（どちらか仕様で採用）
- replies を最重要指標（重み 4x）

## 5. 実装

| ファイル | 役割 |
|----------|------|
| docs/supabase-chain-raid-kpi-schema.sql | テーブル・ビュー・MV |
| utils/supabase.js | insertChainRaidPostKpi（UPSERT）, updateChainRaidPostKpiWithMetrics |
| services/td/buzzDefenceEngineV4.js | CHAIN_RAID 投稿時に insertChainRaidPostKpi |
| api/x-metrics-fetcher.js | メトリクス取得後に updateChainRaidPostKpiWithMetrics |
| api/refresh-chain-raid-mv.js | 5 分ごとに `refresh_chain_raid_mvs()` RPC 呼び出し |

### refresh_chain_raid_mvs が更新する MV 一覧

- mv_lang_ctr_realtime
- mv_cluster_ctr_stats
- mv_cluster_corr（v4.3）
- mv_narrative_ctr_stats（v4.4）
- mv_lang_psych_sensitivity（v4.5）
- mv_lang_psych_matrix（v4.5）

## 6. vercel.json cron 追加

```json
{"path":"/api/refresh-chain-raid-mv","schedule":"*/5 * * * *"}
```
