import {
  AccountCapability,
  GlobalAcrossAccountsInput,
  GlobalAcrossAccountsResult,
  computeGlobalAllocationAcrossAccounts
} from "../core/allocation";
import {
  BuildInterAccountChainsResult,
  ChainPost,
  buildInterAccountQuoteChains
} from "../core/chains";
import { ExternalLlmGenerator, LanguageTemplate } from "../core/content";
import { LanguageCode } from "../core/metrics";
import {
  MultiAccountSchedulerResult,
  SchedulerConfig,
  buildMultiAccountSchedule
} from "../core/scheduler";
import {
  AccountId,
  DEFAULT_NETWORK_TOPOLOGY,
  NetworkTopology
} from "./topology";

export interface AccountCoordinationPlan {
  accountId: string;
  languages: LanguageCode[];
  dailyCap: number;
  totalPosts: number;
  languageAllocation: Record<LanguageCode, number>;
  interAccountChainCap: number;
  quarantined: boolean;
}

export interface MultiAccountCoordinationConfig {
  topology: NetworkTopology;
  maxInterAccountSharePerAccount: number;
}

export interface BuildCoordinationInput {
  allocationInput: GlobalAcrossAccountsInput;
  quarantinedAccounts?: string[];
  config?: Partial<MultiAccountCoordinationConfig>;
}

export interface BuildCoordinationResult {
  allocation: GlobalAcrossAccountsResult;
  plansByAccount: Record<string, AccountCoordinationPlan>;
}

export interface BuildInterAccountCoordinationInput {
  postsByAccount: Record<string, ChainPost[]>;
  plansByAccount: Record<string, AccountCoordinationPlan>;
  templates: Record<LanguageCode, LanguageTemplate>;
  seed: number;
  llmGenerate?: ExternalLlmGenerator;
  topology?: NetworkTopology;
}

export interface BuildInterAccountCoordinationResult {
  interAccount: BuildInterAccountChainsResult;
  mergedPosts: Record<string, ChainPost[]>;
}

export interface BuildCrossAccountScheduleInput {
  postsByAccount: Record<string, ChainPost[]>;
  seed: number;
  schedulerConfig?: SchedulerConfig;
  dayStartUtc?: string;
  windowShiftHours?: number;
}

export const DEFAULT_MULTIACCOUNT_COORDINATION_CONFIG: MultiAccountCoordinationConfig = {
  topology: DEFAULT_NETWORK_TOPOLOGY,
  maxInterAccountSharePerAccount: 0.15
};

function buildLanguageZeroMap(languages: LanguageCode[]): Record<LanguageCode, number> {
  return languages.reduce<Record<LanguageCode, number>>((acc, lang) => {
    acc[lang] = 0;
    return acc;
  }, {} as Record<LanguageCode, number>);
}

function mergeConfig(
  input?: Partial<MultiAccountCoordinationConfig>
): MultiAccountCoordinationConfig {
  return {
    ...DEFAULT_MULTIACCOUNT_COORDINATION_CONFIG,
    ...input,
    topology: input?.topology ?? DEFAULT_MULTIACCOUNT_COORDINATION_CONFIG.topology
  };
}

export function buildAccountCapabilitiesFromTopology(
  topology: NetworkTopology = DEFAULT_NETWORK_TOPOLOGY,
  quarantinedAccounts: string[] = []
): AccountCapability[] {
  const quarantineSet = new Set(quarantinedAccounts);
  return (Object.keys(topology.accounts) as AccountId[]).map((accountId) => {
    const node = topology.accounts[accountId];
    const quarantined = quarantineSet.has(accountId);
    return {
      accountId,
      languages: node.languages,
      dailyCap: quarantined ? 0 : node.dailyCap,
      allocationWeight: node.chainFlowShare
    };
  });
}

export function buildMultiAccountCoordinationPlan(
  input: BuildCoordinationInput
): BuildCoordinationResult {
  const config = mergeConfig(input.config);
  const quarantinedAccounts = input.quarantinedAccounts ?? [];
  const capabilities = buildAccountCapabilitiesFromTopology(config.topology, quarantinedAccounts);

  const allocation = computeGlobalAllocationAcrossAccounts({
    ...input.allocationInput,
    accountCapabilities: capabilities
  });

  const allLanguages = input.allocationInput.state.global
    ? Object.keys(input.allocationInput.state.global.posteriors)
    : ["en", "pt", "es", "ja", "ar", "ko"];

  const plansByAccount = capabilities.reduce<Record<string, AccountCoordinationPlan>>(
    (acc, capability) => {
      const languageAllocation =
        allocation.perAccountLanguageAllocation[capability.accountId] ??
        (buildLanguageZeroMap(allLanguages as LanguageCode[]));
      const totalPosts = allocation.perAccountTotals[capability.accountId] ?? 0;
      acc[capability.accountId] = {
        accountId: capability.accountId,
        languages: capability.languages,
        dailyCap: capability.dailyCap,
        totalPosts,
        languageAllocation,
        interAccountChainCap: Math.floor(
          totalPosts * config.maxInterAccountSharePerAccount
        ),
        quarantined: quarantinedAccounts.includes(capability.accountId)
      };
      return acc;
    },
    {}
  );

  return {
    allocation,
    plansByAccount
  };
}

export async function buildInterAccountCoordination(
  input: BuildInterAccountCoordinationInput
): Promise<BuildInterAccountCoordinationResult> {
  const topology = input.topology ?? DEFAULT_NETWORK_TOPOLOGY;
  const interTargetCount = Math.max(
    0,
    Math.floor(
      Object.values(input.plansByAccount).reduce(
        (sum, plan) => sum + plan.interAccountChainCap,
        0
      ) / 2
    )
  );

  const interAccount = await buildInterAccountQuoteChains({
    postsByAccount: input.postsByAccount,
    topology,
    templates: input.templates,
    seed: input.seed,
    interAccountChainTargetCount: interTargetCount,
    llmGenerate: input.llmGenerate
  });

  const mergedPosts: Record<string, ChainPost[]> = { ...input.postsByAccount };
  for (const quote of interAccount.generatedQuotes) {
    const accountId = quote.accountId ?? quote.targetAccountId;
    if (!accountId) {
      continue;
    }
    mergedPosts[accountId] = mergedPosts[accountId] || [];
    mergedPosts[accountId].push(quote);
  }

  return {
    interAccount,
    mergedPosts
  };
}

export function buildCrossAccountSchedule(
  input: BuildCrossAccountScheduleInput
): MultiAccountSchedulerResult {
  const allPosts = Object.values(input.postsByAccount).flat();
  return buildMultiAccountSchedule(
    {
      posts: allPosts,
      seed: input.seed,
      dayStartUtc: input.dayStartUtc,
      windowShiftHours: input.windowShiftHours
    },
    input.schedulerConfig
  );
}
