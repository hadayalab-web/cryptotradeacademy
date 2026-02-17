# /api/buzzweave-run ロジック概要

## 1. エントリ（api/buzzweave-run.js）

- **Cron**: `0 0,3,6,9,12,15,18,21 * * *`（UTC＝JST 9,12,15,18,21,0,3,6 の 1日8回）
- **認証**: `CRON_SECRET` の Bearer または `?cron_secret=`
- **緊急停止**: `BUZZWEAVE_EMERGENCY_STOP=true` で即 return
- **言語**: 未指定時は **UTC 時間ブロック**（`BUZZWEAVE_LANG_BY_UTC`）で決定  
  - 0–3→ja, 4–7→ko, 8–11→en, 12–15→es, 16–19→pt, 20–23→ar  
  - または `?lang=en` で固定

### 早期 return 条件

| 条件 | 内容 |
|------|------|
| `SKIP_NO_SNAPSHOT` | KV に `btc:snapshot`（または asset 用キー）が無い／古い（`BTC_SNAPSHOT_MAX_AGE_MS` 超過） |
| `daily_limit_reached` | 今日の run 数 ≥ `determineDailyRunTarget(snapshot)`（volatility で 6/7/8、上限 8） |
| `interval_not_reached` | 前回実行から `BUZZWEAVE_MIN_RUN_INTERVAL_HOURS`（デフォルト 3h）経過していない |

### 通過後

- KV の btcSnapshot を取得（必要なら NASDAQ/GOLD から macroContext 付与）
- `kiba:activity:latest` を参照（ログ用）
- **`runBuzzWeaveCycle({ dryRun, langFilter, btcSnapshot })`** を実行
- 終了後に `recordBuzzWeaveRun()` で実行時刻を記録
- **buzzweave-metrics-poll** を非同期で起動（メトリクス取得＋MV/lang_penalty 更新）

---

## 2. 1サイクル中身（runBuzzWeaveCyclePqtOnly）

常に **PQT-only（テンプレ＋リプライのみ）**。引用リポストは廃止。

### 2.1 候補収集（collectBuzzCandidates）

1. **X search/recent**  
   - `slotLang` 用クエリ（bitcoin/btc/crypto, pump/moon/ath, breakout/halving/spot etf, "all time high" 等）  
   - 直近 **30分**（`BUZZWEAVE_SEARCH_WINDOW_MIN`）・recency 順・複数クエリでページ取得
2. **粗候補**  
   - 既に引用したツイート（30日）を除外  
   - `passesQuoteQualityPattern`・最低 reply+retweet・最低 interactions でフィルタ  
   - `engagementScore = scorePostByMetrics(metrics)` でスコア付け
3. **中央値フィルタ**  
   - デフォルトは **スキップ**（`BUZZWEAVE_SIMPLE_SELECTION` が false でないため）  
   - スキップ時: engagement 降順で上から `maxCandidates`（デフォルト 50）まで
4. **クラスタ・スコア**  
   - `classifyCluster`（price_surge / fud / other 等）  
   - `clusterScore`・`impressionScore` 算出  
   - 候補は impression 優先でソート、最大 50 件を `candidates` として返す

### 2.2 1 run あたりの cap 決定

- **言語別配分**: `allocatePqtPerLanguageFromSchedule(snapshot)`  
  - ML-PQT スケジュール＋snapshot の trapScore 等で日次目標を算出し、言語別 share で配分
- **日次目標の動的解決**: `resolveDailyPqtTarget()`  
  - `BUZZWEAVE_DAILY_PQT_TARGET_HARD` があればそれを日次目標に  
  - 否則は「成約目標 100/日 × posts_per_conversion」の動的計算（lookback 日数・実測成約で trust を反映）
- **cap 計算**  
  - `dailyTarget / RUNS_PER_DAY_FOR_TARGET`（デフォルト 8）をベースに 1 run あたり cap を算出  
  - `BUZZWEAVE_USE_LANG_SPECIFIC_CAP=true` のときは言語別 cap をそのまま使用  
  - 上限: `MAX_CAP_PER_RUN`（200）、火水木は `BUZZWEAVE_WEEKDAY_WARP` で最大 `MAX_CAP_PER_RUN_WARP`（400）

ログ例:  
`daily target resolved { mode: 'dynamic', dailyTarget: 500, langFilter: 'en', cap: 112, ... }`

