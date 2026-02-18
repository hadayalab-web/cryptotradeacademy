# KIBA（転換点アラート）実装ロジック

**目的**: KIBA の判定・スコアリング・発火条件の実装ロジックをコード準拠でまとめる。内部用。ユーザーには「転換点アラート」のみ露出。

---

## 1. 全体の流れ

```
btcSnapshot (+ NASDAQ/GOLD) 取得
  → snapshotToDetectorInputs(btcSnapshot)   // 入力の正規化
  → 6 検知器を並列実行 (flow, whale, sentiment, retail, liquidity, algo)
  → computeKibaScore(detectors)            // 重み付き合計 → 0〜100
  → applySuppressionFilters(score, inputs)   // 条件付きで 30 キャップ
  → evaluateKibaImpact(kibaScore)           // スコア → level / intensity
  → triggered = (level が CRITICAL/HIGH/ELEVATED) かつ kibaScore >= 65
  → 時間窓サプレッション: 直近 lastKiba から 1h 以内なら triggered = false（ただし今回の level が前回より高い場合は発火許可）
  → triggered 時のみ KV 保存 + dispatchPayload.alerts 生成 → cron が Telegram 送信
```

---

## 2. 入力のマッピング（snapshotToDetectorInputs）

**データソース**: `btcSnapshot` の `cqDeep` / `xSentiment` / `raw` のみ。Kaiko・orderbook・cluster・liquidation は使わない。

| 検知器 | 入力 | 算出元 |
|--------|------|--------|
| **flow** | netflow, mean=0, std=1 | cqDeep.exchangeFlowsDetailed または exchangeInflow/Outflow/Netflow。netflow = inflow - outflow のフォールバック |
| **whale** | whaleIn, whaleOut, mean=0, std=1 | inflow / outflow（同上） |
| **sentiment** | postVolume, avgVolume, fearScore | xSentiment.postVolume/volume, avgVolume/postVolume。fearScore = raw.fng から 0〜1（25以下→1, 75以上→0, それ以外は (75-fng)/50） |
| **retail** | panicKeywords, bullishDrop | xSentiment.panicKeywords/panicRatio, bullishDrop/retailBias |
| **liquidity** | netflowChange=0, priceImpact, volumeSpike | priceImpact = raw.change5min があれば min(1, \|change5min\|×20)、なければ min(1, \|change24h\|/10)。volumeSpike = flowTotal から log10 スケールで 0〜1 |
| **algo** | flowPriceCorr=0, periodicWhale=0 | 現状は常に 0（将来用） |

**メタ（サプレッション用）**

- `hasCq`: CQ 由来の flow データが 1 つでもあるか
- `postVolume`, `avgVolume`, `change24h`: そのまま
- `whaleImbalanceNorm`: flowTotal > 0 のとき \|inflow - outflow\| / (flowTotal + 1e-6)、否则 0

---

## 3. 各検知器のロジック

各検知器は **0〜5** の値を返す（内部スコア）。未定義・NaN 時は 0。

### 3.1 flow（`detectFlowAnomaly`）

- **入力**: netflow, mean, std（エンジンでは mean=0, std=1）
- **式**: `z = (netflow - mean) / std`、出力 = clamp(z, 0, 5)
- **意味**: ネットフローの偏差（正規化）。std=0 のとき 0 を返す。

### 3.2 whale（`detectWhaleAnomaly`）

- **入力**: whaleIn, whaleOut, mean, std
- **式**: imbalance = \|whaleIn - whaleOut\|、`z = (imbalance - mean) / std`、出力 = clamp(z, 0, 5)
- **意味**: 大型プレイヤーの流入出の偏り。

### 3.3 sentiment（`detectSentimentAnomaly`）

- **入力**: postVolume, avgVolume, fearScore
- **式**: volumeDrop = (avgVolume - postVolume) / avgVolume、raw = volumeDrop×0.6 + fearScore×0.4、出力 = clamp(raw×5, 0, 5)
- **意味**: ボリューム急減と Fear スコアの組み合わせ。avgVolume<=0 のとき 0。

### 3.4 retail（`detectRetailAnomaly`）

- **入力**: panicKeywords, bullishDrop
- **式**: raw = panicKeywords×0.6 + bullishDrop×0.4、出力 = clamp(raw×5, 0, 5)
- **意味**: パニックキーワードとブル寄りドロップ。

### 3.5 liquidity（`detectLiquidityAnomaly`）

- **入力**: netflowChange, priceImpact, volumeSpike
- **式**: raw = netflowChange×0.4 + priceImpact×0.3 + volumeSpike×0.3、出力 = clamp(raw, 0, 5)
- **意味**: フロー変化・価格インパクト・ボリュームスパイクの合成（orderbook なし）。

### 3.6 algo（`detectAlgoAnomaly`）

- **入力**: flowPriceCorr, periodicWhale（現状どちらも 0）
- **式**: raw = flowPriceCorr×0.7 + periodicWhale×0.3、出力 = clamp(raw×5, 0, 5)
- **意味**: 将来用。現状は常に 0。

---

## 4. スコア集約（computeKibaScore）

**重み（crypto-weighted）**  
Algo 未実装の間は algo の 0.10 を liquidity に振り、流動性シグナルを強化。

