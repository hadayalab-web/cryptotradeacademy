import { DEFAULT_LANGUAGES, LanguageCode, PosteriorDelta } from "./metrics";

export type BudgetTier = "low" | "medium" | "high";

export interface LanguagePosterior {
  alpha: number;
  beta: number;
  priorMean: number;
  sigma: number;
}

export interface LanguageThermalState {
  hot: boolean;
  cold: boolean;
  chainDepthCap: 1 | 2 | 3;
  posteriorMean: number;
}

export interface AllocationRuntimeState {
  posteriors: Record<LanguageCode, LanguagePosterior>;
  hotCold: Record<LanguageCode, LanguageThermalState>;
  driftFlag: boolean;
  explorationEpsilon: number;
  updatedAt: string;
}

export interface AllocationConfig {
  languages: LanguageCode[];
  sampleDraws: number;
  minPostsPerLanguage: number;
  maxPostsPerLanguage: number;
  budgets: Record<BudgetTier, number>;
  hotBoostPosts: number;
  coldFloorPosts: number;
  softmaxTemperature: number;
  defaultSigma: number;
  defaultExplorationEpsilon: number;
}

export interface PriorInput {
  p0: number;
  alpha: number;
  beta: number;
  sigma?: number;
}

export interface AllocationInput {
  state: AllocationRuntimeState;
  posteriorDeltas: Record<LanguageCode, PosteriorDelta>;
  budgetTier: BudgetTier;
  seed: number;
  explorationEpsilon?: number;
}

export interface AllocationResult {
  allocation: Record<LanguageCode, number>;
  weights: Record<LanguageCode, number>;
  sampledMeans: Record<LanguageCode, number>;
  totalPosts: number;
  hotCold: Record<LanguageCode, LanguageThermalState>;
  nextState: AllocationRuntimeState;
}

