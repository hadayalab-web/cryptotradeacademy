/**
 * POST /api/telegram-scout-refill
 * パイプライン出力（targets JSON 配列）を KV に投入する。
 * - Cron は「毎日10時に daily を組み立てる」だけで、KV 補充は行わない。
 * - 前夜に run_pipeline.py を実行した環境から、出力 JSON を POST して KV を補充する用途。
 * - 認証: Authorization: Bearer ${CRON_SECRET} または query cron_secret（未設定ならスキップ）
 */
const { kv } = require("../utils/kv");

const KV_PREFIX = "tg_scout";
const KEY_IDS = `${KV_PREFIX}:ids`;

function authOk(req) {
  const secret = process.env.CRON_SECRET || process.env.TELEGRAM_SCOUT_REFILL_SECRET || "";
  if (!secret.trim()) return true;
  const header = req.headers?.authorization || "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const query = (req.query?.cron_secret || req.query?.refill_secret || "").trim();
  return bearer === secret || query === secret;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!authOk(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let list;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "[]") : req.body || [];
    list = Array.isArray(body) ? body : (body.targets && Array.isArray(body.targets) ? body.targets : []);
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body. Expect array of targets or { targets: [] }" });
  }

  const ids = [];
  for (const t of list) {
    const id = String(t.user_id ?? t.userId ?? "");
    if (!id) continue;
    const key = `${KV_PREFIX}:target:${id}`;
    await kv.set(key, JSON.stringify(t));
    ids.push(id);
  }

  await kv.set(KEY_IDS, JSON.stringify(ids));

  return res.status(200).json({
    ok: true,
    message: "Refilled KV with telegram scout targets",
    count: ids.length,
    keyIds: KEY_IDS,
  });
};
