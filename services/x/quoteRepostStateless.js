/**
 * Trap Defence X Repost OS — Stateless Search → Pick → Shoot
 * KV 禁止・完全 stateless
 */

const {
  searchTweets,
  postQuoteTweet,
  isRateLimitError,
  isFatalTweetError,
  isRetryableError
} = require("./client");
const { getXConfigStatus } = require("./config");
const { tryGenerateGrokPool } = require("./grokPoolStateless");
const {
  getQuotedTweetIdsInLast30Days,
  insertQuotedTweets
} = require("../../utils/supabase");
const {
  buildQuery,
  buildBodyWithMode,
  pickTopN,
  pickVidalyticsLink,
  getLinkKind
} = require("../../config/quoteRepostStateless");

function isoNowMinusMinutes(m) {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Stateless 引用リポスト実行
 * @param {string} lang - en | es | pt | pt-br | ja | ko | ar
 * @param {string} tier - "regular" | "minimal" | "mixed"
 * @param {boolean} dryRun - true なら投稿しない
 * @param {number} count - 1Run あたり最大投稿数（デフォルト: 3）
 * @param {string} mode - "template" | "grok" | "hybrid"（デフォルト: hybrid）
 * @returns {Promise<{ok: boolean, posted: number, results: Array, error?: string}>}
 */
async function runStatelessQuoteRepost(lang, tier = "mixed", dryRun = false, count = 3, mode = "hybrid") {
  const runId = `qr-${lang}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  console.log(
    `[QuoteRepostStateless] Start lang=${lang} count=${count} mode=${mode} tier=${tier} dryRun=${dryRun} [runId: ${runId}]`
  );

  try {
    const xStatus = getXConfigStatus();
    if (!xStatus.configured) {
      console.warn(`[QuoteRepostStateless] X API not configured (runId: ${runId})`);
      return { ok: false, posted: 0, results: [], error: "X API not configured" };
    }
    if (!dryRun && !xStatus.postingEnabled) {
      console.warn(`[QuoteRepostStateless] Posting disabled (runId: ${runId})`);
      return { ok: false, posted: 0, results: [], error: "Posting disabled" };
    }

    // 1. Search
    const query = buildQuery(lang);
    const searchRes = await searchTweets(query, {
      maxResults: 30,
      startTime: isoNowMinusMinutes(120),
      sortOrder: "relevancy"
    });
    const rawTweets = searchRes.data || [];
    const includes = searchRes.includes || {};

    console.log(`[QuoteRepostStateless] Search hits=${rawTweets.length} query="${query}" [runId: ${runId}]`);

    if (!rawTweets.length) {
      return { ok: true, posted: 0, results: [] };
    }

    // 1b. 永続的重複除外（過去30日以内に引用済みの tweet_id を除外）
    const tweetIds = rawTweets.map((t) => String(t.id));
    const quotedInLast30 = await getQuotedTweetIdsInLast30Days(tweetIds);
    const filteredByQuoted = rawTweets.filter((t) => !quotedInLast30.has(String(t.id)));
    if (quotedInLast30.size > 0) {
      console.log(
        `[QuoteRepostStateless] Persistent filter excluded ${quotedInLast30.size} already-quoted [runId: ${runId}]`
      );
    }

    if (!filteredByQuoted.length) {
      return { ok: true, posted: 0, results: [] };
    }

    // 2. Pick（score + ランダム + 同一Run重複排除）
    const { tweets: picked, scores: pickScores } = pickTopN(filteredByQuoted, count, includes);
    const pickedIds = picked.map((t) => t.id);
    const topScores = pickScores.slice(0, 3).map((s) => s.toFixed(2));

    console.log(
      `[QuoteRepostStateless] Pick tweetIds=[${pickedIds.join(", ")}] topScores=[${topScores.join(", ")}] [runId: ${runId}]`
    );

    if (!picked.length) {
      return { ok: true, posted: 0, results: [] };
    }

    // 3. Grokプール生成（mode !== "template" のときだけ）
    let grokPool = [];
    const vidLink = pickVidalyticsLink(lang, tier);
    const linkKind = getLinkKind(lang, vidLink);

    if (mode !== "template") {
      grokPool = await tryGenerateGrokPool({ lang, link: vidLink, n: count });
      console.log(
        `[QuoteRepostStateless] GrokPool generated=${grokPool.length} tier=${tier} linkKind=${linkKind} [runId: ${runId}]`
      );
    } else {
      console.log(`[QuoteRepostStateless] template mode tier=${tier} linkKind=${linkKind} [runId: ${runId}]`);
    }

    // 4. Shoot（2秒間隔・レート制御）
    const results = [];
    let posted = 0;
    const SHOOT_DELAY_MS = 2000;

    for (let i = 0; i < picked.length; i++) {
      if (i > 0 && !dryRun) await sleep(SHOOT_DELAY_MS);

      const t = picked[i];
      const text = buildBodyWithMode(lang, i, tier, mode, grokPool);

      if (dryRun) {
        const len = typeof text === "string" ? text.length : 0;
        console.log(`[QuoteRepostStateless] dryRun tweetId=${t.id} textLen=${len} [runId: ${runId}]`);
        results.push({ tweetId: t.id, ok: true, dryRun: true, text });
        continue;
      }

      try {
        const r = await postQuoteTweet(text, t.id);
        posted++;
        results.push({ tweetId: t.id, ok: true, postedId: r.id });
        console.log(
          `[QuoteRepostStateless] Posted quote ${posted}/${count} for ${lang} (tweetId: ${t.id}) [runId: ${runId}]`
        );
      } catch (e) {
        if (isRateLimitError(e)) {
          console.warn(`[QuoteRepostStateless] rate limited (429) - stopping [runId: ${runId}]`);
          throw e;
        }
        if (isFatalTweetError(e)) {
          console.warn(`[QuoteRepostStateless] Skip tweet ${t.id}: ${e.message} [runId: ${runId}]`);
          continue;
        }
        if (isRetryableError(e)) {
          await sleep(1200);
          try {
            const r2 = await postQuoteTweet(text, t.id);
            posted++;
            results.push({ tweetId: t.id, ok: true, postedId: r2.id, retry: true });
            console.log(
              `[QuoteRepostStateless] Posted (retry) for ${lang} tweetId: ${t.id} [runId: ${runId}]`
            );
          } catch (e2) {
            console.warn(`[QuoteRepostStateless] Retry failed for ${t.id}: ${e2.message} [runId: ${runId}]`);
          }
        } else {
          console.warn(`[QuoteRepostStateless] Skip tweet ${t.id}: ${e.message} [runId: ${runId}]`);
        }
      }
    }

    // 5. 引用後に quoted_tweets へ永続保存
    const toInsert = results
      .filter((r) => r.ok && r.postedId && r.tweetId)
      .map((r) => ({ tweet_id: String(r.tweetId), lang }));
    if (toInsert.length > 0) {
      await insertQuotedTweets(toInsert);
    }

    return { ok: true, posted, results };
  } catch (e) {
    console.error(`[QuoteRepostStateless] Error for ${lang}:`, e.message, `[runId: ${runId}]`);
    return { ok: false, posted: 0, results: [], error: e.message };
  }
}

module.exports = {
  runStatelessQuoteRepost,
};