export const DEFAULT_ALLOCATION_CONFIG: AllocationConfig = {
  languages: DEFAULT_LANGUAGES,
  sampleDraws: 100,
  minPostsPerLanguage: 2,
  maxPostsPerLanguage: 12,
  budgets: {
    low: 22,
    medium: 26,
    high: 30
  },
  hotBoostPosts: 2,
  coldFloorPosts: 2,
  softmaxTemperature: 1,
  defaultSigma: 0.08,
  defaultExplorationEpsilon: 0.05
};

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleStandardNormal(rng: () => number): number {
  let u1 = rng();
  while (u1 <= Number.EPSILON) {
    u1 = rng();
  }
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleGamma(shape: number, rng: () => number): number {
  if (shape < 1) {
    const u = Math.max(rng(), Number.EPSILON);
    return sampleGamma(shape + 1, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const x = sampleStandardNormal(rng);
    const v = Math.pow(1 + c * x, 3);
    if (v <= 0) {
      continue;
    }
    const u = rng();
    if (u < 1 - 0.0331 * Math.pow(x, 4)) {
      return d * v;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function sampleBeta(alpha: number, beta: number, rng: () => number): number {
  const x = sampleGamma(alpha, rng);
  const y = sampleGamma(beta, rng);
  return x / (x + y);
}

function softmax(values: number[], temperature: number): number[] {
  const temp = Math.max(temperature, 1e-6);
  const scaled = values.map((v) => v / temp);
  const maxValue = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - maxValue));
  const denom = exps.reduce((sum, v) => sum + v, 0);
  if (denom <= 0) {
    return values.map(() => 1 / values.length);
  }
  return exps.map((v) => v / denom);
}

function buildDefaultHotCold(languages: LanguageCode[]): Record<LanguageCode, LanguageThermalState> {
  return languages.reduce<Record<LanguageCode, LanguageThermalState>>((acc, lang) => {
    acc[lang] = {
      hot: false,
      cold: false,
      chainDepthCap: 3,
      posteriorMean: 0.5
    };
    return acc;
  }, {} as Record<LanguageCode, LanguageThermalState>);
}

export function buildRuntimeStateFromPriors(
  priors: Record<LanguageCode, PriorInput>,
  config: AllocationConfig = DEFAULT_ALLOCATION_CONFIG
): AllocationRuntimeState {
  const posteriors = config.languages.reduce<Record<LanguageCode, LanguagePosterior>>((acc, lang) => {
    const prior = priors[lang];
    const p0 = clamp(0.01, prior?.p0 ?? 0.5, 0.99);
    acc[lang] = {
      alpha: Math.max(1, prior?.alpha ?? p0 * 10),
      beta: Math.max(1, prior?.beta ?? (1 - p0) * 10),
      priorMean: p0,
      sigma: Math.max(0.0001, prior?.sigma ?? config.defaultSigma)
    };
    return acc;
  }, {} as Record<LanguageCode, LanguagePosterior>);

  return {
    posteriors,
    hotCold: buildDefaultHotCold(config.languages),
    driftFlag: false,
    explorationEpsilon: config.defaultExplorationEpsilon,
    updatedAt: new Date().toISOString()
  };
}

export function updatePosteriors(
  state: AllocationRuntimeState,
  deltas: Record<LanguageCode, PosteriorDelta>,
  config: AllocationConfig = DEFAULT_ALLOCATION_CONFIG
): AllocationRuntimeState {
  const nextPosteriors = config.languages.reduce<Record<LanguageCode, LanguagePosterior>>((acc, lang) => {
    const current = state.posteriors[lang];
    const delta = deltas[lang] ?? { successes: 0, failures: 0 };
    acc[lang] = {
      ...current,
      alpha: Math.max(1, current.alpha + Math.max(0, delta.successes)),
      beta: Math.max(1, current.beta + Math.max(0, delta.failures))
    };
    return acc;
  }, {} as Record<LanguageCode, LanguagePosterior>);

  return {
    ...state,
    posteriors: nextPosteriors,
    updatedAt: new Date().toISOString()
  };
}

function rebalanceToTotal(
  allocation: Record<LanguageCode, number>,
  weights: Record<LanguageCode, number>,
  thermal: Record<LanguageCode, LanguageThermalState>,
  targetTotal: number,
  config: AllocationConfig
): Record<LanguageCode, number> {
  const langs = [...config.languages];
  const sum = () => langs.reduce((acc, lang) => acc + allocation[lang], 0);
  const minPosts = config.minPostsPerLanguage;
  const maxPosts = config.maxPostsPerLanguage;

  while (sum() > targetTotal) {
    const candidates = [...langs]
      .filter((lang) => allocation[lang] > minPosts)
      .sort((a, b) => {
        if (thermal[a].hot !== thermal[b].hot) {
          return thermal[a].hot ? 1 : -1;
        }
        if (allocation[b] !== allocation[a]) {
          return allocation[b] - allocation[a];
        }
        return weights[a] - weights[b];
      });
    if (candidates.length === 0) {
      break;
    }
    allocation[candidates[0]] -= 1;
  }

  while (sum() < targetTotal) {
    const candidates = [...langs]
      .filter((lang) => allocation[lang] < maxPosts)
      .sort((a, b) => {
        if (thermal[a].hot !== thermal[b].hot) {
          return thermal[a].hot ? -1 : 1;
        }
        if (weights[b] !== weights[a]) {
          return weights[b] - weights[a];
        }
        return allocation[a] - allocation[b];
      });
    if (candidates.length === 0) {
      break;
    }
    allocation[candidates[0]] += 1;
  }

  return allocation;
}

export function computeAdaptiveAllocation(
  input: AllocationInput,
  config: AllocationConfig = DEFAULT_ALLOCATION_CONFIG
): AllocationResult {
  const updatedState = updatePosteriors(input.state, input.posteriorDeltas, config);
  const totalPosts = config.budgets[input.budgetTier];
  const rng = createSeededRng(input.seed);

  const sampledMeans = config.languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    const posterior = updatedState.posteriors[lang];
    let drawSum = 0;
    for (let i = 0; i < config.sampleDraws; i += 1) {
      drawSum += sampleBeta(posterior.alpha, posterior.beta, rng);
    }
    acc[lang] = drawSum / config.sampleDraws;
    return acc;
  }, {} as Record<LanguageCode, number>);

  const softmaxWeights = softmax(
    config.languages.map((lang) => sampledMeans[lang]),
    config.softmaxTemperature
  );

  const epsilon = clamp(
    0,
    input.explorationEpsilon ?? updatedState.explorationEpsilon ?? config.defaultExplorationEpsilon,
    1
  );

  const mixedWeights = config.languages.reduce<Record<LanguageCode, number>>((acc, lang, index) => {
    const uniform = 1 / config.languages.length;
    acc[lang] = (1 - epsilon) * softmaxWeights[index] + epsilon * uniform;
    return acc;
  }, {} as Record<LanguageCode, number>);

  const hotCold = config.languages.reduce<Record<LanguageCode, LanguageThermalState>>((acc, lang) => {
    const p = sampledMeans[lang];
    const prior = updatedState.posteriors[lang].priorMean;
    const sigma = updatedState.posteriors[lang].sigma;
    const isHot = p > prior + sigma;
    const isCold = p < prior - sigma;
    acc[lang] = {
      hot: isHot,
      cold: isCold,
      chainDepthCap: isHot ? 3 : isCold ? 2 : 3,
      posteriorMean: p
    };
    return acc;
  }, {} as Record<LanguageCode, LanguageThermalState>);

  const allocation = config.languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    const raw = Math.round(totalPosts * mixedWeights[lang]);
    acc[lang] = clamp(config.minPostsPerLanguage, raw, config.maxPostsPerLanguage);
    return acc;
  }, {} as Record<LanguageCode, number>);

  for (const lang of config.languages) {
    if (hotCold[lang].hot) {
      allocation[lang] = clamp(
        config.minPostsPerLanguage,
        allocation[lang] + config.hotBoostPosts,
        config.maxPostsPerLanguage
      );
    }
    if (hotCold[lang].cold) {
      allocation[lang] = Math.max(config.coldFloorPosts, allocation[lang]);
    }
  }

  const rebalanced = rebalanceToTotal(allocation, mixedWeights, hotCold, totalPosts, config);

  const nextState: AllocationRuntimeState = {
    ...updatedState,
    hotCold,
    explorationEpsilon: epsilon,
    updatedAt: new Date().toISOString()
  };

  return {
    allocation: rebalanced,
    weights: mixedWeights,
    sampledMeans,
    totalPosts,
    hotCold,
    nextState
  };
}

