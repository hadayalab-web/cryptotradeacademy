import { createSeededRng } from "../core/allocation";
import { LanguageCode } from "../core/metrics";

export type MediaKind = "video" | "image" | "poll" | "text";
export type OverlayVariantType = "caption" | "zoom" | "crop";

export interface MediaScaleBand {
  minPostsPerDay: number;
  maxPostsPerDay: number;
  ratios: Record<MediaKind, number>;
}

export interface LanguageMediaPreference {
  mediaFormats: string[];
  pollBoost: number;
  videoBoost: number;
}

export interface MediaScalingConfig {
  scaleBands: MediaScaleBand[];
  exactReuseLimitRatio: number;
  overlayVariantLimitRatio: number;
  overlayVariantTypes: OverlayVariantType[];
  languagePreferences: Record<LanguageCode, LanguageMediaPreference>;
  chainReuseAmplification: number;
  hubVideoPropagationAmplification: number;
}

export interface MediaContentSlot {
  id: string;
  lang: LanguageCode;
  chainId?: string;
  accountId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
}

export interface MediaAsset {
  assetId: string;
  lang: LanguageCode;
  kind: Exclude<MediaKind, "poll" | "text">;
  format: string;
  sourceAssetId?: string;
  overlayVariantType?: OverlayVariantType;
}

export interface MediaAssignment {
  contentId: string;
  mediaKind: MediaKind;
  mediaAssetId?: string;
  format?: string;
  reusedExact: boolean;
  overlayVariant: boolean;
}

export interface MediaScalingResult {
  assignments: MediaAssignment[];
  generatedAssets: MediaAsset[];
  stats: {
    totalSlots: number;
    byKind: Record<MediaKind, number>;
    exactReuseRatio: number;
    overlayVariantRatio: number;
  };
}

export interface MediaAmplificationContext {
  baseWeight: number;
  mediaKind: MediaKind;
  chainReuse: boolean;
  isHubToSpokeVideoRelay: boolean;
}

export const DEFAULT_MEDIA_SCALING_CONFIG: MediaScalingConfig = {
  scaleBands: [
    {
      minPostsPerDay: 24,
      maxPostsPerDay: 50,
      ratios: {
        video: 0.4,
        image: 0.3,
        poll: 0.2,
        text: 0.1
      }
    },
    {
      minPostsPerDay: 50,
      maxPostsPerDay: 100,
      ratios: {
        video: 0.45,
        image: 0.25,
        poll: 0.25,
        text: 0.05
      }
    },
    {
      minPostsPerDay: 100,
      maxPostsPerDay: 250,
      ratios: {
        video: 0.45,
        image: 0.25,
        poll: 0.25,
        text: 0.05
      }
    }
  ],
  exactReuseLimitRatio: 0.1,
  overlayVariantLimitRatio: 0.3,
  overlayVariantTypes: ["caption", "zoom", "crop"],
  languagePreferences: {
    en: {
      mediaFormats: ["vertical-video", "poll-card", "explainer-video"],
      pollBoost: 1.25,
      videoBoost: 1.2
    },
    pt: {
      mediaFormats: ["sports-gif", "short-video", "reaction-gif"],
      pollBoost: 1,
      videoBoost: 1.1
    },
    es: {
      mediaFormats: ["sports-gif", "short-video", "reaction-gif"],
      pollBoost: 1,
      videoBoost: 1.1
    },
    ja: {
      mediaFormats: ["gif-loop", "short-video-10s", "micro-clip"],
      pollBoost: 0.95,
      videoBoost: 1.15
    },
    ar: {
      mediaFormats: ["vertical-video-rtl", "rtl-overlay-video", "short-vertical-video"],
      pollBoost: 0.95,
      videoBoost: 1.1
    },
    ko: {
      mediaFormats: ["gif-loop", "short-video-10s", "micro-clip"],
      pollBoost: 0.95,
      videoBoost: 1.15
    }
  },
  chainReuseAmplification: 1.8,
  hubVideoPropagationAmplification: 2.2
};

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function ratioToCounts(total: number, ratios: Record<MediaKind, number>): Record<MediaKind, number> {
  const kinds: MediaKind[] = ["video", "image", "poll", "text"];
  const raw = kinds.map((kind) => ({
    kind,
    exact: total * ratios[kind]
  }));
  const floorCounts = raw.map((row) => ({
    kind: row.kind,
    count: Math.floor(row.exact),
    fraction: row.exact - Math.floor(row.exact)
  }));
  let assigned = floorCounts.reduce((sum, row) => sum + row.count, 0);
  const remaining = total - assigned;
  floorCounts.sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remaining; i += 1) {
    floorCounts[i % floorCounts.length].count += 1;
    assigned += 1;
  }
  return floorCounts.reduce<Record<MediaKind, number>>((acc, row) => {
    acc[row.kind] = row.count;
    return acc;
  }, {} as Record<MediaKind, number>);
}

