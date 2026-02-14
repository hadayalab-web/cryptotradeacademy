import { computeTextSimilarity } from "../core/content";
import { LanguageCode } from "../core/metrics";
import { ScheduleEntry } from "../core/scheduler";

export interface RiskThresholdConfig {
  velocityHighRiskPerHour: number;
  velocityBlockPer2Hours: number;
  textSimilarityBlockThreshold: number;
  exactMediaReuseWarnRatio: number;
  quoteDensityReduceDepthThreshold: number;
  accountPenaltyTrustDecayThreshold: number;
  earlyWarningEngImpThreshold: number;
  earlyWarningEngImpConsecutivePosts: number;
  earlyWarningChainFailThreshold: number;
  earlyWarningImpDropThreshold: number;
  safeZones: Array<{ accountCount: number; maxPostsPerDay: number }>;
  pauseHoursOnVelocityRisk: number;
}

export interface AccountPerformanceSnapshot {
  accountId: string;
  engImpHistory: number[];
  chainFailureRate: number;
  languageImpressionChange: Partial<Record<LanguageCode, number>>;
}

export interface RiskModelInput {
  schedulesByAccount: Record<string, ScheduleEntry[]>;
  postPenaltyCount24hByAccount: Record<string, number>;
  performanceSnapshots?: AccountPerformanceSnapshot[];
  nowIso?: string;
}

export interface RiskWarning {
  accountId?: string;
  code: string;
  detail: string;
}

export interface RecoveryAction {
  type: "pause" | "rotate_templates" | "force_fresh_assets" | "reduce_chain_depth";
  accountId?: string;
  durationHours?: number;
  maxChainDepth?: number;
  reason: string;
}

export interface RiskAssessmentResult {
  level: "low" | "moderate" | "high" | "critical";
  warnings: RiskWarning[];
  blocks: RiskWarning[];
  trustDecayAccounts: string[];
  recommendedActions: RecoveryAction[];
  maxAllowedChainDepth: 1 | 2 | 3;
  safeZone: {
    accountCount: number;
    maxPostsPerDay: number;
    plannedPostsPerDay: number;
    exceeded: boolean;
  };
  metrics: {
    quoteDensity: number;
    exactMediaReuseRatio: number;
    duplicationBlocks: number;
  };
}

export const DEFAULT_RISK_CONFIG: RiskThresholdConfig = {
  velocityHighRiskPerHour: 2,
  velocityBlockPer2Hours: 4,
  textSimilarityBlockThreshold: 0.7,
  exactMediaReuseWarnRatio: 0.1,
  quoteDensityReduceDepthThreshold: 0.55,
  accountPenaltyTrustDecayThreshold: 3,
  earlyWarningEngImpThreshold: 0.08,
  earlyWarningEngImpConsecutivePosts: 3,
  earlyWarningChainFailThreshold: 0.5,
  earlyWarningImpDropThreshold: 0.2,
  safeZones: [
    { accountCount: 1, maxPostsPerDay: 80 },
    { accountCount: 2, maxPostsPerDay: 120 },
    { accountCount: 5, maxPostsPerDay: 250 }
  ],
  pauseHoursOnVelocityRisk: 2
};

function toDate(value: string): Date {
  return new Date(value);
}

function flattenSchedules(schedulesByAccount: Record<string, ScheduleEntry[]>): ScheduleEntry[] {
  return Object.values(schedulesByAccount).flat();
}

function countInWindow(entries: ScheduleEntry[], anchor: Date, windowMinutes: number): number {
  const lower = anchor.getTime() - windowMinutes * 60 * 1000;
  return entries.filter((entry) => {
    const ts = toDate(entry.time).getTime();
    return ts > lower && ts <= anchor.getTime();
  }).length;
}