export interface AccountCapability {
  accountId: string;
  languages: LanguageCode[];
  dailyCap: number;
  allocationWeight?: number;
}

export interface MultiAccountAllocationRuntimeState {
  global: AllocationRuntimeState;
  byAccount: Record<string, AllocationRuntimeState>;
}

export interface MultiAccountPosteriorDeltas {
  global: Record<LanguageCode, PosteriorDelta>;
  byAccount: Record<string, Record<LanguageCode, PosteriorDelta>>;
}

export interface GlobalAcrossAccountsInput {
  state: MultiAccountAllocationRuntimeState;
  deltas: MultiAccountPosteriorDeltas;
  accountCapabilities: AccountCapability[];
  budgetTier: BudgetTier;
  seed: number;
  explorationEpsilon?: number;
  forcedTotalPosts?: number;
}

export interface GlobalAcrossAccountsResult {
  globalResult: AllocationResult;
  perAccountLanguageAllocation: Record<string, Record<LanguageCode, number>>;
  perAccountTotals: Record<string, number>;
  nextState: MultiAccountAllocationRuntimeState;
}

function emptyLanguageMap(languages: LanguageCode[]): Record<LanguageCode, number> {
  return languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    acc[lang] = 0;
    return acc;
  }, {} as Record<LanguageCode, number>);
}

