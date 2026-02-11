/**
 * Trap Defence X Repost OS — Stateless Search → Pick → Shoot
 * KV 禁止・完全 stateless
 */

const { searchTweets, postQuoteTweet, isRateLimitError } = require("./client");
const { getXConfigStatus } = require("./config");
const {
  buildSearchQuery,
  buildBody,
  pickTopN,
} = require("../../config/quoteRepostStateless");

/**
 * Stateless 引用リポスト実行
 * @param {string} lang - en | es | pt | pt-br | ja | ko | ar
 * @param {string} tier - "regular" | "minimal" | "mixed"
 * @returns {Promise<{ok: boolean, posted: number, error?: string}>}
 */
async function runStatelessQuoteRepost(lang, tier = "mixed") {
  const runId = `qr-${lang}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    const xStatus = getXConfigStatus();
    if (!xStatus.configured) {
      console.warn(`[QuoteRepostStateless] X API not configured (runId: ${runId})`);
      return { ok: false, posted: 0, error: "X API not configured" };
    }
    if (!xStatus.postingEnabled) {
      console.warn(`[QuoteRepostStateless] Posting disabled (runId: ${runId})`);
      return { ok: false, posted: 0, error: "Posting disabled" };
    }

    // 1. Search
    const query = buildSearchQuery(lang);
    const searchRes = await searchTweets(query, {
      maxResults: 30,
      sortOrder: "recency",
    });

    if (!searchRes?.data?.length) {
      console.log(`[QuoteRepostStateless] No tweets found for ${lang} (runId: ${runId})`);
      return { ok: true, posted: 0 };
    }

    // 2. Pick
    const top3 = pickTopN(searchRes.data, 3);

    // 3. Shoot
    let posted = 0;
    for (let i = 0; i < top3.length; i++) {
      try {
        const text = buildBody(lang, i, tier);
        const tweetId = top3[i].id;
        await postQuoteTweet(text, tweetId);
        posted++;
        console.log(`[QuoteRepostStateless] Posted quote ${posted}/3 for ${lang} (tweetId: ${tweetId}) [runId: ${runId}]`);
      } catch (e) {
        if (isRateLimitError && isRateLimitError(e)) {
          console.warn(`[QuoteRepostStateless] 429 Rate limit hit, stopping (runId: ${runId})`);
          throw e;
        }
        // 400/403/404/503: スキップして次へ
        console.warn(`[QuoteRepostStateless] Skip tweet ${top3[i].id}: ${e.message} [runId: ${runId}]`);
      }
    }

    return { ok: true, posted };
  } catch (e) {
    console.error(`[QuoteRepostStateless] Error for ${lang}:`, e.message, `[runId: ${runId}]`);
    return { ok: false, posted: 0, error: e.message };
  }
}

module.exports = {
  runStatelessQuoteRepost,
};
