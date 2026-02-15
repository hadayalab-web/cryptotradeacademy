/**
 * ML-PQT Engine スケジューラ
 * DAILY_PQT_TARGET に対する時間帯・言語配分を JSON 比率で計算。端数調整で合計を一致させる。
 */
const { GLOBAL_LIMITS, TIME_DISTRIBUTION, LANGUAGE_ALLOCATION } = require("./mlPqtScheduleConfig");
let normalizePerformanceMetrics;
try {
  normalizePerformanceMetrics = require("./mlPqtNormalizer").normalizePerformanceMetrics;
} catch (_) {
  normalizePerformanceMetrics = () => ({ aggregateCtrNormalized: 0.5, impressionsMomentum: 0.5, tier1SuccessRateNormalized: 0.5, saturationIndexNormalized: 0.5 });
}

const FISHERMAN_DENSITY_THRESHOLD = Number(process.env.ML_PQT_FISHERMAN_DENSITY_THRESHOLD) || 50;
const VOLATILITY_THRESHOLD = Number(process.env.ML_PQT_VOLATILITY_THRESHOLD) || 0.6;
const API_CREDIT_THRESHOLD = Number(process.env.ML_PQT_API_CREDIT_THRESHOLD) || 100;
const PRIOR_CTR_LOW = Number(process.env.ML_PQT_PRIOR_CTR_LOW) || 0.03;
const HIGH_CTR_THRESHOLD = Number(process.env.ML_PQT_HIGH_CTR_THRESHOLD) || 0.05;
const LOW_FISH_THRESHOLD = Number(process.env.ML_PQT_LOW_FISH_THRESHOLD) || 5;
const LANG_VOL_THRESHOLD = Number(process.env.ML_PQT_LANG_VOL_THRESHOLD) || 0.5;

/**
 * 日次目標を 200〜400 の範囲にクランプ
 */
