import { createSeededRng, LanguageThermalState } from "./allocation";
import {
  ContentItem,
  ExternalLlmGenerator,
  LanguageTemplate,
  RewriteQuoteInput,
  rewriteForQuote,
  computeTextSimilarity
} from "./content";
import { pickPropagationTarget } from "./crosslang";
import { DEFAULT_LANGUAGES, LanguageCode } from "./metrics";
import { AccountId, NetworkTopology, selectInterAccountPath } from "../scale/topology";

export interface ChainDepthDistribution {
  oneLayer: number;
  twoLayer: number;
  threeLayer: number;
}

export interface DelayRangeMinutes {
  min: number;
  max: number;
}

export interface ChainConfig {
  languages: LanguageCode[];
  depthDistribution: ChainDepthDistribution;
  selfQuoteRate: number;
  crossQuoteRate: number;
  quoteShareTarget: number;
  quoteShareCap: number;
  maxLayers: number;
  minQuoteDelayMinutes: number;
  twoLayerDelayRangeMinutes: DelayRangeMinutes;
  threeLayerTotalDelayRangeMinutes: DelayRangeMinutes;
  threeLayerHopDelayRangeMinutes: DelayRangeMinutes;
  similarityThreshold: number;
}

export interface ChainPost extends ContentItem {
  chainId: string;
  layer: number;
  delayMinutesFromParent: number;
  delayMinutesFromRoot: number;
  accountId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  interAccount?: boolean;
}

export interface ChainPlan {
  chainId: string;
  depth: number;
  posts: ChainPost[];
  totalDelayMinutes: number;
}

export interface BuildChainsInput {
  allocation: Record<LanguageCode, number>;
  contentPool: ContentItem[];
  templates: Record<LanguageCode, LanguageTemplate>;
  seed: number;
  llmGenerate?: ExternalLlmGenerator;
  thermalState?: Record<LanguageCode, LanguageThermalState>;
  accountId?: string;
}

export interface BuildChainsResult {
  chains: ChainPlan[];
  posts: ChainPost[];
  quoteCount: number;
  quoteRatio: number;
  selfQuoteShare: number;
  crossQuoteShare: number;
  depthCounts: Record<1 | 2 | 3, number>;
}

export const DEFAULT_CHAIN_CONFIG: ChainConfig = {
  languages: DEFAULT_LANGUAGES,
  depthDistribution: {
    oneLayer: 0.1,
    twoLayer: 0.6,
    threeLayer: 0.3
  },
  selfQuoteRate: 0.7,
  crossQuoteRate: 0.3,
  quoteShareTarget: 0.35,
  quoteShareCap: 0.4,
  maxLayers: 3,
  minQuoteDelayMinutes: 240,
  twoLayerDelayRangeMinutes: { min: 240, max: 360 },
  threeLayerTotalDelayRangeMinutes: { min: 480, max: 720 },
  threeLayerHopDelayRangeMinutes: { min: 240, max: 360 },
  similarityThreshold: 0.7
};

export interface InterAccountChainConfig {
  minDelayMinutes: number;
  maxDelayMinutes: number;
  maxInterAccountSharePerAccount: number;
}

export interface BuildInterAccountChainsInput {
  postsByAccount: Record<string, ChainPost[]>;
  topology: NetworkTopology;
  templates: Record<LanguageCode, LanguageTemplate>;
  seed: number;
  interAccountChainTargetCount: number;
  llmGenerate?: ExternalLlmGenerator;
}

export interface BuildInterAccountChainsResult {
  generatedQuotes: ChainPost[];
  perAccountInterCount: Record<string, number>;
}

