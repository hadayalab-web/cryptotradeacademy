/**
 * TD BuzzWeave Engine — 引用リポスト最適化エンジン
 * 目的: 高インプレッション・高エンゲージメント・高CVR（すべて逆算）
 *
 * フロー: Search recent Posts → バズ抽出 → 文脈タグ付け → スロット生成 → マッピング → 寄生コピー生成 → 引用リポスト
 */
const { loadEnv } = require("../../utils/loadEnv");
loadEnv();

const OpenAI = require("openai");
const { getUserByUsername, getUserTweets, postQuoteTweet } = require("../x/client");
const { pickVidalyticsLink } = require("../../config/quoteRepostStateless");
const {
  getTdInfluencers,
  getTdOfficialAccounts,
  getTdEmotionDictionary,
  insertTdPostSlots,
  getTdPostSlotsInNextHour,
  consumeTdPostSlot,
  deferTdPostSlot,
  cleanupOldTdPostSlots,
  insertTdCopyArchive,
  insertTdCopyMeta,
  inferCopyMeta,
  insertXPost,
  getQuotedTweetIdsInLast30Days,
  insertQuotedTweets
} = require("../../utils/supabase");
const { generateXPost } = require("../ai/gpt5mini");

const MODEL = process.env.GPT_MODEL_X_POST || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// バズ閾値（指示書準拠）
const BUZZ_THRESHOLD = { influencer: 200, official: 500 };

// 時間帯分布（JST）400枠/日
const SLOT_DISTRIBUTION_JST = [
  { start: 8, end: 11, count: 80 },
  { start: 12, end: 14, count: 54 },
  { start: 17, end: 20, count: 94 },
  { start: 21, end: 24, count: 120 },
  { start: 0, end: 2, count: 26 },
  { start: 2, end: 6, count: 6 },
  { start: 6, end: 8, count: 20 }
];
const DAILY_SLOT_COUNT = 400;
const DEFAULT_DEADLINE_MS = Number(process.env.BUZZWEAVE_DEADLINE_MS || 55000);
const BUZZWEAVE_MAX_TARGETS = Number(process.env.BUZZWEAVE_MAX_TARGETS || 12);
const BUZZWEAVE_GPT_CLASSIFY_TOP_N = Number(process.env.BUZZWEAVE_GPT_CLASSIFY_TOP_N || 10);
const BUZZWEAVE_ENOUGH_CANDIDATES = Number(process.env.BUZZWEAVE_ENOUGH_CANDIDATES || 24);
const CLEANUP_OLDER_THAN_HOURS = Number(process.env.BUZZWEAVE_SLOT_RETENTION_HOURS || 48);
const LOG_LEVEL = process.env.BUZZWEAVE_LOG_LEVEL || "info";

function logInfo(...args) {
  if (LOG_LEVEL === "info") console.log("[BuzzWeave]", ...args);
}
function logWarn(...args) {
  if (LOG_LEVEL === "info" || LOG_LEVEL === "warn") console.warn("[BuzzWeave]", ...args);
}
function logError(...args) {
  console.error("[BuzzWeave]", ...args);
}

function isDeadlineExceeded(startMs, deadlineMs) {
  return Date.now() - startMs > deadlineMs;
}

function deadlineSnapshot(startMs, deadlineMs) {
  return { elapsedMs: Date.now() - startMs, deadlineMs };
}

// 言語比率 EN 40%, ES 20%, PT/JA/KO/AR 各10%
const LANG_WEIGHTS = { en: 40, es: 20, pt: 10, ja: 10, ko: 10, ar: 10 };

// ターゲット比率 influencer 70%, official 20%, flexible 10%
const TARGET_WEIGHTS = { influencer: 70, official: 20, flexible: 10 };

// モード比率 regular 70%, minimal 30%
const MODE_WEIGHTS = { regular: 70, minimal: 30 };

/**
 * エンゲージメントスコア算出（指示書準拠）
 * score = likes + 2*retweets + 3*quotes + replies
 */
