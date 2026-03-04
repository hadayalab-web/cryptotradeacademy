/**
 * Telegram スカウト用ターゲット一覧（KV から取得・目視用）
 * GET /api/telegram-scout-targets?limit=100&offset=0
 * 戻り: { targets: [...], total }
 */
const { kv } = require("../utils/kv");

const KV_PREFIX = "tg_scout";
const KEY_IDS = `${KV_PREFIX}:ids`;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  try {
    const idsJson = await kv.get(KEY_IDS);
    const ids = Array.isArray(idsJson) ? idsJson : (typeof idsJson === "string" ? JSON.parse(idsJson || "[]") : []);
    const total = ids.length;
    const slice = ids.slice(offset, offset + limit);

    const targets = [];
    for (const id of slice) {
      const key = `${KV_PREFIX}:target:${id}`;
      const raw = await kv.get(key);
      if (raw != null) {
        const t = typeof raw === "string" ? JSON.parse(raw) : raw;
        targets.push(t);
      }
    }

    return res.status(200).json({
      targets,
      total,
      limit,
      offset
    });
  } catch (e) {
    console.error("[telegram-scout-targets]", e.message);
    return res.status(500).json({ error: e.message || "KV error" });
  }
};
