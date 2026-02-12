/**
 * TD BuzzWeave Engine — 1サイクル実行 API
 * Cron: GET /api/buzzweave-run?lang=en など（1 run で 1 言語のみ、round-robin で lang を渡す）
 *
 * 緊急停止: BUZZWEAVE_EMERGENCY_STOP=true で即 return
 * ロック: 多重実行防止のため buzzweave_locks で排他
 */

const { runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");
const { loadEnv } = require("../utils/loadEnv");
const {
  acquireBuzzweaveLock,
  releaseBuzzweaveLock,
  upsertBuzzweaveStatusEmergencyStop,
  getBuzzweaveStatus
} = require("../utils/supabase");
loadEnv();

const BUZZWEAVE_LANGS = ["en", "es", "pt", "ja", "ko", "ar"];

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (process.env.BUZZWEAVE_EMERGENCY_STOP === "true" || process.env.BUZZWEAVE_EMERGENCY_STOP === "1") {
    await upsertBuzzweaveStatusEmergencyStop("env_flag");
    return res.status(200).json({ ok: true, message: "Emergency stop active", posted: 0 });
  }

  const status = await getBuzzweaveStatus();
  if (status.x_api_blocked) {
    return res.status(200).json({ ok: true, message: "X API blocked flag active", posted: 0 });
  }

  const acquired = await acquireBuzzweaveLock();
  if (!acquired) {
    return res.status(200).json({ ok: true, message: "Locked (another run in progress)", posted: 0 });
  }

  const dryRun = req.query?.dry_run === "true" || req.query?.dry_run === "1";
  const langParam = req.query?.lang;
  const langFilter = langParam && BUZZWEAVE_LANGS.includes(langParam)
    ? langParam
    : BUZZWEAVE_LANGS[Math.floor(Date.now() / 60000) % BUZZWEAVE_LANGS.length];

  try {
    const result = await runBuzzWeaveCycle({ dryRun, langFilter });
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-run] error:", e.message);
    return res
      .status(500)
      .setHeader("x-vercel-no-retry", "1")
      .json({ ok: false, message: "Internal error", posted: 0 });
  } finally {
    await releaseBuzzweaveLock();
  }
};