### 2.3 スロット選定（シンプル選定デフォルト）

- **BUZZWEAVE_SIMPLE_SELECTION** が false でない場合:  
  - 候補を **impression × hype × copyFit** の合成スコアでソートし、上から **cap 件** をスロットに
- 否則: quality score 選定 or Fisherman 上位％
- **volume top-up**: `BUZZWEAVE_VOLUME_TOPUP` が有効かつ slots < cap なら、残り候補を engagement 降順で埋める
- **多様性**: `applyDiversityCaps`（1作者あたり・クラスタ share 上限）を適用

### 2.4 リプライ投稿ループ

- **reply-only**: 引用リポストは行わず、**ターゲット投稿へのリプライのみ**
- 各スロットについて:
  - `pickBestFunnelLink`（または Vidalytics regular）でリンク取得
  - `buildPqt(langFilter, { coin, proofSnippet, link, funnelType, quotedText, useBotTemplates })` で本文生成
  - 280字に収め、有料導線なら `getPromoLine`（DEFEND50 等）を付与
  - `replyToTweet(replyText, sourceId)` で投稿
  - `runApiCallCount >= effectiveCap` で打ち切り
- 投稿ごとに `insertQuotedTweets`・`insertBuzzweavePostLog` で DB 記録

### 2.5 返却・shortReport

- `posted`（成功数）、`runId`、`shortReport`（posts_fetched, candidates, slots, cap, posted, fill_rate）を返す
- 403「deleted or not visible」は 1件スキップされ、posted には含めない

---

## 3. 数字の意味（Content Create 82 / Read 75 など）

- **Content Create**: おそらく **buzzweave-run で投稿したリプライ数**（posted）の合計。1日 4 run（JST 9/12/15/18）なら 1 run あたり 20〜30 前後で 80 前後になる想定。
- **Read**: メトリクスポールや MV 更新で「読んだ」投稿数、または別定義の可能性あり（X ダッシュボード／内部 KPI の名称に依存）。
- **成約なし**: リプライ→Vidalytics/Whop のコンバージョンがまだ 0 という意味。動的目標（resolveDailyPqtTarget）は「100成約/日」を KPI に posts_per_conversion を逆算して日次投稿数を決めているが、成約 0 の間は trust が低く、デフォルトの BASE_POSTS_PER_CONVERSION（5）に近い値で目標が立つ。

---

## 4. 主要 env（参照）

| 変数 | デフォルト | 説明 |
|------|------------|------|
| `BUZZWEAVE_MIN_RUN_INTERVAL_HOURS` | 3 | 同一 run の最小間隔（h） |
| `BUZZWEAVE_DAILY_PQT_TARGET_HARD` | - | 日次 PQT 目標のハード指定 |
| `BUZZWEAVE_RUNS_PER_DAY_FOR_TARGET` | 8 | 日次目標を割る run 数 |
| `BUZZWEAVE_USE_LANG_SPECIFIC_CAP` | - | 言語別 cap を使用 |
| `BUZZWEAVE_SIMPLE_SELECTION` | 有効 | シンプル選定（impression×hype×copyFit） |
| `BUZZWEAVE_SEARCH_WINDOW_MIN` | 30 | 検索窓（分） |
| `BUZZWEAVE_MAX_CANDIDATES` | 50 | 候補上限 |
| `BUZZWEAVE_DAILY_CONVERSION_TARGET` | 100 | 動的目標の成約目標/日 |
| `BUZZWEAVE_BASE_POSTS_PER_CONVERSION` | 5 | 成約あたり投稿数のベース |

---

## 5. フロー図（簡略）

```
Cron (8回/日 UTC)
  → auth / 緊急停止 / Supabase check
  → KV から btcSnapshot 取得（無い or 古い → SKIP_NO_SNAPSHOT）
  → daily_limit / interval check
  → runBuzzWeaveCycle({ dryRun, langFilter, btcSnapshot })
       → collectBuzzCandidates (search/recent, 30min, 50候補)
       → resolveDailyPqtTarget + allocatePqtPerLanguageFromSchedule → cap
       → シンプル選定: impression×hype×copyFit で cap 件
       → diversity cap
       → 各スロット: buildPqt → replyToTweet (280字＋プロモ)
  → recordBuzzWeaveRun()
  → buzzweave-metrics-poll（非同期）
```
