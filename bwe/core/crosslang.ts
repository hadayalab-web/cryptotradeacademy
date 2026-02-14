import { createSeededRng } from "./allocation";
import { DEFAULT_LANGUAGES, LanguageCode } from "./metrics";

export interface PropagationPath {
  path: LanguageCode[];
  weight: number;
}

export interface CrossLangConfig {
  languages: LanguageCode[];
  baseMultipliers: Record<LanguageCode, number>;
  pathWeights: PropagationPath[];
  baseEdgeWeight: number;
}

export interface PropagationContext {
  sourceLang: LanguageCode;
  candidateTargets: LanguageCode[];
  performanceBoosts?: Partial<Record<LanguageCode, number>>;
  seed: number;
}

export interface PropagationScore {
  targetLang: LanguageCode;
  score: number;
}

export const DEFAULT_CROSSLANG_CONFIG: CrossLangConfig = {
  languages: DEFAULT_LANGUAGES,
  baseMultipliers: {
    en: 4,
    pt: 3.8,
    es: 3.8,
    ja: 3.4,
    ar: 2.5,
    ko: 3.4
  },
  pathWeights: [
    { path: ["en", "pt", "es"], weight: 0.4 },
    { path: ["ja", "en", "ko"], weight: 0.25 },
    { path: ["pt", "es"], weight: 0.2 },
    { path: ["es", "pt"], weight: 0.2 },
    { path: ["ar", "en", "pt"], weight: 0.1 },
    { path: ["ko", "ja"], weight: 0.05 }
  ],
  baseEdgeWeight: 0.01
};

function normalizeWeights(scores: PropagationScore[]): PropagationScore[] {
  const total = scores.reduce((sum, row) => sum + row.score, 0);
  if (total <= 0) {
    const uniform = 1 / Math.max(scores.length, 1);
    return scores.map((row) => ({ ...row, score: uniform }));
  }
  return scores.map((row) => ({ ...row, score: row.score / total }));
}

function buildEdgeMatrix(
  config: CrossLangConfig
): Record<LanguageCode, Record<LanguageCode, number>> {
  const matrix = config.languages.reduce<Record<LanguageCode, Record<LanguageCode, number>>>(
    (acc, source) => {
      acc[source] = config.languages.reduce<Record<LanguageCode, number>>((row, target) => {
        row[target] = config.baseEdgeWeight;
        return row;
      }, {} as Record<LanguageCode, number>);
      return acc;
    },
    {} as Record<LanguageCode, Record<LanguageCode, number>>
  );

  for (const pathDef of config.pathWeights) {
    for (let i = 0; i < pathDef.path.length - 1; i += 1) {
      const from = pathDef.path[i];
      const to = pathDef.path[i + 1];
      matrix[from][to] += pathDef.weight;
    }
  }

  return matrix;
}

export function scorePropagationTargets(
  context: Omit<PropagationContext, "seed">,
  config: CrossLangConfig = DEFAULT_CROSSLANG_CONFIG
): PropagationScore[] {
  const edgeMatrix = buildEdgeMatrix(config);
  const boosts = context.performanceBoosts ?? {};
  const candidates = context.candidateTargets.filter((lang) => lang !== context.sourceLang);

  const scored = candidates.map((targetLang) => {
    const edgeWeight = edgeMatrix[context.sourceLang]?.[targetLang] ?? config.baseEdgeWeight;
    const baseMultiplier = config.baseMultipliers[targetLang] ?? 1;
    const performanceBoost = boosts[targetLang] ?? 1;
    return {
      targetLang,
      score: edgeWeight * baseMultiplier * performanceBoost
    };
  });

  return normalizeWeights(scored).sort((a, b) => b.score - a.score);
}

export function pickPropagationTarget(
  context: PropagationContext,
  config: CrossLangConfig = DEFAULT_CROSSLANG_CONFIG
): LanguageCode {
  const ranked = scorePropagationTargets(context, config);
  if (ranked.length === 0) {
    return context.sourceLang;
  }

  const rng = createSeededRng(context.seed);
  let threshold = rng();
  for (const row of ranked) {
    threshold -= row.score;
    if (threshold <= 0) {
      return row.targetLang;
    }
  }
  return ranked[ranked.length - 1].targetLang;
}
