/**
 * TD BuzzWeave Engine — 1サイクル実行 API
 * Cron: GET /api/buzzweave-run
 * 次1時間のスロット → バズ候補マッピング → 寄生コピー生成 → 引用リポスト
 *
 * 運用:
 * - Vercel cron は最短1分のため、90秒間隔は外部Cron（GitHub Actions / cron-job.org 等）で本APIを呼び出す。
 * - Authorization: Bearer ${CRON_SECRET}
 */

const { runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");
const { loadEnv } = require("../utils/loadEnv");
loadEnv();

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const dryRun = req.query?.dry_run === "true" || req.query?.dry_run === "1";

  try {
    const result = await runBuzzWeaveCycle({ dryRun });
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-run] error:", e.message);
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
};
