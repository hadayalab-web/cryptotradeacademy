declare const require: any;
declare const module: { exports: unknown };
declare const process: {
  cwd: () => string;
  env: Record<string, string | undefined>;
  exitCode?: number;
};

const fs = require("fs").promises as {
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  readFile: (path: string, encoding: string) => Promise<string>;
  writeFile: (path: string, data: string, encoding: string) => Promise<void>;
};
const path = require("path") as {
  resolve: (...paths: string[]) => string;
  dirname: (path: string) => string;
};

import {
  AllocationConfig,
  AllocationRuntimeState,
  BudgetTier,
  DEFAULT_ALLOCATION_CONFIG,
  MultiAccountAllocationRuntimeState,
  buildRuntimeStateFromPriors
} from "./core/allocation";
import {
  BuildChainsResult,
  ChainConfig,
  ChainPost,
  DEFAULT_CHAIN_CONFIG,
  buildQuoteChains
} from "./core/chains";
import {
  ContentConfig,
  DEFAULT_CONTENT_CONFIG,
  ExternalLlmGenerator,
  generateContentPool
} from "./core/content";
import {
  DEFAULT_DRIFT_CONFIG,
  DriftConfig,
  detectAlgorithmDrift
} from "./core/drift";
import {
  DEFAULT_METRICS_CONFIG,
  LanguageCode,
  OutcomeMetricRecord,
  XMetricRecord,
  buildPosteriorDeltas,
  ingestMetrics
} from "./core/metrics";
import {
  DEFAULT_PENALTY_CONFIG,
  PenaltyConfig,
  applyPenaltyGuardrails
} from "./core/penalties";
import { DEFAULT_SCHEDULER_CONFIG, ScheduleEntry, SchedulerConfig } from "./core/scheduler";
import {
  AccountXProfile,
  DEFAULT_XCLIENT_CONFIG,
  ExecuteScheduleOptions,
  ExecuteScheduleResult,
  XClientConfig,
  executeMultiAccountSchedules,
  fetchLatestMetricsForAccounts
} from "./api/xclient";
import {
  DEFAULT_NETWORK_TOPOLOGY,
  NetworkTopology,
  buildNetworkDescriptor,
  getAccountIds
} from "./scale/topology";
import {
  DEFAULT_FLYWHEEL_CONFIG,
  DailyGrowthSignal,
  FlywheelControlConfig,
  FlywheelEvaluation,
  evaluateGrowthFlywheel
} from "./scale/flywheel";
import {
  DEFAULT_RISK_CONFIG,
  RiskAssessmentResult,
  RiskThresholdConfig,
  evaluatePenaltyRiskCurve
} from "./scale/risk";
import { DEFAULT_MEDIA_SCALING_CONFIG, MediaScalingConfig, buildMediaScalingPlan } from "./scale/media";
import {
  BuildCoordinationResult,
  buildCrossAccountSchedule,
  buildInterAccountCoordination,
  buildMultiAccountCoordinationPlan
} from "./scale/multiaccount";

export interface RuntimeDriftState {
  driftFlag: boolean;
  driftScore: number;
  windowShiftHours: number;
  lastDetectedAt?: string;
}

export interface RuntimeAccountState {
  accountId: string;
  username: string;
  languages: LanguageCode[];
  dailyCap: number;
  trustDecay: boolean;
  quarantined: boolean;
  penaltyCount24h: number;
}

export interface BweRuntimeState {
  seed: number;
  allocationState: MultiAccountAllocationRuntimeState;
  drift: RuntimeDriftState;
  accounts: Record<string, RuntimeAccountState>;
  flywheelHistory: DailyGrowthSignal[];
  lastFlywheel?: FlywheelEvaluation;
  lastRisk?: {
    level: string;
    warningCount: number;
    blockCount: number;
    maxAllowedChainDepth: number;
  };
  lastRun?: {
    runAt: string;
    budgetTier: BudgetTier;
    totalScheduled: number;
    postedCount: number;
    failedCount: number;
    blockedCount: number;
    activeAccounts: number;
  };
}

export interface BwePathsConfig {
  priorsPath: string;
  runtimeStatePath: string;
  runtimeSchedulePath: string;
  runtimeSchedulesDir: string;
  runtimeNetworkPath: string;
}

