/**
 * 送信済みフラグを KV に記録（重複送信防止）
 * POST /api/telegram-scout-mark-sent
 * Body: JSON { "user_id": 123456789 } または { "user_id": "123456789" }
 * 複数: { "user_ids": [123, 456] }
 */
const { kv } = require("../utils/kv");

const KV_PREFIX = "tg_scout";
const SENT_PREFIX = `${KV_PREFIX}:sent`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const userId = body.user_id != null ? String(body.user_id) : null;
  const userIds = Array.isArray(body.user_ids) ? body.user_ids.map((id) => String(id)) : userId ? [userId] : [];
  if (userIds.length === 0) {
    return res.status(400).json({ error: "Missing user_id or user_ids" });
  }

  const sentAt = new Date().toISOString();
  const batchId = body.batch_id != null ? String(body.batch_id) : sentAt.slice(0, 10);

  try {
    for (const uid of userIds) {
      await kv.set(`${SENT_PREFIX}:${uid}`, JSON.stringify({ sentAt, batchId }));
    }
    return res.status(200).json({
      ok: true,
      marked: userIds.length,
      sentAt,
      batchId
    });
  } catch (e) {
    console.error("[telegram-scout-mark-sent]", e.message);
    return res.status(500).json({ error: e.message || "KV error" });
  }
};
