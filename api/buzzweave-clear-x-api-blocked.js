/**
 * BuzzWeave — X API blocked フラグの解除 API
 *
 * Token 修正後や 402 解消後に呼び出し、BuzzWeave の run を再開する。
 * 認証: CRON_SECRET（Bearer または cron_secret クエリ）
 *
 * GET /api/buzzweave-clear-x-api-blocked?cron_secret=xxx
 * POST /api/buzzweave-clear-x-api-blocked (Authorization: Bearer xxx)
 */
require("../utils/suppressKnownWarnings");

const { clearBuzzweaveStatusXApiBlocked, getBuzzweaveStatus } = require("../utils/supabase");
const { loadEnv } = require("../utils/loadEnv");
loadEnv();

async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const querySecret = req.query?.cron_secret;
  const authOk = !cronSecret || authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
  if (!authOk) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const before = await getBuzzweaveStatus();
    const result = await clearBuzzweaveStatusXApiBlocked();

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: result.error || "Failed to clear",
        x_api_blocked_before: before.x_api_blocked
      });
    }

    const after = await getBuzzweaveStatus();
    console.log("[buzzweave-clear-x-api-blocked] Cleared. x_api_blocked:", before.x_api_blocked, "→", after.x_api_blocked);
    return res.status(200).json({
      ok: true,
      message: "x_api_blocked cleared. Next buzzweave-run will attempt X API again.",
      x_api_blocked_before: before.x_api_blocked,
      x_api_blocked_after: after.x_api_blocked
    });
  } catch (e) {
    console.error("[buzzweave-clear-x-api-blocked] Error:", e?.message);
    return res.status(500).json({ ok: false, error: e?.message || "Internal error" });
  }
}

module.exports = handler;
module.exports.config = { runtime: "nodejs" };