export interface DailyPipelineConfig {
  budgetTier: BudgetTier;
  seed: number;
  profitUsd: number;
  paths: BwePathsConfig;
  topology: NetworkTopology;
  accountProfiles: AccountXProfile[];
  allocation: AllocationConfig;
  metrics: typeof DEFAULT_METRICS_CONFIG;
  drift: DriftConfig;
  chain: ChainConfig;
  scheduler: SchedulerConfig;
  penalties: PenaltyConfig;
  content: ContentConfig;
  media: MediaScalingConfig;
  xclient: XClientConfig;
  risk: RiskThresholdConfig;
  flywheel: FlywheelControlConfig;
  execution: ExecuteScheduleOptions;
}

export interface DailyPipelineInput {
  config?: Partial<DailyPipelineConfig>;
  llmGenerate?: ExternalLlmGenerator;
}

export interface DailyPipelineResult {
  runtimeState: BweRuntimeState;
  scheduleSavedPath: string;
  perAccountSchedulePaths: Record<string, string>;
  networkSavedPath: string;
  scheduledCount: number;
  blockedCount: number;
  executionByAccount: Record<string, ExecuteScheduleResult>;
  driftFlag: boolean;
  riskLevel: string;
}

const DEFAULT_PATHS: BwePathsConfig = {
  priorsPath: path.resolve(process.cwd(), "bwe", "data", "priors.json"),
  runtimeStatePath: path.resolve(process.cwd(), "bwe", "runtime", "state.json"),
  runtimeSchedulePath: path.resolve(process.cwd(), "bwe", "runtime", "schedule.json"),
  runtimeSchedulesDir: path.resolve(process.cwd(), "bwe", "runtime", "schedules"),
  runtimeNetworkPath: path.resolve(process.cwd(), "bwe", "runtime", "network.json")
};

function defaultAccountProfiles(topology: NetworkTopology): AccountXProfile[] {
  const env = process.env;
  const envMap: Record<string, string | undefined> = {
    acct1: env.BWE_ACCT1_USERNAME || env.BWE_X_USERNAME || env.X_USERNAME,
    acct2: env.BWE_ACCT2_USERNAME,
    acct3: env.BWE_ACCT3_USERNAME,
    acct4: env.BWE_ACCT4_USERNAME,
    acct5: env.BWE_ACCT5_USERNAME
  };
  return getAccountIds(topology).map((accountId) => ({
    accountId,
    username: envMap[accountId] || "",
    enabled: Boolean(envMap[accountId]),
    postingEnabled: accountId === "acct1"
  }));
}

const DEFAULT_DAILY_CONFIG: DailyPipelineConfig = {
  budgetTier: "medium",
  seed: Number(process.env.BWE_SEED || 20260214),
  profitUsd: Number(process.env.BWE_PROFIT_USD || 0),
  paths: DEFAULT_PATHS,
  topology: DEFAULT_NETWORK_TOPOLOGY,
  accountProfiles: defaultAccountProfiles(DEFAULT_NETWORK_TOPOLOGY),
  allocation: DEFAULT_ALLOCATION_CONFIG,
  metrics: DEFAULT_METRICS_CONFIG,
  drift: DEFAULT_DRIFT_CONFIG,
  chain: DEFAULT_CHAIN_CONFIG,
  scheduler: DEFAULT_SCHEDULER_CONFIG,
  penalties: DEFAULT_PENALTY_CONFIG,
  content: DEFAULT_CONTENT_CONFIG,
  media: DEFAULT_MEDIA_SCALING_CONFIG,
  xclient: DEFAULT_XCLIENT_CONFIG,
  risk: DEFAULT_RISK_CONFIG,
  flywheel: DEFAULT_FLYWHEEL_CONFIG,
  execution: {
    dryRun: process.env.BWE_DRY_RUN !== "false",
    executeDueOnly: true
  }
};

