// api/x-discover-and-stock-from-targets.js
// リスト検索を Grok (grok-4-1-fast-reasoning) と Gemini (gemini-3-pro-preview) で実行し、
// X API で実在を確認できたもののみ KV 在庫にストックする。手動実行用。

const { discoverAndStockFromTargets } = require("../services/x/discoverAndStockFromTargets");

const TIMEOUT_MS = 55000;

module.exports = async function handler(req, res) {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const checkTimeout = () => {
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error(`Timeout: ${TIMEOUT_MS}ms exceeded`);
    }
  };

  try {
    const lang = (req.query?.lang || req.body?.lang || "en").toLowerCase();
    const merge = req.query?.merge !== "false" && req.body?.merge !== false;
    const includeOfficial = req.query?.includeOfficial !== "false" && req.body?.includeOfficial !== false;
    const maxPerModel = parseInt(req.query?.maxPerModel || req.body?.maxPerModel || "25", 10);

    checkTimeout();
    const result = await discoverAndStockFromTargets(lang, {
      maxPerModel: Math.min(50, Math.max(5, maxPerModel)),
      mergeWithExisting: merge,
      includeOfficial
    });
    checkTimeout();

    return res.status(200).json({
      success: result.success,
      lang,
      verified: result.verified,
      officialVerified: result.officialVerified,
      saved: result.saved,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[DiscoverAndStockFromTargets API]", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
