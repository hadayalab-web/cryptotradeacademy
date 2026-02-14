declare const require: (moduleId: string) => any;
declare const process: { cwd: () => string };

const fs = require("fs").promises as {
  access: (path: string) => Promise<void>;
  readFile: (path: string, encoding: string) => Promise<string>;
};
const path = require("path") as {
  resolve: (...paths: string[]) => string;
};
import { createSeededRng } from "./allocation";
import { DEFAULT_LANGUAGES, LanguageCode } from "./metrics";

export interface TemplateRange {
  min: number;
  max: number;
}

export interface LanguageTemplate {
  language: LanguageCode;
  hooks: string[];
  values: string[];
  ctas: string[];
  mediaHints: string[];
  emojis: string[];
  quoteHooks: string[];
  pollQuestions: string[];
  pollOptionSets: string[][];
  spamKeywords: string[];
}

export interface ContentMedia {
  type: "video" | "image";
  hint: string;
}

export interface ContentPoll {
  question: string;
  options: string[];
}

export interface ContentItem {
  id: string;
  lang: LanguageCode;
  type: "orig" | "quote";
  text: string;
  media: ContentMedia | null;
  poll: ContentPoll | null;
  emojis: string[];
  chainId?: string;
  layer?: number;
  parentPostId?: string;
  targetLang?: LanguageCode;
}

export interface LlmGenerationRequest {
  lang: LanguageCode;
  type: "orig" | "quote";
  structure: {
    hook: string;
    value: string;
    cta: string;
    mediaHint: string;
  };
  sourceText?: string;
  lengthRange: TemplateRange;
  similarityUpperBound?: number;
}

export interface LlmGenerationResponse {
  text: string;
  meta?: Record<string, unknown>;
}

export type ExternalLlmGenerator = (
  request: LlmGenerationRequest
) => Promise<LlmGenerationResponse>;

export interface ContentConfig {
  languages: LanguageCode[];
  templatesDir: string;
  lengthRanges: Record<LanguageCode, TemplateRange>;
  mediaInclusionRate: number;
  videoPreferenceRate: number;
  emojiMin: number;
  emojiMax: number;
  pollRateMin: number;
  pollRateMax: number;
  similarityThreshold: number;
  rewriteMaxAttempts: number;
}

export interface GenerateContentPoolInput {
  allocation: Record<LanguageCode, number>;
  seed: number;
  llmGenerate?: ExternalLlmGenerator;
  templates?: Partial<Record<LanguageCode, LanguageTemplate>>;
}

export interface GenerateContentPoolResult {
  items: ContentItem[];
  templates: Record<LanguageCode, LanguageTemplate>;
}

export interface RewriteQuoteInput {
  sourceText: string;
  lang: LanguageCode;
  targetLang: LanguageCode;
  seed: number;
  llmGenerate?: ExternalLlmGenerator;
  template: LanguageTemplate;
  similarityThreshold?: number;
}

export const DEFAULT_CONTENT_CONFIG: ContentConfig = {
  languages: DEFAULT_LANGUAGES,
  templatesDir: path.resolve(process.cwd(), "bwe", "data", "templates"),
  lengthRanges: {
    en: { min: 110, max: 160 },
    pt: { min: 110, max: 160 },
    es: { min: 110, max: 160 },
    ja: { min: 80, max: 110 },
    ar: { min: 110, max: 160 },
    ko: { min: 110, max: 160 }
  },
  mediaInclusionRate: 0.8,
  videoPreferenceRate: 0.7,
  emojiMin: 2,
  emojiMax: 4,
  pollRateMin: 0.2,
  pollRateMax: 0.3,
  similarityThreshold: 0.7,
  rewriteMaxAttempts: 4
};

function textLength(input: string): number {
  return [...input].length;
}

function pickOne<T>(arr: T[], rng: () => number, fallback: T): T {
  if (!arr || arr.length === 0) {
    return fallback;
  }
  return arr[Math.floor(rng() * arr.length)];
}