function clampDailyTarget(value) {
  const { min, max } = GLOBAL_LIMITS.recommended_range_per_day;
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * 各 UTC ウィンドウの PQT 数（relative_intensity で配分、合計 = dailyTarget）
 * @param {number} dailyTarget - 日次目標数
 * @param {number[]} [intensityRatios] - 省略時は TIME_DISTRIBUTION。adjustWindowIntensities の戻り値を渡せる
 */
function computePerWindowPqt(dailyTarget, intensityRatios) {
  const target = clampDailyTarget(dailyTarget);
  const ratios = Array.isArray(intensityRatios) && intensityRatios.length >= 6
    ? intensityRatios
    : TIME_DISTRIBUTION.map((w) => w.relative_intensity);
  const raw = TIME_DISTRIBUTION.map((w, i) => ({
    ...w,
    pqt: Math.round(target * (ratios[i] || 0))
  }));
  const sum = raw.reduce((s, w) => s + w.pqt, 0);
  const diff = target - sum;
  if (diff !== 0 && raw.length > 0) {
    const last = raw.length - 1;
    raw[last].pqt = Math.max(0, raw[last].pqt + diff);
  }
  return raw;
}

/**
 * 各言語の PQT 数（share_ratio で配分、合計 = dailyTarget）
 */
function computePerLangPqt(dailyTarget) {
  const target = clampDailyTarget(dailyTarget);
  const perLang = {};
  let sum = 0;
  const langList = LANGUAGE_ALLOCATION.map((l) => l.language.toLowerCase());
  for (let i = 0; i < LANGUAGE_ALLOCATION.length; i++) {
    const l = LANGUAGE_ALLOCATION[i];
    const lang = l.language.toLowerCase();
    const pqt = i < LANGUAGE_ALLOCATION.length - 1
      ? Math.round(target * l.share_ratio)
      : Math.max(0, target - sum);
    perLang[lang] = Math.max(0, pqt);
    sum += perLang[lang];
  }
  const diff = target - sum;
  if (diff !== 0 && langList.length > 0) {
    perLang[langList[0]] = Math.max(0, (perLang[langList[0]] || 0) + diff);
  }
  return perLang;
}

/**
 * 時間帯 × 言語の 2 次元割り当て
 * 各ウィンドウ内を share_ratio で言語配分。ウィンドウ合計 = pqt_per_window、全体合計 = dailyTarget
 */
function computePerWindowLang(dailyTarget) {
  const windows = computePerWindowPqt(dailyTarget);
  const result = [];

  for (const win of windows) {
    const windowPqt = win.pqt;
    const row = { utc_window: win.utc_window, pqt_total: windowPqt, by_lang: {} };
    let rowSum = 0;
    const langKeys = LANGUAGE_ALLOCATION.map((l) => l.language.toLowerCase());

    for (let i = 0; i < LANGUAGE_ALLOCATION.length; i++) {
      const l = LANGUAGE_ALLOCATION[i];
      const lang = l.language.toLowerCase();
      const pqt = i < LANGUAGE_ALLOCATION.length - 1
        ? Math.round(windowPqt * l.share_ratio)
        : Math.max(0, windowPqt - rowSum);
      row.by_lang[lang] = Math.max(0, pqt);
      rowSum += row.by_lang[lang];
    }
    const rowDiff = windowPqt - rowSum;
    if (rowDiff !== 0 && langKeys.length > 0) {
      row.by_lang[langKeys[0]] = Math.max(0, (row.by_lang[langKeys[0]] || 0) + rowDiff);
    }
    result.push(row);
  }

  return result;
}

/**
 * スケジュール一括取得
 * @param {number} dailyTarget - 日次 PQT 目標（OS が 200〜400 で決定）
 * @returns {{ dailyTarget: number, perWindow: Array, perLang: Object, perWindowLang: Array }}
 */
function getSchedule(dailyTarget) {
  const target = clampDailyTarget(dailyTarget);
  return {
    dailyTarget: target,
    perWindow: computePerWindowPqt(target),
    perLang: computePerLangPqt(target),
    perWindowLang: computePerWindowLang(target)
  };
}

/**
 * 現在 UTC 時刻が属するウィンドウと、そのウィンドウの PQT 数・言語内訳を返す
 */
function getCurrentWindowSchedule(dailyTarget, utcDate) {
  const d = utcDate || new Date();
  const utcHour = d.getUTCHours();
  const windows = computePerWindowPqt(dailyTarget);
  const windowRanges = TIME_DISTRIBUTION.map((w) => {
    const parts = w.utc_window.split("-").map((s) => s.trim());
    const startH = parts[0] ? parseInt(parts[0].slice(0, 2), 10) : 0;
    const endPart = parts[1] || "00:00";
    const endH = endPart.slice(0, 2) === "00" && endPart !== "00:00" ? 24 : parseInt(endPart.slice(0, 2), 10);
    return { ...w, startH, endH: endH || 24 };
  });

  let current = null;
  for (let i = 0; i < windowRanges.length; i++) {
    const w = windowRanges[i];
    const endH = w.endH === 0 ? 24 : w.endH;
    if (utcHour >= w.startH && utcHour < endH) {
      current = { ...windows[i], startH: w.startH, endH };
      break;
    }
  }
  if (!current) current = { ...windows[0], startH: 0, endH: 4 };

  const perWindowLang = computePerWindowLang(dailyTarget);
  const row = perWindowLang.find((r) => r.utc_window === current.utc_window) || { by_lang: {} };
  return { window: current, by_lang: row.by_lang || {} };
}

/**
 * 日次ターゲット強化（ML_PQT_REFINEMENT_CONFIG + PERFORMANCE_REFINEMENT_CONFIG.daily_target_adjustment）
 * snapshot: trapScore, totalFishermanDetected, marketVolatilityIndex, priorDayCtrAverage, apiCreditRemaining, performanceMetrics
 */
function refineDailyTarget(baseTarget, snapshot) {
  let target = Number(baseTarget);
  if (!Number.isFinite(target)) target = GLOBAL_LIMITS.recommended_range_per_day.min;

  const trapScore = snapshot?.trapScore;
  const trapHigh = trapScore === "high" || trapScore === "elevated" ||
    (typeof trapScore === "number" && trapScore > 0.7);
  if (trapHigh) target = Math.max(350, Math.min(400, target));

  const totalFisherman = Number(snapshot?.totalFishermanDetected);
  if (Number.isFinite(totalFisherman) && totalFisherman > FISHERMAN_DENSITY_THRESHOLD) {
    target = Math.max(target, 300);
  }

  const vol = Number(snapshot?.marketVolatilityIndex);
  if (Number.isFinite(vol) && vol > VOLATILITY_THRESHOLD) {
    target = Math.max(250, Math.min(400, target));
  }

  const priorCtr = Number(snapshot?.priorDayCtrAverage);
  if (Number.isFinite(priorCtr) && priorCtr < PRIOR_CTR_LOW) {
    target = Math.min(target, 300);
  }

  const apiCredit = Number(snapshot?.apiCreditRemaining);
  if (Number.isFinite(apiCredit) && apiCredit < API_CREDIT_THRESHOLD) {
    target = Math.min(target, 300);
  }

  if (snapshot?.performanceMetrics && typeof normalizePerformanceMetrics === "function") {
    const norm = normalizePerformanceMetrics(snapshot.performanceMetrics);
    if (norm.aggregateCtrNormalized > 0.7) target = Math.max(target, 350);
    if (norm.impressionsMomentum > 0.7) target = Math.max(target, 300);
    if (norm.tier1SuccessRateNormalized > 0.8) target = Math.max(target, 350);
    if (norm.saturationIndexNormalized > 0.7) target = Math.min(target, 300);
  }

  return clampDailyTarget(target);
}

const SOME_IMPRESSIONS_THRESHOLD = 0.6;
const SOME_DENSITY_THRESHOLD = 0.5;

/**
 * 言語配分の動的補正（ML_PQT_REFINEMENT_CONFIG + PERFORMANCE_REFINEMENT_CONFIG.language_allocation_adjustment）
 * baseRatios: { en: 0.4, es: 0.2, ... } 合計 1.0
 * langStatsOrSnapshot: { en: { ctr, fishermanCount, volatility }, ... } または snapshot（performanceMetrics あり）
 */
function adjustLanguageAllocation(baseRatios, langStatsOrSnapshot) {
  const snapshot = langStatsOrSnapshot && langStatsOrSnapshot.performanceMetrics ? langStatsOrSnapshot : null;
  const langStats = snapshot ? snapshot.langStats || {} : (langStatsOrSnapshot || {});

  const adjusted = {};
  for (const lang of Object.keys(baseRatios)) {
    adjusted[lang] = baseRatios[lang];
  }

  if (snapshot && typeof normalizePerformanceMetrics === "function") {
    const normalized = normalizePerformanceMetrics(snapshot.performanceMetrics);
    const ctr = normalized.perLanguageCtrNormalized || {};
    const fishermanDensity = snapshot.fishermanDensityByLang || {};
    const impressions = snapshot.impressionsByLangNormalized || {};

    const langs = Object.keys(baseRatios);
    const sortedByCtr = [...langs].sort((a, b) => (ctr[b] || 0) - (ctr[a] || 0));
    const topLang = sortedByCtr[0];
    const bottomLang = sortedByCtr[sortedByCtr.length - 1];
    if (topLang) adjusted[topLang] += 0.04;
    if (bottomLang && bottomLang !== topLang) adjusted[bottomLang] -= 0.04;

    for (const lang of langs) {
      if ((impressions[lang] || 0) > SOME_IMPRESSIONS_THRESHOLD) adjusted[lang] += 0.03;
      if ((fishermanDensity[lang] || 0) > SOME_DENSITY_THRESHOLD) adjusted[lang] += 0.02;
      else adjusted[lang] -= 0.02;
    }
  } else {
    for (const lang of Object.keys(baseRatios)) {
      const s = langStats[lang] || {};
      const ctr = Number(s.ctr);
      const fishermanCount = Number(s.fishermanCount);
      const volatility = Number(s.volatility);
      if (Number.isFinite(ctr) && ctr > HIGH_CTR_THRESHOLD) adjusted[lang] += 0.04;
      if (Number.isFinite(fishermanCount) && fishermanCount < LOW_FISH_THRESHOLD) adjusted[lang] -= 0.03;
      if (Number.isFinite(volatility) && volatility > LANG_VOL_THRESHOLD) adjusted[lang] += 0.04;
    }
  }

  const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
  if (sum <= 0) return baseRatios;
  for (const lang of Object.keys(adjusted)) {
    adjusted[lang] = adjusted[lang] / sum;
  }
  return adjusted;
}

/**
 * ウィンドウ強度補正（PERFORMANCE_REFINEMENT_CONFIG.window_intensity_adjustment）
 * baseWindows: [0.25, 0.15, 0.10, 0.20, 0.20, 0.10] など 6 要素、合計 1.0
 * snapshot.performanceMetrics を正規化し、per-window CTR / velocity で乗数適用後、合計 1.0 に再正規化
 */
function adjustWindowIntensities(baseWindows, snapshot) {
  const arr = Array.isArray(baseWindows) && baseWindows.length >= 6 ? [...baseWindows] : TIME_DISTRIBUTION.map((w) => w.relative_intensity);
  if (arr.length < 6) return arr;

  if (!snapshot?.performanceMetrics || typeof normalizePerformanceMetrics !== "function") {
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum > 0 ? arr.map((v) => v / sum) : arr;
  }

  const normalized = normalizePerformanceMetrics(snapshot.performanceMetrics);
  const ctr = normalized.perWindowCtrNormalized || {};
  const velocity = snapshot.fishermanVelocityByWindow || {};
  const HIGH = 0.7;
  const LOW = 0.3;

  for (let i = 0; i < 6; i++) {
    const key = `w${i + 1}`;
    if ((ctr[key] || 0) > HIGH) arr[i] *= 1.15;
    if ((velocity[key] || 0) > HIGH) arr[i] *= 1.1;
    if ((ctr[key] || 0) < LOW) arr[i] *= 0.9;
  }

  const sum = arr.reduce((a, b) => a + b, 0);
  return sum > 0 ? arr.map((v) => v / sum) : arr;
}

/**
 * 任意の言語比率オブジェクトで言語別 PQT 数を算出（合計 = dailyTarget）
 * ratios: { en: 0.4, es: 0.2, ... } 合計 1.0
 */
function computePerLangPqtWithRatios(dailyTarget, ratios) {
  const target = clampDailyTarget(dailyTarget);
  const langs = Object.keys(ratios);
  if (langs.length === 0) return {};
  const perLang = {};
  let sum = 0;
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    const r = ratios[lang] || 0;
    const pqt = i < langs.length - 1 ? Math.round(target * r) : Math.max(0, target - sum);
    perLang[lang] = Math.max(0, pqt);
    sum += perLang[lang];
  }
  const diff = target - sum;
  if (diff !== 0 && langs.length > 0) perLang[langs[0]] = Math.max(0, (perLang[langs[0]] || 0) + diff);
  return perLang;
}

module.exports = {
  GLOBAL_LIMITS,
  clampDailyTarget,
  computePerWindowPqt,
  computePerLangPqt,
  computePerWindowLang,
  getSchedule,
  getCurrentWindowSchedule,
  refineDailyTarget,
  adjustLanguageAllocation,
  adjustWindowIntensities,
  computePerLangPqtWithRatios
};
