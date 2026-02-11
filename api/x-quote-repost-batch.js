/**
 * Trap Defence OS — 600投稿/日 バッチ
 * 7分ごとに 3投稿（150秒間隔）、言語ローテーション
 * 奇数バッチ: EN, ES, PT | 偶数バッチ: JA, KO, AR
 */
require("../utils/suppressKnownWarnings");

const { runStatelessQuoteRepost } = require("../services/x/quoteRepostStateless");

const BATCH_INTERVAL_SEC = 150;
const LANG_GROUP_A = ["en", "es", "pt"];
const LANG_GROUP_B = ["ja", "ko", "ar"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = async function handler(req, res) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const runId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const batchIndex = Math.floor(Date.now() / (7 * 60 * 1000));
  const isOdd = batchIndex % 2 === 1;
  const langs = isOdd ? LANG_GROUP_A : LANG_GROUP_B;

  console.log(`[QuoteRepostBatch] Start ${runId} batchIndex=${batchIndex} langs=[${langs.join(",")}]`);

  const results = [];
  let totalPosted = 0;

  for (let i = 0; i < langs.length; i++) {
    if (i > 0) await sleep(BATCH_INTERVAL_SEC * 1000);

    const lang = langs[i];
    try {
      const r = await runStatelessQuoteRepost(lang, "mixed", false, 1, "hybrid");
      totalPosted += r.posted || 0;
      results.push({ lang, posted: r.posted, ok: r.ok, error: r.error });
    } catch (e) {
      console.warn(`[QuoteRepostBatch] ${lang} error:`, e.message);
      results.push({ lang, posted: 0, ok: false, error: e.message });
    }
  }

  console.log(`[QuoteRepostBatch] Done ${runId} totalPosted=${totalPosted}`);
  return res.status(200).json({
    ok: true,
    runId,
    batchIndex,
    langs,
    totalPosted,
    results
  });
};
