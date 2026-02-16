/**
 * PQT 投稿数決定（PQT-ONLY: 固定数・固定スケジュールは使わない）
 * 唯一の入力: 1. trapScore（high/medium/low） 2. Fisherman 活動量（言語別）
 */
const { LANGUAGE_CONFIG } = require("./languageConfig");

const BASE_MIN = 200;
const BASE_MAX = 500;

/**
 * スナップショットからグローバルな PQT レンジ（min, max）を決定
 * trap_score が高いほど多めに撃つ。KPI 100成約/日 ≒ 500投稿 を上限に寄せる。
 */
function decideGlobalPqtRangeFromSnapshot(snapshot) {
  const trap_score = String(snapshot?.trap_score ?? snapshot?.trapScore ?? "").toLowerCase();
  const funding_state = String(snapshot?.funding_state ?? snapshot?.fundingRate ?? "").toLowerCase();
  const liquidation_bias = String(snapshot?.liquidation_bias ?? snapshot?.liquidationBias ?? "").toLowerCase();

  if (trap_score === "high" || trap_score === "elevated") return { min: 350, max: BASE_MAX };
  if (trap_score === "medium" || funding_state === "high" || liquidation_bias === "long" || liquidation_bias === "short") {
    return { min: 280, max: 400 };
  }
  return { min: BASE_MIN, max: 320 };
}

/**
 * 言語別 PQT 目標数を配分（weight + Fisherman 活動量で微調整）
 * @param {Object} snapshot - getBtcSnapshot() 形式
 * @param {Object} fisherActivityByLang - 言語ごとの活動係数 { en: 1.2, ja: 0.8, ... } 0.5〜1.5 程度
 * @returns {Object} { en: 90, es: 60, ... }
 */
function allocatePqtPerLanguage(snapshot, fisherActivityByLang = {}) {
  const { min, max } = decideGlobalPqtRangeFromSnapshot(snapshot);
  const totalWeight = Object.values(LANGUAGE_CONFIG).reduce((sum, cfg) => sum + cfg.weight, 0);
  const targetTotal = Math.round((min + max) / 2);

  const perLang = {};
  for (const [lang, cfg] of Object.entries(LANGUAGE_CONFIG)) {
    const base = (targetTotal * cfg.weight) / totalWeight;
    const activityBoost = fisherActivityByLang[lang] ?? 1.0;
    perLang[lang] = Math.max(0, Math.round(base * activityBoost));
  }
  return perLang;
}

/**
 * 1 run あたりの PQT 上限（trapScore + Fisherman 配分、API クレジットで cap）
 */
function getPqtCapForRun(snapshot, lang, apiCreditCap) {
  const perLang = allocatePqtPerLanguage(snapshot, {});
  const cap = Math.max(1, Math.min(perLang[lang] || 0, apiCreditCap || 999));
  return cap;
}

/**
 * OS が日次 PQT 目標を 200〜400 で決定（ML-PQT スケジュール用）
 * ベース算出後に refineDailyTarget で強化。
 */
function getDailyPqtTargetFromSnapshot(snapshot) {
  const { GLOBAL_LIMITS } = require("./mlPqtScheduleConfig");
  const { refineDailyTarget } = require("./mlPqtScheduler");
  const { min, max } = GLOBAL_LIMITS.recommended_range_per_day;
  const { min: rMin, max: rMax } = decideGlobalPqtRangeFromSnapshot(snapshot || {});
  const mid = Math.round((rMin + rMax) / 2);
  const trap_score = String(snapshot?.trap_score ?? snapshot?.trapScore ?? "").toLowerCase();
  const isHigh = trap_score === "high" || trap_score === "elevated";
  const baseTarget = isHigh ? Math.max(400, Math.min(max, mid + 80)) : mid;
  const clamped = Math.max(min, Math.min(max, baseTarget));
  return refineDailyTarget(clamped, snapshot || {});
}

/**
 * 言語別 CTR / fisherman 数等を snapshot から構成（未実装時は空で base 比率のまま）
 */
function collectLangStats(snapshot) {
  if (!snapshot?.langStats) return {};
  return snapshot.langStats;
}

/**
 * Safety & Saturation ガード（PERFORMANCE_REFINEMENT_CONFIG.safety_and_saturation）
 * CTR 急落でターゲット削減、停滞で low-tier 停止、言語過多で再配分、テンプレ分散で top-3 のみ
 */
function applySafetyAndSaturationGuards(snapshot, currentPlan) {
  if (!currentPlan || typeof currentPlan !== "object") return currentPlan;
  const perf = snapshot?.performanceMetrics;
  if (!perf) return currentPlan;

  const plan = { ...currentPlan, perLangTargets: { ...(currentPlan.perLangTargets || {}) } };

  if (Number(perf.ctrDropRate) > 0.2) {
    plan.dailyTarget = Math.round((plan.dailyTarget || 0) * 0.8);
  }
  if (Boolean(perf.tierImpressionsStagnant)) {
    plan.pauseLowTierUntil = Date.now() + 24 * 60 * 60 * 1000;
  }
  const perLang = plan.perLangTargets;
  let overflow = 0;
  for (const lang of Object.keys(perLang || {})) {
    if (perLang[lang] > 50) {
      const reduce = Math.round(perLang[lang] * 0.1);
      perLang[lang] -= reduce;
      overflow += reduce;
    }
  }
  if (overflow > 0 && perLang) {
    const langs = Object.keys(perLang);
    const under = langs.filter((l) => perLang[l] < 30);
    const each = under.length ? Math.floor(overflow / under.length) : 0;
    under.forEach((l) => { perLang[l] = (perLang[l] || 0) + each; });
  }
  if (Boolean(perf.templateCtrVarianceHigh)) {
    plan.useTop3TemplatesOnly = true;
  }

  return plan;
}

/**
 * ML-PQT スケジュール JSON に基づく言語別配分。adjustLanguageAllocation(snapshot) で実測補正、ガード適用。
 */
function allocatePqtPerLanguageFromSchedule(snapshot) {
  const { LANGUAGE_ALLOCATION } = require("./mlPqtScheduleConfig");
  const { adjustLanguageAllocation, computePerLangPqtWithRatios } = require("./mlPqtScheduler");
  const dailyTarget = getDailyPqtTargetFromSnapshot(snapshot);
  const baseRatios = LANGUAGE_ALLOCATION.reduce((acc, l) => {
    acc[l.language.toLowerCase()] = l.share_ratio;
    return acc;
  }, {});
  const adjustedRatios = adjustLanguageAllocation(baseRatios, snapshot);
  const perLangTargets = computePerLangPqtWithRatios(dailyTarget, adjustedRatios);
  const plan = applySafetyAndSaturationGuards(snapshot, { dailyTarget, perLangTargets });
  return plan.perLangTargets || perLangTargets;
}

module.exports = {
  decideGlobalPqtRangeFromSnapshot,
  allocatePqtPerLanguage,
  getPqtCapForRun,
  getDailyPqtTargetFromSnapshot,
  allocatePqtPerLanguageFromSchedule,
  applySafetyAndSaturationGuards,
  BASE_MIN,
  BASE_MAX
};
