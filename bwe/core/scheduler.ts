import { createSeededRng } from "./allocation";
import { ChainPost } from "./chains";
import { DEFAULT_LANGUAGES, LanguageCode } from "./metrics";

export type Region = "apac" | "eu" | "amer";

export interface TimeWindow {
  startHourUtc: number;
  endHourUtc: number;
}

export interface SchedulerConfig {
  languages: LanguageCode[];
  regionWindows: Record<Region, TimeWindow>;
  languageRegionMap: Record<LanguageCode, Region>;
  minGapMinutes: number;
  maxGapMinutes: number;
  jitterMinutes: number;
  maxPostsPerHour: number;
  maxPostsPerHourPerAccount: number;
  maxPostsPerHourGlobal: number;
  defaultAccountOffsetsMinutes: Record<string, number>;
  interAccountRelayDelayRangeMinutes: {
    min: number;
    max: number;
  };
}

export interface SchedulerInput {
  posts: ChainPost[];
  seed: number;
  dayStartUtc?: string;
  windowShiftHours?: number;
  accountOffsetsMinutes?: Record<string, number>;
}

export interface ScheduleEntry {
  id: string;
  time: string;
  accountId: string;
  lang: LanguageCode;
  type: "orig" | "quote";
  chainId: string;
  layer: number;
  targetLang?: LanguageCode;
  parentPostId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  interAccount?: boolean;
  text: string;
  media: ChainPost["media"];
  poll: ChainPost["poll"];
}

export interface SchedulerResult {
  entries: ScheduleEntry[];
}

export interface MultiAccountSchedulerResult extends SchedulerResult {
  perAccountSchedules: Record<string, ScheduleEntry[]>;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  languages: DEFAULT_LANGUAGES,
  regionWindows: {
    apac: { startHourUtc: 22, endHourUtc: 8 },
    eu: { startHourUtc: 6, endHourUtc: 12 },
    amer: { startHourUtc: 12, endHourUtc: 22 }
  },
  languageRegionMap: {
    en: "amer",
    pt: "eu",
    es: "eu",
    ja: "apac",
    ar: "eu",
    ko: "apac"
  },
  minGapMinutes: 45,
  maxGapMinutes: 90,
  jitterMinutes: 15,
  maxPostsPerHour: 1.5,
  maxPostsPerHourPerAccount: 1.5,
  maxPostsPerHourGlobal: 5,
  defaultAccountOffsetsMinutes: {
    acct1: 0,
    acct2: 8,
    acct3: 16,
    acct4: 24,
    acct5: 32
  },
  interAccountRelayDelayRangeMinutes: {
    min: 240,
    max: 480
  }
};

function toDayStart(dayStartUtc?: string): Date {
  const date = dayStartUtc ? new Date(dayStartUtc) : new Date();
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function diffMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (60 * 1000));
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomJitterMinutes(maxJitter: number, rng: () => number): number {
  return Math.round((rng() * 2 - 1) * maxJitter);
}

function windowDurationHours(window: TimeWindow): number {
  if (window.endHourUtc > window.startHourUtc) {
    return window.endHourUtc - window.startHourUtc;
  }
  return 24 - window.startHourUtc + window.endHourUtc;
}

function hourOffsetToDate(dayStart: Date, hourOffset: number): Date {
  return addMinutes(dayStart, Math.round(hourOffset * 60));
}

