/**
 * 実測メトリクス集約（PERFORMANCE_REFINEMENT_CONFIG.required_metrics）
 * Supabase / buzzweave_post_log 等から集約し、snapshot.performanceMetrics に渡す形を返す。
 */
const PQT_LANGS = ["en", "es", "pt", "ar", "ko", "ja"];
const WINDOW_KEYS = ["w1", "w2", "w3", "w4", "w5", "w6"];

function emptyPerLang() {
  return PQT_LANGS.reduce((acc, l) => {
    acc[l] = 0;
    return acc;
  }, {});
}

function emptyPerWindow() {
  return WINDOW_KEYS.reduce((acc, w) => {
    acc[w] = 0;
    return acc;
  }, {});
}

/**
 * 日次またはレンジで実測メトリクスを集約する
 * @param {string|Date|{ from: Date, to: Date }} dateOrRange - 対象日またはレンジ
 * @returns {Promise<Object>} performanceMetrics の形（未実装時はデフォルト構造）
 */
async function collectPerformanceMetricsForSnapshot(dateOrRange) {
  const range = normalizeRange(dateOrRange);
  try {
    const metrics = await aggregateFromStore(range);
    return metrics;
  } catch (e) {
    return getDefaultMetrics();
  }
}

function normalizeRange(dateOrRange) {
  if (!dateOrRange) return { from: new Date(), to: new Date() };
  if (typeof dateOrRange === "string" || dateOrRange instanceof Date) {
    const d = new Date(dateOrRange);
    const from = new Date(d);
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);
    return { from, to };
  }
  return dateOrRange;
}

async function aggregateFromStore(range) {
  const { getBuzzweavePostLogStats } = require("../../utils/supabase");
  const fn = typeof getBuzzweavePostLogStats === "function" ? getBuzzweavePostLogStats : null;
  if (!fn) return getDefaultMetrics();
  const stats = await fn(range).catch(() => null);
  if (!stats || typeof stats !== "object") return getDefaultMetrics();
  return mergeWithDefaults(stats);
}

function mergeWithDefaults(stats) {
  return {
    perPqtCtr: stats.perPqtCtr || {},
    perPqtImpressions: stats.perPqtImpressions || {},
    perPqtEngagements: stats.perPqtEngagements || {},
    perLanguageCtr: { ...emptyPerLang(), ...(stats.perLanguageCtr || {}) },
    perWindowCtr: { ...emptyPerWindow(), ...(stats.perWindowCtr || {}) },
    perTierSuccessRate: stats.perTierSuccessRate || { tier1: 0, tier2: 0, tier3: 0 },
    fishermanCtrHistory: stats.fishermanCtrHistory || {},
    dailySaturationIndex: Number(stats.dailySaturationIndex) || 0,
    ctrDropRate: Number(stats.ctrDropRate),
    tierImpressionsStagnant: Boolean(stats.tierImpressionsStagnant),
    impressionsByLang: stats.impressionsByLang || emptyPerLang(),
    fishermanDensityByLang: stats.fishermanDensityByLang || emptyPerLang(),
    fishermanVelocityByWindow: stats.fishermanVelocityByWindow || emptyPerWindow(),
    templateCtrVarianceHigh: Boolean(stats.templateCtrVarianceHigh)
  };
}

function getDefaultMetrics() {
  return {
    perPqtCtr: {},
    perPqtImpressions: {},
    perPqtEngagements: {},
    perLanguageCtr: emptyPerLang(),
    perWindowCtr: emptyPerWindow(),
    perTierSuccessRate: { tier1: 0, tier2: 0, tier3: 0 },
    fishermanCtrHistory: {},
    dailySaturationIndex: 0,
    ctrDropRate: 0,
    tierImpressionsStagnant: false,
    impressionsByLang: emptyPerLang(),
    fishermanDensityByLang: emptyPerLang(),
    fishermanVelocityByWindow: emptyPerWindow(),
    templateCtrVarianceHigh: false
  };
}

module.exports = {
  collectPerformanceMetricsForSnapshot,
  getDefaultMetrics,
  PQT_LANGS,
  WINDOW_KEYS
};