export const DEFAULT_INTER_ACCOUNT_CHAIN_CONFIG: InterAccountChainConfig = {
  minDelayMinutes: 240,
  maxDelayMinutes: 480,
  maxInterAccountSharePerAccount: 0.15
};

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickLanguageByQuota(
  remaining: Record<LanguageCode, number>,
  rng: () => number,
  allowed?: LanguageCode[]
): LanguageCode | null {
  const candidates = (allowed ?? Object.keys(remaining)).filter(
    (lang) => (remaining[lang as LanguageCode] ?? 0) > 0
  ) as LanguageCode[];
  if (candidates.length === 0) {
    return null;
  }
  const total = candidates.reduce((sum, lang) => sum + remaining[lang], 0);
  let threshold = rng() * total;
  for (const lang of candidates) {
    threshold -= remaining[lang];
    if (threshold <= 0) {
      return lang;
    }
  }
  return candidates[candidates.length - 1];
}

function resolveDepthCounts(chainCount: number, config: ChainConfig): Record<1 | 2 | 3, number> {
  const d2 = Math.round(chainCount * config.depthDistribution.twoLayer);
  const d3 = Math.round(chainCount * config.depthDistribution.threeLayer);
  const d1 = Math.max(0, chainCount - d2 - d3);
  return { 1: d1, 2: d2, 3: d3 };
}

function expectedQuotesFromDepth(depthCounts: Record<1 | 2 | 3, number>): number {
  return depthCounts[2] + depthCounts[3] * 2;
}

function adjustDepthCountsToQuoteTarget(
  depthCounts: Record<1 | 2 | 3, number>,
  quoteTarget: number
): Record<1 | 2 | 3, number> {
  const adjusted = { ...depthCounts };
  while (expectedQuotesFromDepth(adjusted) > quoteTarget && adjusted[3] > 0) {
    adjusted[3] -= 1;
    adjusted[2] += 1;
  }
  while (expectedQuotesFromDepth(adjusted) > quoteTarget && adjusted[2] > 0) {
    adjusted[2] -= 1;
    adjusted[1] += 1;
  }
  while (expectedQuotesFromDepth(adjusted) < quoteTarget && adjusted[1] > 0) {
    adjusted[1] -= 1;
    adjusted[2] += 1;
  }
  return adjusted;
}

