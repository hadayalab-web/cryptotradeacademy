# 投稿がほとんど伸びないとき（Content Create が少ない）

**状況**: X Developer の「使用状況」で **Content Create**（投稿数）が少ない（例: 23 リクエスト/日）。Read は 200 前後あるが、Create が伸びない。

**目標**: 100成約/日 → 投稿フロア **500/日**（100×5）。Content Create は **1 投稿 = 1 リクエスト**なので、500/日 に近づける。

---

## 1. 何が Content Create か

| 種類 | 当リポでの対応 |
|------|----------------|
| **Content Create** | `postQuoteTweet`（引用リポスト）＝ BuzzWeave の 1 回の PQT 投稿。 |
| **Read** | `searchPostsRecent`（検索）、`getTweetMetrics`（メトリクス取得）等。 |

Content Create 23/日 ＝ その日に **23 本の PQT が投稿された** だけ。設計上は **8 run/日 × 1 run あたり数十本** で 数百/日 を目指す。

---

## 2. 伸びない原因候補

| 原因 | 説明 | 確認方法 |
|------|------|----------|
| **run がスキップされている** | 8 回 Cron が叩かれても、スナップショットなし・間隔未満・日次上限で早期 return している。 | Vercel ログで `[buzzweave-run] early return: SKIP_NO_SNAPSHOT` / `interval_not_reached` / `daily_limit_reached` の有無。 |
| **1 run あたりの slots が少ない** | 検索で候補が少ない、Fisherman 通過が少ない、フォールバックでも少ない → 投稿数が cap に届かない。 | ログの `short_report`（posts_fetched, candidates, slots, cap, **posted**, fill_rate）。posted が cap より小さいなら「候補不足」。 |
| **cap が低い** | 環境変数で 1 run あたりの上限が小さく設定されている。 | `BUZZWEAVE_API_CALL_CAP`（デフォルト 100）、`BUZZWEAVE_DAILY_PQT_TARGET_HARD`、日次ターゲット ÷ 8 で決まる cap。 |
| **スナップショットが古い/無い** | KV に btcSnapshot が無い or 有効期限切れ → 毎回 SKIP_NO_SNAPSHOT。 | `/api/cron` が先に動いて snapshot を書き込んでいるか。KV の `asset:snapshot:BTC` または `btc_snapshot`。 |

---

## 3. 対処（優先順）

1. **スナップショットを確実に更新する**  
   Cron で `/api/cron` が動き、その中で BTC スナップショットが KV に保存される。**cron が buzzweave-run より先に・十分な頻度で動いているか** を確認。スナップが無いと全 run が SKIP になり、Content Create が 0 に近づく。

2. **検索供給を増やす（候補 → slots を増やす）**  
   - **BUZZWEAVE_SEARCH_WINDOW_MIN** を大きくする（例: 30 → 45）。直近何分までのツイートを検索するか。  
   - **BUZZWEAVE_FALLBACK_SLOT_COUNT** を増やす（例: 10 → 15）。Fisherman 0 件時のフォールバック本数。  
   - 必要なら **BUZZWEAVE_USE_QUALITY_SCORE_SELECTION=true** で Fisherman 必須を外し、品質スコアで選ぶ（候補を捨てすぎない）。

3. **日次ターゲットを固定して cap を確保**  
   - **BUZZWEAVE_DAILY_PQT_TARGET_HARD=500** を設定すると、日次 500 が固定され、1 run あたり cap ≈ 500÷8 ＝ 63 になる。  
   - 動的ターゲットで「成約が少ないと目標が下がる」場合、意図的に 500 を維持したいなら HARD で固定する。

4. **run 数を減らしすぎない**  
   - **BUZZWEAVE_DAILY_RUN_LOW / MEDIUM / HIGH**（デフォルト 6/7/8）。ボラ low の日は 6 run で打ち切り。  
   - 投稿数を伸ばしたい期間は **BUZZWEAVE_DAILY_RUN_LOW=8** などで 8 run 全部回す。

5. **ログで 1 run あたりの posted を確認**  
   - `[buzzweave-run] short_report` の **posted** と **fill_rate**（posted/cap）。  
   - posted が毎 run  cap に近い → run 数や cap を増やす余地。  
   - posted が毎 run 少ない → 候補・スロット不足なので上記 2 を優先。

---

## 4. 目標の目安

| 指標 | 目標 | 備考 |
|------|------|------|
| Content Create（投稿数）/日 | **500 前後**（100成約×5） | 北極星 KPI から逆算。 |
| 1 run あたり posted | **50〜63**（500÷8） | cap がこれに届くように。 |
| fill_rate | **できるだけ 1 に近い** | slots が cap を満たしているか。 |

Read が 200 前後で Create が 23 なら、**検索・メトリクスは動いているが、実際の投稿（Create）が少ない**状態。run スキップか 1 run あたり slots 不足のどちらか（または両方）を、ログと上記レバーで潰す。

---

## 5. 参照

- 北極星・日次ターゲット: `docs/NORTH_STAR_KPI.md`、`services/td/buzzWeaveEngine.js`（`resolveDailyPqtTarget`）
- run 上限・スナップ: `api/buzzweave-run.js`、`services/td/autonomousSlotGenerator.js`（`determineDailyRunTarget`）
- 検索・スロット: `docs/ML_PQT_ENGINE_FOR_OPERATION_AND_VERIFICATION.md` § 7.2、`BUZZWEAVE_SEARCH_WINDOW_MIN` / `BUZZWEAVE_FALLBACK_SLOT_COUNT`
