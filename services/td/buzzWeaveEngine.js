/**
 * TD BuzzWeave Engine — 引用リポスト最適化エンジン
 * 目的: 高インプレッション・高エンゲージメント・高CVR（すべて逆算）
 *
 * フロー: Search recent Posts → バズ抽出 → 文脈タグ付け → スロット生成 → マッピング → 寄生コピー生成 → 引用リポスト
 */

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
  insertTdCopyArchive,
  insertTdCopyMeta,
  inferCopyMeta,
  insertXPost
} = require("../../utils/supabase");
const { generateXPost } = require("../ai/gpt5mini");

const MODEL = process.env.GPT_MODEL_X_POST || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// バズ閾値（指示書準拠）
const BUZZ_THRESHOLD = { influencer: 200, official: 500 };

// 時間帯分布（JST）600枠/日
const SLOT_DISTRIBUTION_JST = [
  { start: 8, end: 11, count: 120 },
  { start: 12, end: 14, count: 80 },
  { start: 17, end: 20, count: 140 },
  { start: 21, end: 24, count: 180 },
  { start: 0, end: 2, count: 40 },
  { start: 2, end: 6, count: 10 },
  { start: 6, end: 8, count: 30 }
];

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
    console.warn("[BuzzWeave] fetchRecentPostsFromX error:", handle, e.message);
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
    console.warn("[BuzzWeave] classifyPostWithGpt4o error:", e.message);
    return { topic: "crypto", tone: "neutral", lang: "en" };
  }
}

/**
 * 600枠/日のスロットを生成（JST 時間帯分布）
 */
function generateSlotsForDay(date = new Date()) {
  const slots = [];
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);

  const langs = ["en", "es", "pt", "ja", "ko", "ar"];
  const targets = ["influencer", "official", "flexible"];
  const modes = ["minimal", "regular"];

  for (const range of SLOT_DISTRIBUTION_JST) {
    const count = range.count;
    const startH = range.start;
    const endH = range.end === 0 ? 24 : range.end;

    for (let i = 0; i < count; i++) {
      const lang = weightedRandom(langs, LANG_WEIGHTS);
      const target = weightedRandom(targets, TARGET_WEIGHTS);
      const mode = weightedRandom(modes, MODE_WEIGHTS);

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

  return slots.slice(0, 600);
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
  const candidates = [];

  const influencers = await getTdInfluencers(null, limit);
  const officials = await getTdOfficialAccounts(null, limit);

  const targets = [
    ...influencers.map((t) => ({ ...t, target_type: "influencer", org_type: null })),
    ...officials.map((t) => ({ ...t, target_type: "official", org_type: t.org_type }))
  ];

  for (const target of targets.slice(0, 30)) {
    const posts = await fetchRecentPostsFromX(target.handle, { limit: 5 });
    for (const post of posts) {
      const metrics = post.public_metrics || {};
      const score = calculateEngagementScore(metrics);
      const threshold =
        target.target_type === "official"
          ? BUZZ_THRESHOLD.official
          : BUZZ_THRESHOLD.influencer;
      if (score < threshold) continue;

      const context = await classifyPostWithGpt4o(post.text);
      candidates.push({
        target,
        post: {
          id: post.id,
          text: post.text,
          created_at: post.created_at
        },
        engagementScore: score,
        context
      });
    }
  }

  candidates.sort((a, b) => b.engagementScore - a.engagementScore);
  return candidates;
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

  const slots = await getTdPostSlotsInNextHour();
  if (!slots.length) {
    return { ok: true, message: "No slots in next hour", posted: 0 };
  }

  const buzzCandidates = await collectBuzzCandidates({ limit: 50 });
  if (!buzzCandidates.length) {
    return { ok: true, message: "No buzz candidates", posted: 0 };
  }

  const results = [];
  const slot = slots[0];
  const candidate = pickBestBuzzCandidate(buzzCandidates, slot);
  if (!candidate) {
    return { ok: true, message: "No matching candidate for slot", posted: 0 };
  }

  const videoUrl = pickVidalyticsLink(slot.lang, slot.mode);
  const body = await generateParasiticCopy(slot, candidate, videoUrl);

  if (!dryRun) {
    try {
      const postResult = await postQuoteTweet(body, candidate.post.id);
      await consumeTdPostSlot(slot.id);
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
        success: true
      });
    } catch (e) {
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
    results
  };
}

/**
 * 日次スロット生成（Cron用）
 */
async function generateDailySlots() {
  const slots = generateSlotsForDay(new Date());
  const result = await insertTdPostSlots(slots);
  return { ok: result.ok, count: slots.length };
}

module.exports = {
  calculateEngagementScore,
  fetchRecentPostsFromX,
  classifyPostWithGpt4o,
  generateSlotsForDay,
  pickBestBuzzCandidate,
  collectBuzzCandidates,
  generateParasiticCopy,
  runBuzzWeaveCycle,
  generateDailySlots,
  BUZZ_THRESHOLD,
  SLOT_DISTRIBUTION_JST
};
