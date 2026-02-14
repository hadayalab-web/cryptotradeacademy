import { LanguageCode } from "../core/metrics";
import { createSeededRng } from "../core/allocation";

export type AccountId = "acct1" | "acct2" | "acct3" | "acct4" | "acct5";
export type AccountRole = "hub" | "spoke";
export type AccountCluster = "hub" | "amer" | "apac" | "mena";
export type InterAccountPatternId =
  | "hub_amer_bidirectional"
  | "hub_to_apac"
  | "spoke_to_spoke"
  | "apac_to_hub";

export interface AccountNode {
  id: AccountId;
  role: AccountRole;
  cluster: AccountCluster;
  languages: LanguageCode[];
  dailyCap: number;
  interAccountShareLimit: number;
  chainFlowShare: number;
  isolationTag: string;
}

export interface PatternConstraint {
  id: InterAccountPatternId;
  weight: number;
  minDelayMinutes: number;
  maxDelayMinutes: number;
  from: AccountId[];
  to: AccountId[];
  bidirectional?: boolean;
}

export interface TopologyConstraints {
  maxInterAccountSharePerAccount: number;
  minInterAccountDelayMinutes: number;
  maxInterAccountDelayMinutes: number;
  penaltyIsolationRequired: boolean;
}

export interface NetworkTopology {
  hubId: AccountId;
  accounts: Record<AccountId, AccountNode>;
  patterns: PatternConstraint[];
  constraints: TopologyConstraints;
}

export interface NetworkPathDescriptor {
  patternId: InterAccountPatternId;
  from: AccountId;
  to: AccountId;
  weight: number;
  minDelayMinutes: number;
  maxDelayMinutes: number;
}

export interface NetworkDescriptor {
  generatedAt: string;
  hub: AccountId;
  roles: Array<{
    accountId: AccountId;
    role: AccountRole;
    cluster: AccountCluster;
    languages: LanguageCode[];
    dailyCap: number;
    interAccountShareLimit: number;
    chainFlowShare: number;
    isolationTag: string;
  }>;
  volumes: {
    totalBaseDailyCap: number;
    interAccountShareCapByAccount: Record<AccountId, number>;
  };
  chainPaths: NetworkPathDescriptor[];
  constraints: TopologyConstraints;
}

export interface TopologyPathSelection {
  patternId: InterAccountPatternId;
  from: AccountId;
  to: AccountId;
  delayMinutes: number;
}

