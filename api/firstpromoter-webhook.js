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
  // DM→登録紐づけ用。FirstPromoter が招待 URL の ref をエコーする場合に利用
  const ref =
    payload.ref ??
    payload.referral_id ??
    payload.referral_code ??
    payload.visitor_id ??
    payload.ref_id ??
    payload.referrer_id;

  if (eventType && (promoterId || email)) {
    if (kv) {
      try {
        const key = `${KV_PREFIX}promoter:${promoterId || email}`;
        await kv.set(key, {
          eventType,
          promoterId,
          email: email || null,
          acceptedAt,
          rawType: eventType,
          ref: ref ?? null
        }, { ex: 86400 * 365 });
        const listKey = `${KV_PREFIX}events:list`;
        const list = (await kv.get(listKey)) || [];
        list.push({ eventType, promoterId, email, acceptedAt: acceptedAt.slice(0, 19), ref: ref ?? null });
        if (list.length > 1000) list.splice(0, list.length - 500);
        await kv.set(listKey, list, { ex: 86400 * 30 });

        // ref ありなら DM 送信ログと突き合わせ可能に（affiliate-recruit-funnel 用）
        if (ref) {
          const refKey = `${KV_PREFIX}signup:ref:${String(ref)}`;
          await kv.set(
            refKey,
            { ref: String(ref), promoterId, email: email || null, acceptedAt, eventType },
            { ex: 86400 * 365 }
          );
          const refsListKey = `${KV_PREFIX}signup_refs:list`;
          const refsList = (await kv.get(refsListKey)) || [];
          if (!refsList.includes(String(ref))) {
            refsList.push(String(ref));
            if (refsList.length > 500) refsList.splice(0, refsList.length - 400);
            await kv.set(refsListKey, refsList, { ex: 86400 * 365 });
          }
        }
      } catch (e) {
        console.warn("[firstpromoter-webhook] KV write error:", e?.message);
      }
    }
  }

  res.status(200).json({ received: true, eventType });
};
