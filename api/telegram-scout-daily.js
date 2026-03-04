/**
 * 毎日 JST 10:00 用: 最新200リスト ＋ ターゲットごとの message30 を組み立てて返す／KV に保存
 * - 各ターゲットに送信済みフラグ（sentAt）を KV から付与。重複送信防止用。
 * - CSV はコピペ最適化: username, message, category, group_name を先頭に。
 * - ストックが MIN_STOCK_THRESHOLD 未満のとき TELEGRAM_SCOUT_ALERT_WEBHOOK_URL に通知。
 */
const { kv } = require("../utils/kv");
const { getScout30Message } = require("../config/telegramScout30Templates");

const KV_PREFIX = "tg_scout";
const KEY_IDS = `${KV_PREFIX}:ids`;
const DAILY_PREFIX = `${KV_PREFIX}:daily`;
const SENT_PREFIX = `${KV_PREFIX}:sent`;
const MAX_LIST = 200;
const MIN_STOCK_THRESHOLD = 200;

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchSentAt(userId) {
  const raw = await kv.get(`${SENT_PREFIX}:${userId}`);
  if (raw == null) return null;
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    return o.sentAt || null;
  } catch {
    return null;
  }
}

async function notifyLowStock(total) {
  const url = process.env.TELEGRAM_SCOUT_ALERT_WEBHOOK_URL || "";
  if (!url.trim()) return;
  const text = `[Telegram Scout] 弾薬不足: KV ターゲットが ${total} 件です（${MIN_STOCK_THRESHOLD} 件未満）。run_pipeline.py と telegram-scout-to-kv.js で補充してください。`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text })
    });
  } catch (e) {
    console.error("[telegram-scout-daily] Alert webhook failed:", e.message);
  }
}

async function buildDailyPayload(dateKey) {
  const idsRaw = await kv.get(KEY_IDS);
  const ids = Array.isArray(idsRaw)
    ? idsRaw
    : typeof idsRaw === "string"
      ? JSON.parse(idsRaw || "[]")
      : [];
  const slice = ids.slice(0, MAX_LIST);
  const targetsWithMessage = [];
  for (const id of slice) {
    const raw = await kv.get(`${KV_PREFIX}:target:${id}`);
    if (raw == null) continue;
    const t = typeof raw === "string" ? JSON.parse(raw) : raw;
    const lang = t.language || t.lang || "en";
    const category = t.category || "Admin";
    const market = t.market || undefined;
    const message = getScout30Message(lang, category, market) || "";
    const sentAt = await fetchSentAt(t.user_id ?? id);
    targetsWithMessage.push({ ...t, message, sentAt: sentAt || undefined });
  }
  const payload = {
    date: dateKey,
    generatedAt: new Date().toISOString(),
    total: targetsWithMessage.length,
    targets: targetsWithMessage
  };
  await kv.set(`${DAILY_PREFIX}:${dateKey}`, JSON.stringify(payload));
  if (payload.total < MIN_STOCK_THRESHOLD) {
    await notifyLowStock(payload.total);
  }
  return payload;
}

/** コピペ最適化: t.me/username → メッセージコピペ → 送信 の流れで崩さない順 */
function toCsv(targets) {
  const header = "username,message,category,group_name,user_id,first_name,last_name,language,sent_at";
  const rows = (targets || []).map((t) => {
    const msg = (t.message || "").replace(/\r?\n/g, " ").replace(/"/g, '""');
    return [
      (t.username ?? "").replace(/"/g, '""'),
      `"${msg}"`,
      t.category ?? "",
      (t.group_name ?? "").replace(/"/g, '""'),
      t.user_id ?? "",
      (t.first_name ?? "").replace(/"/g, '""'),
      (t.last_name ?? "").replace(/"/g, '""'),
      t.language ?? "",
      t.sentAt ?? ""
    ].join(",");
  });
  return "\uFEFF" + header + "\n" + rows.join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dateParam = (req.query.date || "").trim();
  const dateKey = dateParam || todayUtc();
  const format = (req.query.format || "").toLowerCase();
  const rebuild = req.query.rebuild === "1" || req.query.rebuild === "true";

  try {
    let payload = null;
    if (!rebuild && !dateParam) {
      const cached = await kv.get(`${DAILY_PREFIX}:${dateKey}`);
      if (cached != null) {
        payload = typeof cached === "string" ? JSON.parse(cached) : cached;
      }
    }
    if (payload == null) {
      payload = await buildDailyPayload(dateKey);
    }

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="telegram-scout-daily-${dateKey}.csv"`);
      return res.status(200).send(toCsv(payload.targets));
    }

    return res.status(200).json(payload);
  } catch (e) {
    console.error("[telegram-scout-daily]", e.message);
    return res.status(500).json({ error: e.message || "KV error" });
  }
};