| 検知器 | 重み |
|--------|------|
| flow | 0.25 |
| whale | 0.30 |
| sentiment | 0.20 |
| liquidity | 0.20 |
| algo | 0 |
| retail | 0.05 |

**式**:  
`score = flow×0.25 + liquidity×0.2 + sentiment×0.2 + whale×0.3 + algo×0 + retail×0.05`  
各検知器は 0〜5 なので加重合計は 0〜5。これを **×20** して **0〜100** にスケールし、clamp(0, 100) する。

---

## 5. サプレッション（applySuppressionFilters）

**定数**（kiba_engine.js）

- `LOW_VOLATILITY_THRESHOLD = 0.5` … \|change24h\| < 0.5 なら低ボラとみなす
- `X_VOLUME_MIN = 10` … postVolume または avgVolume が 10 未満なら X ボリューム不足
- `WHALE_SIGMA = 0.4` … whaleImbalanceNorm が 0.4 以下ならホエール偏り小

**ロジック**: 以下のいずれかを満たす場合、スコアを **min(score, 30)** にキャップする。

1. `!hasCq` … CQ データなし
2. `avgVolume < 10 || postVolume < 10`
3. `|change24h| < 0.5`
4. `whaleImbalanceNorm <= 0.4`

→ 誤検出を抑え、スコアが高く出ても 30 以下に抑える。

---

## 6. インパクト評価（evaluateKibaImpact）

**スコア → level / intensity**（kiba_trigger.js）

| スコア範囲 | level | intensity |
|------------|--------|-----------|
| 85 以上 | CRITICAL | max |
| 75 以上 85 未満 | HIGH | strong |
| 65 以上 75 未満 | ELEVATED | moderate |
| 65 未満 | NONE | none |

---

## 7. 発火条件（triggered）

**両方を満たすときのみ発火**:

1. **レベル**: `impact.level` が CRITICAL / HIGH / ELEVATED のいずれか  
   （＝ `kibaScore >= 65` と実質同値）
2. **閾値**: `kibaScore >= 65`

**時間窓サプレッション**:

- `SUPPRESSION_WINDOW_MS = 60 * 60 * 1000`（1 時間）
- `lastKibaSnapshot` が存在し、その `as_of_utc` と現在の `btcSnapshot.as_of_utc` の差が **1 時間未満** のとき、原則として `triggered` を **false** に上書き（重複アラート防止）。
- **例外**: 今回の `impact.level` が前回の `lastKibaSnapshot.level` より**高い**場合は、クールダウンを無視して発火する（例: 15 分前に ELEVATED 配信済みでも、今回 CRITICAL なら即時配信）。

---

## 8. 出力スナップショットと KV

**triggered 時のみ**:

- `buildKibaSnapshot` で level / intensity / btcContext / macroContext を正規化したスナップショットを生成。
- KV に保存: `kiba:snapshot:latest`（BTC の場合）、履歴は `kiba:snapshot:YYYYMMDDHHmm`（15 分バケット）。asset 指定時は `kiba:snapshot:${ASSET}:latest` 等。
- `formatCriticalAlert(snapshot, lang)` で 6 言語のアラート文を生成し、`dispatchPayload.alerts` に格納。
- cron が `kibaResult.triggered && dispatchPayload.alerts` を検知して Telegram 送信。

---

## 9. 定数・閾値一覧

| 名前 | 値 | 場所 |
|------|-----|------|
| SUPPRESSION_WINDOW_MS | 3600000 (1h) | kiba_engine.js |
| LOW_VOLATILITY_THRESHOLD | 0.5 | kiba_engine.js |
| X_VOLUME_MIN | 10 | kiba_engine.js |
| WHALE_SIGMA | 0.4 | kiba_engine.js |
| 発火スコア閾値 | 65 | kiba_engine.js (triggered), kiba_trigger.js (ELEVATED 下限) |
| CRITICAL 下限 | 85 | kiba_trigger.js |
| HIGH 下限 | 75 | kiba_trigger.js |
| ELEVATED 下限 | 65 | kiba_trigger.js |
| スコアスケール係数 | 20 | kiba_score.js（加重合計 0〜5 → 0〜100） |

---

## 10. 参照ファイル

| ファイル | 役割 |
|----------|------|
| `core/kiba/kiba_engine.js` | 入力マッピング、6 検知器呼び出し、スコア・サプレッション・時間窓・triggered 判定 |
| `core/kiba/scoring/kiba_score.js` | 重み付きスコア計算 |
| `core/kiba/evaluator/kiba_trigger.js` | スコア → level / intensity |
| `core/kiba/detectors/*.js` | flow, whale, sentiment, retail, liquidity, algo の各 0〜5 スコア |
| `api/kiba/run.js` | 認証、KV 読み、runKibaEngine 呼び出し、KV 保存、dispatchPayload 生成 |
| `services/snapshot/kibaSnapshotSchema.js` | スナップショット正規化、KV キー名（asset 対応） |
| `services/snapshot/kibaSnapshotBuilder.js` | スナップショット構築と KV 書き込み |

概要・フロー・認証・配信条件は `docs/KIBA_IMPLEMENTATION_SUMMARY.md` を参照。
