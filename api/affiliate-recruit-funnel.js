/**
 * アフィリエイトリクルート 完全血流 API（観測ダッシュボード用）
 * GET: 送信数（言語×スコア帯）+ ref 紐づきクリック + 成約数（直近30日）を返す。
 * 設計: docs/AFFILIATE_RECRUIT_FULL_BLOODFLOW_DASHBOARD_DESIGN.md
 */
const { kv } = require("../utils/kv");

const RECRUIT_STATS_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];
const KV_KEY_STATS_LANG = (lang) => `affiliate_recruit:stats:lang:${lang}`;
const KV_KEY_STATS_LANG_BAND = (lang, band) => `affiliate_recruit:stats:lang:${lang}:band:${band}`;
const KV_KEY_REF_SENT = (ref) => `affiliate_recruit:ref_sent:${ref}`;
const KV_KEY_CLICK_REF = (ref) => `affiliate_recruit:click:ref:${ref}`;
const AFFILIATE_RECRUIT_CLICK_REFS_LIST = "affiliate_recruit:click_refs:list";
const AFFILIATE_RECRUIT_CLICK_EVENTS_LIST = "affiliate_recruit:click_events:list";
const CONVERSION_COUNT_KEY = (type, dateStr) => `conversion:${type}:${dateStr}:count`;
const AFFILIATE_CONVERSION_COUNT_KEY = (type, dateStr) =>
  `affiliate_recruit:conversion:affiliate:${type}:${dateStr}:count`;
const SALES_DAYS = 30;

