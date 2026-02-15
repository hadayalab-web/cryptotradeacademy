# ML-PQT 実装パッチ仕様（実測補正レイヤー）

Grok 由来の JSON（`PERFORMANCE_REFINEMENT_CONFIG`）を OS に載せ、「実測データ → 正規化 → 日次ターゲット / 言語配分 / Tier / ウィンドウ強度 / ガード」の**補正レイヤー**を追加するための仕様。

---

## 0. 前提

- **対象 JSON**: `mlPqtScheduleConfig.js` の `PERFORMANCE_REFINEMENT_CONFIG`
  - `conceptual_summary`, `required_metrics`, `metric_normalization`, `daily_target_adjustment`, `language_allocation_adjustment`, `fisherman_tier_adjustment`, `window_intensity_adjustment`, `safety_and_saturation`, `unknowns`
- **目的**: 実測メトリクスを正規化し、日次ターゲット・言語配分・Tier・ウィンドウ強度・ガードレールに反映する。

---

## 1. データの流れ（正規化 → 補正 → ガード）

```
実測取得 (mlPqtMetrics)
    → collectPerformanceMetricsForSnapshot(dateOrRange)
    → snapshot.performanceMetrics（生メトリクス）

正規化 (mlPqtNormalizer)
    → normalizePerformanceMetrics(snapshot.performanceMetrics)
    → 0〜1 の正規化フィールド

補正
    → refineDailyTarget(baseTarget, snapshot)           … 日次ターゲット
    → adjustLanguageAllocation(baseRatios, snapshot)    … 言語配分
    → adjustWindowIntensities(baseWindows, snapshot)    … ウィンドウ強度
    → updateFishermanTiers(fishermen, normalized)       … Tier / ブラックリスト

ガード (pqtPlanner)
    → applySafetyAndSaturationGuards(snapshot, currentPlan)
    → ターゲット削減・low-tier 停止・言語再配分・top-3 テンプレ
```

---

## 2. JSON ブロックと実装の対応

| ブロック | ファイル | 関数・役割 |
|----------|----------|------------|
| `metric_normalization` | `mlPqtNormalizer.js` | `normalizePerformanceMetrics(rawMetrics)` |
| `daily_target_adjustment` | `mlPqtScheduler.js` | `refineDailyTarget(baseTarget, snapshot)` 内で aggregateCtr / impressionsMomentum / tier1SuccessRate / saturationIndex で 350/300 補正 |
| `language_allocation_adjustment` | `mlPqtScheduler.js` | `adjustLanguageAllocation(baseRatios, snapshot)`（snapshot に performanceMetrics があれば Top CTR ±0.04、impressions・fisherman 密度で補正） |
| `window_intensity_adjustment` | `mlPqtScheduler.js` | `adjustWindowIntensities(baseWindows, snapshot)`（per-window CTR / velocity で 1.15 / 1.1 / 0.9 乗数、合計 1.0 に再正規化） |
| `fisherman_tier_adjustment` | `fishermanPriority.js` | `updateFishermanTiers(fishermen, performanceMetrics)` / `orderCandidatesByPerformanceTiers(candidates, normalized, tier3Cap)` |
| `safety_and_saturation` | `pqtPlanner.js` | `applySafetyAndSaturationGuards(snapshot, currentPlan)`（CTR 急落・停滞・言語過多・テンプレ分散） |

---

## 3. snapshot.performanceMetrics の構造（生メトリクス）

`collectPerformanceMetricsForSnapshot(dateOrRange)` の戻り値（Supabase / ログから集約）:

| フィールド | 説明 |
|------------|------|
| `perPqtCtr` | PQT 単位の CTR（id または集計） |
| `perPqtImpressions` | PQT 単位インプレッション |
| `perPqtEngagements` | PQT 単位エンゲージメント |
| `perLanguageCtr` | `{ en, es, pt, ar, ko, ja }` |
| `perWindowCtr` | `{ w1..w6 }` |
| `perTierSuccessRate` | `{ tier1, tier2, tier3 }` |
| `fishermanCtrHistory` | `{ [fishermanId]: { recentCtrs: [], avgCtr } }` |
| `dailySaturationIndex` | 1 fisherman あたり PQT 数（飽和度） |
| （ガード用）`ctrDropRate` | 前日比 CTR 下落率（任意） |
| `tierImpressionsStagnant` | ティア別インプレ停滞フラグ（任意） |
| `templateCtrVarianceHigh` | テンプレ分散高フラグ（任意） |

snapshot に `fishermanDensityByLang` / `impressionsByLangNormalized` / `fishermanVelocityByWindow` がある場合、言語配分・ウィンドウ強度補正で利用する。

---

## 4. 正規化後の形（normalizePerformanceMetrics の戻り値）

| フィールド | 用途 |
|------------|------|
| `aggregateCtrNormalized` | 日次ターゲット補正（>0.7 → 350〜400） |
| `impressionsMomentum` | 日次ターゲット（>0.7 → 300〜400） |
| `tier1SuccessRateNormalized` | 日次ターゲット（>0.8 → 上振れ） |
| `saturationIndexNormalized` | 日次ターゲット（>0.7 → 200〜300 に縮小） |
| `perLanguageCtrNormalized` | 言語配分（Top +0.04 / Bottom -0.04） |
| `perWindowCtrNormalized` | ウィンドウ強度（高 CTR *1.15 等） |
| `perTierSuccessNormalized` | ティア別成功率 |
| `fishermanSignals` | `{ [id]: { ctrNormalized, velocity, trendDeclining, poorCyclesCount } }` → Tier 更新・ブラックリスト |

---

## 5. 接続ポイント

- **pqtPlanner**: `allocatePqtPerLanguageFromSchedule(snapshot)` で `adjustLanguageAllocation(baseRatios, snapshot)` を呼び、最後に `applySafetyAndSaturationGuards(snapshot, plan)` を適用。
- **buzzWeaveEngine**: `runBuzzWeaveCyclePqtOnly` で
  1. `snapshot.performanceMetrics = await collectPerformanceMetricsForSnapshot(new Date())` で実測を付与（任意）、
  2. `allocatePqtPerLanguageFromSchedule(snapshot)` で日次・言語・ガードまで反映、
  3. `snapshot.performanceMetrics` があるとき `orderCandidatesByPerformanceTiers(slots, normalized, 2)`、なければ `orderedCandidatesWithTier3Cap(slots, {}, 2)`。
- **ウィンドウ強度**: `computePerWindowPqt(dailyTarget, intensityRatios)` の第2引数に `adjustWindowIntensities(TIME_DISTRIBUTION.map(w => w.relative_intensity), snapshot)` の戻り値を渡すと、実測ベースのウィンドウ配分になる。

---

## 6. 参照ドキュメント

- スケジュール JSON 全体: `docs/BUZZWEAVE_ML_PQT_SCHEDULE_SPEC.md`
- CTR 設計・メインフロー: `docs/BUZZWEAVE_PQT_CTR_DESIGN.md`
- 監査メモ: `docs/ML_PQT_IMPLEMENTATION_AUDIT.md`
