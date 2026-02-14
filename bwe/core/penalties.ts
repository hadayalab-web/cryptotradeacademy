import { computeTextSimilarity } from "./content";
import { ScheduleEntry } from "./scheduler";

export type BehavioralAction = "post" | "follow" | "unfollow" | "reply_spam";

export interface GuardrailEntry extends ScheduleEntry {
  behavioralAction?: BehavioralAction;
}

export interface PenaltyConfig {
  velocity: {
    maxPostsPerHour: number;
    maxPostsPer2Hours: number;
    maxSameLangPer2Hours: number;
  };
  content: {
    similarityThreshold: number;
    spamKeywords: string[];
    maxKeywordRepeats: number;
  };
  quotes: {
    minDelayMinutes: number;
    maxLayers: number;
    maxQuoteShare: number;
  };
  media: {
    maxIdenticalMediaPerDay: number;
  };
  behavior: {
    disallowedActions: BehavioralAction[];
  };
}

export interface GuardrailViolation {
  entryId: string;
  reasons: string[];
}

export interface GuardrailResult {
  allowedEntries: GuardrailEntry[];
  blockedEntries: GuardrailEntry[];
  violations: GuardrailViolation[];
}

export const DEFAULT_PENALTY_CONFIG: PenaltyConfig = {
  velocity: {
    maxPostsPerHour: 2,
    maxPostsPer2Hours: 4,
    maxSameLangPer2Hours: 3
  },
  content: {
    similarityThreshold: 0.7,
    spamKeywords: ["buy now", "100x", "guaranteed", "pump", "moon", "free money", "no risk"],
    maxKeywordRepeats: 1
  },
  quotes: {
    minDelayMinutes: 240,
    maxLayers: 3,
    maxQuoteShare: 0.5
  },
  media: {
    maxIdenticalMediaPerDay: 2
  },
  behavior: {
    disallowedActions: ["follow", "unfollow", "reply_spam"]
  }
};

function toDate(value: string): Date {
  return new Date(value);
}

function countWithinMinutes(entries: GuardrailEntry[], referenceTime: Date, minutes: number): number {
  const lowerBound = referenceTime.getTime() - minutes * 60 * 1000;
  return entries.filter((entry) => {
    const t = toDate(entry.time).getTime();
    return t > lowerBound && t <= referenceTime.getTime();
  }).length;
}

function countLanguageWithinMinutes(
  entries: GuardrailEntry[],
  lang: string,
  referenceTime: Date,
  minutes: number
): number {
  const lowerBound = referenceTime.getTime() - minutes * 60 * 1000;
  return entries.filter((entry) => {
    const t = toDate(entry.time).getTime();
    return entry.lang === lang && t > lowerBound && t <= referenceTime.getTime();
  }).length;
}

function keywordRepeatCount(text: string, keyword: string): number {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.toLowerCase().match(new RegExp(escaped, "g"));
  return matches ? matches.length : 0;
}

function hasKeywordSpam(text: string, config: PenaltyConfig["content"]): boolean {
  return config.spamKeywords.some(
    (keyword) => keywordRepeatCount(text, keyword) > config.maxKeywordRepeats
  );
}

function mediaKey(entry: GuardrailEntry): string | null {
  if (!entry.media) {
    return null;
  }
  return `${entry.media.type}:${entry.media.hint}`;
}

export function applyPenaltyGuardrails(
  scheduleEntries: GuardrailEntry[],
  config: PenaltyConfig = DEFAULT_PENALTY_CONFIG
): GuardrailResult {
  const sorted = [...scheduleEntries].sort(
    (a, b) => toDate(a.time).getTime() - toDate(b.time).getTime()
  );

  const allowed: GuardrailEntry[] = [];
  const blocked: GuardrailEntry[] = [];
  const violations: GuardrailViolation[] = [];
  const mediaUsage: Record<string, number> = {};

  for (const entry of sorted) {
    const reasons: string[] = [];
    const now = toDate(entry.time);

    // Velocity guardrails
    const posts1h = countWithinMinutes(allowed, now, 60);
    const posts2h = countWithinMinutes(allowed, now, 120);
    const sameLang2h = countLanguageWithinMinutes(allowed, entry.lang, now, 120);
    if (posts1h + 1 > config.velocity.maxPostsPerHour) {
      reasons.push("velocity:max_posts_per_hour");
    }
    if (posts2h + 1 > config.velocity.maxPostsPer2Hours) {
      reasons.push("velocity:max_posts_per_2hours");
    }
    if (sameLang2h + 1 > config.velocity.maxSameLangPer2Hours) {
      reasons.push("velocity:max_same_lang_per_2hours");
    }

    // Content guardrails
    for (const prior of allowed) {
      if (computeTextSimilarity(prior.text, entry.text) > config.content.similarityThreshold) {
        reasons.push("content:similarity_threshold");
        break;
      }
    }
    if (hasKeywordSpam(entry.text, config.content)) {
      reasons.push("content:keyword_spam");
    }

    // Quote guardrails
    const quoteCount = allowed.filter((item) => item.type === "quote").length;
    const totalIfAllowed = allowed.length + 1;
    const quoteIfAllowed = quoteCount + (entry.type === "quote" ? 1 : 0);
    if (entry.type === "quote") {
      if (entry.layer > config.quotes.maxLayers) {
        reasons.push("quotes:max_layers");
      }
      if (entry.parentPostId) {
        const parent = allowed.find((item) => item.id === entry.parentPostId) ??
          sorted.find((item) => item.id === entry.parentPostId);
        if (parent) {
          const delayMinutes = Math.round(
            (toDate(entry.time).getTime() - toDate(parent.time).getTime()) / (60 * 1000)
          );
          if (delayMinutes < config.quotes.minDelayMinutes) {
            reasons.push("quotes:min_delay");
          }
        }
      }
    }
    if (totalIfAllowed > 0 && quoteIfAllowed / totalIfAllowed > config.quotes.maxQuoteShare) {
      reasons.push("quotes:max_quote_share");
    }

    // Media guardrails
    const mKey = mediaKey(entry);
    if (mKey) {
      const used = mediaUsage[mKey] ?? 0;
      if (used + 1 > config.media.maxIdenticalMediaPerDay) {
        reasons.push("media:identical_media_limit");
      }
    }

    // Behavioral guardrails
    const behavior = entry.behavioralAction ?? "post";
    if (config.behavior.disallowedActions.includes(behavior)) {
      reasons.push(`behavior:${behavior}_blocked`);
    }

    if (reasons.length > 0) {
      blocked.push(entry);
      violations.push({
        entryId: entry.id,
        reasons
      });
      continue;
    }

    allowed.push(entry);
    if (mKey) {
      mediaUsage[mKey] = (mediaUsage[mKey] ?? 0) + 1;
    }
  }

  return {
    allowedEntries: allowed,
    blockedEntries: blocked,
    violations
  };
}