function mergeConfig(input?: Partial<DailyPipelineConfig>): DailyPipelineConfig {
  if (!input) {
    return DEFAULT_DAILY_CONFIG;
  }
  const mergedTopology = input.topology ?? DEFAULT_DAILY_CONFIG.topology;
  return {
    ...DEFAULT_DAILY_CONFIG,
    ...input,
    topology: mergedTopology,
    accountProfiles: input.accountProfiles ?? defaultAccountProfiles(mergedTopology),
    paths: { ...DEFAULT_DAILY_CONFIG.paths, ...(input.paths || {}) },
    allocation: { ...DEFAULT_DAILY_CONFIG.allocation, ...(input.allocation || {}) },
    metrics: { ...DEFAULT_DAILY_CONFIG.metrics, ...(input.metrics || {}) },
    drift: { ...DEFAULT_DAILY_CONFIG.drift, ...(input.drift || {}) },
    chain: { ...DEFAULT_DAILY_CONFIG.chain, ...(input.chain || {}) },
    scheduler: { ...DEFAULT_DAILY_CONFIG.scheduler, ...(input.scheduler || {}) },
    penalties: { ...DEFAULT_DAILY_CONFIG.penalties, ...(input.penalties || {}) },
    content: { ...DEFAULT_DAILY_CONFIG.content, ...(input.content || {}) },
    media: { ...DEFAULT_DAILY_CONFIG.media, ...(input.media || {}) },
    xclient: { ...DEFAULT_DAILY_CONFIG.xclient, ...(input.xclient || {}) },
    risk: { ...DEFAULT_DAILY_CONFIG.risk, ...(input.risk || {}) },
    flywheel: { ...DEFAULT_DAILY_CONFIG.flywheel, ...(input.flywheel || {}) },
    execution: { ...DEFAULT_DAILY_CONFIG.execution, ...(input.execution || {}) }
  };
}

async function ensureDirectoryForFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDirectoryForFile(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function buildBootstrapPriors(
  summaries: Record<LanguageCode, { successRate: number }>,
  languages: LanguageCode[]
): Record<LanguageCode, number> {
  return languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    const v = summaries[lang]?.successRate ?? 0.5;
    acc[lang] = Math.max(0.01, Math.min(0.99, v));
    return acc;
  }, {} as Record<LanguageCode, number>);
}

function buildRecentAndBaselineSeries(records: Array<{ outcomeScore: number; createdAt?: string }>): {
  recent7d: number[];
  baseline30d: number[];
  residualSeries: number[];
} {
  const now = Date.now();
  const d7 = now - 7 * 24 * 60 * 60 * 1000;
  const d30 = now - 30 * 24 * 60 * 60 * 1000;
  const normalized = records.map((record, idx) => ({
    score: record.outcomeScore,
    ts: record.createdAt ? new Date(record.createdAt).getTime() : now - idx * 60 * 60 * 1000
  }));
  const recent7d = normalized.filter((row) => row.ts >= d7).map((row) => row.score);
  const baseline30d = normalized.filter((row) => row.ts >= d30).map((row) => row.score);
  const residualSeries = normalized.sort((a, b) => a.ts - b.ts).map((row) => row.score);
  return {
    recent7d: recent7d.length > 0 ? recent7d : residualSeries.slice(-7),
    baseline30d: baseline30d.length > 0 ? baseline30d : residualSeries.slice(-30),
    residualSeries
  };
}

function applyRecoveredPriors(
  state: AllocationRuntimeState,
  resetPriors: Record<LanguageCode, number>,
  languages: LanguageCode[]
): AllocationRuntimeState {
  const posteriors = { ...state.posteriors };
  for (const lang of languages) {
    const current = posteriors[lang];
    const concentration = Math.max(2, current.alpha + current.beta);
    const nextPrior = Math.max(0.01, Math.min(0.99, resetPriors[lang] ?? current.priorMean));
    posteriors[lang] = {
      ...current,
      priorMean: nextPrior,
      alpha: Math.max(1, concentration * nextPrior),
      beta: Math.max(1, concentration * (1 - nextPrior))
    };
  }
  return {
    ...state,
    posteriors
  };
}

function applyRecoveredPriorsToMultiAccountState(
  state: MultiAccountAllocationRuntimeState,
  resetPriors: Record<LanguageCode, number>,
  languages: LanguageCode[]
): MultiAccountAllocationRuntimeState {
  const global = applyRecoveredPriors(state.global, resetPriors, languages);
  const byAccount = Object.keys(state.byAccount).reduce<Record<string, AllocationRuntimeState>>((acc, accountId) => {
    acc[accountId] = applyRecoveredPriors(state.byAccount[accountId], resetPriors, languages);
    return acc;
  }, {});
  return {
    global,
    byAccount
  };
}

function groupByAccount(entries: ScheduleEntry[]): Record<string, ScheduleEntry[]> {
  return entries.reduce<Record<string, ScheduleEntry[]>>((acc, entry) => {
    const accountId = entry.accountId || "acct1";
    acc[accountId] = acc[accountId] || [];
    acc[accountId].push(entry);
    return acc;
  }, {});
}

