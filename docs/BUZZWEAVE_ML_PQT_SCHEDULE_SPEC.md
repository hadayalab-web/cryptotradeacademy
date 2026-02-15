# ML-PQT Engine スケジュール仕様（JSON そのまま実装）

日次合計 DAILY_PQT_TARGET を OS が 200〜400 で決定し、時間帯・言語配分は Grok JSON の比率で計算する。

## 1. グローバル設定

- max_pqt_per_day: 500
- recommended_range_per_day: { min: 200, max: 400 }

DAILY_PQT_TARGET は可変。snapshot の trapScore 等で 200〜400 を決定。時間・言語は DAILY_PQT_TARGET に対する比率で算出。

## 2. 時間帯

- 00:00-04:00 → 0.25
- 04:00-08:00 → 0.15
- 08:00-12:00 → 0.10
- 12:00-16:00 → 0.20
- 16:00-20:00 → 0.20
- 20:00-00:00 → 0.10

pqt_per_window = round(DAILY_PQT_TARGET * relative_intensity)。端数は最後のウィンドウで調整。

## 3. 言語配分

- EN 0.40, ES 0.20, PT 0.15, AR 0.10, KO 0.08, JA 0.07

pqt_per_lang = round(DAILY_PQT_TARGET * share_ratio)。端数は EN または最後の言語で調整。

## 4. 時間 x 言語

各ウィンドウ内で pqt_per_window を share_ratio で言語配分。ウィンドウ合計が pqt_per_window になるよう端数調整。

## 5. 実装

- mlPqtScheduleConfig.js: GLOBAL_LIMITS, TIME_DISTRIBUTION, LANGUAGE_ALLOCATION
- mlPqtScheduler.js: clampDailyTarget, computePerWindowPqt, computePerLangPqt, computePerWindowLang, getSchedule, getCurrentWindowSchedule
- pqtPlanner.js: getDailyPqtTargetFromSnapshot(snapshot), allocatePqtPerLanguageFromSchedule(snapshot)