function clonePosteriorState(state: AllocationRuntimeState): AllocationRuntimeState {
  return {
    ...state,
    posteriors: { ...state.posteriors },
    hotCold: { ...state.hotCold },
    updatedAt: new Date().toISOString()
  };
}

function ensureAccountState(
  maybeState: AllocationRuntimeState | undefined,
  globalState: AllocationRuntimeState,
  config: AllocationConfig
): AllocationRuntimeState {
  if (maybeState) {
    return maybeState;
  }
  const fallback = clonePosteriorState(globalState);
  return {
    ...fallback,
    explorationEpsilon: globalState.explorationEpsilon
  };
}

function sampleMeansByLanguage(
  state: AllocationRuntimeState,
  rng: () => number,
  config: AllocationConfig
): Record<LanguageCode, number> {
  return config.languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    const posterior = state.posteriors[lang];
    let sum = 0;
    for (let i = 0; i < config.sampleDraws; i += 1) {
      sum += sampleBeta(posterior.alpha, posterior.beta, rng);
    }
    acc[lang] = sum / config.sampleDraws;
    return acc;
  }, {} as Record<LanguageCode, number>);
}

function updateHotColdFromSamples(
  state: AllocationRuntimeState,
  sampledMeans: Record<LanguageCode, number>,
  config: AllocationConfig
): AllocationRuntimeState {
  const hotCold = config.languages.reduce<Record<LanguageCode, LanguageThermalState>>((acc, lang) => {
    const posterior = state.posteriors[lang];
    const mean = sampledMeans[lang];
    const hot = mean > posterior.priorMean + posterior.sigma;
    const cold = mean < posterior.priorMean - posterior.sigma;
    acc[lang] = {
      hot,
      cold,
      chainDepthCap: hot ? 3 : cold ? 2 : 3,
      posteriorMean: mean
    };
    return acc;
  }, {} as Record<LanguageCode, LanguageThermalState>);
  return {
    ...state,
    hotCold,
    updatedAt: new Date().toISOString()
  };
}

