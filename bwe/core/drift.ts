import { createSeededRng } from "./allocation";
import { DEFAULT_LANGUAGES, LanguageCode } from "./metrics";

export interface DriftConfig {
  languages: LanguageCode[];
  ewmaLambda: number;
  ewmaSigmaMultiplier: number;
  ksComponentWeight: number;
  residualZWeight: number;
  ewmaAnomalyBonus: number;
  scalingRiskWeight: number;
  penaltyRiskWeight: number;
  driftThreshold: number;
  recoveryExplorationEpsilon: number;
  recoveryWindowShiftHours: number;
  recoveryPriorBlendOld: number;
  recoveryPriorBlendBootstrap: number;
  recoveryMaxChainDepth: 2;
  recoveryScaleDownFactor: number;
  safeZones: Array<{ accountCount: number; maxPostsPerDay: number }>;
}

export interface DriftInput {
  recent7d: number[];
  baseline30d: number[];
  residualSeries: number[];
  currentPriors: Record<LanguageCode, number>;
  bootstrapPriors: Record<LanguageCode, number>;
  seed: number;
  accountCount?: number;
  plannedDailyPosts?: number;
  penaltyEvents24h?: number;
  currentAccountCount?: number;
}

export interface EwmaStats {
  ewmaSeries: number[];
  residualSeries: number[];
  latestResidual: number;
  residualSigma: number;
  residualZ: number;
  anomaly: boolean;
}

export interface DriftRecoveryPlan {
  reduceMaxChainDepthTo: 2;
  explorationEpsilon: number;
  windowShiftHours: number;
  resetPriors: Record<LanguageCode, number>;
  scaleDownFactor: number;
  recommendedDailyPosts?: number;
  recommendedAccountCount?: number;
  quarantineScaleExpansion: boolean;
}

export interface DriftDetectionResult {
  ksStatistic: number;
  ewma: EwmaStats;
  driftScore: number;
  driftFlag: boolean;
  scalingPressure: number;
  penaltyPressure: number;
  recovery: DriftRecoveryPlan | null;
}

export const DEFAULT_DRIFT_CONFIG: DriftConfig = {
  languages: DEFAULT_LANGUAGES,
  ewmaLambda: 0.3,
  ewmaSigmaMultiplier: 2,
  ksComponentWeight: 0.6,
  residualZWeight: 4,
  ewmaAnomalyBonus: 4,
  scalingRiskWeight: 6,
  penaltyRiskWeight: 1.4,
  driftThreshold: 10,
  recoveryExplorationEpsilon: 0.3,
  recoveryWindowShiftHours: 1,
  recoveryPriorBlendOld: 0.7,
  recoveryPriorBlendBootstrap: 0.3,
  recoveryMaxChainDepth: 2,
  recoveryScaleDownFactor: 0.2,
  safeZones: [
    { accountCount: 1, maxPostsPerDay: 80 },
    { accountCount: 2, maxPostsPerDay: 120 },
    { accountCount: 5, maxPostsPerDay: 250 }
  ]
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const mu = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - mu) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function resolveSafeZone(
  accountCount: number,
  config: DriftConfig
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

function buildEmpiricalCdf(values: number[]): Array<{ x: number; cdf: number }> {
  if (values.length === 0) {
    return [];
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return sorted.map((x, i) => ({ x, cdf: (i + 1) / n }));
}

export function computeKsStatistic(sampleA: number[], sampleB: number[]): number {
  if (sampleA.length === 0 || sampleB.length === 0) {
    return 0;
  }
  const cdfA = buildEmpiricalCdf(sampleA);
  const cdfB = buildEmpiricalCdf(sampleB);
  const points = [...cdfA.map((d) => d.x), ...cdfB.map((d) => d.x)].sort((a, b) => a - b);

  let aIndex = 0;
  let bIndex = 0;
  let maxDistance = 0;

  for (const point of points) {
    while (aIndex < cdfA.length && cdfA[aIndex].x <= point) {
      aIndex += 1;
    }
    while (bIndex < cdfB.length && cdfB[bIndex].x <= point) {
      bIndex += 1;
    }
    const cdfValueA = aIndex / cdfA.length;
    const cdfValueB = bIndex / cdfB.length;
    maxDistance = Math.max(maxDistance, Math.abs(cdfValueA - cdfValueB));
  }

  return maxDistance;
}

export function computeEwmaStats(series: number[], config: DriftConfig = DEFAULT_DRIFT_CONFIG): EwmaStats {
  if (series.length === 0) {
    return {
      ewmaSeries: [],
      residualSeries: [],
      latestResidual: 0,
      residualSigma: 0,
      residualZ: 0,
      anomaly: false
    };
  }

  const ewmaSeries: number[] = [];
  const residualSeries: number[] = [];
  let prevEwma = series[0];
  ewmaSeries.push(prevEwma);

  for (let i = 1; i < series.length; i += 1) {
    const residual = series[i] - prevEwma;
    residualSeries.push(residual);
    const ewma = config.ewmaLambda * series[i] + (1 - config.ewmaLambda) * prevEwma;
    ewmaSeries.push(ewma);
    prevEwma = ewma;
  }

  const sigma = stddev(residualSeries);
  const latestResidual = residualSeries.length > 0 ? residualSeries[residualSeries.length - 1] : 0;
  const residualZ = sigma > 0 ? Math.abs(latestResidual) / sigma : 0;
  const anomaly = sigma > 0 && Math.abs(latestResidual) > config.ewmaSigmaMultiplier * sigma;

  return {
    ewmaSeries,
    residualSeries,
    latestResidual,
    residualSigma: sigma,
    residualZ,
    anomaly
  };
}

export function blendPriorsForRecovery(
  currentPriors: Record<LanguageCode, number>,
  bootstrapPriors: Record<LanguageCode, number>,
  config: DriftConfig = DEFAULT_DRIFT_CONFIG
): Record<LanguageCode, number> {
  return config.languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    const oldPrior = clamp01(currentPriors[lang] ?? 0.5);
    const bootstrapPrior = clamp01(bootstrapPriors[lang] ?? 0.5);
    const blended =
      config.recoveryPriorBlendOld * oldPrior +
      config.recoveryPriorBlendBootstrap * bootstrapPrior;
    acc[lang] = clamp01(blended);
    return acc;
  }, {} as Record<LanguageCode, number>);
}