function calculateEngagementScore(metrics = {}) {
  const likes = Number(metrics.like_count) || 0;
  const retweets = Number(metrics.retweet_count) || 0;
  const quotes = Number(metrics.quote_count) || 0;
  const replies = Number(metrics.reply_count) || 0;
  return likes + 2 * retweets + 3 * quotes + replies;
}

/**
 * ターゲットの直近投稿を取得
 */
async function fetchRecentPostsFromX(handle, options = {}) {
  const limit = options.limit || 5;
  try {
    const user = await getUserByUsername(handle.replace(/^@/, ""));
    const userId = user?.id;
    if (!userId) return [];
    const { data } = await getUserTweets(userId, { maxResults: limit });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    logWarn("fetchRecentPostsFromX error:", handle, e.message);
    return [];
  }
}

/**
 * gpt-4o で投稿を topic/tone/lang に分類
 */
async function classifyPostWithGpt4o(postText) {
  if (!OPENAI_API_KEY || !postText || postText.length < 10) {
    return { topic: "crypto", tone: "neutral", lang: "en" };
  }
  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Return ONLY a JSON object. Keys: topic (crypto/ai/finance/tech/general), tone (urgent/neutral/bullish/bearish/fear), lang (en/ja/es/pt/ko/ar). No markdown."
        },
        {
          role: "user",
          content: `Classify this X post:\n"${String(postText).slice(0, 500)}"\nJSON:`
        }
      ],
      max_completion_tokens: 80,
      temperature: 0.2
    });
    const raw = completion?.choices?.[0]?.message?.content?.trim() || "{}";
    const cleaned = raw.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      topic: parsed.topic || "crypto",
      tone: parsed.tone || "neutral",
      lang: parsed.lang || "en"
    };
  } catch (e) {
    logWarn("classifyPostWithGpt4o error:", e.message);
    return { topic: "crypto", tone: "neutral", lang: "en" };
  }
}

/**
 * 400枠/日のスロットを生成（JST 時間帯分布）
 */
function generateSlotsForDay(date = new Date()) {
  const slots = [];
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);

  const langs = ["en", "es", "pt", "ja", "ko", "ar"];
  const targets = ["influencer", "official", "flexible"];
  // CVR要件を満たすため mode は日次固定配分にする（regular 70% / minimal 30%）
  const modeSequence = buildWeightedSequence(DAILY_SLOT_COUNT, MODE_WEIGHTS);
  let modeIndex = 0;

  for (const range of SLOT_DISTRIBUTION_JST) {
    const count = range.count;
    const startH = range.start;
    const endH = range.end === 0 ? 24 : range.end;

    for (let i = 0; i < count; i++) {
      const lang = weightedRandom(langs, LANG_WEIGHTS);
      const target = weightedRandom(targets, TARGET_WEIGHTS);
      const mode = modeSequence[modeIndex] || "regular";
      modeIndex++;

      const hour = startH + Math.random() * (endH - startH);
      const slotDate = new Date(base);
      slotDate.setUTCHours(Math.floor(hour) - 9, Math.floor(Math.random() * 60), 0, 0);

      slots.push({
        datetime_jst: slotDate.toISOString(),
        lang,
        target_type: target,
        mode
      });
    }
  }

  return slots.slice(0, DAILY_SLOT_COUNT);
}

function buildWeightedSequence(total, weights) {
  const keys = Object.keys(weights);
  const weightSum = keys.reduce((sum, k) => sum + (weights[k] || 0), 0);
  if (!weightSum || total <= 0) return [];
  const raw = keys.map((k) => ({
    key: k,
    exact: (total * (weights[k] || 0)) / weightSum
  }));
  const baseCounts = raw.map((r) => ({ ...r, count: Math.floor(r.exact), rem: r.exact % 1 }));
  let assigned = baseCounts.reduce((s, r) => s + r.count, 0);
  const left = total - assigned;
  baseCounts.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < left; i++) {
    baseCounts[i % baseCounts.length].count += 1;
    assigned += 1;
  }
  const sequence = [];
  for (const row of baseCounts) {
    for (let i = 0; i < row.count; i++) sequence.push(row.key);
  }
  // 均一化のため軽くシャッフル
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  return sequence;
}