function buildDepthQueue(
  depthCounts: Record<1 | 2 | 3, number>,
  rng: () => number
): Array<1 | 2 | 3> {
  const queue: Array<1 | 2 | 3> = [];
  for (let i = 0; i < depthCounts[1]; i += 1) queue.push(1);
  for (let i = 0; i < depthCounts[2]; i += 1) queue.push(2);
  for (let i = 0; i < depthCounts[3]; i += 1) queue.push(3);
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

function getBaseFromPool(
  poolByLanguage: Record<LanguageCode, ContentItem[]>,
  lang: LanguageCode
): ContentItem | null {
  const bucket = poolByLanguage[lang] ?? [];
  if (bucket.length === 0) {
    return null;
  }
  return bucket.shift() ?? null;
}

function buildEmptyPoolByLanguage(languages: LanguageCode[]): Record<LanguageCode, ContentItem[]> {
  return languages.reduce<Record<LanguageCode, ContentItem[]>>((acc, lang) => {
    acc[lang] = [];
    return acc;
  }, {} as Record<LanguageCode, ContentItem[]>);
}

export async function buildQuoteChains(
  input: BuildChainsInput,
  config: ChainConfig = DEFAULT_CHAIN_CONFIG
): Promise<BuildChainsResult> {
  const rng = createSeededRng(input.seed);
  const totalPosts = config.languages.reduce((sum, lang) => sum + (input.allocation[lang] ?? 0), 0);
  const quoteCap = Math.floor(totalPosts * config.quoteShareCap);
  const quoteTarget = Math.min(Math.round(totalPosts * config.quoteShareTarget), quoteCap);
  const expectedQuotesPerChain =
    config.depthDistribution.twoLayer + config.depthDistribution.threeLayer * 2;
  const chainCount = Math.max(1, Math.floor(quoteTarget / Math.max(expectedQuotesPerChain, 1)));
  const initialDepthCounts = resolveDepthCounts(chainCount, config);
  const depthCounts = adjustDepthCountsToQuoteTarget(initialDepthCounts, quoteTarget);
  const depthQueue = buildDepthQueue(depthCounts, rng);

  const poolByLanguage = buildEmptyPoolByLanguage(config.languages);
  for (const item of input.contentPool) {
    poolByLanguage[item.lang].push(item);
  }

  const remaining = { ...input.allocation };
  const chains: ChainPlan[] = [];
  const posts: ChainPost[] = [];
  let quoteCount = 0;
  let selfQuotes = 0;
  let crossQuotes = 0;

  for (let chainIndex = 0; chainIndex < depthQueue.length; chainIndex += 1) {
    const requestedDepth = depthQueue[chainIndex];
    const rootLang = pickLanguageByQuota(remaining, rng);
    if (!rootLang) {
      break;
    }

    const thermalCap = input.thermalState?.[rootLang]?.chainDepthCap ?? config.maxLayers;
    const depth = clamp(1, Math.min(requestedDepth, thermalCap, config.maxLayers), config.maxLayers) as 1 | 2 | 3;
    const chainId = `chain-${String(chainIndex + 1).padStart(3, "0")}`;
    const rootBase = getBaseFromPool(poolByLanguage, rootLang);
    remaining[rootLang] = Math.max(0, remaining[rootLang] - 1);

    const rootPost: ChainPost = {
      id: rootBase?.id ?? `${chainId}-l1-${rootLang}`,
      lang: rootLang,
      type: "orig",
      text: rootBase?.text ?? `Signal frame update for ${rootLang}.`,
      media: rootBase?.media ?? null,
      poll: rootBase?.poll ?? null,
      emojis: rootBase?.emojis ?? [],
      chainId,
      layer: 1,
      delayMinutesFromParent: 0,
      delayMinutesFromRoot: 0,
      accountId: input.accountId
    };

    const chainPosts: ChainPost[] = [rootPost];
    posts.push(rootPost);

    const threeLayerTotalDelay =
      depth === 3
        ? randomInt(
            config.threeLayerTotalDelayRangeMinutes.min,
            config.threeLayerTotalDelayRangeMinutes.max,
            rng
          )
        : 0;

    let cumulativeDelay = 0;
    let parentLang = rootLang;
    let parentText = rootPost.text;
    let firstHopDelay = 0;

    for (let layer = 2; layer <= depth; layer += 1) {
      const targetSelfQuotes = Math.round(quoteTarget * config.selfQuoteRate);
      const targetCrossQuotes = Math.round(quoteTarget * config.crossQuoteRate);
      const selfDeficit = targetSelfQuotes - selfQuotes;
      const crossDeficit = targetCrossQuotes - crossQuotes;
      const shouldSelf =
        selfDeficit > crossDeficit
          ? true
          : crossDeficit > selfDeficit
            ? false
            : rng() < config.selfQuoteRate;
      let nextLang: LanguageCode | null = null;

      if (shouldSelf && (remaining[parentLang] ?? 0) > 0) {
        nextLang = parentLang;
      } else {
        const crossCandidates = config.languages.filter(
          (lang) => lang !== parentLang && (remaining[lang] ?? 0) > 0
        );
        if (crossCandidates.length > 0) {
          nextLang = pickPropagationTarget({
            sourceLang: parentLang,
            candidateTargets: crossCandidates,
            seed: input.seed + chainIndex * 17 + layer
          });
        } else if ((remaining[parentLang] ?? 0) > 0) {
          nextLang = parentLang;
        }
      }

      if (!nextLang) {
        nextLang = pickLanguageByQuota(remaining, rng);
      }
      if (!nextLang) {
        break;
      }

      let delayMinutes = config.minQuoteDelayMinutes;
      if (depth === 2) {
        delayMinutes = randomInt(
          config.twoLayerDelayRangeMinutes.min,
          config.twoLayerDelayRangeMinutes.max,
          rng
        );
      } else if (depth === 3) {
        if (layer === 2) {
          firstHopDelay = randomInt(
            config.threeLayerHopDelayRangeMinutes.min,
            config.threeLayerHopDelayRangeMinutes.max,
            rng
          );
          delayMinutes = firstHopDelay;
        } else {
          const secondHopRaw = threeLayerTotalDelay - firstHopDelay;
          delayMinutes = clamp(
            config.threeLayerHopDelayRangeMinutes.min,
            secondHopRaw,
            config.threeLayerHopDelayRangeMinutes.max
          );
        }
      }

      cumulativeDelay += delayMinutes;
      const base = getBaseFromPool(poolByLanguage, nextLang);
      const rewriteInput: RewriteQuoteInput = {
        sourceText: parentText,
        lang: parentLang,
        targetLang: nextLang,
        seed: input.seed + chainIndex * 37 + layer * 13,
        llmGenerate: input.llmGenerate,
        template: input.templates[nextLang],
        similarityThreshold: config.similarityThreshold
      };
      let rewrittenText = await rewriteForQuote(rewriteInput);
      if (computeTextSimilarity(rewrittenText, parentText) >= config.similarityThreshold) {
        rewrittenText = await rewriteForQuote({
          ...rewriteInput,
          seed: rewriteInput.seed + 1
        });
      }

      const quotePost: ChainPost = {
        id: base?.id ?? `${chainId}-l${layer}-${nextLang}`,
        lang: nextLang,
        type: "quote",
        text: rewrittenText,
        media: base?.media ?? null,
        poll: base?.poll ?? null,
        emojis: base?.emojis ?? [],
        chainId,
        layer,
        parentPostId: chainPosts[layer - 2].id,
        targetLang: nextLang,
        delayMinutesFromParent: delayMinutes,
        delayMinutesFromRoot: cumulativeDelay,
        accountId: input.accountId
      };

      remaining[nextLang] = Math.max(0, (remaining[nextLang] ?? 0) - 1);
      quoteCount += 1;
      if (nextLang === parentLang) {
        selfQuotes += 1;
      } else {
        crossQuotes += 1;
      }

      chainPosts.push(quotePost);
      posts.push(quotePost);
      parentLang = nextLang;
      parentText = rewrittenText;
    }

    const totalDelayMinutes = chainPosts.length > 0 ? chainPosts[chainPosts.length - 1].delayMinutesFromRoot : 0;
    chains.push({
      chainId,
      depth: chainPosts.length as 1 | 2 | 3,
      posts: chainPosts,
      totalDelayMinutes
    });
  }

  for (const lang of config.languages) {
    while ((remaining[lang] ?? 0) > 0) {
      const base = getBaseFromPool(poolByLanguage, lang);
      const standalone: ChainPost = {
        id: base?.id ?? `single-${lang}-${remaining[lang]}`,
        lang,
        type: "orig",
        text: base?.text ?? `Standalone signal for ${lang}.`,
        media: base?.media ?? null,
        poll: base?.poll ?? null,
        emojis: base?.emojis ?? [],
        chainId: `single-${lang}`,
        layer: 1,
        delayMinutesFromParent: 0,
        delayMinutesFromRoot: 0,
        accountId: input.accountId
      };
      posts.push(standalone);
      remaining[lang] -= 1;
    }
  }

  const finalQuoteRatio = totalPosts > 0 ? quoteCount / totalPosts : 0;
  const quoteTotal = selfQuotes + crossQuotes;

  return {
    chains,
    posts,
    quoteCount,
    quoteRatio: finalQuoteRatio,
    selfQuoteShare: quoteTotal > 0 ? selfQuotes / quoteTotal : 0,
    crossQuoteShare: quoteTotal > 0 ? crossQuotes / quoteTotal : 0,
    depthCounts
  };
}

function pickTargetLanguageForAccount(
  accountId: string,
  sourceLang: LanguageCode,
  topology: NetworkTopology
): LanguageCode {
  const node = topology.accounts[accountId as AccountId];
  if (!node || node.languages.length === 0) {
    return sourceLang;
  }
  if (node.languages.includes(sourceLang)) {
    return sourceLang;
  }
  return node.languages[0];
}

function pickRootPost(posts: ChainPost[], rng: () => number): ChainPost | null {
  if (!posts.length) {
    return null;
  }
  const sorted = posts
    .filter((post) => post.type === "orig" || post.layer === 1)
    .sort((a, b) => {
      const aScore = a.type === "orig" ? 1 : 0;
      const bScore = b.type === "orig" ? 1 : 0;
      return bScore - aScore;
    });
  if (sorted.length === 0) {
    return posts[Math.floor(rng() * posts.length)];
  }
  return sorted[Math.floor(rng() * sorted.length)];
}

export async function buildInterAccountQuoteChains(
  input: BuildInterAccountChainsInput,
  config: InterAccountChainConfig = DEFAULT_INTER_ACCOUNT_CHAIN_CONFIG
): Promise<BuildInterAccountChainsResult> {
  const rng = createSeededRng(input.seed);
  const accountIds = Object.keys(input.postsByAccount);
  const totalsByAccount = accountIds.reduce<Record<string, number>>((acc, accountId) => {
    acc[accountId] = input.postsByAccount[accountId]?.length ?? 0;
    return acc;
  }, {});
  const perAccountInterCap = accountIds.reduce<Record<string, number>>((acc, accountId) => {
    acc[accountId] = Math.floor(totalsByAccount[accountId] * config.maxInterAccountSharePerAccount);
    return acc;
  }, {});
  const perAccountInterCount = accountIds.reduce<Record<string, number>>((acc, accountId) => {
    acc[accountId] = 0;
    return acc;
  }, {});

  const generatedQuotes: ChainPost[] = [];
  const hardLimit = input.interAccountChainTargetCount * 8;
  let attempts = 0;

  while (generatedQuotes.length < input.interAccountChainTargetCount && attempts < hardLimit) {
    attempts += 1;
    const path = selectInterAccountPath(input.seed + attempts * 17, input.topology);
    const sourceAccount = path.from;
    const targetAccount = path.to;

    if (sourceAccount === targetAccount) {
      continue;
    }
    if ((perAccountInterCount[sourceAccount] ?? 0) >= (perAccountInterCap[sourceAccount] ?? 0)) {
      continue;
    }
    if ((perAccountInterCount[targetAccount] ?? 0) >= (perAccountInterCap[targetAccount] ?? 0)) {
      continue;
    }

    const sourceRoot = pickRootPost(input.postsByAccount[sourceAccount] ?? [], rng);
    if (!sourceRoot) {
      continue;
    }

    const targetLang = pickTargetLanguageForAccount(targetAccount, sourceRoot.lang, input.topology);
    const template = input.templates[targetLang];
    const rewrittenText = await rewriteForQuote({
      sourceText: sourceRoot.text,
      lang: sourceRoot.lang,
      targetLang,
      seed: input.seed + attempts * 29,
      llmGenerate: input.llmGenerate,
      template,
      similarityThreshold: 0.7
    });

    const boundedDelay = Math.max(
      config.minDelayMinutes,
      Math.min(config.maxDelayMinutes, path.delayMinutes)
    );

    const quotePost: ChainPost = {
      id: `iac-${sourceAccount}-${targetAccount}-${String(generatedQuotes.length + 1).padStart(4, "0")}`,
      lang: targetLang,
      type: "quote",
      text: rewrittenText,
      media: null,
      poll: null,
      emojis: template.emojis.slice(0, 2),
      chainId: `iac-chain-${String(generatedQuotes.length + 1).padStart(3, "0")}`,
      layer: 2,
      parentPostId: sourceRoot.id,
      targetLang,
      delayMinutesFromParent: boundedDelay,
      delayMinutesFromRoot: boundedDelay,
      accountId: targetAccount,
      sourceAccountId: sourceAccount,
      targetAccountId: targetAccount,
      interAccount: true
    };

    generatedQuotes.push(quotePost);
    perAccountInterCount[sourceAccount] += 1;
    perAccountInterCount[targetAccount] += 1;
  }

  return {
    generatedQuotes,
    perAccountInterCount
  };
}