function resolveSafeZone(
  accountCount: number,
  config: RiskThresholdConfig
): { accountCount: number; maxPostsPerDay: number } {
  const ordered = [...config.safeZones].sort((a, b) => a.accountCount - b.accountCount);
  if (accountCount <= ordered[0].accountCount) {
    return ordered[0];
  }
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const left = ordered[i];
    const right = ordered[i + 1];
    if (accountCount >= left.accountCount && accountCount <= right.accountCount) {
      const ratio =
        (accountCount - left.accountCount) / Math.max(right.accountCount - left.accountCount, 1);
      return {
        accountCount,
        maxPostsPerDay: Math.round(left.maxPostsPerDay + ratio * (right.maxPostsPerDay - left.maxPostsPerDay))
      };
    }
  }
  return ordered[ordered.length - 1];
}

function countConsecutiveBelowThreshold(values: number[], threshold: number): number {
  let maxRun = 0;
  let run = 0;
  for (const value of values) {
    if (value < threshold) {
      run += 1;
      if (run > maxRun) maxRun = run;
    } else {
      run = 0;
    }
  }
  return maxRun;
}

export function evaluatePenaltyRiskCurve(
  input: RiskModelInput,
  config: RiskThresholdConfig = DEFAULT_RISK_CONFIG
): RiskAssessmentResult {
  const warnings: RiskWarning[] = [];
  const blocks: RiskWarning[] = [];
  const recommendedActions: RecoveryAction[] = [];
  const trustDecayAccounts: string[] = [];
  const now = input.nowIso ? new Date(input.nowIso) : new Date();
  const accountIds = Object.keys(input.schedulesByAccount);
  const flattened = flattenSchedules(input.schedulesByAccount).sort(
    (a, b) => toDate(a.time).getTime() - toDate(b.time).getTime()
  );

  let duplicationBlocks = 0;
  const mediaUsage: Record<string, number> = {};
  for (const accountId of accountIds) {
    const entries = [...(input.schedulesByAccount[accountId] ?? [])].sort(
      (a, b) => toDate(a.time).getTime() - toDate(b.time).getTime()
    );
    for (let i = 0; i < entries.length; i += 1) {
      const anchor = toDate(entries[i].time);
      const hourlyCount = countInWindow(entries, anchor, 60);
      const twoHourCount = countInWindow(entries, anchor, 120);
      if (hourlyCount > config.velocityHighRiskPerHour) {
        warnings.push({
          accountId,
          code: "velocity.high_risk",
          detail: `hourly posts=${hourlyCount} exceeds ${config.velocityHighRiskPerHour}`
        });
        recommendedActions.push({
          type: "pause",
          accountId,
          durationHours: config.pauseHoursOnVelocityRisk,
          reason: "velocity threshold exceeded"
        });
      }
      if (twoHourCount > config.velocityBlockPer2Hours) {
        blocks.push({
          accountId,
          code: "velocity.block",
          detail: `2-hour posts=${twoHourCount} exceeds ${config.velocityBlockPer2Hours}`
        });
      }
    }

    const penaltyCount24h = input.postPenaltyCount24hByAccount[accountId] ?? 0;
    if (penaltyCount24h > config.accountPenaltyTrustDecayThreshold) {
      trustDecayAccounts.push(accountId);
      warnings.push({
        accountId,
        code: "trust.decay",
        detail: `post-level penalties=${penaltyCount24h} in 24h`
      });
    }
  }

  for (let i = 0; i < flattened.length; i += 1) {
    const current = flattened[i];
    for (let j = Math.max(0, i - 30); j < i; j += 1) {
      const prior = flattened[j];
      const similarity = computeTextSimilarity(current.text, prior.text);
      if (similarity > config.textSimilarityBlockThreshold) {
        duplicationBlocks += 1;
        blocks.push({
          accountId: current.accountId,
          code: "duplication.block",
          detail: `text similarity ${similarity.toFixed(2)} > ${config.textSimilarityBlockThreshold}`
        });
        recommendedActions.push({
          type: "rotate_templates",
          accountId: current.accountId,
          reason: "duplicate text detected"
        });
        break;
      }
    }

    if (current.media) {
      const key = `${current.media.type}:${current.media.hint}`;
      mediaUsage[key] = (mediaUsage[key] ?? 0) + 1;
    }
  }

  const mediaTotal = Object.values(mediaUsage).reduce((sum, count) => sum + count, 0);
  const mediaExactReuse = Object.values(mediaUsage).reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0
  );
  const exactMediaReuseRatio = mediaTotal > 0 ? mediaExactReuse / mediaTotal : 0;
  if (exactMediaReuseRatio > config.exactMediaReuseWarnRatio) {
    warnings.push({
      code: "media.reuse_warn",
      detail: `exact media reuse ratio ${exactMediaReuseRatio.toFixed(3)} > ${config.exactMediaReuseWarnRatio}`
    });
    recommendedActions.push({
      type: "force_fresh_assets",
      reason: "exact media reuse exceeded warning threshold"
    });
  }

  const quoteCount = flattened.filter((entry) => entry.type === "quote").length;
  const quoteDensity = flattened.length > 0 ? quoteCount / flattened.length : 0;
  let maxAllowedChainDepth: 1 | 2 | 3 = 3;
  if (quoteDensity > config.quoteDensityReduceDepthThreshold) {
    warnings.push({
      code: "quote.density_high",
      detail: `quote density ${quoteDensity.toFixed(3)} > ${config.quoteDensityReduceDepthThreshold}`
    });
    maxAllowedChainDepth = 1;
    recommendedActions.push({
      type: "reduce_chain_depth",
      maxChainDepth: 1,
      reason: "quote density exceeded threshold"
    });
  }

  for (const snapshot of input.performanceSnapshots ?? []) {
    const lowEngRun = countConsecutiveBelowThreshold(
      snapshot.engImpHistory,
      config.earlyWarningEngImpThreshold
    );
    if (lowEngRun >= config.earlyWarningEngImpConsecutivePosts) {
      warnings.push({
        accountId: snapshot.accountId,
        code: "early.eng_imp_drop",
        detail: `eng/imp below ${config.earlyWarningEngImpThreshold} for ${lowEngRun} posts`
      });
    }
    if (snapshot.chainFailureRate > config.earlyWarningChainFailThreshold) {
      warnings.push({
        accountId: snapshot.accountId,
        code: "early.chain_fail",
        detail: `chain failure rate ${snapshot.chainFailureRate.toFixed(2)} > ${config.earlyWarningChainFailThreshold}`
      });
    }
    for (const [lang, change] of Object.entries(snapshot.languageImpressionChange)) {
      if (Number(change) < -config.earlyWarningImpDropThreshold) {
        warnings.push({
          accountId: snapshot.accountId,
          code: "early.impression_drop",
          detail: `language ${lang} impression drop ${Number(change).toFixed(2)}`
        });
      }
    }
  }

  const safeZone = resolveSafeZone(accountIds.length, config);
  const plannedPostsPerDay = flattened.length;
  const safeExceeded = plannedPostsPerDay > safeZone.maxPostsPerDay;
  if (safeExceeded) {
    warnings.push({
      code: "safe_zone.exceeded",
      detail: `planned=${plannedPostsPerDay} > max=${safeZone.maxPostsPerDay}`
    });
  }

  const severityScore =
    blocks.length * 3 +
    warnings.length +
    trustDecayAccounts.length * 2 +
    (safeExceeded ? 3 : 0);
  const level =
    severityScore >= 14
      ? "critical"
      : severityScore >= 8
        ? "high"
        : severityScore >= 4
          ? "moderate"
          : "low";

  // Avoid duplicate action tuples.
  const dedupedActions = new Map<string, RecoveryAction>();
  for (const action of recommendedActions) {
    const key = `${action.type}:${action.accountId ?? "all"}:${action.maxChainDepth ?? "-"}:${action.durationHours ?? "-"}`;
    if (!dedupedActions.has(key)) {
      dedupedActions.set(key, action);
    }
  }

  return {
    level,
    warnings,
    blocks,
    trustDecayAccounts: [...new Set(trustDecayAccounts)],
    recommendedActions: [...dedupedActions.values()],
    maxAllowedChainDepth,
    safeZone: {
      accountCount: accountIds.length,
      maxPostsPerDay: safeZone.maxPostsPerDay,
      plannedPostsPerDay,
      exceeded: safeExceeded
    },
    metrics: {
      quoteDensity,
      exactMediaReuseRatio,
      duplicationBlocks
    }
  };
}