function parseCount(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseObject(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function resolveEventType(row) {
  if (!row || typeof row !== "object") return "";
  return row.eventType || row.event_type || row.type || row.rawType || row.event || "";
}

function getScoreBand(score) {
  if (score == null || typeof score !== "number") return "0-49";
  if (score < 50) return "0-49";
  if (score < 65) return "50-64";
  if (score < 80) return "65-79";
  return "80-100";
}

function createByLangZero() {
  const byLang = {};
  for (const lang of RECRUIT_STATS_LANGS) byLang[lang] = 0;
  return byLang;
}

function createByLangScoreZero() {
  const byLangScore = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    byLangScore[lang] = { "0-49": 0, "50-64": 0, "65-79": 0, "80-100": 0 };
  }
  return byLangScore;
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

/** ref 紐づきクリック: DM 送信ログ（ref_sent）と click:ref を突き合わせ、言語×スコア帯で集計 */
async function getClicksAttributed() {
  const refsListRaw = (await kv.get(AFFILIATE_RECRUIT_CLICK_REFS_LIST)) || [];
  const refsList = Array.isArray(refsListRaw) ? refsListRaw : [];
  const byLang = createByLangZero();
  const byLangScore = createByLangScoreZero();
  const recentClicks = [];
  let totalUnique = 0;
  let totalClicks = 0;

  for (const rawRef of refsList) {
    const ref = String(rawRef || "").trim();
    if (!ref) continue;

    const [sentRow, clickRow] = await Promise.all([
      kv.get(KV_KEY_REF_SENT(ref)),
      kv.get(KV_KEY_CLICK_REF(ref))
    ]);
    if (!clickRow) continue;

    const click = parseObject(clickRow) || {};
    const clickCount = Math.max(1, Number(click.count) || 1);
    totalClicks += clickCount;

    if (!sentRow) continue;
    const sent = parseObject(sentRow);
    if (!sent) continue;

    const lang = sent.lang && RECRUIT_STATS_LANGS.includes(sent.lang) ? sent.lang : "en";
    const score = sent.score != null ? Number(sent.score) : 0;
    const band = getScoreBand(score);
    byLang[lang] = (byLang[lang] || 0) + 1;
    byLangScore[lang][band] = (byLangScore[lang][band] || 0) + 1;
    totalUnique += 1;

    recentClicks.push({
      ref,
      handle: sent.handle || click.handle || null,
      lang,
      angle: sent.angle || click.angle || null,
      clickCount,
      firstClickAt: click.firstClickAt || null,
      lastClickAt: click.lastClickAt || null
    });
  }

  recentClicks.sort((a, b) => {
    const aTs = new Date(a.lastClickAt || a.firstClickAt || 0).getTime();
    const bTs = new Date(b.lastClickAt || b.firstClickAt || 0).getTime();
    return bTs - aTs;
  });

  return {
    totalUnique,
    totalClicks,
    byLang,
    byLangScore,
    recentClicks: recentClicks.slice(0, 20)
  };
}

async function getRecentClickEvents() {
  const eventsRaw = await kv.get(AFFILIATE_RECRUIT_CLICK_EVENTS_LIST);
  const events = Array.isArray(eventsRaw) ? eventsRaw : [];
  return events.slice(-20).reverse();
}

async function getSalesStats() {
  let totalMinimal = 0;
  let totalRegular = 0;
  let rawTotalMinimal = 0;
  let rawTotalRegular = 0;
  const byDate = [];

  for (let i = 0; i < SALES_DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const [minimalRaw, regularRaw, rawMinimalRaw, rawRegularRaw] = await Promise.all([
      kv.get(AFFILIATE_CONVERSION_COUNT_KEY("minimal", dateStr)),
      kv.get(AFFILIATE_CONVERSION_COUNT_KEY("regular", dateStr)),
      kv.get(CONVERSION_COUNT_KEY("minimal", dateStr)),
      kv.get(CONVERSION_COUNT_KEY("regular", dateStr))
    ]);
    const minimal = parseCount(minimalRaw);
    const regular = parseCount(regularRaw);
    const rawMinimal = parseCount(rawMinimalRaw);
    const rawRegular = parseCount(rawRegularRaw);
    totalMinimal += minimal;
    totalRegular += regular;
    rawTotalMinimal += rawMinimal;
    rawTotalRegular += rawRegular;
    byDate.push({
      date: dateStr,
      minimal,
      regular,
      total: minimal + regular,
      rawMinimal,
      rawRegular,
      rawTotal: rawMinimal + rawRegular
    });
  }

  return {
    total: totalMinimal + totalRegular,
    minimal: totalMinimal,
    regular: totalRegular,
    rawTotal: rawTotalMinimal + rawTotalRegular,
    rawMinimal: rawTotalMinimal,
    rawRegular: rawTotalRegular,
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
      clicks: {
        totalUnique: 0,
        totalClicks: 0,
        byLang: {},
        byLangScore: {},
        clickRateByLang: {},
        clickRateTotal: 0,
        recentClicks: [],
        recentEvents: []
      },
      sales: {
        total: 0,
        minimal: 0,
        regular: 0,
        rawTotal: 0,
        rawMinimal: 0,
        rawRegular: 0,
        lastNDays: SALES_DAYS,
        byDate: []
      }
    });
  }

  const [sent, clicks, recentClickEvents, sales] = await Promise.all([
    getSentStats(),
    getClicksAttributed(),
    getRecentClickEvents(),
    getSalesStats()
  ]);

  const clickRateByLang = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    const sentCount = sent.byLang[lang] || 0;
    const clickUnique = clicks.byLang[lang] || 0;
    clickRateByLang[lang] =
      sentCount > 0 ? Math.round((clickUnique / sentCount) * 10000) / 100 : 0;
  }
  clicks.clickRateByLang = clickRateByLang;
  clicks.clickRateTotal =
    sent.total > 0 ? Math.round((clicks.totalUnique / sent.total) * 10000) / 100 : 0;
  clicks.recentEvents = recentClickEvents;

  return res.status(200).json({
    ok: true,
    sent,
    clicks,
    sales,
    meta: {
      description:
        "Affiliate recruit funnel: sent DMs, ref-attributed clicks (DM→LP click), affiliate-attributed sales. Ref = author_id on invite URL.",
      salesSource:
        "affiliate_recruit:conversion:affiliate:minimal|regular:YYYY-MM-DD:count (track/sale=200). rawWhopSales also available from conversion:minimal|regular:YYYY-MM-DD:count."
    }
  });
};

handler.getSentStats = getSentStats;
handler.getClicksAttributed = getClicksAttributed;
handler.getRecentClickEvents = getRecentClickEvents;
handler.RECRUIT_STATS_LANGS = RECRUIT_STATS_LANGS;
handler.SCORE_BANDS = SCORE_BANDS;
module.exports = handler;
