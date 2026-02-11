/**
 * Trap Defence X Repost OS — Stateless ハンドラー
 * Vercel Serverless 用：req, res を受け取り Search → Pick → Shoot を実行
 */

require("../utils/suppressKnownWarnings");

const { runStatelessQuoteRepost } = require("../services/x/quoteRepostStateless");

/**
 * @param {object} req - Vercel request
 * @param {object} res - Vercel response
 * @param {string} lang - en | es | pt | pt-br | ja | ko | ar
 */
async function handleStatelessQuoteRepost(req, res, lang) {
  const runId = `qr-${lang}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  try {
    console.log(`[QuoteRepost-${lang.toUpperCase()}] Stateless 実行開始 [runId: ${runId}]`);

    const tier = process.env.QUOTE_REPOST_TIER || "mixed";
    const result = await runStatelessQuoteRepost(lang, tier);

    console.log(
      `[QuoteRepost-${lang.toUpperCase()}] Stateless 完了: posted=${result.posted} [runId: ${runId}]`
    );

    return res.status(200).json({
      success: result.ok,
      lang,
      posted: result.posted,
      error: result.error,
      runId,
      mode: "stateless",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[QuoteRepost-${lang.toUpperCase()}] ❌ エラー [runId: ${runId}]:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      lang,
      runId,
      mode: "stateless",
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { handleStatelessQuoteRepost };
