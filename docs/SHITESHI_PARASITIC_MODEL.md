# SHITESHI_PARASITIC_MODEL（仕手師・寄生・swarm・転換）

Trap Defence OS に組み込んだ「仕手師検出 → 寄生引用タイミング → swarm 検出 → 転換スコア」レイヤーの仕様と JSON 対応。

---

## 1. Grok JSON の構造（コンフィグ）

`services/td/mlPqtScheduleConfig.js` の `SHITESHI_PARASITIC_MODEL` に以下をそのまま保持する。

| キー | 内容 |
|------|------|
| `conceptual_summary` | モデル要約 |
| `core_objective` | 目的（swarm 捕捉・エコシステム成長） |
| `required_detection_signals` | 検出に使うシグナル（velocity, follower surge, volatility hashtags, cross-platform, pump history） |
| `shiteshi_scoring_model` | 仕手師スコアの要因・重み・閾値・24h 減衰 |
| `parasitic_entry_timing` | 寄生エントリーの drivers・timing_model（early/mid/late） |
| `lantern_trader_swarm_model` | swarm シグナル・転換機会 |
| `conversion_scoring` | 転換スコアの drivers・重み・sigmoid・>0.6 high-conversion |
| `ecosystem_feedback_loops` | フィードバックループ |
| `advanced_strategies` | 上級戦略 |
| `unknowns` | 不確実性 |

---

## 2. JSON ブロックと実装の対応

| ブロック | ファイル | 関数 |
|----------|----------|------|
| `shiteshi_scoring_model` | `shiteshiScoring.js` | `scoreShiteshiCandidate(candidateMetrics)` / `isHighImpactShiteshi(score)` |
| `parasitic_entry_timing` | `shiteshiTiming.js` | `classifyParasiticTiming(rampPercentile)` → `'early'|'mid'|'late'` |
| `conversion_scoring` | `swarmScoring.js` | `scoreSwarmConversionPotential(swarmMetrics)` / `isHighConversionSwarm(likelihood)` |
| （転換の OS 接続） | `conversionEngine.js` | `applyConversionFlags(plan, swarmMetrics)` |

- **仕手師**: `candidateMetrics` = velocity, volatilityImpact, followerQuality, networkCentrality, spikeFrequency, lastSpikeAt（0–1）。重み 30/25/20/15/10、24h 減衰、閾値 >0.7。
- **寄生タイミング**: `rampPercentile` 0–1。&lt;0.2 early、0.2–0.6 mid、&gt;0.6 late。
- **転換**: `swarmMetrics` = pqtCtr, engagementDepth, repeatedVisits, demographicFit（0–1）。重み 40/30/20/10、sigmoid で 0–1、&gt;0.6 high-conversion。

---

## 3. 接続ポイント

### 3-1. Fisherman / Operator 側

- **fishermanPriority.js**: `rankFishermenWithTiers` で `stats[id].shiteshiScore` があり `isHighImpactShiteshi(score)` なら Tier1 に格上げし `c.shiteshi = true`。
- **buzzWeaveEngine.js**: スロット確定後、各 slot から `candidateMetrics` を組み立て `scoreShiteshiCandidate` でスコアを算出。`slot.shiteshiScore` を付与し、`orderedCandidatesWithTier3Cap(slots, shiteshiStats, 2)` に `shiteshiStats[id] = { shiteshiScore }` を渡す。performance 経路時は `orderCandidatesByPerformanceTiers` の結果を `shiteshiScore` 降順でソート。
- **タイミング**: PQT 発火時に `classifyParasiticTiming(rampPercentile)` を参照可能（rampPercentile は engagement/price/swarm から別レイヤーで算出）。mid を優先する場合は呼び出し側で制御。

### 3-2. swarm / 転換側

- **conversionEngine.js**: `applyConversionFlags(plan, swarmMetrics)` で `scoreSwarmConversionPotential` → `isHighConversionSwarm`。high-conversion なら `plan.highConversionSegment` / `preferStrongCta` / `retargetSegment` を立てる。
- **利用**: pqtPlanner や CTA 選択ロジックで `plan.preferStrongCta` が true なら強めの CTA / KIBA・Regular 導線を優先。retarget 対象は `plan.retargetSegment` でフラグ。

---

## 4. ループ図（仕手師 → 寄生 → swarm → 転換 → エコシステム）

```
[検出シグナル] → 仕手師スコア (scoreShiteshiCandidate)
       ↓
  high-impact → Tier1 / shiteshi ラベル
       ↓
[寄生タイミング] classifyParasiticTiming(ramp) → early / mid / late
       ↓
  PQT 発火（mid 優先など）
       ↓
[swarm メトリクス] CTR / depth / repeats / fit
       ↓
  転換スコア (scoreSwarmConversionPotential) → high-conversion フラグ
       ↓
  applyConversionFlags → 強め CTA / retarget
       ↓
[エコシステム] 転換データ → 検出・スコア・タイミングのチューニング
```

---

## 5. 参照

- コンフィグ: `services/td/mlPqtScheduleConfig.js`（`SHITESHI_PARASITIC_MODEL`）
- 仕手師: `services/td/shiteshiScoring.js`
- タイミング: `services/td/shiteshiTiming.js`
- swarm 転換: `services/td/swarmScoring.js` / `services/td/conversionEngine.js`