function aggregateExecution(results: Record<string, ExecuteScheduleResult>): { posted: number; failed: number } {
  return Object.values(results).reduce(
    (acc, row) => {
      acc.posted += row.postedCount;
      acc.failed += row.failedCount;
      return acc;
    },
    { posted: 0, failed: 0 }
  );
}

function deriveDailySignalFromMetrics(
  scoredRecords: OutcomeMetricRecord[],
  penaltyCount: number
): DailyGrowthSignal {
  const engagementRate = scoredRecords.length > 0
    ? scoredRecords.reduce((sum, row) => {
        const impressions = row.impressions ?? 0;
        const engagements = row.engagements ?? 0;
        return sum + (impressions > 0 ? engagements / impressions : 0);
      }, 0) / scoredRecords.length
    : 0;
  const impressions = scoredRecords.map((row) => row.impressions ?? 0);
  const half = Math.max(1, Math.floor(impressions.length / 2));
  const prev = impressions.slice(0, half).reduce((sum, x) => sum + x, 0);
  const curr = impressions.slice(-half).reduce((sum, x) => sum + x, 0);
  const impressionGrowth = prev > 0 ? (curr - prev) / prev : 0;
  const impressionDrop = impressionGrowth < 0 ? Math.abs(impressionGrowth) : 0;
  return {
    date: new Date().toISOString(),
    engagementRate,
    impressionGrowth,
    impressionDrop,
    penalties: penaltyCount
  };
}

function buildPerformanceSnapshots(metricsByAccount: Record<string, XMetricRecord[]>): Array<{
  accountId: string;
  engImpHistory: number[];
  chainFailureRate: number;
  languageImpressionChange: Partial<Record<LanguageCode, number>>;
}> {
  return Object.entries(metricsByAccount).map(([accountId, records]) => {
    const engImpHistory = records
      .map((row) => {
        const imp = row.impressions ?? 0;
        const eng = row.engagements ?? 0;
        return imp > 0 ? eng / imp : 0;
      })
      .slice(-10);

    const languageImpressionChange: Partial<Record<LanguageCode, number>> = {};
    const langs = ["en", "pt", "es", "ja", "ar", "ko"] as LanguageCode[];
    for (const lang of langs) {
      const series = records.filter((row) => row.lang === lang).map((row) => row.impressions ?? 0);
      if (series.length < 2) {
        continue;
      }
      const split = Math.max(1, Math.floor(series.length / 2));
      const prev = series.slice(0, split).reduce((sum, x) => sum + x, 0) / split;
      const curr = series.slice(-split).reduce((sum, x) => sum + x, 0) / split;
      if (prev > 0) {
        languageImpressionChange[lang] = (curr - prev) / prev;
      }
    }

    return {
      accountId,
      engImpHistory,
      chainFailureRate: 0,
      languageImpressionChange
    };
  });
}

function applyMediaPlanToPosts(posts: ChainPost[], plan: ReturnType<typeof buildMediaScalingPlan>): ChainPost[] {
  const assignmentById = plan.assignments.reduce<Record<string, (typeof plan.assignments)[number]>>(
    (acc, row) => {
      acc[row.contentId] = row;
      return acc;
    },
    {}
  );
  return posts.map((post) => {
    const assignment = assignmentById[post.id];
    if (!assignment) {
      return post;
    }
    if (assignment.mediaKind === "text") {
      return {
        ...post,
        media: null,
        poll: null
      };
    }
    if (assignment.mediaKind === "poll") {
      return {
        ...post,
        poll: post.poll || { question: "What is your setup?", options: ["Conservative", "Balanced", "Aggressive", "Skip"] },
        media: null
      };
    }
    return {
      ...post,
      media: {
        type: assignment.mediaKind === "video" ? "video" : "image",
        hint: `${assignment.format || "asset"}:${assignment.mediaAssetId || "na"}`
      }
    };
  });
}

async function loadPreviousSchedules(
  config: DailyPipelineConfig
): Promise<Record<string, ScheduleEntry[]>> {
  const result: Record<string, ScheduleEntry[]> = {};
  for (const accountId of getAccountIds(config.topology)) {
    const schedulePath = path.resolve(config.paths.runtimeSchedulesDir, `${accountId}.json`);
    result[accountId] = await readJsonFile<ScheduleEntry[]>(schedulePath, []);
  }
  return result;
}

