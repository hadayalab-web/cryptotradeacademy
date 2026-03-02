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
const KV_KEY_ATTEMPTS_DAILY = (dateStr) => `x_reply_sales:attempts_daily:${dateStr}`;
const KV_KEY_ATTEMPTS_DAILY_LANG = (dateStr, lang) => `x_reply_sales:attempts_daily:${dateStr}:${lang}`;
const KV_KEY_DM_SENT_DAILY = (dateStr) => `x_reply_sales:dm_sent:${dateStr}`;
const KV_KEY_DM_SENT_DAILY_LANG = (dateStr, lang) => `x_reply_sales:dm_sent:${dateStr}:${lang}`;
const KV_KEY_DM_NG_DAILY = (dateStr) => `x_reply_sales:dm_ng:${dateStr}`;
const KV_KEY_DM_NG_DAILY_LANG = (dateStr, lang) => `x_reply_sales:dm_ng:${dateStr}:${lang}`;
const KV_KEY_ATTEMPTS_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:attempts_h:${dateStr}:${hour}:${lang}`;
const KV_KEY_SENT_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:sent_h:${dateStr}:${hour}:${lang}`;
const KV_KEY_DM_SENT_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:dm_sent_h:${dateStr}:${hour}:${lang}`;
const KV_KEY_DM_NG_HOURLY_LANG = (dateStr, hour, lang) => `x_reply_sales:dm_ng_h:${dateStr}:${hour}:${lang}`;

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
    attemptsRaw,
    dmSentRaw,
    dmNgRaw,
    listSummaryRaw,
    sendSummaryRaw,
    ...rest
  ] = await Promise.all([
    kv.get(KV_KEY_DISCOVERED_DAILY(dateStr)),
    kv.get(KV_KEY_SENT_DAILY(dateStr)),
    kv.get(KV_KEY_CLICK_DAILY(dateStr)),
    kv.get(KV_KEY_TRIAL_START_DAILY(dateStr)),
    kv.get(KV_KEY_ERROR_DAILY(dateStr)),
    kv.get(KV_KEY_ATTEMPTS_DAILY(dateStr)),
    kv.get(KV_KEY_DM_SENT_DAILY(dateStr)),
    kv.get(KV_KEY_DM_NG_DAILY(dateStr)),
    kv.get(KV_KEY_LIST_SUMMARY_LATEST),
    kv.get(KV_KEY_SEND_SUMMARY_LATEST),
    ...X_REPLY_SALES_LANGS.flatMap((lang) => [
      kv.get(KV_KEY_DISCOVERED_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_SENT_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_CLICK_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_TRIAL_START_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_ERROR_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_ATTEMPTS_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_DM_SENT_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_DM_NG_DAILY_LANG(dateStr, lang)),
      kv.get(KV_KEY_QUEUE(lang))
    ])
  ]);

  let idx = 0;
  const byLang = {};
  for (const lang of X_REPLY_SALES_LANGS) {
    const discovered = parseCount(rest[idx++]);
    const replyOk = parseCount(rest[idx++]);
    const linkClicks = parseCount(rest[idx++]);
    const trialStarts = parseCount(rest[idx++]);
    const errors = parseCount(rest[idx++]);
    const attempts = parseCount(rest[idx++]);
    const dmSent = parseCount(rest[idx++]);
    const dmNg = parseCount(rest[idx++]);
    const queueLength = parseQueueValue(rest[idx++]).length;
    const delivered = replyOk + dmSent;
    byLang[lang] = {
      discovered,
      attempts,
      reply_ok: replyOk,
      dm_sent: dmSent,
      dm_ng: dmNg,
      errors,
      delivered,
      linkClicks,
      trialStarts,
      queueLength,
      success_rate: toPercent(delivered, attempts),
      replyRate: toPercent(replyOk, discovered),
      linkClickRate: toPercent(linkClicks, delivered),
      trialStartRate: toPercent(trialStarts, linkClicks)
    };
  }

  const totalsAttempts = parseCount(attemptsRaw);
  const totalsReplyOk = parseCount(sentRaw);
  const totalsDmSent = parseCount(dmSentRaw);
  const totalsDmNg = parseCount(dmNgRaw);
  const totalsDelivered = totalsReplyOk + totalsDmSent;
  const totals = {
    discovered: parseCount(discoveredRaw),
    attempts: totalsAttempts,
    reply_ok: totalsReplyOk,
    dm_sent: totalsDmSent,
    dm_ng: totalsDmNg,
    delivered: totalsDelivered,
    replied: totalsReplyOk,
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
      send_success_rate: toPercent(totalsDelivered, totalsAttempts),
      reply_rate: toPercent(totalsReplyOk, totals.discovered),
      profile_click_rate: null,
      link_click_rate: toPercent(totals.linkClicks, totalsDelivered),
      trial_start_rate: toPercent(totals.trialStarts, totals.linkClicks)
    }
  };
}

/** 過去1時間（指定UTC日時）の集計を6言語別で取得 */
async function getLast1HourSnapshot(dateStr, hourUtc) {
  const byLang = {};
  let totalsAttempts = 0;
  let totalsReplyOk = 0;
  let totalsDmSent = 0;
  let totalsDmNg = 0;
  for (const lang of X_REPLY_SALES_LANGS) {
    const [a, r, ds, dn] = await Promise.all([
      kv.get(KV_KEY_ATTEMPTS_HOURLY_LANG(dateStr, hourUtc, lang)),
      kv.get(KV_KEY_SENT_HOURLY_LANG(dateStr, hourUtc, lang)),
      kv.get(KV_KEY_DM_SENT_HOURLY_LANG(dateStr, hourUtc, lang)),
      kv.get(KV_KEY_DM_NG_HOURLY_LANG(dateStr, hourUtc, lang))
    ]);
    const attempts = parseCount(a);
    const replyOk = parseCount(r);
    const dmSent = parseCount(ds);
    const dmNg = parseCount(dn);
    const delivered = replyOk + dmSent;
    totalsAttempts += attempts;
    totalsReplyOk += replyOk;
    totalsDmSent += dmSent;
    totalsDmNg += dmNg;
    byLang[lang] = {
      attempts,
      reply_ok: replyOk,
      dm_sent: dmSent,
      dm_ng: dmNg,
      delivered,
      success_rate: toPercent(delivered, attempts)
    };
  }
  const totalsDelivered = totalsReplyOk + totalsDmSent;
  return {
    period: "1h",
    dateStr,
    hourUtc,
    totals: {
      attempts: totalsAttempts,
      reply_ok: totalsReplyOk,
      dm_sent: totalsDmSent,
      dm_ng: totalsDmNg,
      delivered: totalsDelivered,
      success_rate: toPercent(totalsDelivered, totalsAttempts)
    },
    byLang
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
  const now = new Date();
  const hourUtc = now.getUTCHours();
  const dateFor1h = now.toISOString().split("T")[0];
  const last1h = await getLast1HourSnapshot(dateFor1h, hourUtc);

  console.log("[x-reply-sales-kpi]", {
    date,
    attempts: totals.attempts,
    reply_ok: totals.reply_ok,
    dm_sent: totals.dm_sent,
    dm_ng: totals.dm_ng,
    delivered: totals.delivered,
    success_rate: kpi.send_success_rate,
    discovered: totals.discovered,
    queueTotal: queueLengths.total
  });

  const response = {
    ok: true,
    capturedAt: now.toISOString(),
    ...snapshot,
    last1h,
    last24h: {
      period: "24h",
      dateStr: date,
      totals: snapshot.totals,
      byLang: snapshot.byLang,
      kpi: snapshot.kpi,
      queueLengths: snapshot.queueLengths
    },
    notes: {
      profile_click_rate:
        "X API単体ではプロフィール遷移数を安定取得できないためnull。Xネイティブ分析との突合が必要。",
      ...(totals.attempts === 0 && totals.delivered === 0
        ? { empty: "本日の試行・到達がまだ0です。送信ランが動くとKVにカウントが入ります。" }
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
        totals: {
          attempts: day.totals.attempts,
          delivered: day.totals.delivered,
          reply_ok: day.totals.reply_ok,
          dm_sent: day.totals.dm_sent,
          dm_ng: day.totals.dm_ng,
          discovered: day.totals.discovered,
          linkClicks: day.totals.linkClicks,
          trialStarts: day.totals.trialStarts
        },
        byLang: day.byLang,
        successRate: day.kpi.send_success_rate,
        linkClickRate: day.kpi.link_click_rate,
        trialStartRate: day.kpi.trial_start_rate
      });
    }
    response.last7Days = series.reverse();
  }

  return res.status(200).json(response);
};