export function computeGlobalAllocationAcrossAccounts(
  input: GlobalAcrossAccountsInput,
  config: AllocationConfig = DEFAULT_ALLOCATION_CONFIG
): GlobalAcrossAccountsResult {
  const globalResult = computeAdaptiveAllocation(
    {
      state: input.state.global,
      posteriorDeltas: input.deltas.global,
      budgetTier: input.budgetTier,
      seed: input.seed,
      explorationEpsilon: input.explorationEpsilon
    },
    config
  );

  const targetTotal = Math.max(
    0,
    Math.min(
      input.forcedTotalPosts ?? globalResult.totalPosts,
      input.accountCapabilities.reduce((sum, account) => sum + Math.max(0, account.dailyCap), 0)
    )
  );

  const perAccountLanguageAllocation: Record<string, Record<LanguageCode, number>> = {};
  const perAccountTotals: Record<string, number> = {};
  const nextByAccount: Record<string, AllocationRuntimeState> = {};
  const accountSampleMeans: Record<string, Record<LanguageCode, number>> = {};
  const rng = createSeededRng(input.seed + 1009);
  const remainingAccountCap: Record<string, number> = {};
  const remainingLangTarget = config.languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    acc[lang] = Math.max(0, Math.round(targetTotal * (globalResult.weights[lang] ?? 0)));
    return acc;
  }, {} as Record<LanguageCode, number>);
  // Rebalance language target exactly to forced total.
  let langSum = config.languages.reduce((sum, lang) => sum + remainingLangTarget[lang], 0);
  while (langSum > targetTotal) {
    const lang = [...config.languages].sort((a, b) => remainingLangTarget[b] - remainingLangTarget[a])[0];
    if (remainingLangTarget[lang] <= 0) break;
    remainingLangTarget[lang] -= 1;
    langSum -= 1;
  }
  while (langSum < targetTotal) {
    const lang = [...config.languages].sort((a, b) => globalResult.weights[b] - globalResult.weights[a])[0];
    remainingLangTarget[lang] += 1;
    langSum += 1;
  }

  for (const capability of input.accountCapabilities) {
    const existing = input.state.byAccount[capability.accountId];
    const accountState = ensureAccountState(existing, input.state.global, config);
    const updated = updatePosteriors(
      accountState,
      input.deltas.byAccount[capability.accountId] ??
        ({} as Record<LanguageCode, PosteriorDelta>),
      config
    );
    const sampled = sampleMeansByLanguage(updated, rng, config);
    nextByAccount[capability.accountId] = updateHotColdFromSamples(updated, sampled, config);
    accountSampleMeans[capability.accountId] = sampled;
    perAccountLanguageAllocation[capability.accountId] = emptyLanguageMap(config.languages);
    perAccountTotals[capability.accountId] = 0;
    remainingAccountCap[capability.accountId] = Math.max(0, capability.dailyCap);
  }

  const supportedByAccount = input.accountCapabilities.reduce<Record<string, Set<LanguageCode>>>((acc, capability) => {
    acc[capability.accountId] = new Set<LanguageCode>(capability.languages);
    return acc;
  }, {});

  let assigned = 0;
  const maxIterations = targetTotal * config.languages.length * Math.max(1, input.accountCapabilities.length);
  let iterations = 0;

  while (assigned < targetTotal && iterations < maxIterations) {
    iterations += 1;
    let bestAccountId = "";
    let bestLang: LanguageCode | null = null;
    let bestScore = -1;

    for (const capability of input.accountCapabilities) {
      const accountId = capability.accountId;
      if ((remainingAccountCap[accountId] ?? 0) <= 0) {
        continue;
      }
      for (const lang of config.languages) {
        if (!supportedByAccount[accountId].has(lang)) {
          continue;
        }
        const langPressure = remainingLangTarget[lang] > 0 ? 1.35 : 0.55;
        const accountWeight = capability.allocationWeight ?? 1;
        const score =
          (accountSampleMeans[accountId]?.[lang] ?? 0) *
          (globalResult.weights[lang] ?? 0) *
          langPressure *
          accountWeight;
        if (score > bestScore) {
          bestScore = score;
          bestAccountId = accountId;
          bestLang = lang;
        }
      }
    }

    if (!bestLang || !bestAccountId || bestScore <= 0) {
      break;
    }
    perAccountLanguageAllocation[bestAccountId][bestLang] += 1;
    perAccountTotals[bestAccountId] += 1;
    remainingAccountCap[bestAccountId] -= 1;
    remainingLangTarget[bestLang] = Math.max(0, remainingLangTarget[bestLang] - 1);
    assigned += 1;
  }

  // Final pass to satisfy any residual target with supported capacity.
  if (assigned < targetTotal) {
    for (const capability of input.accountCapabilities) {
      const accountId = capability.accountId;
      while (assigned < targetTotal && remainingAccountCap[accountId] > 0) {
        const fallbackLang = config.languages
          .filter((lang) => supportedByAccount[accountId].has(lang))
          .sort((a, b) => remainingLangTarget[b] - remainingLangTarget[a])[0];
        if (!fallbackLang) {
          break;
        }
        perAccountLanguageAllocation[accountId][fallbackLang] += 1;
        perAccountTotals[accountId] += 1;
        remainingAccountCap[accountId] -= 1;
        remainingLangTarget[fallbackLang] = Math.max(0, remainingLangTarget[fallbackLang] - 1);
        assigned += 1;
      }
    }
  }

  return {
    globalResult,
    perAccountLanguageAllocation,
    perAccountTotals,
    nextState: {
      global: globalResult.nextState,
      byAccount: nextByAccount
    }
  };
}
