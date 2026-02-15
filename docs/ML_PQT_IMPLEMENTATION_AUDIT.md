# ML-PQT 実装 監査メモ（破綻チェック）

## 結論: 致命的な破綻はなし

- 依存関係の循環なし（pqtPlanner → mlPqtScheduleConfig / mlPqtScheduler、mlPqtScheduler → mlPqtScheduleConfig）
- PQT-only 経路（runBuzzWeaveCyclePqtOnly）は getPqtCapForRun / selectFishermanSlotsTopPercent / buildPqt / insertQuotedTweets / insertBuzzweavePostLog と整合
- insertQuotedTweets の引数は `[{ tweet_id, lang }]` で supabase の仕様と一致

---

## 軽微な不整合・仕様ギャップ

### 1. 日次ターゲットの上限が 350 で止まる → **対応済み**

- **状況:** 当初、high trapScore でも mid が最大 315 となり 350–400 帯が使われていなかった。
- **対応:** `getDailyPqtTargetFromSnapshot` で trapScore が high / elevated のとき `target = max(350, min(400, mid))` とし、350–400 が使われるようにした。

### 2. スケジュール配分とエンジン配分の二系統 → **対応済み（優先度1パッチ）**

- **状況:** 当初、本番 PQT-only は `getPqtCapForRun`（weight ベース）のみ使用していた。
- **対応:** `runBuzzWeaveCyclePqtOnly` で `allocatePqtPerLanguageFromSchedule(snapshot)` を参照し、`cap = max(1, min(perLang[langFilter], API_CALL_CAP))` で 1 run あたりの上限を決定するように変更済み。スケジュール（share_ratio）とエンジン配分を統一。

### 3. 未実装の拡張 → **優先度2 対応済み（一部）**

- **refineDailyTarget** … `mlPqtScheduler.js` に実装済み。`getDailyPqtTargetFromSnapshot` から呼び出し。trapScore / totalFishermanDetected / marketVolatilityIndex / priorDayCtrAverage / apiCreditRemaining で 200–400 を補正。
- **adjustLanguageAllocation** … `mlPqtScheduler.js` に実装済み。`allocatePqtPerLanguageFromSchedule` で baseRatios + langStats から動的補正（snapshot.langStats があれば反映。未設定時は base 比率のまま）。
- **rankFishermenWithTiers** … `fishermanPriority.js` 新規で実装。`runBuzzWeaveCyclePqtOnly` で `orderedCandidatesWithTier3Cap(slots, {}, 2)` により Tier1→Tier2→Tier3 順・Tier3 は最大 2 件に制限。
- **adjustWindowIntensities** … `mlPqtScheduler.js` に実装済み。`computePerWindowPqt(dailyTarget, intensityRatios)` の第2引数に渡して利用可能。
- **Safety guards** … `pqtPlanner.applySafetyAndSaturationGuards` で CTR 急落・停滞・言語過多・テンプレ分散に応じたガードを適用。実測補正レイヤーは `docs/ML_PQT_IMPLEMENTATION_PATCH_SPEC.md` 参照。

---

## 推奨（任意）

1. **日次 350–400 を使う場合:** `pqtPlanner.getDailyPqtTargetFromSnapshot` で trapScore high のとき `min(400, max(350, mid))` のように 350–400 に寄せる。
2. **スケジュールと 1 run を一致させる場合:** PQT-only 時に `allocatePqtPerLanguageFromSchedule` を参照する経路を追加し、その言語の日次目標と run あたり上限から cap を算出する。
