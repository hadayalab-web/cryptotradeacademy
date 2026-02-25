/**
 * アフィリエイトリクルート 完全血流 API（観測ダッシュボード用）
 * GET: 送信数（言語×スコア帯）+ FirstPromoter 登録数 + ref 紐づき登録数 + Whop 成約数（直近30日）を返す。
 * 設計: docs/AFFILIATE_RECRUIT_FULL_BLOODFLOW_DASHBOARD_DESIGN.md
 */
const { kv } = require("../utils/kv");

const RECRUIT_STATS_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];
const KV_KEY_STATS_LANG = (lang) => `affiliate_recruit:stats:lang:${lang}`;
const KV_KEY_STATS_LANG_BAND = (lang, band) => `affiliate_recruit:stats:lang:${lang}:band:${band}`;
const KV_KEY_REF_SENT = (ref) => `affiliate_recruit:ref_sent:${ref}`;
const FIRSTPROMOTER_EVENTS_LIST = "firstpromoter:events:list";
const FIRSTPROMOTER_SIGNUP_REFS_LIST = "firstpromoter:signup_refs:list";
const FIRSTPROMOTER_SIGNUP_REF = (ref) => `firstpromoter:signup:ref:${ref}`;
const CONVERSION_COUNT_KEY = (type, dateStr) => `conversion:${type}:${dateStr}:count`;
const SALES_DAYS = 30;

function parseCount(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function getScoreBand(score) {
  if (score == null || typeof score !== "number") return "0-49";
  if (score < 50) return "0-49";
  if (score < 65) return "50-64";
  if (score < 80) return "65-79";
  return "80-100";
}

async function getSentStats() {
  const keys = [];
  for (const lang of RECRUIT_STATS_LANGS) {
    keys.push({ type: "lang", lang, key: KV_KEY_STATS_LANG(lang) });
    for (const band of SCORE_BANDS) {
      keys.push({ type: "band", lang, band, key: KV_KEY_STATS_LANG_BAND(lang, band) });
    }
  }
  const values = await Promise.all(keys.map(({ key }) => kv.get(key)));

  const byLang = {};
  const byLangScore = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    byLang[lang] = 0;
    byLangScore[lang] = { "0-49": 0, "50-64": 0, "65-79": 0, "80-100": 0 };
  }
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const count = parseCount(values[i]);
    if (k.type === "lang") {
      byLang[k.lang] = count;
    } else {
      byLangScore[k.lang][k.band] = count;
    }
  }
  const total = Object.values(byLang).reduce((a, b) => a + b, 0);
  return { total, byLang, byLangScore };
}

async function getSignupsStats() {
  const list = await kv.get(FIRSTPROMOTER_EVENTS_LIST);
  const arr = Array.isArray(list) ? list : [];
  return {
    total: arr.length,
    recentEvents: arr.slice(-20).reverse()
  };
}

/** ref 紐づき登録: FirstPromoter の ref 付き登録のうち、当方 DM 送信（ref_sent）と一致した件数を言語×スコア帯で集計 */
async function getSignupsAttributed() {
  const refsList = (await kv.get(FIRSTPROMOTER_SIGNUP_REFS_LIST)) || [];
  const byLang = {};
  const byLangScore = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    byLang[lang] = 0;
    byLangScore[lang] = { "0-49": 0, "50-64": 0, "65-79": 0, "80-100": 0 };
  }
  let total = 0;
  for (const ref of refsList) {
    const sentRow = await kv.get(KV_KEY_REF_SENT(ref));
    if (!sentRow) continue;
    let parsed;
    try {
      parsed = typeof sentRow === "string" ? JSON.parse(sentRow) : sentRow;
    } catch (_) {
      continue;
    }
    const lang = parsed.lang && RECRUIT_STATS_LANGS.includes(parsed.lang) ? parsed.lang : "en";
    const score = parsed.score != null ? Number(parsed.score) : 0;
    const band = getScoreBand(score);
    byLang[lang] = (byLang[lang] || 0) + 1;
    byLangScore[lang][band] = (byLangScore[lang][band] || 0) + 1;
    total += 1;
  }
  return { total, byLang, byLangScore };
}

async function getSalesStats() {
  let totalMinimal = 0;
  let totalRegular = 0;
  const byDate = [];

  for (let i = 0; i < SALES_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const minimal = parseCount(await kv.get(CONVERSION_COUNT_KEY("minimal", dateStr)));
    const regular = parseCount(await kv.get(CONVERSION_COUNT_KEY("regular", dateStr)));
    totalMinimal += minimal;
    totalRegular += regular;
    byDate.push({ date: dateStr, minimal, regular });
  }

  return {
    total: totalMinimal + totalRegular,
    minimal: totalMinimal,
    regular: totalRegular,
    lastNDays: SALES_DAYS,
    byDate: byDate.reverse()
  };
}

const handler = async function (req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!kv) {
    return res.status(503).json({
      error: "KV not available",
      sent: { total: 0, byLang: {}, byLangScore: {} },
      signups: { total: 0, recentEvents: [] },
      signupsAttributed: { total: 0, byLang: {}, byLangScore: {}, conversionRateByLang: {} },
      sales: { total: 0, minimal: 0, regular: 0, lastNDays: SALES_DAYS, byDate: [] }
    });
  }

  const [sent, signups, signupsAttributed, sales] = await Promise.all([
    getSentStats(),
    getSignupsStats(),
    getSignupsAttributed(),
    getSalesStats()
  ]);

  const conversionRateByLang = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    const sentCount = sent.byLang[lang] || 0;
    const attributedCount = signupsAttributed.byLang[lang] || 0;
    conversionRateByLang[lang] =
      sentCount > 0 ? Math.round((attributedCount / sentCount) * 10000) / 100 : 0;
  }
  signupsAttributed.conversionRateByLang = conversionRateByLang;

  return res.status(200).json({
    ok: true,
    sent,
    signups,
    signupsAttributed,
    sales,
    meta: {
      description:
        "Affiliate recruit funnel: sent DMs, FirstPromoter signups, ref-attributed signups (DM→LP→Signup), Whop sales. Ref = author_id on invite URL.",
      salesSource: "conversion:minimal|regular:YYYY-MM-DD:count (from Whop webhook)"
    }
  });
};

handler.getSentStats = getSentStats;
handler.getSignupsAttributed = getSignupsAttributed;
handler.RECRUIT_STATS_LANGS = RECRUIT_STATS_LANGS;
handler.SCORE_BANDS = SCORE_BANDS;
module.exports = handler;
