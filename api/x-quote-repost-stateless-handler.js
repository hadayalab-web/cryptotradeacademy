/**
 * Trap Defence X Repost OS — Stateless ハンドラー
 * Vercel Serverless 用：req, res を受け取り Search → Pick → Shoot を実行
 * QueryParam:
 *   dryRun=1|0（1=投稿しない）
 *   count=1〜10（デフォルト3）
 *   tier=mixed|minimal|regular
 *   mode=template|grok|hybrid（デフォルトhybrid）
 */

require("../utils/suppressKnownWarnings");

const { runStatelessQuoteRepost } = require("../services/x/quoteRepostStateless");

function getDefaultCount(lang) {
  if (lang === "en") return 4;
  if (lang === "ja" || lang === "ko") return 2;
  return 3;
}

function parseQuery(req, lang) {
  let q = req.query;
  if (!q && req.url) {
    try {
      const u = new URL(req.url, "http://localhost");
      q = Object.fromEntries(u.searchParams);
    } catch {
      q = {};
    }
  }
  q = q || {};
  const dryRun = q.dryRun === "1";
  const defaultCount = getDefaultCount(lang);
  const count = Math.min(Math.max(1, parseInt(q.count, 10) || defaultCount), 10);
  const tierRaw = (q.tier || process.env.QUOTE_REPOST_TIER || "mixed").toLowerCase();
  const tier = ["mixed", "minimal", "regular"].includes(tierRaw) ? tierRaw : "mixed";
  const modeRaw = (q.mode || "hybrid").toLowerCase();
  const mode = ["template", "grok", "hybrid"].includes(modeRaw) ? modeRaw : "hybrid";
  return { dryRun, count, tier, mode };
}

/**
 * @param {object} req - Vercel request
 * @param {object} res - Vercel response
 * @param {string} lang - en | es | pt | pt-br | ja | ko | ar
 */
async function handleStatelessQuoteRepost(req, res, lang) {
  const runId = `qr-${lang}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const { dryRun, count, tier, mode } = parseQuery(req, lang);

  try {
    const result = await runStatelessQuoteRepost(lang, tier, dryRun, count, mode);

    console.log(
      `[QuoteRepost-${lang.toUpperCase()}] Stateless 完了: posted=${result.posted} [runId: ${runId}]`
    );

    return res.status(200).json({
      success: result.ok,
      lang,
      posted: result.posted,
      results: result.results,
      error: result.error,
      runId,
      mode,
      dryRun,
      count,
      tier,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[QuoteRepost-${lang.toUpperCase()}] ❌ エラー [runId: ${runId}]:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      lang,
      runId,
      mode,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { handleStatelessQuoteRepost };