function weightedRandom(items, weights) {
  const total = items.reduce((s, k) => s + (weights[k] || 0), 0);
  let r = Math.random() * total;
  for (const k of items) {
    r -= weights[k] || 0;
    if (r <= 0) return k;
  }
  return items[items.length - 1];
}

/**
 * 古いスロット削除（定期メンテ）
 */
async function cleanupOldSlots(olderThanHours = CLEANUP_OLDER_THAN_HOURS) {
  return cleanupOldTdPostSlots(olderThanHours);
}

/**
 * バズ候補をスロットに最適マッピング
 */
function pickBestBuzzCandidate(buzzCandidates, slot) {
  if (!buzzCandidates?.length) return null;

  const langMatch = (c) => c.context?.lang === slot.lang;
  const langApprox = (c) =>
    (slot.lang === "en" && ["es", "pt"].includes(c.context?.lang)) ||
    (["es", "pt"].includes(slot.lang) && c.context?.lang === "en");
  const targetMatch = (c) =>
    slot.target_type === "flexible" ||
    c.target_type === slot.target_type;

  const scored = buzzCandidates
    .filter((c) => targetMatch(c))
    .map((c) => {
      let score = c.engagementScore || 0;
      if (langMatch(c)) score *= 2;
      else if (langApprox(c)) score *= 1.2;
      const topicGood = ["crypto", "finance", "ai"].includes(c.context?.topic);
      if (topicGood) score *= 1.3;
      return { ...c, matchScore: score };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return scored[0] || null;
}

/**
 * バズ候補を収集（Fetch + Buzz + 文脈タグ）
 */
async function collectBuzzCandidates(options = {}) {
  const limit = options.limit || 20;
  const startMs = Number(options.startMs || Date.now());
  const deadlineMs = Number(options.deadlineMs || DEFAULT_DEADLINE_MS);
  const maxTargets = Number(options.maxTargets || BUZZWEAVE_MAX_TARGETS);
  const classifyTopN = Number(options.classifyTopN || BUZZWEAVE_GPT_CLASSIFY_TOP_N);
  const enoughCandidates = Number(options.enoughCandidates || BUZZWEAVE_ENOUGH_CANDIDATES);
  const candidates = [];
  const rawCandidates = [];

  const influencers = await getTdInfluencers(null, limit);
  const officials = await getTdOfficialAccounts(null, limit);
  logInfo("targets loaded", {
    influencers: influencers.length,
    officials: officials.length,
    total: influencers.length + officials.length
  });

  const targets = [
    ...influencers.map((t) => ({ ...t, target_type: "influencer", org_type: null })),
    ...officials.map((t) => ({ ...t, target_type: "official", org_type: t.org_type }))
  ];

  let postsFetched = 0;
  let postsFilteredByDup = 0;
  let postsPassedThreshold = 0;
  let deadlineExceeded = false;
  let earlyExitEnoughCandidates = false;

  for (const target of targets.slice(0, maxTargets)) {
    if (isDeadlineExceeded(startMs, deadlineMs)) {
      deadlineExceeded = true;
      logWarn("deadline exceeded", {
        stage: "before-fetch-target",
        ...deadlineSnapshot(startMs, deadlineMs)
      });
      break;
    }

    const posts = await fetchRecentPostsFromX(target.handle, { limit: 5 });
    postsFetched += posts.length;
    const quotedIds = await getQuotedTweetIdsInLast30Days(posts.map((p) => String(p.id)));
    const deduped = posts.filter((p) => !quotedIds.has(String(p.id)));
    postsFilteredByDup += posts.length - deduped.length;
    for (const post of deduped) {
      const metrics = post.public_metrics || {};
      const score = calculateEngagementScore(metrics);
      const threshold =
        target.target_type === "official"
          ? BUZZ_THRESHOLD.official
          : BUZZ_THRESHOLD.influencer;
      if (score < threshold) continue;
      postsPassedThreshold++;

      rawCandidates.push({
        target,
        post: {
          id: post.id,
          text: post.text,
          created_at: post.created_at
        },
        engagementScore: score
      });

      if (rawCandidates.length >= enoughCandidates) {
        earlyExitEnoughCandidates = true;
        break;
      }
    }
    if (earlyExitEnoughCandidates) {
      break;
    }
  }

  rawCandidates.sort((a, b) => b.engagementScore - a.engagementScore);
  const toClassify = rawCandidates.slice(0, Math.max(1, classifyTopN));
  if (isDeadlineExceeded(startMs, deadlineMs)) {
    deadlineExceeded = true;
    logWarn("deadline exceeded", {
      stage: "before-gpt-classification-loop",
      ...deadlineSnapshot(startMs, deadlineMs)
    });
    // 途中結果を返す（分類なしフォールバック）
    for (const c of toClassify) {
      candidates.push({
        ...c,
        context: {
          topic: "crypto",
          tone: "neutral",
          lang: c.target?.lang || "en"
        }
      });
    }
  } else {
    for (const c of toClassify) {
      if (isDeadlineExceeded(startMs, deadlineMs)) {
        deadlineExceeded = true;
        logWarn("deadline exceeded", {
          stage: "gpt-classification-loop",
          ...deadlineSnapshot(startMs, deadlineMs)
        });
        break;
      }
      const context = await classifyPostWithGpt4o(c.post.text);
      candidates.push({
        ...c,
        context
      });
    }
    // 分類途中で打ち切った場合も、残りはフォールバックで補完して部分進行を維持
    if (deadlineExceeded && candidates.length < toClassify.length) {
      for (const c of toClassify.slice(candidates.length)) {
        candidates.push({
          ...c,
          context: {
            topic: "crypto",
            tone: "neutral",
            lang: c.target?.lang || "en"
          }
        });
      }
    }
  }

  candidates.sort((a, b) => b.engagementScore - a.engagementScore);
  logInfo("candidate summary", {
    postsFetched,
    postsFilteredByDup,
    postsPassedThreshold,
    rawCandidates: rawCandidates.length,
    candidates: candidates.length,
    maxTargets,
    classifyTopN,
    earlyExitEnoughCandidates,
    deadlineExceeded
  });
  return { candidates, deadlineExceeded };
}

/**
 * 寄生コピー生成（バズ文脈を付与）
 */
async function generateParasiticCopy(slot, buzzCandidate, videoUrl) {
  const { target, post, context } = buzzCandidate;
  const dict = await getTdEmotionDictionary(null, slot.lang, 10);
  const phrases = dict.map((d) => d.phrase).filter(Boolean);

  const result = await generateXPost({
    mode: slot.mode,
    language: slot.lang,
    video_url: videoUrl || pickVidalyticsLink(slot.lang, slot.mode),
    orgType: target.org_type || undefined,
    dictionaryPhrases: phrases,
    buzzContext: {
      quotedText: post.text?.slice(0, 200),
      topic: context.topic,
      tone: context.tone
    }
  });

  return result.body;
}

/**
 * 1サイクル実行: 次1時間のスロット取得 → マッピング → 生成 → 投稿
 */
async function runBuzzWeaveCycle(options = {}) {
  const dryRun = options.dryRun !== false;
  const deadlineMs = Number(options.deadlineMs || DEFAULT_DEADLINE_MS);
  const startMs = Date.now();
  const runId = `bw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  logInfo("cycle start", { runId, dryRun, deadlineMs });
  // 古いスロットの定期掃除（毎回呼んでも負荷は低い。実削除は条件一致時のみ）
  const cleanup = await cleanupOldSlots(CLEANUP_OLDER_THAN_HOURS);
  if (cleanup.ok && cleanup.deleted > 0) {
    logInfo("cleanupOldTdPostSlots", {
      deleted: cleanup.deleted,
      olderThanHours: CLEANUP_OLDER_THAN_HOURS
    });
  }

  const slots = await getTdPostSlotsInNextHour();
  if (!slots.length) {
    return { ok: true, message: "No slots in next hour", posted: 0, runId };
  }

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    logWarn("deadline exceeded", {
      stage: "before-collectBuzzCandidates",
      runId,
      ...deadlineSnapshot(startMs, deadlineMs)
    });
    return {
      ok: true,
      message: "deadline exceeded before collectBuzzCandidates",
      posted: 0,
      runId,
      deadlineExceeded: true
    };
  }

  const collectResult = await collectBuzzCandidates({
    limit: 50,
    startMs,
    deadlineMs,
    maxTargets: BUZZWEAVE_MAX_TARGETS,
    classifyTopN: BUZZWEAVE_GPT_CLASSIFY_TOP_N
  });
  const buzzCandidates = collectResult.candidates || [];
  if (!buzzCandidates.length) {
    return {
      ok: true,
      message: collectResult.deadlineExceeded ? "deadline exceeded during candidate collection" : "No buzz candidates",
      posted: 0,
      runId,
      deadlineExceeded: !!collectResult.deadlineExceeded
    };
  }

  const results = [];
  const slot = slots[0];
  const candidate = pickBestBuzzCandidate(buzzCandidates, slot);
  if (!candidate) {
    return { ok: true, message: "No matching candidate for slot", posted: 0, runId };
  }

  const videoUrl = pickVidalyticsLink(slot.lang, slot.mode);
  const body = await generateParasiticCopy(slot, candidate, videoUrl);

  if (!dryRun) {
    if (isDeadlineExceeded(startMs, deadlineMs)) {
      logWarn("deadline exceeded", {
        stage: "before-x-post",
        runId,
        ...deadlineSnapshot(startMs, deadlineMs)
      });
      results.push({
        slot,
        candidate: { handle: candidate.target.handle, postId: candidate.post.id },
        body,
        deadlineExceeded: true,
        success: false
      });
      return {
        ok: true,
        message: "deadline exceeded before posting",
        posted: 0,
        runId,
        deadlineExceeded: true,
        results
      };
    }

    try {
      const postResult = await postQuoteTweet(body, candidate.post.id);
      // 30日重複防止へ登録（成功投稿時）
      await insertQuotedTweets([{ tweet_id: String(candidate.post.id), lang: slot.lang }]);
      const consume = await consumeTdPostSlot(slot.id);
      let compensation = null;
      if (!consume.ok) {
        // 補償: 削除失敗時は将来時刻へ退避し、同slotの即時再利用を防ぐ
        const deferred = await deferTdPostSlot(slot.id, 180);
        compensation = {
          slotConsumeFailed: true,
          deferred: deferred.ok,
          deferredTo: deferred.deferred_to || null
        };
        logWarn("slot consume failed, compensation applied", { runId, slotId: slot.id, compensation });
      }
      await insertTdCopyArchive({ text: body, lang: slot.lang, mode: slot.mode });
      await insertTdCopyMeta(inferCopyMeta(body, slot.mode, slot.lang));
      await insertXPost({
        lang: slot.lang,
        mode: slot.mode,
        body,
        video_url: videoUrl
      });
      results.push({
        slot,
        candidate: { handle: candidate.target.handle, postId: candidate.post.id },
        tweetId: postResult?.id,
        compensation,
        success: true
      });
    } catch (e) {
      logError("post cycle failed", { runId, message: e.message });
      results.push({
        slot,
        error: e.message,
        success: false
      });
    }
  } else {
    results.push({
      slot,
      candidate: { handle: candidate.target.handle, postId: candidate.post.id },
      body,
      dryRun: true
    });
  }

  return {
    ok: true,
    posted: dryRun ? 0 : results.filter((r) => r.success).length,
    runId,
    deadlineExceeded: !!collectResult.deadlineExceeded,
    results
  };
}

/**
 * 日次スロット生成（Cron用）
 */
async function generateDailySlots() {
  await cleanupOldSlots(CLEANUP_OLDER_THAN_HOURS);
  const slots = generateSlotsForDay(new Date());
  const result = await insertTdPostSlots(slots);
  return { ok: result.ok, count: slots.length, targetDailySlots: DAILY_SLOT_COUNT };
}

module.exports = {
  calculateEngagementScore,
  fetchRecentPostsFromX,
  classifyPostWithGpt4o,
  generateSlotsForDay,
  cleanupOldSlots,
  pickBestBuzzCandidate,
  collectBuzzCandidates,
  generateParasiticCopy,
  runBuzzWeaveCycle,
  generateDailySlots,
  BUZZ_THRESHOLD,
  SLOT_DISTRIBUTION_JST
};