export function detectAlgorithmDrift(
  input: DriftInput,
  config: DriftConfig = DEFAULT_DRIFT_CONFIG
): DriftDetectionResult {
  const ksStatistic = computeKsStatistic(input.recent7d, input.baseline30d);
  const ewma = computeEwmaStats(input.residualSeries, config);
  const ksComponent = ksStatistic * 100 * config.ksComponentWeight;
  const residualComponent = ewma.residualZ * config.residualZWeight;
  const anomalyComponent = ewma.anomaly ? config.ewmaAnomalyBonus : 0;
  const accountCount = input.accountCount ?? 1;
  const plannedDailyPosts = input.plannedDailyPosts ?? 0;
  const safeZone = resolveSafeZone(accountCount, config);
  const scalingPressure =
    safeZone.maxPostsPerDay > 0
      ? Math.max(0, (plannedDailyPosts - safeZone.maxPostsPerDay) / safeZone.maxPostsPerDay)
      : 0;
  const penaltyPressure = Math.max(0, input.penaltyEvents24h ?? 0) * config.penaltyRiskWeight;
  const scalingComponent = scalingPressure * 10 * config.scalingRiskWeight;
  const driftScore =
    ksComponent + residualComponent + anomalyComponent + scalingComponent + penaltyPressure;
  const driftFlag = driftScore > config.driftThreshold;

  if (!driftFlag) {
    return {
      ksStatistic,
      ewma,
      driftScore,
      driftFlag,
      scalingPressure,
      penaltyPressure,
      recovery: null
    };
  }

  const rng = createSeededRng(input.seed);
  const shiftDirection = rng() < 0.5 ? -1 : 1;
  const resetPriors = blendPriorsForRecovery(input.currentPriors, input.bootstrapPriors, config);

  return {
    ksStatistic,
    ewma,
    driftScore,
    driftFlag,
    scalingPressure,
    penaltyPressure,
    recovery: {
      reduceMaxChainDepthTo: config.recoveryMaxChainDepth,
      explorationEpsilon: config.recoveryExplorationEpsilon,
      windowShiftHours: shiftDirection * config.recoveryWindowShiftHours,
      resetPriors,
      scaleDownFactor: config.recoveryScaleDownFactor,
      recommendedDailyPosts:
        plannedDailyPosts > 0
          ? Math.max(
              Math.floor(plannedDailyPosts * (1 - config.recoveryScaleDownFactor)),
              Math.floor(safeZone.maxPostsPerDay * 0.8)
            )
          : undefined,
      recommendedAccountCount:
        scalingPressure > 0
          ? Math.max(1, (input.currentAccountCount ?? accountCount) - 1)
          : input.currentAccountCount ?? accountCount,
      quarantineScaleExpansion: scalingPressure > 0 || penaltyPressure > 0
    }
  };
}
