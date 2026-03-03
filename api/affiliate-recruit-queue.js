/**
 * アフィリエイトリクルート キュー取得 API（手動DM用）
 * GET: 言語別キュー（発見済みアフィリエイター候補）を返す。DM は手動で送る想定。
 */
const { kv } = require("../utils/kv");

const KV_KEY_QUEUE_EN = "affiliate_recruit:queue:en";
const KV_KEY_QUEUE_REGION = (lang) => `affiliate_recruit:queue:${lang}`;
const REGION_LANGS = ["ar", "es", "pt", "ja", "ko"];

function parseQueue(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!kv) {
    return res.status(503).json({
      ok: false,
      error: "KV not available",
      queues: {},
      meta: { description: "Run list cron first to fill queues." }
    });
  }

  const langParam = String(req.query?.lang || "").trim().toLowerCase();
  const langs = langParam
    ? [langParam].filter((l) => l === "en" || REGION_LANGS.includes(l))
    : ["en", ...REGION_LANGS];

  const queues = {};
  for (const lang of langs) {
    const key = lang === "en" ? KV_KEY_QUEUE_EN : KV_KEY_QUEUE_REGION(lang);
    const raw = await kv.get(key);
    const items = parseQueue(raw);
    queues[lang] = items.map((x) => ({
      username: x.username || x.handle,
      author_id: x.author_id,
      score: x.score,
      angle: x.angle,
      recommended_angle: x.recommended_angle
    }));
  }

  const total = Object.values(queues).reduce((s, arr) => s + arr.length, 0);

  return res.status(200).json({
    ok: true,
    queues,
    total,
    meta: {
      description: "Discovered affiliate candidates. DM manually via X. List crons fill queues; send cron is disabled.",
      lang: langParam || "all"
    }
  });
};