function resolveScaleBand(postsPerDay: number, config: MediaScalingConfig): MediaScaleBand {
  const ordered = [...config.scaleBands].sort((a, b) => a.minPostsPerDay - b.minPostsPerDay);
  for (const band of ordered) {
    if (postsPerDay >= band.minPostsPerDay && postsPerDay <= band.maxPostsPerDay) {
      return band;
    }
  }
  if (postsPerDay < ordered[0].minPostsPerDay) {
    return ordered[0];
  }
  return ordered[ordered.length - 1];
}

function pickMediaKindSequence(
  totalSlots: number,
  posts: MediaContentSlot[],
  rng: () => number,
  config: MediaScalingConfig
): MediaKind[] {
  const band = resolveScaleBand(totalSlots, config);
  const counts = ratioToCounts(totalSlots, band.ratios);

  // Apply language preference boosts (poll/video) lightly.
  const prefBoost = posts.reduce(
    (acc, post) => {
      const pref = config.languagePreferences[post.lang];
      acc.poll += pref.pollBoost;
      acc.video += pref.videoBoost;
      return acc;
    },
    { poll: 0, video: 0 }
  );

  const pollAdjust = Math.round((prefBoost.poll / Math.max(totalSlots, 1) - 1) * totalSlots * 0.02);
  const videoAdjust = Math.round((prefBoost.video / Math.max(totalSlots, 1) - 1) * totalSlots * 0.02);
  counts.poll = clamp(0, counts.poll + pollAdjust, totalSlots);
  counts.video = clamp(0, counts.video + videoAdjust, totalSlots);
  const over = counts.video + counts.image + counts.poll + counts.text - totalSlots;
  if (over > 0) {
    counts.text = Math.max(0, counts.text - over);
  }
  const under = totalSlots - (counts.video + counts.image + counts.poll + counts.text);
  if (under > 0) {
    counts.text += under;
  }

  const sequence: MediaKind[] = [];
  for (let i = 0; i < counts.video; i += 1) sequence.push("video");
  for (let i = 0; i < counts.image; i += 1) sequence.push("image");
  for (let i = 0; i < counts.poll; i += 1) sequence.push("poll");
  for (let i = 0; i < counts.text; i += 1) sequence.push("text");
  return shuffle(sequence, rng);
}

function createFreshAssetId(lang: LanguageCode, kind: Exclude<MediaKind, "poll" | "text">, index: number): string {
  return `asset-${lang}-${kind}-${String(index).padStart(4, "0")}`;
}

function createOverlayVariantId(baseAssetId: string, variantType: OverlayVariantType, index: number): string {
  return `${baseAssetId}-ov-${variantType}-${String(index).padStart(3, "0")}`;
}