function minuteOfDay(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isInsideWindow(minuteUtc: number, window: TimeWindow): boolean {
  const start = window.startHourUtc * 60;
  const end = window.endHourUtc * 60;
  if (window.endHourUtc > window.startHourUtc) {
    return minuteUtc >= start && minuteUtc < end;
  }
  return minuteUtc >= start || minuteUtc < end;
}

function nextRegion(region: Region): Region {
  if (region === "apac") return "eu";
  if (region === "eu") return "amer";
  return "apac";
}

function alignToRegionWindow(
  targetDate: Date,
  region: Region,
  dayStart: Date,
  config: SchedulerConfig,
  windowShiftHours: number
): Date {
  const baseWindow = config.regionWindows[region];
  const shiftedWindow: TimeWindow = {
    startHourUtc: (baseWindow.startHourUtc + windowShiftHours + 24) % 24,
    endHourUtc: (baseWindow.endHourUtc + windowShiftHours + 24) % 24
  };

  const minute = minuteOfDay(targetDate);
  if (isInsideWindow(minute, shiftedWindow)) {
    return targetDate;
  }

  const startMinute = shiftedWindow.startHourUtc * 60;
  let aligned = addMinutes(dayStart, startMinute);
  if (aligned < targetDate) {
    aligned = addMinutes(aligned, 24 * 60);
  }
  return aligned;
}

function generateOriginTargetsByLanguage(
  origins: ChainPost[],
  dayStart: Date,
  rng: () => number,
  config: SchedulerConfig,
  windowShiftHours: number
): Record<string, Date> {
  const byLanguage = config.languages.reduce<Record<LanguageCode, ChainPost[]>>((acc, lang) => {
    acc[lang] = [];
    return acc;
  }, {} as Record<LanguageCode, ChainPost[]>);

  for (const origin of origins) {
    byLanguage[origin.lang].push(origin);
  }

  const targets: Record<string, Date> = {};
  for (const lang of config.languages) {
    const posts = byLanguage[lang];
    const count = posts.length;
    if (count === 0) {
      continue;
    }
    const region = config.languageRegionMap[lang];
    const baseWindow = config.regionWindows[region];
    const window: TimeWindow = {
      startHourUtc: (baseWindow.startHourUtc + windowShiftHours + 24) % 24,
      endHourUtc: (baseWindow.endHourUtc + windowShiftHours + 24) % 24
    };

    const duration = windowDurationHours(window);
    for (let i = 0; i < posts.length; i += 1) {
      const ratio = (i + 1) / (count + 1);
      let hourOffset = window.startHourUtc + ratio * duration;
      if (hourOffset >= 24) {
        hourOffset -= 24;
      }
      const jitter = randomJitterMinutes(config.jitterMinutes, rng) / 60;
      hourOffset = (hourOffset + jitter + 24) % 24;
      targets[posts[i].id] = hourOffsetToDate(dayStart, hourOffset);
    }
  }
  return targets;
}

function enforceGapRules(
  entries: Array<{ post: ChainPost; time: Date }>,
  config: SchedulerConfig
): Array<{ post: ChainPost; time: Date }> {
  const sorted = [...entries].sort((a, b) => a.time.getTime() - b.time.getTime());
  if (sorted.length <= 1) {
    return sorted;
  }

  const adjusted: Array<{ post: ChainPost; time: Date }> = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = adjusted[adjusted.length - 1];
    const current = sorted[i];
    const gap = diffMinutes(current.time, prev.time);
    let nextTime = new Date(current.time);
    if (gap < config.minGapMinutes) {
      nextTime = addMinutes(prev.time, config.minGapMinutes);
    } else if (gap > config.maxGapMinutes) {
      nextTime = addMinutes(prev.time, config.maxGapMinutes);
    }
    adjusted.push({ ...current, time: nextTime });
  }
  return adjusted;
}

function validateRateLimit(entries: Array<{ post: ChainPost; time: Date }>, config: SchedulerConfig): void {
  const sorted = [...entries].sort((a, b) => a.time.getTime() - b.time.getTime());
  for (let i = 0; i < sorted.length; i += 1) {
    const start = sorted[i].time.getTime() - 60 * 60 * 1000;
    const inLastHour = sorted.filter((entry) => entry.time.getTime() > start && entry.time <= sorted[i].time);
    if (inLastHour.length > Math.ceil(config.maxPostsPerHour)) {
      throw new Error("Scheduler violated maxPostsPerHour constraint.");
    }
  }
}

function countWindow(
  entries: Array<{ post: ChainPost; time: Date }>,
  anchorTime: Date,
  windowMinutes: number,
  accountId?: string
): number {
  const lower = anchorTime.getTime() - windowMinutes * 60 * 1000;
  return entries.filter((entry) => {
    const ts = entry.time.getTime();
    if (!(ts > lower && ts <= anchorTime.getTime())) {
      return false;
    }
    if (!accountId) {
      return true;
    }
    return (entry.post.accountId ?? "acct1") === accountId;
  }).length;
}

function enforceAccountGapRules(
  entries: Array<{ post: ChainPost; time: Date }>,
  config: SchedulerConfig
): Array<{ post: ChainPost; time: Date }> {
  const byAccount: Record<string, Array<{ post: ChainPost; time: Date }>> = {};
  for (const entry of entries) {
    const accountId = entry.post.accountId ?? "acct1";
    byAccount[accountId] = byAccount[accountId] || [];
    byAccount[accountId].push(entry);
  }
  const adjusted: Array<{ post: ChainPost; time: Date }> = [];
  for (const accountEntries of Object.values(byAccount)) {
    adjusted.push(...enforceGapRules(accountEntries, config));
  }
  return adjusted.sort((a, b) => a.time.getTime() - b.time.getTime());
}

function enforceDensityCaps(
  entries: Array<{ post: ChainPost; time: Date }>,
  config: SchedulerConfig
): Array<{ post: ChainPost; time: Date }> {
  const sorted = [...entries].sort((a, b) => a.time.getTime() - b.time.getTime());
  const adjusted: Array<{ post: ChainPost; time: Date }> = [];
  const globalCap = Math.floor(config.maxPostsPerHourGlobal);
  const perAccountCap = Math.floor(config.maxPostsPerHourPerAccount);

  for (const entry of sorted) {
    const accountId = entry.post.accountId ?? "acct1";
    let scheduledTime = new Date(entry.time);
    let attempts = 0;
    while (attempts < 600) {
      const globalCount = countWindow(adjusted, scheduledTime, 60);
      const accountCount = countWindow(adjusted, scheduledTime, 60, accountId);
      if (globalCount < globalCap && accountCount < perAccountCap) {
        break;
      }
      scheduledTime = addMinutes(scheduledTime, 5);
      attempts += 1;
    }
    adjusted.push({
      post: entry.post,
      time: scheduledTime
    });
  }
  return adjusted.sort((a, b) => a.time.getTime() - b.time.getTime());
}

