/**
 * 毎日 JST 10:00 用: 最新200リスト ＋ ターゲットごとの message30 を組み立てて返す／KV に保存
 * - Cron が JST 10:00（UTC 01:00）に呼ぶと、KV のターゲットから 200 件を取得し、各件に message30 を付与して KV に保存
 * - GET /api/telegram-scout-daily … 当日分の「200リスト＋メッセージ」を返す（未生成ならこのタイミングで生成）
 * - ?format=csv … CSV で出力（username, message 等）
 * - ?date=YYYY-MM-DD … 指定日のスナップショットを取得（あれば）
 * - ?rebuild=1 … キャッシュを無視して再生成
 */
const { kv } = require("../utils/kv");
const { getScout30Message } = require("../config/telegramScout30Templates");

const KV_PREFIX = "tg_scout";
const KEY_IDS = `${KV_PREFIX}:ids`;
const DAILY_PREFIX = `${KV_PREFIX}:daily`;
const MAX_LIST = 200;

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
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
    targetsWithMessage.push({ ...t, message });
  }
  const payload = {
    date: dateKey,
    generatedAt: new Date().toISOString(),
    total: targetsWithMessage.length,
    targets: targetsWithMessage
  };
  await kv.set(`${DAILY_PREFIX}:${dateKey}`, JSON.stringify(payload));
  return payload;
}

function toCsv(targets) {
  const header = "user_id,username,first_name,last_name,category,language,group_name,message";
  const rows = (targets || []).map((t) => {
    const msg = (t.message || "").replace(/\r?\n/g, " ").replace(/"/g, '""');
    return [
      t.user_id ?? "",
      (t.username ?? "").replace(/"/g, '""'),
      (t.first_name ?? "").replace(/"/g, '""'),
      (t.last_name ?? "").replace(/"/g, '""'),
      t.category ?? "",
      t.language ?? "",
      (t.group_name ?? "").replace(/"/g, '""'),
      `"${msg}"`
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
