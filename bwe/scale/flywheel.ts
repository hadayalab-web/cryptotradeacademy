export type FlywheelAction = "scale_up" | "scale_down" | "hold";

export interface ProfitTier {
  minUsd: number;
  maxUsd: number;
  postsRange: [number, number];
  accountRange: [number, number];
}

export interface FlywheelControlConfig {
  tiers: ProfitTier[];
  scaleUpConditions: {
    minEngagementRate: number;
    minImpressionGrowth: number;
    maxPenalties: number;
  };
  scaleDownConditions: {
    maxImpressionDrop: number;
    minPenalties: number;
    minEngagementRate: number;
  };
  cadence: {
    evaluateEveryDays: number;
    scaleEveryDays: number;
    minGreenDaysForScale: number;
  };
}

export interface DailyGrowthSignal {
  date: string;
  engagementRate: number;
  impressionGrowth: number;
  impressionDrop: number;
  penalties: number;
}

export interface FlywheelInput {
  profitUsd: number;
  currentPostsPerDay: number;
  currentAccountCount: number;
  dailySignals: DailyGrowthSignal[];
  lastScaleAtIso?: string;
  nowIso?: string;
}

export interface FlywheelEvaluation {
  action: FlywheelAction;
  reason: string;
  targetPostsRange: [number, number];
  targetPostsPerDay: number;
  targetAccountCount: number;
  weeklyScaleAllowed: boolean;
  diagnostics: {
    greenDays: number;
    redDays: number;
    avgEngagementRate: number;
    avgImpressionGrowth: number;
    totalPenalties: number;
    daysSinceLastScale: number;
  };
}

export const DEFAULT_FLYWHEEL_CONFIG: FlywheelControlConfig = {
  tiers: [
    { minUsd: 0, maxUsd: 1000, postsRange: [22, 30], accountRange: [1, 1] },
    { minUsd: 1000, maxUsd: 5000, postsRange: [40, 60], accountRange: [1, 2] },
    { minUsd: 5000, maxUsd: 20000, postsRange: [60, 80], accountRange: [2, 2] },
    { minUsd: 20000, maxUsd: Number.POSITIVE_INFINITY, postsRange: [80, 125], accountRange: [4, 5] }
  ],
  scaleUpConditions: {
    minEngagementRate: 0.15,
    minImpressionGrowth: 0.2,
    maxPenalties: 0
  },
  scaleDownConditions: {
    maxImpressionDrop: 0.15,
    minPenalties: 1,
    minEngagementRate: 0.08
  },
  cadence: {
    evaluateEveryDays: 1,
    scaleEveryDays: 7,
    minGreenDaysForScale: 5
  }
};

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveTier(profitUsd: number, config: FlywheelControlConfig): ProfitTier {
  for (const tier of config.tiers) {
    if (profitUsd >= tier.minUsd && profitUsd < tier.maxUsd) {
      return tier;
    }
  }
  return config.tiers[config.tiers.length - 1];
}

function toDate(value: string): Date {
  return new Date(value);
}

function daysBetween(left: Date, right: Date): number {
  const ms = Math.abs(left.getTime() - right.getTime());
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function evaluateGrowthFlywheel(
  input: FlywheelInput,
  config: FlywheelControlConfig = DEFAULT_FLYWHEEL_CONFIG
): FlywheelEvaluation {
  const tier = resolveTier(input.profitUsd, config);
  const signals = [...input.dailySignals].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  const now = input.nowIso ? new Date(input.nowIso) : new Date();
  const lastScaleAt = input.lastScaleAtIso ? new Date(input.lastScaleAtIso) : new Date(0);
  const daysSinceLastScale = daysBetween(now, lastScaleAt);

  let greenDays = 0;
  let redDays = 0;
  for (const signal of signals) {
    const green =
      signal.engagementRate > config.scaleUpConditions.minEngagementRate &&
      signal.impressionGrowth > config.scaleUpConditions.minImpressionGrowth &&
      signal.penalties <= config.scaleUpConditions.maxPenalties;
    const red =
      signal.impressionDrop > config.scaleDownConditions.maxImpressionDrop ||
      signal.penalties > config.scaleDownConditions.minPenalties ||
      signal.engagementRate < config.scaleDownConditions.minEngagementRate;
    if (green) greenDays += 1;
    if (red) redDays += 1;
  }

  const avgEngagementRate = average(signals.map((signal) => signal.engagementRate));
  const avgImpressionGrowth = average(signals.map((signal) => signal.impressionGrowth));
  const totalPenalties = signals.reduce((sum, signal) => sum + signal.penalties, 0);
  const weeklyScaleAllowed =
    daysSinceLastScale >= config.cadence.scaleEveryDays &&
    greenDays >= config.cadence.minGreenDaysForScale &&
    redDays === 0;

  let action: FlywheelAction = "hold";
  let reason = "signals balanced";
  let targetPostsPerDay = clamp(tier.postsRange[0], input.currentPostsPerDay, tier.postsRange[1]);
  let targetAccountCount = clamp(
    tier.accountRange[0],
    input.currentAccountCount,
    tier.accountRange[1]
  );

  const isScaleDownSignal =
    redDays >= 2 ||
    avgEngagementRate < config.scaleDownConditions.minEngagementRate ||
    totalPenalties > config.scaleDownConditions.minPenalties;
  const isScaleUpSignal = weeklyScaleAllowed;

  if (isScaleDownSignal) {
    action = "scale_down";
    reason = "risk indicators exceeded scale-down thresholds";
    targetPostsPerDay = Math.max(tier.postsRange[0], Math.floor(input.currentPostsPerDay * 0.85));
    targetAccountCount = Math.max(tier.accountRange[0], input.currentAccountCount - 1);
  } else if (isScaleUpSignal) {
    action = "scale_up";
    reason = "weekly green window met scale-up requirements";
    const tierTargetMid = Math.round((tier.postsRange[0] + tier.postsRange[1]) / 2);
    targetPostsPerDay = Math.min(tier.postsRange[1], Math.max(input.currentPostsPerDay + 8, tierTargetMid));
    targetAccountCount = Math.min(tier.accountRange[1], input.currentAccountCount + 1);
  }

  return {
    action,
    reason,
    targetPostsRange: tier.postsRange,
    targetPostsPerDay,
    targetAccountCount,
    weeklyScaleAllowed,
    diagnostics: {
      greenDays,
      redDays,
      avgEngagementRate,
      avgImpressionGrowth,
      totalPenalties,
      daysSinceLastScale
    }
  };
}
