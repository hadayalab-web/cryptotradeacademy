/**
 * Fisherman 優先度 tier（ML_PQT_REFINEMENT_CONFIG + SHITESHI_PARASITIC_MODEL）
 * Tier1: 仕手師 high-impact または >90th velocity + high CTR / Tier2: 70-90th / Tier3: その他、cap 2
 */
const { isHighImpactShiteshi } = require("./shiteshiScoring");

const HIGH_CTR_THRESHOLD = Number(process.env.ML_PQT_FISHERMAN_HIGH_CTR) || 0.05;
const OVERLAP_THRESHOLD = Number(process.env.ML_PQT_FISHERMAN_OVERLAP) || 0.3;

/**
 * 候補を velocity パーセンタイルでソートし、スコアの 90th/70th を算出
 */
function velocityPercentile(candidates) {
  if (!candidates || candidates.length === 0) return new Map();
  const scores = candidates.map((c) => c.engagementScore ?? 0).filter((s) => Number.isFinite(s));
  if (scores.length === 0) return new Map();
  const sorted = [...scores].sort((a, b) => a - b);
  const p90 = sorted[Math.min(Math.floor(scores.length * 0.9), sorted.length - 1)];
  const p70 = sorted[Math.min(Math.floor(scores.length * 0.7), sorted.length - 1)];
  const byId = new Map();
  candidates.forEach((c) => {
    const id = c?.post?.id ?? c?.id ?? String(c);
    const s = c.engagementScore ?? 0;
    byId.set(id, { score: s, p90, p70 });
  });
  return byId;
}

/**
 * Tier1: >90th velocity + high CTR
 * Tier2: 70-90th + moderate overlap
 * Tier3: その他
 * @param {Array} candidates - Fisherman 候補（post, engagementScore 等）
 * @param {Object} stats - 候補 id ごと { velocityPercentile, historicalCtr, audienceOverlap }（省略時は velocity のみスコアから算出）
 */
function rankFishermenWithTiers(candidates, stats) {
  const tier1 = [];
  const tier2 = [];
  const tier3 = [];
  if (!candidates || candidates.length === 0) return { tier1, tier2, tier3 };

  const vel = velocityPercentile(candidates);
  for (const c of candidates) {
    const id = c?.post?.id ?? c?.id ?? String(c);
    const s = (stats && stats[id]) || {};
    if (s.shiteshiScore != null && isHighImpactShiteshi(s.shiteshiScore)) {
      c.shiteshi = true;
      tier1.push(c);
      continue;
    }
    const v = vel.get(id);
    const velocityPercentile = s.velocityPercentile ?? (v && v.score >= v.p90 ? 0.95 : v && v.score >= v.p70 ? 0.8 : 0.5);
    const historicalCtr = Number(s.historicalCtr);
    const audienceOverlap = Number(s.audienceOverlap);

    if (velocityPercentile > 0.9 && Number.isFinite(historicalCtr) && historicalCtr > HIGH_CTR_THRESHOLD) {
      tier1.push(c);
      continue;
    }
    if (velocityPercentile >= 0.7 && (audienceOverlap >= OVERLAP_THRESHOLD || !Number.isFinite(audienceOverlap))) {
      tier2.push(c);
      continue;
    }
    tier3.push(c);
  }

  return { tier1, tier2, tier3 };
}

/**
 * Tier 順の配列と Tier3 の cap（2）を返す
 */
function orderedCandidatesWithTier3Cap(candidates, stats, tier3Cap) {
  const cap = Math.max(0, tier3Cap ?? 2);
  const { tier1, tier2, tier3 } = rankFishermenWithTiers(candidates, stats);
  const limitedTier3 = tier3.slice(0, cap);
  return [...tier1, ...tier2, ...limitedTier3];
}

const HIGH_VELOCITY_THRESHOLD = Number(process.env.ML_PQT_FISHERMAN_HIGH_VELOCITY) || 0.7;
const BLACKLIST_MS = 48 * 60 * 60 * 1000;

/**
 * 実測メトリクスに基づく Tier 更新（PERFORMANCE_REFINEMENT_CONFIG.fisherman_tier_adjustment）
 * @param {Array} fishermen - { id, currentTier, ... }[]
 * @param {Object} performanceMetrics - normalizePerformanceMetrics の戻り値（fishermanSignals 必須）
 * @returns {Array} { ...f, tier, blacklistUntil }[]
 */
function updateFishermanTiers(fishermen, performanceMetrics) {
  if (!Array.isArray(fishermen)) return [];
  const signals = (performanceMetrics && performanceMetrics.fishermanSignals) || {};
  const now = Date.now();
  const updated = [];

  for (const f of fishermen) {
    const id = f?.post?.id ?? f?.id ?? String(f);
    const s = signals[id] || {};
    let tier = f.currentTier ?? "tier2";
    let blacklistUntil = f.blacklistUntil ?? null;

    const ctr = Number(s.ctrNormalized);
    const velocity = Number(s.velocity);
    const trendDeclining = Boolean(s.trendDeclining);
    const poorCycles = Number(s.poorCyclesCount) || 0;

    if (ctr > 0.8 && velocity > HIGH_VELOCITY_THRESHOLD) {
      tier = "tier1";
    } else if (ctr >= 0.5 && ctr <= 0.8) {
      tier = "tier2";
    } else if (ctr < 0.5 || trendDeclining) {
      tier = "tier3";
    }

    if (tier === "tier3" && poorCycles >= 3) {
      blacklistUntil = now + BLACKLIST_MS;
    }

    updated.push({ ...f, id, tier, blacklistUntil });
  }

  return updated;
}

/**
 * 実測メトリクスで Tier 更新した上で、Tier 順・Tier3 cap・ブラックリスト除外を適用
 */
function orderCandidatesByPerformanceTiers(candidates, performanceMetrics, tier3Cap) {
  const cap = Math.max(0, tier3Cap ?? 2);
  const now = Date.now();
  const updated = updateFishermanTiers(candidates, performanceMetrics);
  const notBlacklisted = updated.filter((c) => !c.blacklistUntil || c.blacklistUntil < now);
  const tier1 = notBlacklisted.filter((c) => c.tier === "tier1");
  const tier2 = notBlacklisted.filter((c) => c.tier === "tier2");
  const tier3 = notBlacklisted.filter((c) => c.tier === "tier3");
  const limitedTier3 = tier3.slice(0, cap);
  return [...tier1, ...tier2, ...limitedTier3];
}

module.exports = {
  rankFishermenWithTiers,
  orderedCandidatesWithTier3Cap,
  updateFishermanTiers,
  orderCandidatesByPerformanceTiers,
  HIGH_CTR_THRESHOLD,
  OVERLAP_THRESHOLD
};
