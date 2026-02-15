# Grok に聞く「狙いどころの時間・タイミング」— JSON 回答用プロンプト

Grok にそのまま貼り、**JSON のみ**で回答させる。忖度なしで時刻・ウィンドウ・理由を返させる。

---

## プロンプト（コピペ用）

```
You are a crypto Twitter / X strategy analyst. Answer ONLY with a single JSON object. No preamble, no markdown code fence, no explanation outside the JSON.

Context:
- We run a parasitic quote-tweet (PQT) engine: we find buzzy posts from "shiteshi" (operator) accounts, quote them with a product link (Vidalytics/Whop), and aim to get "lantern traders" (提灯—retail that flocks to the pump) to click.
- We operate ONLY in these 6 language regions: EN (English), ES (Spanish), PT (Portuguese), AR (Arabic), KO (Korean), JA (Japanese). Do not consider any other markets or languages.
- All shiteshi activity and lantern reaction analysis must be scoped to crypto Twitter/X in these 6 language spheres only.
- We can schedule runs at any UTC hour (e.g. cron) and we have 6 UTC windows: 00–04, 04–08, 08–12, 12–16, 16–20, 20–24.

Questions to answer in JSON:

1. **shiteshi_activity_peaks**: When do crypto operator / shiteshi accounts tend to post or pump most (UTC), **within EN/ES/PT/AR/KO/JA language spheres only**? Give 2–4 time windows (start_hour_utc, end_hour_utc, weight 0–1, reason one line).
2. **lantern_reaction_peaks**: When are lantern traders (retail) in **EN/ES/PT/AR/KO/JA** most likely to see and react to quote tweets (UTC)? Same format: start_hour_utc, end_hour_utc, weight, reason.
3. **optimal_run_times_utc**: Concrete UTC hours (0–23) we should prefer for running our PQT engine across the 6 regions (e.g. [8, 9, 14, 15, 20, 21]). Max 12 hours. Brief reason.
4. **per_language_nudge**: For each of en, es, pt, ar, ko, ja, give preferred_hours_utc (array of 0–23) when that language’s audience is most active; or null if no nudge. Must include all 6 keys.
5. **cron_schedule_suggestion**: A single cron expression (e.g. "0 8,14,20 * * *" for 08:00, 14:00, 20:00 UTC daily) that fits the above. Reason one line.
6. **expected_reach**: Given this posting cadence (runs at the suggested cron times, ~1–3 PQTs per run, ~15–30 PQTs/day across EN/ES/PT/AR/KO/JA), estimate for crypto quote-tweets parasitizing shiteshi buzz: (a) **daily_impressions_low** and **daily_impressions_high** (range), (b) **daily_engagements_low** and **daily_engagements_high** (likes + RTs + replies, range), (c) **assumptions_one_line** (e.g. "assuming 0.5–2% CTR, no virals").
7. **expected_reach_at_max_volume**: If we **maximize post volume** (run at every optimal_run_times_utc hour, post up to 15–20 PQTs per run, all 6 languages EN/ES/PT/AR/KO/JA covered; e.g. ~100–150 PQTs/day), same structure: **daily_impressions_low**, **daily_impressions_high**, **daily_engagements_low**, **daily_engagements_high**, **assumptions_one_line**. Include one line on diminishing returns or ceiling effects if any.

Output format (strict JSON only):

{
  "shiteshi_activity_peaks": [
    { "start_hour_utc": 14, "end_hour_utc": 18, "weight": 0.9, "reason": "NY session overlap" }
  ],
  "lantern_reaction_peaks": [
    { "start_hour_utc": 14, "end_hour_utc": 17, "weight": 0.85, "reason": "Peak engagement window" }
  ],
  "optimal_run_times_utc": [8, 14, 15, 20, 21],
  "optimal_run_times_reason": "One line",
  "per_language_nudge": {
    "en": [14, 15, 20, 21],
    "es": [15, 16, 21],
    "pt": [15, 16, 21],
    "ar": [10, 11, 18, 19],
    "ko": [0, 1, 8, 9],
    "ja": [0, 1, 8, 9]
  },
  "cron_schedule_suggestion": "0 8,14,20 * * *",
  "cron_schedule_reason": "One line",
  "expected_reach": {
    "daily_impressions_low": 0,
    "daily_impressions_high": 0,
    "daily_engagements_low": 0,
    "daily_engagements_high": 0,
    "assumptions_one_line": "One line"
  },
  "expected_reach_at_max_volume": {
    "daily_impressions_low": 0,
    "daily_impressions_high": 0,
    "daily_engagements_low": 0,
    "daily_engagements_high": 0,
    "assumptions_one_line": "One line (include diminishing returns/ceiling if any)"
  }
}

Reply with nothing but this JSON.
```

---

## 回答の使い方

1. Grok の返答から JSON だけをコピーする（前後の説明文は除く）。
2. **cron_schedule_suggestion** を Vercel の `vercel.json` の `/api/buzzweave-run` の `schedule` に設定する。  
   例: `"0 8,14,20 * * *"` → 毎日 08:00 / 14:00 / 20:00 UTC に実行。
3. **optimal_run_times_utc** や **shiteshi_activity_peaks** / **lantern_reaction_peaks** は、`mlPqtScheduleConfig.js` の `TIME_DISTRIBUTION` の `relative_intensity` を調整するときの参照にする（どの UTC ウィンドウを強くするか）。
4. **expected_reach**（daily_impressions_low/high, daily_engagements_low/high）は、この投稿数で得られる想定インプレ・エンゲージメントの目安。KPI やレポートの参照用。
5. **expected_reach_at_max_volume** は、ポスト数を最大限に伸ばした場合（全最適時刻で run、1 run あたり 15–20 PQT、6言語で 1 日 100–150 PQT 想定）の想定。伸びしろとディミニッシングリターンの目安用。
6. **recommended_settings**（落としどころ）は、9 run フルと最大 PQT 数の中間。X API 消費とリーチのバランス用の推奨値。

---

## 落としどころの設定

`config/grokOptimalTiming.json` の **recommended_settings** に、中間的な運用の目安を入れている。

| 項目 | 落としどころ | 説明 |
|------|--------------|------|
| **cron_schedule** | `0 0,8,13,14,20,21 * * *` | 1 日 6 run（0,1,15,16 を外して API 節約） |
| **BUZZWEAVE_API_CALL_CAP** | 8 | 1 run あたり最大 8 PQT（希釈抑制） |
| **BUZZWEAVE_DAILY_RUN_HIGH** | 6 | 日次 run 上限 6（cron 本数と一致） |
| **想定** | 30–50 PQT/日、5万–12万 imp、2k–8k eng | 9 run フルより控えめ、最大より現実的 |

**使い方**

- **vercel.json**: `crons[].schedule` に `recommended_settings.cron_schedule` をコピー。
- **環境変数**: `BUZZWEAVE_API_CALL_CAP=8`、必要なら `BUZZWEAVE_DAILY_RUN_HIGH=6` を設定。

3段階の目安: **控えめ**（expected_reach・15–30 PQT/日） → **落としどころ**（上記） → **最大**（expected_reach_at_max_volume・100–150 PQT/日）。

---

## 注意

- Grok が JSON の前に文を付けた場合は、その部分を削除してからパースする。
- 必要なら「Answer only with valid JSON, no other text」をプロンプトの最後に追加する。
