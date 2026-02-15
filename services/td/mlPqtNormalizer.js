/**
 * 実測メトリクス正規化（PERFORMANCE_REFINEMENT_CONFIG.metric_normalization）
 * 生メトリクス → 0〜1 または相対スコアに変換。
 */
const { PQT_LANGS, WINDOW_KEYS } = require("./mlPqtMetrics");

function minMax(value, min, max) {
  if (!Number.isFinite(value)) return 0.5;
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 生メトリクスを正規化（PERFORMANCE_REFINEMENT_CONFIG.metric_normalization.rules）
 * @param {Object} rawMetrics - collectPerformanceMetricsForSnapshot の戻り値
 * @returns {Object} 0〜1 の正規化フィールド
 */
function normalizePerformanceMetrics(rawMetrics) {
  if (!rawMetrics || typeof rawMetrics !== "object") {
    return getDefaultNormalized();
  }

  const perLangCtr = rawMetrics.perLanguageCtr || {};
  const perWindowCtr = rawMetrics.perWindowCtr || {};
  const tierRates = rawMetrics.perTierSuccessRate || {};
  const langValues = PQT_LANGS.map((l) => toNum(perLangCtr[l]));
  const windowValues = WINDOW_KEYS.map((w) => toNum(perWindowCtr[w]));

  const langMin = Math.min(...langValues, 0);
  const langMax = Math.max(...langValues, 1);
  const windowMin = Math.min(...windowValues, 0);
  const windowMax = Math.max(...windowValues, 1);

  const perLanguageCtrNormalized = {};
  PQT_LANGS.forEach((l) => {
    perLanguageCtrNormalized[l] = minMax(toNum(perLangCtr[l]), langMin, langMax);
  });

  const perWindowCtrNormalized = {};
  WINDOW_KEYS.forEach((w) => {
    perWindowCtrNormalized[w] = minMax(toNum(perWindowCtr[w]), windowMin, windowMax);
  });

  const tier1 = minMax(toNum(tierRates.tier1), 0, 1);
  const tier2 = minMax(toNum(tierRates.tier2), 0, 1);
  const tier3 = minMax(toNum(tierRates.tier3), 0, 1);

  const aggregateCtr =
    PQT_LANGS.length > 0
      ? PQT_LANGS.reduce((s, l) => s + toNum(perLangCtr[l]), 0) / PQT_LANGS.length
      : 0.5;
  const aggregateCtrNormalized = minMax(aggregateCtr, 0, 0.1);

  const saturationIndexNormalized = minMax(toNum(rawMetrics.dailySaturationIndex), 0, 10);

  const impressionsByLang = rawMetrics.impressionsByLang || {};
  const impValues = PQT_LANGS.map((l) => toNum(impressionsByLang[l]));
  const impMin = Math.min(...impValues, 0);
  const impMax = Math.max(...impValues, 1);
  const impressionsMomentum =
    impMax > impMin ? (impValues.reduce((a, b) => a + b, 0) / impValues.length - impMin) / (impMax - impMin) : 0.5;
  const impressionsMomentumClamped = Math.max(0, Math.min(1, impressionsMomentum));

  const fishermanSignals = rawMetrics.fishermanCtrHistory || {};
  const outFisherman = {};
  for (const [id, data] of Object.entries(fishermanSignals)) {
    const recent = Array.isArray(data.recentCtrs) ? data.recentCtrs : [];
    const avg = toNum(data.avgCtr);
    outFisherman[id] = {
      ctrNormalized: minMax(avg, 0, 0.1),
      velocity: minMax(recent.length ? recent[recent.length - 1] - (recent[0] || 0), -0.05, 0.05),
      impressions: minMax(avg * 1000, 0, 10000),
      trendDeclining: recent.length >= 2 && recent[recent.length - 1] < recent[0],
      poorCyclesCount: recent.filter((c) => toNum(c) < 0.03).length
    };
  }

  return {
    aggregateCtrNormalized,
    impressionsMomentum: impressionsMomentumClamped,
    tier1SuccessRateNormalized: tier1,
    tier2SuccessRateNormalized: tier2,
    tier3SuccessRateNormalized: tier3,
    saturationIndexNormalized,
    perLanguageCtrNormalized,
    perWindowCtrNormalized,
    perTierSuccessNormalized: { tier1, tier2, tier3 },
    fishermanSignals: outFisherman
  };
}

function getDefaultNormalized() {
  const zeroLang = PQT_LANGS.reduce((acc, l) => {
    acc[l] = 0.5;
    return acc;
  }, {});
  const zeroWindow = WINDOW_KEYS.reduce((acc, w) => {
    acc[w] = 0.5;
    return acc;
  }, {});
  return {
    aggregateCtrNormalized: 0.5,
    impressionsMomentum: 0.5,
    tier1SuccessRateNormalized: 0.5,
    tier2SuccessRateNormalized: 0.5,
    tier3SuccessRateNormalized: 0.5,
    saturationIndexNormalized: 0.5,
    perLanguageCtrNormalized: zeroLang,
    perWindowCtrNormalized: zeroWindow,
    perTierSuccessNormalized: { tier1: 0.5, tier2: 0.5, tier3: 0.5 },
    fishermanSignals: {}
  };
}

module.exports = {
  normalizePerformanceMetrics,
  getDefaultNormalized
};