function applyAccountOffsets(
  date: Date,
  accountId: string,
  inputOffsets: Record<string, number> | undefined,
  config: SchedulerConfig
): Date {
  const offset =
    inputOffsets?.[accountId] ??
    config.defaultAccountOffsetsMinutes[accountId] ??
    0;
  return addMinutes(date, offset);
}

function applyInterAccountRelayBounds(
  desired: Date,
  parentDate: Date,
  post: ChainPost,
  config: SchedulerConfig
): Date {
  const isInter = post.interAccount || (post.sourceAccountId && post.accountId && post.sourceAccountId !== post.accountId);
  if (!isInter) {
    return desired;
  }
  const minBound = addMinutes(parentDate, config.interAccountRelayDelayRangeMinutes.min);
  const maxBound = addMinutes(parentDate, config.interAccountRelayDelayRangeMinutes.max);
  if (desired < minBound) {
    return minBound;
  }
  if (desired > maxBound) {
    return maxBound;
  }
  return desired;
}

export function buildMultiAccountSchedule(
  input: SchedulerInput,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): MultiAccountSchedulerResult {
  const dayStart = toDayStart(input.dayStartUtc);
  const rng = createSeededRng(input.seed);
  const windowShiftHours = input.windowShiftHours ?? 0;

  const normalizedPosts = input.posts.map((post) => ({
    ...post,
    accountId: post.accountId ?? "acct1"
  }));

  const origins = normalizedPosts.filter((post) => post.type === "orig");
  const quotes = normalizedPosts.filter((post) => post.type === "quote");
  const originTargets = generateOriginTargetsByLanguage(origins, dayStart, rng, config, windowShiftHours);

  const scheduledMap: Record<string, Date> = {};
  const provisional: Array<{ post: ChainPost; time: Date }> = [];

  for (const origin of origins) {
    const base = originTargets[origin.id] ?? dayStart;
    const withAccountOffset = applyAccountOffsets(
      base,
      origin.accountId ?? "acct1",
      input.accountOffsetsMinutes,
      config
    );
    const jittered = addMinutes(withAccountOffset, randomJitterMinutes(config.jitterMinutes, rng));
    scheduledMap[origin.id] = jittered;
    provisional.push({ post: origin, time: jittered });
  }

  const quotesByLayer = [...quotes].sort((a, b) => a.layer - b.layer);
  for (const quote of quotesByLayer) {
    const parentDate = quote.parentPostId ? scheduledMap[quote.parentPostId] : null;
    const resolvedParentDate = parentDate ?? dayStart;
    const desiredBase = addMinutes(resolvedParentDate, quote.delayMinutesFromParent);
    const boundedRelay = applyInterAccountRelayBounds(desiredBase, resolvedParentDate, quote, config);
    const parentLang = quote.parentPostId
      ? normalizedPosts.find((post) => post.id === quote.parentPostId)?.lang ?? quote.lang
      : quote.lang;
    const targetRegion = nextRegion(config.languageRegionMap[parentLang]);
    const aligned = alignToRegionWindow(boundedRelay, targetRegion, dayStart, config, windowShiftHours);
    const withAccountOffset = applyAccountOffsets(
      aligned,
      quote.accountId ?? "acct1",
      input.accountOffsetsMinutes,
      config
    );
    const jittered = addMinutes(withAccountOffset, randomJitterMinutes(config.jitterMinutes, rng));
    scheduledMap[quote.id] = jittered;
    provisional.push({ post: quote, time: jittered });
  }

  const accountGapAdjusted = enforceAccountGapRules(provisional, config);
  const densityAdjusted = enforceDensityCaps(accountGapAdjusted, config);
  validateRateLimit(densityAdjusted, { ...config, maxPostsPerHour: config.maxPostsPerHourGlobal });

  const entries: ScheduleEntry[] = densityAdjusted
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .map(({ post, time }) => ({
      id: post.id,
      time: time.toISOString(),
      accountId: post.accountId ?? "acct1",
      lang: post.lang,
      type: post.type,
      chainId: post.chainId,
      layer: post.layer,
      targetLang: post.targetLang,
      parentPostId: post.parentPostId,
      sourceAccountId: post.sourceAccountId,
      targetAccountId: post.targetAccountId,
      interAccount: post.interAccount,
      text: post.text,
      media: post.media,
      poll: post.poll
    }));

  const perAccountSchedules = entries.reduce<Record<string, ScheduleEntry[]>>((acc, entry) => {
    acc[entry.accountId] = acc[entry.accountId] || [];
    acc[entry.accountId].push(entry);
    return acc;
  }, {});

  return {
    entries,
    perAccountSchedules
  };
}

export function buildDailySchedule(
  input: SchedulerInput,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): SchedulerResult {
  const result = buildMultiAccountSchedule(input, config);
  return { entries: result.entries };
}