function buildRuntimeFallback(
  config: DailyPipelineConfig,
  priors: Record<LanguageCode, { p0: number; alpha: number; beta: number; sigma?: number }>
): BweRuntimeState {
  const globalState = buildRuntimeStateFromPriors(priors, config.allocation);
  const byAccount = getAccountIds(config.topology).reduce<Record<string, AllocationRuntimeState>>((acc, accountId) => {
    acc[accountId] = buildRuntimeStateFromPriors(priors, config.allocation);
    return acc;
  }, {});
  const accounts = getAccountIds(config.topology).reduce<Record<string, RuntimeAccountState>>((acc, accountId) => {
    const node = config.topology.accounts[accountId];
    const profile = config.accountProfiles.find((row) => row.accountId === accountId);
    acc[accountId] = {
      accountId,
      username: profile?.username || "",
      languages: node.languages,
      dailyCap: node.dailyCap,
      trustDecay: false,
      quarantined: false,
      penaltyCount24h: 0
    };
    return acc;
  }, {});
  return {
    seed: config.seed,
    allocationState: {
      global: globalState,
      byAccount
    },
    drift: {
      driftFlag: false,
      driftScore: 0,
      windowShiftHours: 0
    },
    accounts,
    flywheelHistory: []
  };
}

function normalizeRuntimeState(
  raw: unknown,
  fallback: BweRuntimeState,
  config: DailyPipelineConfig
): BweRuntimeState {
  const candidate = (raw || {}) as any;
  const hasMultiAccount =
    candidate?.allocationState &&
    candidate.allocationState.global &&
    candidate.allocationState.byAccount;

  if (!hasMultiAccount) {
    const legacyAllocation = candidate?.allocationState?.posteriors
      ? (candidate.allocationState as AllocationRuntimeState)
      : fallback.allocationState.global;
    const byAccount = getAccountIds(config.topology).reduce<Record<string, AllocationRuntimeState>>((acc, accountId) => {
      acc[accountId] = legacyAllocation;
      return acc;
    }, {});
    return {
      ...fallback,
      seed: Number(candidate?.seed ?? fallback.seed),
      allocationState: {
        global: legacyAllocation,
        byAccount
      },
      drift: {
        ...fallback.drift,
        ...(candidate?.drift || {})
      }
    };
  }

  return {
    ...fallback,
    ...candidate,
    seed: Number(candidate.seed ?? fallback.seed),
    allocationState: candidate.allocationState,
    accounts: {
      ...fallback.accounts,
      ...(candidate.accounts || {})
    },
    flywheelHistory: Array.isArray(candidate.flywheelHistory)
      ? candidate.flywheelHistory
      : fallback.flywheelHistory
  };
}

function selectActiveProfiles(
  config: DailyPipelineConfig,
  targetAccountCount: number
): AccountXProfile[] {
  const enabled = config.accountProfiles.filter((profile) => profile.enabled !== false && profile.username);
  const sorted = [...enabled].sort((a, b) => {
    if (a.accountId === "acct1") return -1;
    if (b.accountId === "acct1") return 1;
    return a.accountId.localeCompare(b.accountId);
  });
  const n = Math.max(1, Math.min(targetAccountCount, sorted.length));
  return sorted.slice(0, n);
}