export const DEFAULT_NETWORK_TOPOLOGY: NetworkTopology = {
  hubId: "acct1",
  accounts: {
    acct1: {
      id: "acct1",
      role: "hub",
      cluster: "hub",
      languages: ["en"],
      dailyCap: 40,
      interAccountShareLimit: 0.15,
      chainFlowShare: 0.6,
      isolationTag: "isolation-segment-1"
    },
    acct2: {
      id: "acct2",
      role: "spoke",
      cluster: "amer",
      languages: ["pt"],
      dailyCap: 20,
      interAccountShareLimit: 0.15,
      chainFlowShare: 0.1,
      isolationTag: "isolation-segment-2"
    },
    acct3: {
      id: "acct3",
      role: "spoke",
      cluster: "amer",
      languages: ["es"],
      dailyCap: 20,
      interAccountShareLimit: 0.15,
      chainFlowShare: 0.1,
      isolationTag: "isolation-segment-3"
    },
    acct4: {
      id: "acct4",
      role: "spoke",
      cluster: "apac",
      languages: ["ja", "ko"],
      dailyCap: 15,
      interAccountShareLimit: 0.15,
      chainFlowShare: 0.1,
      isolationTag: "isolation-segment-4"
    },
    acct5: {
      id: "acct5",
      role: "spoke",
      cluster: "mena",
      languages: ["ar", "ko"],
      dailyCap: 15,
      interAccountShareLimit: 0.15,
      chainFlowShare: 0.1,
      isolationTag: "isolation-segment-5"
    }
  },
  patterns: [
    {
      id: "hub_amer_bidirectional",
      weight: 0.5,
      minDelayMinutes: 240,
      maxDelayMinutes: 480,
      from: ["acct1"],
      to: ["acct2", "acct3"],
      bidirectional: true
    },
    {
      id: "hub_to_apac",
      weight: 0.3,
      minDelayMinutes: 240,
      maxDelayMinutes: 480,
      from: ["acct1"],
      to: ["acct4", "acct5"]
    },
    {
      id: "spoke_to_spoke",
      weight: 0.15,
      minDelayMinutes: 240,
      maxDelayMinutes: 480,
      from: ["acct2", "acct3", "acct4", "acct5"],
      to: ["acct2", "acct3", "acct4", "acct5"]
    },
    {
      id: "apac_to_hub",
      weight: 0.05,
      minDelayMinutes: 240,
      maxDelayMinutes: 480,
      from: ["acct4", "acct5"],
      to: ["acct1"]
    }
  ],
  constraints: {
    maxInterAccountSharePerAccount: 0.15,
    minInterAccountDelayMinutes: 240,
    maxInterAccountDelayMinutes: 480,
    penaltyIsolationRequired: true
  }
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function weightedPick<T extends { weight: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let threshold = rng() * total;
  for (const item of items) {
    threshold -= item.weight;
    if (threshold <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function randomPick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function randomDelay(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function getAccountIds(topology: NetworkTopology = DEFAULT_NETWORK_TOPOLOGY): AccountId[] {
  return Object.keys(topology.accounts) as AccountId[];
}

export function validatePenaltyIsolation(topology: NetworkTopology = DEFAULT_NETWORK_TOPOLOGY): void {
  if (!topology.constraints.penaltyIsolationRequired) {
    return;
  }
  const allTags = getAccountIds(topology).map((accountId) => topology.accounts[accountId].isolationTag);
  if (unique(allTags).length !== allTags.length) {
    throw new Error("Penalty isolation violation: isolationTag must be unique per account.");
  }
}

export function buildInterAccountChainQuota(
  topology: NetworkTopology = DEFAULT_NETWORK_TOPOLOGY
): Record<AccountId, number> {
  const quota = {} as Record<AccountId, number>;
  for (const accountId of getAccountIds(topology)) {
    const node = topology.accounts[accountId];
    quota[accountId] = Math.floor(node.dailyCap * node.interAccountShareLimit);
  }
  return quota;
}

export function selectInterAccountPath(
  seed: number,
  topology: NetworkTopology = DEFAULT_NETWORK_TOPOLOGY
): TopologyPathSelection {
  const rng = createSeededRng(seed);
  const pattern = weightedPick(topology.patterns, rng);
  const rawFrom = randomPick(pattern.from, rng);
  const rawTo = randomPick(pattern.to, rng);
  let from = rawFrom;
  let to = rawTo;

  if (pattern.bidirectional && rng() < 0.5) {
    from = rawTo as AccountId;
    to = rawFrom as AccountId;
  }

  if (pattern.id === "spoke_to_spoke" && from === to) {
    const alternatives = pattern.to.filter((candidate) => candidate !== from);
    if (alternatives.length > 0) {
      to = randomPick(alternatives, rng);
    }
  }

  const minDelayMinutes = Math.max(
    topology.constraints.minInterAccountDelayMinutes,
    pattern.minDelayMinutes
  );
  const maxDelayMinutes = Math.min(
    topology.constraints.maxInterAccountDelayMinutes,
    pattern.maxDelayMinutes
  );

  return {
    patternId: pattern.id,
    from,
    to,
    delayMinutes: randomDelay(minDelayMinutes, maxDelayMinutes, rng)
  };
}

export function buildNetworkDescriptor(
  topology: NetworkTopology = DEFAULT_NETWORK_TOPOLOGY
): NetworkDescriptor {
  validatePenaltyIsolation(topology);
  const accountIds = getAccountIds(topology);
  const interAccountShareCapByAccount = accountIds.reduce<Record<AccountId, number>>((acc, accountId) => {
    const node = topology.accounts[accountId];
    acc[accountId] = node.interAccountShareLimit;
    return acc;
  }, {} as Record<AccountId, number>);

  const chainPaths: NetworkPathDescriptor[] = [];
  for (const pattern of topology.patterns) {
    for (const from of pattern.from) {
      for (const to of pattern.to) {
        if (pattern.id === "spoke_to_spoke" && from === to) {
          continue;
        }
        chainPaths.push({
          patternId: pattern.id,
          from,
          to,
          weight: pattern.weight,
          minDelayMinutes: Math.max(pattern.minDelayMinutes, topology.constraints.minInterAccountDelayMinutes),
          maxDelayMinutes: Math.min(pattern.maxDelayMinutes, topology.constraints.maxInterAccountDelayMinutes)
        });
      }
    }
  }

  const totalBaseDailyCap = accountIds.reduce(
    (sum, accountId) => sum + topology.accounts[accountId].dailyCap,
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    hub: topology.hubId,
    roles: accountIds.map((accountId) => {
      const node = topology.accounts[accountId];
      return {
        accountId,
        role: node.role,
        cluster: node.cluster,
        languages: node.languages,
        dailyCap: node.dailyCap,
        interAccountShareLimit: node.interAccountShareLimit,
        chainFlowShare: node.chainFlowShare,
        isolationTag: node.isolationTag
      };
    }),
    volumes: {
      totalBaseDailyCap,
      interAccountShareCapByAccount
    },
    chainPaths,
    constraints: topology.constraints
  };
}
