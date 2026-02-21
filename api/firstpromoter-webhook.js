/**
 * FirstPromoter Webhook 受信（Promoter Accepted / Lead Signup 等）
 * プロモーター登録を KV に記録し、DM 送信済み @handle との突き合わせに利用可能にする。
 * 参照: docs/INTEGRATION_WHOP_X_FIRSTPROMOTER.md §3, §5
 */
const { kv } = require("../utils/kv");

const WEBHOOK_SECRET = process.env.FIRSTPROMOTER_WEBHOOK_SECRET;
const KV_PREFIX = "firstpromoter:";

function getPayload(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return null;
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = getPayload(req);
  if (!payload) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  if (WEBHOOK_SECRET) {
    const sig = req.headers?.["x-firstpromoter-signature"] || req.headers?.["x-webhook-signature"];
    if (!sig || sig !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const eventType = payload.type || payload.event_type || payload.event;
  const promoterId = payload.promoter_id ?? payload.promoter?.id;
  const email = payload.email ?? payload.promoter?.email;
  const acceptedAt = payload.created_at ?? payload.accepted_at ?? new Date().toISOString();

  if (eventType && (promoterId || email)) {
    if (kv) {
      try {
        const key = `${KV_PREFIX}promoter:${promoterId || email}`;
        await kv.set(key, {
          eventType,
          promoterId,
          email: email || null,
          acceptedAt,
          rawType: eventType
        }, { ex: 86400 * 365 });
        const listKey = `${KV_PREFIX}events:list`;
        const list = (await kv.get(listKey)) || [];
        list.push({ eventType, promoterId, email, acceptedAt: acceptedAt.slice(0, 19) });
        if (list.length > 1000) list.splice(0, list.length - 500);
        await kv.set(listKey, list, { ex: 86400 * 30 });
      } catch (e) {
        console.warn("[firstpromoter-webhook] KV write error:", e?.message);
      }
    }
  }

  res.status(200).json({ received: true, eventType });
};