function pickManyUnique<T>(arr: T[], count: number, rng: () => number): T[] {
  const pool = [...arr];
  const selected: T[] = [];
  while (pool.length > 0 && selected.length < count) {
    const index = Math.floor(rng() * pool.length);
    selected.push(pool[index]);
    pool.splice(index, 1);
  }
  return selected;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function enforceLength(text: string, range: TemplateRange, fallbackSuffix: string): string {
  let normalized = text.trim().replace(/\s+/g, " ");
  while (textLength(normalized) < range.min) {
    normalized = `${normalized} ${fallbackSuffix}`.trim();
  }
  if (textLength(normalized) > range.max) {
    normalized = [...normalized].slice(0, range.max).join("").trim();
  }
  return normalized;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function cosineSimilarity(left: string, right: string): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  const vocab = new Set<string>([...leftTokens, ...rightTokens]);
  const leftFreq: Record<string, number> = {};
  const rightFreq: Record<string, number> = {};

  for (const token of leftTokens) {
    leftFreq[token] = (leftFreq[token] ?? 0) + 1;
  }
  for (const token of rightTokens) {
    rightFreq[token] = (rightFreq[token] ?? 0) + 1;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const token of vocab) {
    const l = leftFreq[token] ?? 0;
    const r = rightFreq[token] ?? 0;
    dot += l * r;
    leftNorm += l * l;
    rightNorm += r * r;
  }
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function extractTopTokens(sourceText: string, maxTokens: number): string[] {
  const freq: Record<string, number> = {};
  for (const token of tokenize(sourceText)) {
    if (token.length < 3) {
      continue;
    }
    freq[token] = (freq[token] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTokens)
    .map(([token]) => token);
}

function buildFallbackOriginalText(
  template: LanguageTemplate,
  emojis: string[],
  media: ContentMedia | null,
  range: TemplateRange,
  rng: () => number
): string {
  const hook = pickOne(template.hooks, rng, "Signal shift detected");
  const value = pickOne(template.values, rng, "Risk filter confirms high-odds structure");
  const cta = pickOne(template.ctas, rng, "Check execution map before entry");
  const mediaTag = media ? `[${media.type}:${media.hint}]` : "";
  const base = `${hook} ${value} ${cta} ${mediaTag} ${emojis.join("")}`.trim();
  return enforceLength(base, range, emojis[0] ?? "!");
}

function buildFallbackQuoteText(
  template: LanguageTemplate,
  sourceText: string,
  emojis: string[],
  media: ContentMedia | null,
  range: TemplateRange,
  rng: () => number
): string {
  const quoteHook = pickOne(template.quoteHooks, rng, "Key angle from this thread:");
  const value = pickOne(template.values, rng, "Context shifts once liquidity rotates");
  const cta = pickOne(template.ctas, rng, "Compare this with your risk protocol");
  const keyTerms = extractTopTokens(sourceText, 3).join(" / ");
  const mediaTag = media ? `[${media.type}:${media.hint}]` : "";
  const base = `${quoteHook} ${keyTerms} ${value} ${cta} ${mediaTag} ${emojis.join("")}`.trim();
  return enforceLength(base, range, emojis[0] ?? "!");
}

function resolvePollRate(config: ContentConfig): number {
  return (config.pollRateMin + config.pollRateMax) / 2;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadTemplates(
  config: ContentConfig = DEFAULT_CONTENT_CONFIG
): Promise<Record<LanguageCode, LanguageTemplate>> {
  const templates: Partial<Record<LanguageCode, LanguageTemplate>> = {};
  for (const lang of config.languages) {
    const filePath = path.resolve(config.templatesDir, `${lang}.json`);
    if (!(await fileExists(filePath))) {
      throw new Error(`Template file not found: ${filePath}`);
    }
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as LanguageTemplate;
    templates[lang] = parsed;
  }
  return templates as Record<LanguageCode, LanguageTemplate>;
}

export async function generateContentPool(
  input: GenerateContentPoolInput,
  config: ContentConfig = DEFAULT_CONTENT_CONFIG
): Promise<GenerateContentPoolResult> {
  const templates = (input.templates as Record<LanguageCode, LanguageTemplate>) || (await loadTemplates(config));
  const rng = createSeededRng(input.seed);
  const totalPosts = config.languages.reduce((sum, lang) => sum + (input.allocation[lang] ?? 0), 0);
  const mediaCountTarget = Math.round(totalPosts * config.mediaInclusionRate);
  const pollCountTarget = Math.round(totalPosts * resolvePollRate(config));
  const allSlots: Array<{ lang: LanguageCode; ordinal: number }> = [];

  for (const lang of config.languages) {
    const count = input.allocation[lang] ?? 0;
    for (let ordinal = 1; ordinal <= count; ordinal += 1) {
      allSlots.push({ lang, ordinal });
    }
  }

  const shuffledIndices = shuffle(
    allSlots.map((_, i) => i),
    rng
  );
  const mediaIndexSet = new Set(shuffledIndices.slice(0, mediaCountTarget));
  const pollIndexSet = new Set(shuffledIndices.slice(mediaCountTarget, mediaCountTarget + pollCountTarget));

  const mediaIndices = Array.from(mediaIndexSet);
  const videoCountTarget = Math.round(mediaIndices.length * config.videoPreferenceRate);
  const videoIndices = new Set(shuffle(mediaIndices, rng).slice(0, videoCountTarget));

  const items: ContentItem[] = [];
  for (let index = 0; index < allSlots.length; index += 1) {
    const { lang, ordinal } = allSlots[index];
    const template = templates[lang];
    const emojiCount =
      config.emojiMin + Math.floor(rng() * (config.emojiMax - config.emojiMin + 1));
    const emojis = pickManyUnique(template.emojis, emojiCount, rng);

    const media: ContentMedia | null =
      mediaIndexSet.has(index)
        ? {
            type: (videoIndices.has(index) ? "video" : "image") as "video" | "image",
            hint: pickOne(template.mediaHints, rng, "chart")
          }
        : null;

    const poll =
      pollIndexSet.has(index)
        ? {
            question: pickOne(template.pollQuestions, rng, "What is your risk setup today?"),
            options: pickOne(template.pollOptionSets, rng, ["Conservative", "Balanced", "Aggressive", "Wait"])
          }
        : null;

    const range = config.lengthRanges[lang];
    const structure = {
      hook: pickOne(template.hooks, rng, "Market shift alert"),
      value: pickOne(template.values, rng, "Momentum and liquidity are diverging"),
      cta: pickOne(template.ctas, rng, "Protect downside before entry"),
      mediaHint: media?.hint ?? "none"
    };

    let text = buildFallbackOriginalText(template, emojis, media, range, rng);
    if (input.llmGenerate) {
      try {
        const generated = await input.llmGenerate({
          lang,
          type: "orig",
          structure,
          lengthRange: range
        });
        if (generated?.text) {
          text = enforceLength(generated.text, range, emojis[0] ?? "!");
        }
      } catch {
        // Fallback text is already prepared.
      }
    }

    items.push({
      id: `orig-${lang}-${String(ordinal).padStart(3, "0")}`,
      lang,
      type: "orig",
      text,
      media,
      poll,
      emojis
    });
  }

  return { items, templates };
}

function reduceSimilarityWithMutations(text: string, template: LanguageTemplate, rng: () => number): string {
  const mutations = [
    (input: string) => `${pickOne(template.quoteHooks, rng, "Angle shift:")} ${input}`,
    (input: string) => input.replace(/\s+/g, " ").split(" ").reverse().join(" "),
    (input: string) =>
      `${pickOne(template.hooks, rng, "Context alert")} ${pickOne(template.values, rng, "Liquidity map changed")} ${input}`
  ];
  return pickOne(mutations, rng, mutations[0])(text);
}

export async function rewriteForQuote(
  input: RewriteQuoteInput,
  config: ContentConfig = DEFAULT_CONTENT_CONFIG
): Promise<string> {
  const rng = createSeededRng(input.seed);
  const template = input.template;
  const range = config.lengthRanges[input.targetLang];
  const similarityThreshold = input.similarityThreshold ?? config.similarityThreshold;

  let candidate = buildFallbackQuoteText(
    template,
    input.sourceText,
    pickManyUnique(template.emojis, Math.max(config.emojiMin, 2), rng),
    null,
    range,
    rng
  );

  if (input.llmGenerate) {
    try {
      const generated = await input.llmGenerate({
        lang: input.targetLang,
        type: "quote",
        sourceText: input.sourceText,
        structure: {
          hook: pickOne(template.quoteHooks, rng, "Angle shift"),
          value: pickOne(template.values, rng, "Signal context changed"),
          cta: pickOne(template.ctas, rng, "Update your risk plan"),
          mediaHint: "none"
        },
        lengthRange: range,
        similarityUpperBound: similarityThreshold
      });
      if (generated?.text) {
        candidate = enforceLength(generated.text, range, "!");
      }
    } catch {
      // Fallback candidate is already available.
    }
  }

  for (let attempt = 0; attempt < config.rewriteMaxAttempts; attempt += 1) {
    const similarity = cosineSimilarity(candidate, input.sourceText);
    if (similarity < similarityThreshold) {
      return candidate;
    }
    candidate = enforceLength(reduceSimilarityWithMutations(candidate, template, rng), range, "!");
  }

  // Guaranteed low-similarity fallback by minimizing overlap with source tokens.
  const isolated = `${pickOne(template.quoteHooks, rng, "Signal reframed")} ${pickOne(
    template.values,
    rng,
    "Focus on structure, not noise"
  )} ${pickOne(template.ctas, rng, "Apply your checklist before acting")}`.trim();
  return enforceLength(isolated, range, "!");
}

export function computeTextSimilarity(left: string, right: string): number {
  return cosineSimilarity(left, right);
}
