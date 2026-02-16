# 自社 PQT のバズらせ方検証（実データ）

**北極星 KPI: 100成約/日**（`BUZZWEAVE_DAILY_CONVERSION_TARGET`）。インプレ・エンゲージメントは「リーチ → クリック → ファネル → 成約」の入り口指標。分析では **成約（our_subs）が取れている条件を最優先**で見る。成約データがなければインプレ・クリックで「どの条件がファネルに効いているか」を proxy として使う。

**目的**: `buzzweave_post_log` の実メトリクスから、「どの条件で成約（およびクリック・インプレ）が伸びているか」を特定し、言語・クラスタ・時間帯・引用元の配分を 100成約/日 に寄せる。

---

## 1. メトリクスをリアルタイムに取り続ける

- **API**: `GET /api/buzzweave-metrics-poll`  
  - `metrics_fetched_at` が null のログに対して X API で `public_metrics` を取得し、`our_impressions`, `our_likes`, `our_retweets`, `our_quotes`, `our_replies` を DB に保存する。
- **Cron**: `vercel.json` の crons に **15 分毎** で登録済み。
  - `"path": "/api/buzzweave-metrics-poll", "schedule": "*/15 * * * *"`
- 手動でメトリクスを埋めたい場合は `GET /api/buzzweave-metrics-poll?limit=50` を叩く。

---

## 2. バズ条件の分析スクリプト

- **スクリプト**: `scripts/analyze-our-pqt-buzz.js`
- **実行例**:
  - `node scripts/analyze-our-pqt-buzz.js` … 直近 7 日分を集計し、言語・クラスタ・UTC 時間帯・引用元 engagement 別の平均インプレを表示。
  - `node scripts/analyze-our-pqt-buzz.js --days=14 --csv` … 14 日分を集計し、同じ内容を CSV 出力（`buzzweave-buzz-analysis.csv`）。

**集計軸**: slot_lang / cluster_label / UTC時間帯 / engagement_score（引用元の low・mid・high）。

**出力**: 成約（our_subs）が取れていれば **条件別の成約数（sum_subs）でランキング** し、成約がなければ平均インプレでランキング。最後に「100成約/日に向けた成約に効く条件」を要約する。

---

## 3. 検証結果の運用反映案

分析結果で「バズりやすい条件」が分かったら、以下で配分・重みを調整する。

| 結果の例 | 反映先 | 調整案 |
|----------|--------|--------|
| 言語 X の平均インプレが他より高い | `mlPqtScheduleConfig.js`（またはスロット言語配分） | その言語のスロット割合を増やす、または優先度を上げる。 |
| クラスタ Y で伸びている | クラスタ別 cap / 重み（buzzWeaveEngine や planner） | そのクラスタの採用本数を増やす、またはスコア係数を微調整。 |
| UTC 時間帯 Z で伸びている | スロット生成（td-generate-daily-slots 等）や Cron 時刻 | その時間帯のスロット数を増やす、または buzzweave-run の Cron をその時間に寄せる。 |
| 引用元 engagement が high のとき伸びる | `services/td/quoteTargetQuality.js` | 既に品質スコアで選んでいる場合は、engagement の重みを少し上げる／閾値を調整。逆に low で伸びているなら「話題の火付け前」を拾えている可能性。 |

具体的な定数変更は、一度ドキュメントまたはコードコメントで「分析結果 YYYY-MM-DD: 言語 en が 1.5 倍伸びたため slot 配分を en に +10% 反映」のようにメモしておくと運用しやすい。

---

## 4. 関連ファイル

| 用途 | パス |
|------|------|
| 投稿ログ挿入 | `services/td/buzzWeaveEngine.js`（`insertBuzzweavePostLog`） |
| ログ取得・メトリクス更新 | `utils/supabase.js`（`fetchBuzzweavePostLogsPendingMetrics`, `updateBuzzweavePostLogWithMetrics`, `getBuzzweavePostLogsRecent`） |
| X メトリクス取得 | `services/x/metrics.js`（`getTweetMetrics`） |
| メトリクス Cron | `api/buzzweave-metrics-poll.js`（15 分毎） |
| バズ分析スクリプト | `scripts/analyze-our-pqt-buzz.js` |
| 品質スコア（引用元選定） | `services/td/quoteTargetQuality.js` |
| スケジュール・言語配分 | `services/td/mlPqtScheduler.js` 等 |
