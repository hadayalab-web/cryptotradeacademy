/**
 * Xリプライ直販 KPI API
 * KPI:
 * - reply_rate = リプライ実行数 / ターゲット発見数
 * - profile_click_rate = 取得不可（Xネイティブ分析が必要）
 * - link_click_rate = リンククリック数 / リプライ数
 * - trial_start_rate = 1日トライアル開始数 / リンククリック数
 */
const { kv } = require("../utils/kv");
const { X_REPLY_SALES_LANGS } = require("../config/xReplySalesConfig");

const KV_KEY_QUEUE = (lang) => `x_reply_sales:queue:${lang}`;
const KV_KEY_LIST_SUMMARY_LATEST = "x_reply_sales:list_summary:latest";
const KV_KEY_SEND_SUMMARY_LATEST = "x_reply_sales:send_summary:latest";

const KV_KEY_DISCOVERED_DAILY = (dateStr) => `x_reply_sales:discovered:${dateStr}`;
const KV_KEY_DISCOVERED_DAILY_LANG = (dateStr, lang) => `x_reply_sales:discovered:${dateStr}:${lang}`;
const KV_KEY_SENT_DAILY = (dateStr) => `x_reply_sales:sent:${dateStr}`;
const KV_KEY_SENT_DAILY_LANG = (dateStr, lang) => `x_reply_sales:sent:${dateStr}:${lang}`;
const KV_KEY_CLICK_DAILY = (dateStr) => `x_reply_sales:click:${dateStr}`;
const KV_KEY_CLICK_DAILY_LANG = (dateStr, lang) => `x_reply_sales:click:${dateStr}:${lang}`;
const KV_KEY_TRIAL_START_DAILY = (dateStr) => `x_reply_sales:trial_start:${dateStr}`;
const KV_KEY_TRIAL_START_DAILY_LANG = (dateStr, lang) => `x_reply_sales:trial_start:${dateStr}:${lang}`;
const KV_KEY_ERROR_DAILY = (dateStr) => `x_reply_sales:error:${dateStr}`;
const KV_KEY_ERROR_DAILY_LANG = (dateStr, lang) => `x_reply_sales:error:${dateStr}:${lang}`;

function parseCount(value) {
  const n = parseInt(value, 10);
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

function parseQueueValue(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function toPercent(numerator, denominator) {
  const n = Math.max(0, Number(numerator) || 0);
  const d = Math.max(0, Number(denominator) || 0);
  if (!d) return 0;
  return Math.round((n / d) * 10000) / 100;
}

async function getDailySnapshot(dateStr) {
  const [
    discoveredRaw,
    sentRaw,
    clickRaw,
    trialRaw,
    errorRaw,
    listSummaryRaw,
    sendSummaryRaw,
    ...rest
  ] = await Promise.all([
    kv.get(KV_KEY_DISCOVERED_DAILY(dateStr)),
    kv.get(KV_KEY_SENT_DAILY(dateStr)),
    kv.get(KV_KEY_CLICK_DAILY(dateStr)),
    kv.get(KV_KEY_TRIAL_START_DAILY(dateStr)),
    kv.get(KV_KEY_ERROR_DAILY(dateStr)),
    kv.get(KV_KEY_LIST_SUMMARY_LATEST),
    kv.get(KV_KEY_SEND_SUMMARY_LATEST),
    ...X_REPLY_SALES_LANGS.flatMap((lang) => [
      kv.get(KV_KEY_DISCOVERED_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_SENT_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_CLICK_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_TRIAL_START_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_ERROR_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_QUEUE(lang))
    ])
  ]);

  let idx = 0;
  const byLang = {};
  for (const lang of X_REPLY_SALES_LANGS) {
    const discovered = parseCount(rest[idx++]);
    const replied = parseCount(rest[idx++]);
    const linkClicks = parseCount(rest[idx++]);
    const trialStarts = parseCount(rest[idx++]);
    const errors = parseCount(rest[idx++]);
    const queueLength = parseQueueValue(rest[idx++]).length;
    byLang[lang] = {
      discovered,
      replied,
      linkClicks,
      trialStarts,
      errors,
      queueLength,
      replyRate: toPercent(replied, discovered),
      linkClickRate: toPercent(linkClicks, replied),
      trialStartRate: toPercent(trialStarts, linkClicks)
    };
  }

  const totals = {
    discovered: parseCount(discoveredRaw),
    replied: parseCount(sentRaw),
    linkClicks: parseCount(clickRaw),
    trialStarts: parseCount(trialRaw),
    errors: parseCount(errorRaw)
  };
  const queueLengths = {};
  for (const lang of X_REPLY_SALES_LANGS) {
    queueLengths[lang] = byLang[lang].queueLength;
  }
  queueLengths.total = Object.values(queueLengths).reduce((acc, n) => acc + n, 0);

  return {
    date: dateStr,
    totals,
    byLang,
    queueLengths,
    latest: {
      listSummary: parseObject(listSummaryRaw),
      sendSummary: parseObject(sendSummaryRaw)
    },
    kpi: {
      reply_rate: toPercent(totals.replied, totals.discovered),
      profile_click_rate: null,
      link_click_rate: toPercent(totals.linkClicks, totals.replied),
      trial_start_rate: toPercent(totals.trialStarts, totals.linkClicks)
    }
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!kv) {
    return res.status(503).json({ ok: false, error: "KV not available" });
  }

  const dateRaw = String(req.query?.date || "").trim();
  const date = dateRaw || new Date().toISOString().split("T")[0];
  const includeLast7 = req.query?.last7 === "1";

  const snapshot = await getDailySnapshot(date);
  const { totals, queueLengths, kpi } = snapshot;
  console.log("[x-reply-sales-kpi]", {
    date,
    discovered: totals.discovered,
    sent: totals.replied,
    clicks: totals.linkClicks,
    trialStarts: totals.trialStarts,
    errors: totals.errors,
    queueTotal: queueLengths.total,
    reply_rate: kpi.reply_rate,
    link_click_rate: kpi.link_click_rate
  });

  const response = {
    ok: true,
    capturedAt: new Date().toISOString(),
    ...snapshot,
    notes: {
      profile_click_rate:
        "X API単体ではプロフィール遷移数を安定取得できないためnull。Xネイティブ分析との突合が必要。",
      ...(totals.discovered === 0 && totals.replied === 0
        ? { empty: "本日のdiscovered/sentがまだ0です。リスト・送信ランが動くとKVにカウントが入ります。" }
        : {})
    }
  };

  if (includeLast7) {
    const series = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const ds = d.toISOString().split("T")[0];
      const day = await getDailySnapshot(ds);
      series.push({
        date: ds,
        discovered: day.totals.discovered,
        replied: day.totals.replied,
        linkClicks: day.totals.linkClicks,
        trialStarts: day.totals.trialStarts,
        replyRate: day.kpi.reply_rate,
        linkClickRate: day.kpi.link_click_rate,
        trialStartRate: day.kpi.trial_start_rate
      });
    }
    response.last7Days = series.reverse();
  }

  return res.status(200).json(response);
};
