import { mapTweetMetricsToRecord, XMetricRecord, LanguageCode } from "../core/metrics";
import { ScheduleEntry } from "../core/scheduler";

declare const require: (moduleId: string) => any;
declare const process: {
  env: Record<string, string | undefined>;
};

type LegacyXClient = {
  getUserByUsername: (username: string) => Promise<{ id: string }>;
  getUserTweets: (
    userId: string,
    options?: { maxResults?: number }
  ) => Promise<{
    data: Array<{
      id: string;
      text: string;
      lang?: string;
      created_at?: string;
      public_metrics?: {
        quote_count?: number;
        retweet_count?: number;
        like_count?: number;
        reply_count?: number;
      };
    }>;
  }>;
  postTweet: (
    text: string,
    mediaIds?: string[],
    pollOptions?: { options: string[]; duration_minutes?: number } | null
  ) => Promise<{ id?: string; text?: string }>;
  postQuoteTweet: (
    text: string,
    quoteTweetId: string,
    mediaIds?: string[]
  ) => Promise<{ id?: string; text?: string }>;
};

type LegacyMetricsClient = {
  getTweetMetrics: (
    tweetId: string,
    includeNonPublic?: boolean
  ) => Promise<{
    publicMetrics?: {
      quote_count?: number;
      retweet_count?: number;
      like_count?: number;
      reply_count?: number;
    };
    nonPublicMetrics?: {
      impression_count?: number;
      url_link_clicks?: number;
    } | null;
    organicMetrics?: {
      impression_count?: number;
      url_link_clicks?: number;
    } | null;
  }>;
};

export interface XClientConfig {
  username: string;
  maxMetricsPosts: number;
  includeNonPublicMetrics: boolean;
  defaultDwellSeconds: number;
}

export interface ExecuteScheduleOptions {
  dryRun: boolean;
  executeDueOnly: boolean;
  nowIso?: string;
}

export interface AccountXProfile {
  accountId: string;
  username: string;
  enabled?: boolean;
  postingEnabled?: boolean;
}

export interface AccountExecutionAdapter {
  postOriginal: (
    entry: ScheduleEntry,
    pollOptions: { options: string[]; duration_minutes?: number } | null
  ) => Promise<{ id?: string; text?: string }>;
  postQuote: (
    entry: ScheduleEntry,
    parentTweetId: string
  ) => Promise<{ id?: string; text?: string }>;
}

export interface ExecuteScheduleLog {
  entryId: string;
  status: "posted" | "skipped" | "failed";
  tweetId?: string;
  reason?: string;
}

export interface ExecuteScheduleResult {
  logs: ExecuteScheduleLog[];
  postedCount: number;
  failedCount: number;
}

export const DEFAULT_XCLIENT_CONFIG: XClientConfig = {
  username: process.env.BWE_X_USERNAME || process.env.X_USERNAME || "",
  maxMetricsPosts: 100,
  includeNonPublicMetrics: true,
  defaultDwellSeconds: 45
};

const legacyXClient = require("../../services/x/client") as LegacyXClient;
const legacyMetricsClient = require("../../services/x/metrics") as LegacyMetricsClient;

function normalizeLanguage(lang: string | undefined): LanguageCode {
  const normalized = (lang || "en").toLowerCase();
  if (normalized === "en" || normalized === "pt" || normalized === "es" || normalized === "ja" || normalized === "ar" || normalized === "ko") {
    return normalized;
  }
  return "en";
}

function isDue(entry: ScheduleEntry, now: Date): boolean {
  return new Date(entry.time).getTime() <= now.getTime();
}

function toPollOptions(entry: ScheduleEntry): { options: string[]; duration_minutes?: number } | null {
  if (!entry.poll || !entry.poll.options || entry.poll.options.length < 2) {
    return null;
  }
  return {
    options: entry.poll.options.slice(0, 4),
    duration_minutes: 1440
  };
}

export async function fetchLatestMetrics(
  config: XClientConfig = DEFAULT_XCLIENT_CONFIG
): Promise<XMetricRecord[]> {
  if (!config.username) {
    return [];
  }
  return fetchLatestMetricsForUsername(config.username, config);
}