export function buildMediaScalingPlan(
  posts: MediaContentSlot[],
  seed: number,
  config: MediaScalingConfig = DEFAULT_MEDIA_SCALING_CONFIG
): MediaScalingResult {
  const rng = createSeededRng(seed);
  const totalSlots = posts.length;
  const exactReuseLimit = Math.floor(totalSlots * config.exactReuseLimitRatio);
  const overlayVariantLimit = Math.floor(totalSlots * config.overlayVariantLimitRatio);

  const mediaKindSequence = pickMediaKindSequence(totalSlots, posts, rng, config);
  const assignments: MediaAssignment[] = [];
  const generatedAssets: MediaAsset[] = [];
  const existingByKey: Record<string, MediaAsset[]> = {};
  const formatByLang = (lang: LanguageCode) => config.languagePreferences[lang].mediaFormats;
  let exactReuseCount = 0;
  let overlayVariantCount = 0;
  let freshIndex = 1;
  let variantIndex = 1;

  for (let i = 0; i < posts.length; i += 1) {
    const post = posts[i];
    const mediaKind = mediaKindSequence[i] ?? "text";
    if (mediaKind === "text") {
      assignments.push({
        contentId: post.id,
        mediaKind,
        reusedExact: false,
        overlayVariant: false
      });
      continue;
    }
    if (mediaKind === "poll") {
      assignments.push({
        contentId: post.id,
        mediaKind,
        reusedExact: false,
        overlayVariant: false
      });
      continue;
    }

    const formats = formatByLang(post.lang);
    const preferredFormat = pickOne(formats, rng);
    const key = `${post.lang}:${mediaKind}`;
    const existing = existingByKey[key] ?? [];
    const hasReusable = existing.length > 0;
    const canExactReuse = hasReusable && exactReuseCount < exactReuseLimit;
    const canOverlayVariant = hasReusable && overlayVariantCount < overlayVariantLimit;

    let selectedAsset: MediaAsset;
    let reusedExact = false;
    let overlayVariant = false;

    if (canExactReuse && rng() < 0.5) {
      selectedAsset = pickOne(existing, rng);
      reusedExact = true;
      exactReuseCount += 1;
    } else if (canOverlayVariant && rng() < 0.65) {
      const baseAsset = pickOne(existing, rng);
      const variantType = pickOne(config.overlayVariantTypes, rng);
      selectedAsset = {
        assetId: createOverlayVariantId(baseAsset.assetId, variantType, variantIndex),
        lang: post.lang,
        kind: mediaKind,
        format: baseAsset.format,
        sourceAssetId: baseAsset.assetId,
        overlayVariantType: variantType
      };
      overlayVariant = true;
      overlayVariantCount += 1;
      variantIndex += 1;
      generatedAssets.push(selectedAsset);
      existing.push(selectedAsset);
      existingByKey[key] = existing;
    } else {
      selectedAsset = {
        assetId: createFreshAssetId(post.lang, mediaKind, freshIndex),
        lang: post.lang,
        kind: mediaKind,
        format: preferredFormat
      };
      freshIndex += 1;
      generatedAssets.push(selectedAsset);
      existing.push(selectedAsset);
      existingByKey[key] = existing;
    }

    assignments.push({
      contentId: post.id,
      mediaKind,
      mediaAssetId: selectedAsset.assetId,
      format: selectedAsset.format,
      reusedExact,
      overlayVariant
    });
  }

  const byKind = assignments.reduce<Record<MediaKind, number>>(
    (acc, row) => {
      acc[row.mediaKind] += 1;
      return acc;
    },
    { video: 0, image: 0, poll: 0, text: 0 }
  );

  return {
    assignments,
    generatedAssets,
    stats: {
      totalSlots,
      byKind,
      exactReuseRatio: totalSlots > 0 ? exactReuseCount / totalSlots : 0,
      overlayVariantRatio: totalSlots > 0 ? overlayVariantCount / totalSlots : 0
    }
  };
}

export function computeMediaAmplificationWeight(
  context: MediaAmplificationContext,
  config: MediaScalingConfig = DEFAULT_MEDIA_SCALING_CONFIG
): number {
  let weight = context.baseWeight;
  if (context.chainReuse) {
    weight *= config.chainReuseAmplification;
  }
  if (context.isHubToSpokeVideoRelay && context.mediaKind === "video") {
    weight *= config.hubVideoPropagationAmplification;
  }
  return weight;
}