export async function runDailyPipeline(input: DailyPipelineInput = {}): Promise<DailyPipelineResult> {
  const config = mergeConfig(input.config);
  const priors = await readJsonFile<Record<LanguageCode, { p0: number; alpha: number; beta: number; sigma?: number }>>(
    config.paths.priorsPath,
    {} as Record<LanguageCode, { p0: number; alpha: number; beta: number; sigma?: number }>
  );
  const runtimeFallback = buildRuntimeFallback(config, priors);
  const runtimeRaw = await readJsonFile<any>(config.paths.runtimeStatePath, runtimeFallback as any);
  const runtimeState = normalizeRuntimeState(runtimeRaw, runtimeFallback, config);
  const seed = runtimeState.seed ?? config.seed;

  // 1) Load metrics for all accounts
  const metricsByAccount = await fetchLatestMetricsForAccounts(config.accountProfiles, config.xclient);
  const globalMetrics = Object.values(metricsByAccount).flat();

  // 2) Update global + per-account posteriors
  const globalIngestion = ingestMetrics(globalMetrics, config.metrics);
  const globalPosteriorDeltas = buildPosteriorDeltas(globalIngestion.byLanguage, config.metrics.languages);
  const accountPosteriorDeltas = Object.entries(metricsByAccount).reduce<Record<string, Record<LanguageCode, { successes: number; failures: number }>>>(
    (acc, [accountId, records]) => {
      const ingestion = ingestMetrics(records, config.metrics);
      acc[accountId] = buildPosteriorDeltas(ingestion.byLanguage, config.metrics.languages);
      return acc;
    },
    {}
  );

  const previousSchedulesByAccount = await loadPreviousSchedules(config);
  const priorPenaltyByAccount = Object.keys(runtimeState.accounts || {}).reduce<Record<string, number>>((acc, accountId) => {
    acc[accountId] = runtimeState.accounts[accountId]?.penaltyCount24h ?? 0;
    return acc;
  }, {});

  const performanceSnapshots = buildPerformanceSnapshots(metricsByAccount);

  // Flywheel signal derivation for scaling
  const todaySignal = deriveDailySignalFromMetrics(globalIngestion.scoredRecords, 0);
  const flywheelHistory = [...(runtimeState.flywheelHistory || []), todaySignal].slice(-14);
  const flywheelEval = evaluateGrowthFlywheel(
    {
      profitUsd: config.profitUsd,
      currentPostsPerDay: runtimeState.lastRun?.totalScheduled ?? 30,
      currentAccountCount: Object.values(runtimeState.accounts || {}).filter((a) => !a.quarantined).length || 1,
      dailySignals: flywheelHistory.slice(-7),
      lastScaleAtIso: runtimeState.lastRun?.runAt
    },
    config.flywheel
  );

  // 3) Run drift detection
  const priorMeanSnapshot = config.metrics.languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    acc[lang] = runtimeState.allocationState.global.posteriors[lang]?.priorMean ?? 0.5;
    return acc;
  }, {} as Record<LanguageCode, number>);
  const bootstrapPriors = buildBootstrapPriors(globalIngestion.byLanguage, config.metrics.languages);
  const series = buildRecentAndBaselineSeries(globalIngestion.scoredRecords);
  let plannedDailyPosts = flywheelEval.targetPostsPerDay;
  const selectedForScale = selectActiveProfiles(config, flywheelEval.targetAccountCount);
  const drift = detectAlgorithmDrift(
    {
      recent7d: series.recent7d,
      baseline30d: series.baseline30d,
      residualSeries: series.residualSeries,
      currentPriors: priorMeanSnapshot,
      bootstrapPriors,
      seed,
      accountCount: selectedForScale.length,
      plannedDailyPosts,
      penaltyEvents24h: Object.values(priorPenaltyByAccount).reduce((sum, value) => sum + value, 0),
      currentAccountCount: selectedForScale.length
    },
    config.drift
  );

  let allocationState = runtimeState.allocationState;
  let windowShiftHours = runtimeState.drift.windowShiftHours || 0;
  let explorationEpsilon = allocationState.global.explorationEpsilon;
  let maxChainDepth = config.chain.maxLayers;
  let targetAccountCount = selectedForScale.length;
  if (drift.driftFlag && drift.recovery) {
    allocationState = applyRecoveredPriorsToMultiAccountState(
      allocationState,
      drift.recovery.resetPriors,
      config.metrics.languages
    );
    explorationEpsilon = drift.recovery.explorationEpsilon;
    windowShiftHours = drift.recovery.windowShiftHours;
    maxChainDepth = drift.recovery.reduceMaxChainDepthTo;
    plannedDailyPosts = drift.recovery.recommendedDailyPosts ?? plannedDailyPosts;
    targetAccountCount = drift.recovery.recommendedAccountCount ?? targetAccountCount;
  }

  // 4) Run risk model
  const preRisk = evaluatePenaltyRiskCurve(
    {
      schedulesByAccount: previousSchedulesByAccount,
      postPenaltyCount24hByAccount: priorPenaltyByAccount,
      performanceSnapshots
    },
    config.risk
  );
  if (preRisk.safeZone.exceeded) {
    plannedDailyPosts = Math.min(plannedDailyPosts, preRisk.safeZone.maxPostsPerDay);
  }
  maxChainDepth = Math.min(maxChainDepth, preRisk.maxAllowedChainDepth);

  // 5) Compute global + per-account allocations
  const activeProfiles = selectActiveProfiles(config, targetAccountCount);
  const activeSet = new Set(activeProfiles.map((profile) => profile.accountId));
  const quarantinedAccounts = new Set([
    ...preRisk.trustDecayAccounts,
    ...Object.values(runtimeState.accounts || {})
      .filter((account) => account.quarantined)
      .map((account) => account.accountId),
    ...getAccountIds(config.topology).filter((accountId) => !activeSet.has(accountId))
  ]);

  const coordination: BuildCoordinationResult = buildMultiAccountCoordinationPlan({
    allocationInput: {
      state: allocationState,
      deltas: {
        global: globalPosteriorDeltas,
        byAccount: accountPosteriorDeltas
      },
      accountCapabilities: [],
      budgetTier: config.budgetTier,
      seed: seed + 17,
      explorationEpsilon,
      forcedTotalPosts: plannedDailyPosts
    },
    quarantinedAccounts: [...quarantinedAccounts],
    config: {
      topology: config.topology,
      maxInterAccountSharePerAccount: config.topology.constraints.maxInterAccountSharePerAccount
    }
  });

  // 6) Generate content pools per account
  const postsByAccount: Record<string, ChainPost[]> = {};
  let sharedTemplates: Record<LanguageCode, any> | null = null;
  for (const [accountId, plan] of Object.entries(coordination.plansByAccount)) {
    if (plan.quarantined || plan.totalPosts <= 0) {
      postsByAccount[accountId] = [];
      continue;
    }
    const contentPool = await generateContentPool(
      {
        allocation: plan.languageAllocation,
        seed: seed + accountId.length * 37,
        llmGenerate: input.llmGenerate
      },
      config.content
    );
    if (!sharedTemplates) {
      sharedTemplates = contentPool.templates;
    }

    const mediaPlan = buildMediaScalingPlan(
      contentPool.items.map((item) => ({
        id: item.id,
        lang: item.lang,
        chainId: item.chainId,
        accountId
      })),
      seed + accountId.length * 101,
      config.media
    );
    const mediaAppliedPool = applyMediaPlanToPosts(
      contentPool.items.map((item) => ({
        ...item,
        chainId: item.chainId || `seed-${accountId}`,
        layer: item.layer || 1,
        delayMinutesFromParent: 0,
        delayMinutesFromRoot: 0,
        accountId
      })),
      mediaPlan
    );

    const chainBuild: BuildChainsResult = await buildQuoteChains(
      {
        allocation: plan.languageAllocation,
        contentPool: mediaAppliedPool,
        templates: contentPool.templates,
        seed: seed + accountId.length * 211,
        llmGenerate: input.llmGenerate,
        thermalState: coordination.allocation.nextState.byAccount[accountId]?.hotCold,
        accountId
      },
      {
        ...config.chain,
        maxLayers: Math.min(config.chain.maxLayers, maxChainDepth)
      }
    );
    postsByAccount[accountId] = chainBuild.posts;
  }
  const templates = (sharedTemplates || (await generateContentPool({
    allocation: { en: 1, pt: 0, es: 0, ja: 0, ar: 0, ko: 0 } as Record<LanguageCode, number>,
    seed: seed + 99999
  }, config.content)).templates) as Record<LanguageCode, any>;

  // 7) Generate inter-account quote-chains
  const interCoordination = await buildInterAccountCoordination({
    postsByAccount,
    plansByAccount: coordination.plansByAccount,
    templates,
    seed: seed + 701,
    llmGenerate: input.llmGenerate,
    topology: config.topology
  });

  // 8) Build multi-account schedules
  const scheduleResult = buildCrossAccountSchedule({
    postsByAccount: interCoordination.mergedPosts,
    seed: seed + 977,
    schedulerConfig: config.scheduler,
    windowShiftHours
  });

  // 9) Apply penalty guardrails
  const guarded = applyPenaltyGuardrails(scheduleResult.entries, config.penalties);
  const allowedByAccount = groupByAccount(guarded.allowedEntries);
  const blockedByAccount = groupByAccount(guarded.blockedEntries);

  // 10) Save schedules + network topology output
  const scheduleForStorage = guarded.allowedEntries.map((entry) => ({
    time: entry.time,
    accountId: entry.accountId,
    lang: entry.lang,
    type: entry.type,
    chainId: entry.chainId,
    layer: entry.layer,
    targetLang: entry.targetLang
  }));
  await writeJsonFile(config.paths.runtimeSchedulePath, scheduleForStorage);

  const perAccountSchedulePaths: Record<string, string> = {};
  for (const accountId of getAccountIds(config.topology)) {
    const schedulePath = path.resolve(config.paths.runtimeSchedulesDir, `${accountId}.json`);
    perAccountSchedulePaths[accountId] = schedulePath;
    await writeJsonFile(schedulePath, allowedByAccount[accountId] ?? []);
  }

  const networkDescriptor = buildNetworkDescriptor(config.topology) as unknown as Record<string, unknown>;
  const volumes = (networkDescriptor.volumes as Record<string, unknown>) || {};
  volumes.assignedPostsByAccount = Object.fromEntries(
    Object.entries(coordination.plansByAccount).map(([accountId, plan]) => [accountId, plan.totalPosts])
  );
  volumes.interAccountChainsByAccount = interCoordination.interAccount.perAccountInterCount;
  networkDescriptor.volumes = volumes;
  await writeJsonFile(config.paths.runtimeNetworkPath, networkDescriptor);

  // 11) Execute posting
  const executionByAccount = await executeMultiAccountSchedules(allowedByAccount, config.execution);

  // 12) Log outcomes
  const executionTotals = aggregateExecution(executionByAccount);
  const blockedCountsByAccount = Object.keys(coordination.plansByAccount).reduce<Record<string, number>>((acc, accountId) => {
    acc[accountId] = blockedByAccount[accountId]?.length ?? 0;
    return acc;
  }, {});

  const nextAccounts = getAccountIds(config.topology).reduce<Record<string, RuntimeAccountState>>((acc, accountId) => {
    const node = config.topology.accounts[accountId];
    const profile = config.accountProfiles.find((row) => row.accountId === accountId);
    const previous = runtimeState.accounts?.[accountId];
    const penaltyCount24h = Math.max(
      0,
      (previous?.penaltyCount24h ?? 0) - 1 + (blockedCountsByAccount[accountId] ?? 0)
    );
    const trustDecay = preRisk.trustDecayAccounts.includes(accountId) || penaltyCount24h > config.risk.accountPenaltyTrustDecayThreshold;
    const quarantined = quarantinedAccounts.has(accountId) || trustDecay;
    acc[accountId] = {
      accountId,
      username: profile?.username || previous?.username || "",
      languages: node.languages,
      dailyCap: node.dailyCap,
      trustDecay,
      quarantined,
      penaltyCount24h
    };
    return acc;
  }, {});

  const nextRuntimeState: BweRuntimeState = {
    seed: seed + 1,
    allocationState: coordination.allocation.nextState,
    drift: {
      driftFlag: drift.driftFlag,
      driftScore: drift.driftScore,
      windowShiftHours,
      lastDetectedAt: drift.driftFlag ? new Date().toISOString() : runtimeState.drift.lastDetectedAt
    },
    accounts: nextAccounts,
    flywheelHistory,
    lastFlywheel: flywheelEval,
    lastRisk: {
      level: preRisk.level,
      warningCount: preRisk.warnings.length,
      blockCount: preRisk.blocks.length,
      maxAllowedChainDepth: preRisk.maxAllowedChainDepth
    },
    lastRun: {
      runAt: new Date().toISOString(),
      budgetTier: config.budgetTier,
      totalScheduled: guarded.allowedEntries.length,
      postedCount: executionTotals.posted,
      failedCount: executionTotals.failed,
      blockedCount: guarded.blockedEntries.length,
      activeAccounts: activeProfiles.length
    }
  };

  await writeJsonFile(config.paths.runtimeStatePath, nextRuntimeState);

  return {
    runtimeState: nextRuntimeState,
    scheduleSavedPath: config.paths.runtimeSchedulePath,
    perAccountSchedulePaths,
    networkSavedPath: config.paths.runtimeNetworkPath,
    scheduledCount: guarded.allowedEntries.length,
    blockedCount: guarded.blockedEntries.length,
    executionByAccount,
    driftFlag: drift.driftFlag,
    riskLevel: preRisk.level
  };
}

if (require.main === module) {
  runDailyPipeline()
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log(
        `[BWE] Pipeline completed. scheduled=${result.scheduledCount} blocked=${result.blockedCount} risk=${result.riskLevel}`
      );
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[BWE] Pipeline failed:", error);
      process.exitCode = 1;
    });
}