async function fetchLatestMetricsForUsername(
  username: string,
  config: XClientConfig
): Promise<XMetricRecord[]> {
  const user = await legacyXClient.getUserByUsername(username.replace(/^@/, ""));
  const tweetsRes = await legacyXClient.getUserTweets(user.id, { maxResults: config.maxMetricsPosts });
  const tweets = tweetsRes?.data ?? [];
  const output: XMetricRecord[] = [];

  for (const tweet of tweets) {
    const publicMetrics = tweet.public_metrics || {};
    let impressions = 0;
    const engagements =
      (publicMetrics.like_count || 0) +
      (publicMetrics.retweet_count || 0) +
      (publicMetrics.reply_count || 0) +
      (publicMetrics.quote_count || 0);
    let ctr = 0;
    let dwellSeconds = config.defaultDwellSeconds;

    if (config.includeNonPublicMetrics) {
      try {
        const details = await legacyMetricsClient.getTweetMetrics(tweet.id, true);
        const nonPublicImpressions =
          details?.nonPublicMetrics?.impression_count ??
          details?.organicMetrics?.impression_count ??
          0;
        const urlClicks =
          details?.nonPublicMetrics?.url_link_clicks ??
          details?.organicMetrics?.url_link_clicks ??
          0;
        impressions = nonPublicImpressions;
        ctr = impressions > 0 ? (urlClicks / impressions) * 100 : 0;
        dwellSeconds = Math.max(config.defaultDwellSeconds, 30 + ctr);
      } catch {
        // Fallback to public metrics only.
      }
    }

    output.push(
      mapTweetMetricsToRecord({
        id: tweet.id,
        lang: normalizeLanguage(tweet.lang),
        quoteCount: Number(publicMetrics.quote_count || 0),
        repostCount: Number(publicMetrics.retweet_count || 0),
        impressions,
        engagements,
        ctr,
        dwellSeconds,
        createdAt: tweet.created_at
      })
    );
  }

  return output;
}

export async function fetchLatestMetricsForAccounts(
  profiles: AccountXProfile[],
  config: XClientConfig = DEFAULT_XCLIENT_CONFIG
): Promise<Record<string, XMetricRecord[]>> {
  const output: Record<string, XMetricRecord[]> = {};
  for (const profile of profiles) {
    if (profile.enabled === false) {
      output[profile.accountId] = [];
      continue;
    }
    try {
      output[profile.accountId] = await fetchLatestMetricsForUsername(profile.username, config);
    } catch {
      output[profile.accountId] = [];
    }
  }
  return output;
}

const defaultAccountAdapter: AccountExecutionAdapter = {
  postOriginal: async (entry, pollOptions) => legacyXClient.postTweet(entry.text, [], pollOptions),
  postQuote: async (entry, parentTweetId) => legacyXClient.postQuoteTweet(entry.text, parentTweetId, [])
};

export async function executeMultiAccountSchedules(
  entriesByAccount: Record<string, ScheduleEntry[]>,
  options: ExecuteScheduleOptions,
  accountExecutors: Record<string, AccountExecutionAdapter> = { acct1: defaultAccountAdapter }
): Promise<Record<string, ExecuteScheduleResult>> {
  const now = options.nowIso ? new Date(options.nowIso) : new Date();
  const postedTweetIds: Record<string, string> = {};
  const results: Record<string, ExecuteScheduleResult> = {};
  const allEntries = Object.entries(entriesByAccount)
    .flatMap(([accountId, entries]) =>
      entries.map((entry) => ({
        ...entry,
        accountId
      }))
    )
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  for (const accountId of Object.keys(entriesByAccount)) {
    results[accountId] = { logs: [], postedCount: 0, failedCount: 0 };
  }

  for (const entry of allEntries) {
    const accountId = entry.accountId || "acct1";
    const result = results[accountId] || { logs: [], postedCount: 0, failedCount: 0 };
    results[accountId] = result;
    const adapter = accountExecutors[accountId];

    if (options.executeDueOnly && !isDue(entry, now)) {
      result.logs.push({
        entryId: entry.id,
        status: "skipped",
        reason: "not_due"
      });
      continue;
    }
    if (options.dryRun) {
      result.logs.push({
        entryId: entry.id,
        status: "skipped",
        reason: "dry_run"
      });
      continue;
    }
    if (!adapter) {
      result.failedCount += 1;
      result.logs.push({
        entryId: entry.id,
        status: "failed",
        reason: "missing_account_executor"
      });
      continue;
    }

    try {
      if (entry.type === "orig") {
        const posted = await adapter.postOriginal(entry, toPollOptions(entry));
        if (!posted?.id) {
          throw new Error("Missing tweet ID for original post.");
        }
        postedTweetIds[entry.id] = posted.id;
        result.postedCount += 1;
        result.logs.push({
          entryId: entry.id,
          status: "posted",
          tweetId: posted.id
        });
      } else {
        if (!entry.parentPostId) {
          throw new Error("Quote post missing parentPostId.");
        }
        const parentTweetId = postedTweetIds[entry.parentPostId];
        if (!parentTweetId) {
          throw new Error(`Parent tweet not posted yet for ${entry.parentPostId}.`);
        }
        const posted = await adapter.postQuote(entry, parentTweetId);
        if (!posted?.id) {
          throw new Error("Missing tweet ID for quote post.");
        }
        postedTweetIds[entry.id] = posted.id;
        result.postedCount += 1;
        result.logs.push({
          entryId: entry.id,
          status: "posted",
          tweetId: posted.id
        });
      }
    } catch (error) {
      result.failedCount += 1;
      result.logs.push({
        entryId: entry.id,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return results;
}

export async function executeSchedule(
  entries: ScheduleEntry[],
  options: ExecuteScheduleOptions
): Promise<ExecuteScheduleResult> {
  const multi = await executeMultiAccountSchedules(
    { acct1: entries.map((entry) => ({ ...entry, accountId: entry.accountId || "acct1" })) },
    options
  );
  return multi.acct1 || { logs: [], postedCount: 0, failedCount: 0 };
}
