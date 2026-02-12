/**
 * TD BuzzWeave Engine — Health Check API
 * GET /api/buzzweave-health
 * Authorization: Bearer ${CRON_SECRET}
 */

const {
  getSupabase,
  getTdInfluencers,
  getTdOfficialAccounts,
  getTdPostSlotsInNextHour,
  getTdPostSlotsHealthStats
} = require("../utils/supabase");
const { loadEnv } = require("../utils/loadEnv");
loadEnv();

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({
      ok: false,
      status: "degraded",
      reason: "supabase_not_configured"
    });
  }

  try {
    const env = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      X_API_CONSUMER_KEY: !!process.env.X_API_CONSUMER_KEY,
      X_API_CONSUMER_KEY_SECRET: !!process.env.X_API_CONSUMER_KEY_SECRET,
      X_API_ACCESS_TOKEN: !!process.env.X_API_ACCESS_TOKEN,
      X_API_ACCESS_TOKEN_SECRET: !!process.env.X_API_ACCESS_TOKEN_SECRET
    };
    const [slotsHealth, nextHourSlots, influencers, officials] = await Promise.all([
      getTdPostSlotsHealthStats(),
      getTdPostSlotsInNextHour(),
      getTdInfluencers(null, 1),
      getTdOfficialAccounts(null, 1)
    ]);

    const ok =
      slotsHealth.ok &&
      Array.isArray(nextHourSlots) &&
      influencers.length > 0 &&
      officials.length > 0 &&
      Object.values(env).every(Boolean);

    return res.status(ok ? 200 : 503).json({
      ok,
      status: ok ? "healthy" : "degraded",
      checks: {
        env,
        slots: {
          total: slotsHealth.total_slots ?? null,
          nextHour: Array.isArray(nextHourSlots) ? nextHourSlots.length : null
        },
        targets: {
          influencers_has_data: influencers.length > 0,
          officials_has_data: officials.length > 0
        }
      },
      ts: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      status: "error",
      error: e.message
    });
  }
};

