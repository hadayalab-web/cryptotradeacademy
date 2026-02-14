export type LanguageCode = "en" | "pt" | "es" | "ja" | "ar" | "ko";

export const DEFAULT_LANGUAGES: LanguageCode[] = ["en", "pt", "es", "ja", "ar", "ko"];

export interface XMetricRecord {
  postId: string;
  lang: LanguageCode;
  quoteCount: number;
  repostCount: number;
  ctr: number;
  dwellSeconds: number;
  impressions?: number;
  engagements?: number;
  createdAt?: string;
}

export interface OutcomeMetricRecord extends XMetricRecord {
  outcomeScore: number;
  success: boolean;
}

export interface LanguageOutcomeSummary {
  lang: LanguageCode;
  count: number;
  successes: number;
  failures: number;
  medianOutcome: number;
  meanOutcome: number;
  successRate: number;
}

export interface MetricsIngestionResult {
  scoredRecords: OutcomeMetricRecord[];
  globalMedian: number;
  byLanguage: Record<LanguageCode, LanguageOutcomeSummary>;
}

export interface PosteriorDelta {
  successes: number;
  failures: number;
}

export interface MetricsConfig {
  languages: LanguageCode[];
  scoreWeights: {
    q: number;
    r: number;
    ctr: number;
    dwell: number;
  };
  ctrScale: number;
  dwellScaleSeconds: number;
}

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  languages: DEFAULT_LANGUAGES,
  scoreWeights: {
    q: 0.5,
    r: 0.3,
    ctr: 0.15,
    dwell: 0.05
  },
  ctrScale: 100,
  dwellScaleSeconds: 60
};

function toFinite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCtr(rawCtr: number): number {
  if (rawCtr <= 1) {
    return rawCtr * 100;
  }
  return rawCtr;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function scoreOutcome(metric: XMetricRecord, config: MetricsConfig = DEFAULT_METRICS_CONFIG): number {
  const q = toFinite(metric.quoteCount);
  const r = toFinite(metric.repostCount);
  const ctrNormalized = normalizeCtr(toFinite(metric.ctr)) / config.ctrScale;
  const dwellNormalized = toFinite(metric.dwellSeconds) / config.dwellScaleSeconds;
  const { scoreWeights } = config;
  return (
    scoreWeights.q * q +
    scoreWeights.r * r +
    scoreWeights.ctr * ctrNormalized +
    scoreWeights.dwell * dwellNormalized
  );
}

export function ingestMetrics(
  records: XMetricRecord[],
  config: MetricsConfig = DEFAULT_METRICS_CONFIG
): MetricsIngestionResult {
  const scoredWithoutLabel = records.map((record) => ({
    ...record,
    outcomeScore: scoreOutcome(record, config)
  }));
  const allScores = scoredWithoutLabel.map((record) => record.outcomeScore);
  const globalMedian = median(allScores);

  const scoredRecords: OutcomeMetricRecord[] = scoredWithoutLabel.map((record) => ({
    ...record,
    success: record.outcomeScore > globalMedian
  }));

  const byLanguage = config.languages.reduce<Record<LanguageCode, LanguageOutcomeSummary>>((acc, lang) => {
    const langRecords = scoredRecords.filter((record) => record.lang === lang);
    const langScores = langRecords.map((record) => record.outcomeScore);
    const successes = langRecords.filter((record) => record.success).length;
    const failures = Math.max(0, langRecords.length - successes);
    acc[lang] = {
      lang,
      count: langRecords.length,
      successes,
      failures,
      medianOutcome: median(langScores),
      meanOutcome: mean(langScores),
      successRate: langRecords.length > 0 ? successes / langRecords.length : 0
    };
    return acc;
  }, {} as Record<LanguageCode, LanguageOutcomeSummary>);

  return {
    scoredRecords,
    globalMedian,
    byLanguage
  };
}

export function buildPosteriorDeltas(
  summaryByLanguage: Record<LanguageCode, LanguageOutcomeSummary>,
  languages: LanguageCode[] = DEFAULT_LANGUAGES
): Record<LanguageCode, PosteriorDelta> {
  return languages.reduce<Record<LanguageCode, PosteriorDelta>>((acc, lang) => {
    const summary = summaryByLanguage[lang];
    acc[lang] = {
      successes: summary?.successes ?? 0,
      failures: summary?.failures ?? 0
    };
    return acc;
  }, {} as Record<LanguageCode, PosteriorDelta>);
}

export function mapTweetMetricsToRecord(params: {
  id: string;
  lang: LanguageCode;
  quoteCount: number;
  repostCount: number;
  impressions?: number;
  engagements?: number;
  ctr?: number;
  dwellSeconds?: number;
  createdAt?: string;
}): XMetricRecord {
  const impressions = toFinite(params.impressions);
  const engagements = toFinite(params.engagements);
  const ctrComputed = impressions > 0 ? (engagements / impressions) * 100 : 0;
  return {
    postId: params.id,
    lang: params.lang,
    quoteCount: toFinite(params.quoteCount),
    repostCount: toFinite(params.repostCount),
    ctr: toFinite(params.ctr, ctrComputed),
    dwellSeconds: toFinite(params.dwellSeconds, 0),
    impressions,
    engagements,
    createdAt: params.createdAt
  };
}
