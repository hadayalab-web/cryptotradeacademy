/**
 * Affiliate Recruit KPI 集約 API
 * - 送信/クリック/登録/成約 + キュー在庫 + 403 状態を1本で返す
 * - 取得時に KV へスナップショット保存（15分 cron で自動取得を想定）
 */
const { kv } = require("../utils/kv");
const funnel = require("./affiliate-recruit-funnel");

const REGION_QUEUE_LANGS = ["ar", "es", "pt", "ja", "ko"];
const KV_KEY_QUEUE_EN = "affiliate_recruit:queue:en";
const KV_KEY_QUEUE_REGION = (lang) => `affiliate_recruit:queue:${lang}`;
const KV_KEY_DAILY_COUNT = (dateStr) => `affiliate_recruit:daily_count:${dateStr}`;
const KV_KEY_403_WINDOW_EN = (dateStr, slot15) => `affiliate_recruit:403:en:${dateStr}:${slot15}`;
const KV_KEY_ATTEMPT_WINDOW_EN = (dateStr, slot15) => `affiliate_recruit:attempts:en:${dateStr}:${slot15}`;
const KV_KEY_DELIVERY_OUTCOME_AGG = "affiliate_recruit:delivery:agg:v1";
const KV_KEY_SEND_403_RATE_LATEST = "affiliate_recruit:send_403_rate:latest";
const CONVERSION_COUNT_KEY = (type, dateStr) => `conversion:${type}:${dateStr}:count`;
const AFFILIATE_CONVERSION_COUNT_KEY = (type, dateStr) =>
  `affiliate_recruit:conversion:affiliate:${type}:${dateStr}:count`;

const KV_KEY_KPI_LATEST = "affiliate_recruit:kpi:latest";
const KV_KEY_KPI_HISTORY = "affiliate_recruit:kpi:history";
const KV_KEY_KPI_SLOT = (slotKey) => `affiliate_recruit:kpi:snapshot:${slotKey}`;

const KPI_SNAPSHOT_TTL_SECONDS = Math.max(
  3600,
  Number(process.env.AFFILIATE_RECRUIT_KPI_TTL_SEC || 86400 * 90)
);
const KPI_HISTORY_MAX = Math.max(
  96,
  Number(process.env.AFFILIATE_RECRUIT_KPI_HISTORY_MAX || 1000)
);
const EN_QUEUE_ATTEMPT_CAP_PER_15MIN = Math.max(
  1,
  Number(
    process.env.EN_RECRUIT_ATTEMPT_CAP_PER_15MIN ||
    process.env.EN_RECRUIT_ATTEMPT_BREAKER_PER_15MIN ||
    15
  )
);
const DELIVERY_TREND_MIN_ATTEMPTS = Math.max(
  1,
  Number(process.env.AFFILIATE_RECRUIT_DELIVERY_TREND_MIN_ATTEMPTS || 10)
);
const DELIVERY_TREND_TOP_LIMIT = Math.max(
  1,
  Number(process.env.AFFILIATE_RECRUIT_DELIVERY_TREND_TOP_LIMIT || 5)
);
const DELIVERY_OUTCOME_KEYS = [
  "attempted",
  "sent",
  "recipient403",
  "operationNotPermitted403",
  "other403",
  "non403Errors"
];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];

function parseCount(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function nowUtcMeta(now = new Date()) {
  const dateStr = now.toISOString().split("T")[0];
  const slot15 = Math.floor(now.getUTCMinutes() / 15) * 15;
  const slotKey = `${dateStr}:${slot15}`;
  return { dateStr, slot15, slotKey };
}

function roundPercent(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function createDeliveryOutcomeCounter() {
  return {
    attempted: 0,
    sent: 0,
    recipient403: 0,
    operationNotPermitted403: 0,
    other403: 0,
    non403Errors: 0
  };
}

function normalizeDeliveryOutcomeCounter(raw) {
  const normalized = createDeliveryOutcomeCounter();
  if (!raw || typeof raw !== "object") return normalized;
  for (const key of DELIVERY_OUTCOME_KEYS) {
    normalized[key] = Math.max(0, parseInt(raw[key], 10) || 0);
  }
  return normalized;
}

function normalizeDeliveryOutcomeMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) return {};
  const normalized = {};
  for (const [bucket, counter] of Object.entries(rawMap)) {
    normalized[String(bucket)] = normalizeDeliveryOutcomeCounter(counter);
  }
  return normalized;
}

function normalizeDeliveryOutcomeAggregate(rawValue) {
  let raw = rawValue;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (_) {
      raw = null;
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      totals: createDeliveryOutcomeCounter(),
      byLang: {},
      byScoreBand: {},
      byHighIntent: {},
      byIntentSegment: {},
      byAngle: {},
      byDetectedVia: {},
      updatedAt: null
    };
  }
  return {
    totals: normalizeDeliveryOutcomeCounter(raw.totals),
    byLang: normalizeDeliveryOutcomeMap(raw.byLang),
    byScoreBand: normalizeDeliveryOutcomeMap(raw.byScoreBand),
    byHighIntent: normalizeDeliveryOutcomeMap(raw.byHighIntent),
    byIntentSegment: normalizeDeliveryOutcomeMap(raw.byIntentSegment),
    byAngle: normalizeDeliveryOutcomeMap(raw.byAngle),
    byDetectedVia: normalizeDeliveryOutcomeMap(raw.byDetectedVia),
    updatedAt: raw.updatedAt || null
  };
}

function toDeliveryRateRow(counter) {
  const normalized = normalizeDeliveryOutcomeCounter(counter);
  return {
    attempted: normalized.attempted,
    sent: normalized.sent,
    recipient403: normalized.recipient403,
    operationNotPermitted403: normalized.operationNotPermitted403,
    other403: normalized.other403,
    non403Errors: normalized.non403Errors,
    sentRate: roundPercent(normalized.sent, normalized.attempted),
    recipient403Rate: roundPercent(normalized.recipient403, normalized.attempted),
    opNotPermittedRate: roundPercent(normalized.operationNotPermitted403, normalized.attempted)
  };
}

function summarizeDeliveryTrendDimension(rawMap, options = {}) {
  const minAttempts = Math.max(1, Number(options.minAttempts || DELIVERY_TREND_MIN_ATTEMPTS));
  const topLimit = Math.max(1, Number(options.limit || DELIVERY_TREND_TOP_LIMIT));
  const rows = Object.entries(normalizeDeliveryOutcomeMap(rawMap))
    .map(([bucket, counter]) => {
      const row = toDeliveryRateRow(counter);
      return {
        bucket,
        ...row
      };
    })
    .filter((row) => row.attempted >= minAttempts);

  const bySentRate = [...rows].sort((a, b) => {
    const rateDiff = b.sentRate - a.sentRate;
    if (rateDiff !== 0) return rateDiff;
    return b.attempted - a.attempted;
  });
  const byRecipient403Rate = [...rows].sort((a, b) => {
    const rateDiff = b.recipient403Rate - a.recipient403Rate;
    if (rateDiff !== 0) return rateDiff;
    return b.attempted - a.attempted;
  });
  const byOpNotPermittedRate = [...rows].sort((a, b) => {
    const rateDiff = b.opNotPermittedRate - a.opNotPermittedRate;
    if (rateDiff !== 0) return rateDiff;
    return b.attempted - a.attempted;
  });

  return {
    minAttempts,
    topSuccess: bySentRate.slice(0, topLimit),
    topRecipient403Risk: byRecipient403Rate.slice(0, topLimit),
    topOpNotPermittedRisk: byOpNotPermittedRate.slice(0, topLimit)
  };
}

function buildDeliveryTrend(rawAggregate) {
  const aggregate = normalizeDeliveryOutcomeAggregate(rawAggregate);
  const byLang = {
    en: toDeliveryRateRow(aggregate.byLang.en),
    ar: toDeliveryRateRow(aggregate.byLang.ar),
    es: toDeliveryRateRow(aggregate.byLang.es),
    pt: toDeliveryRateRow(aggregate.byLang.pt),
    ja: toDeliveryRateRow(aggregate.byLang.ja),
    ko: toDeliveryRateRow(aggregate.byLang.ko)
  };
  const byScoreBand = {};
  for (const band of SCORE_BANDS) {
    byScoreBand[band] = toDeliveryRateRow(aggregate.byScoreBand[band]);
  }
  return {
    updatedAt: aggregate.updatedAt,
    totals: toDeliveryRateRow(aggregate.totals),
    byLang,
    byScoreBand,
    byHighIntent: {
      "0": toDeliveryRateRow(aggregate.byHighIntent["0"]),
      "1": toDeliveryRateRow(aggregate.byHighIntent["1"])
    },
    trends: {
      intentSegment: summarizeDeliveryTrendDimension(aggregate.byIntentSegment),
      angle: summarizeDeliveryTrendDimension(aggregate.byAngle),
      detectedVia: summarizeDeliveryTrendDimension(aggregate.byDetectedVia)
    }
  };
}

function pickDelta(current, previous) {
  const cur = parseNumber(current, NaN);
  const prev = parseNumber(previous, NaN);
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null;
  return cur - prev;
}

async function getQueueRuntimeState(now) {
  const { dateStr, slot15 } = nowUtcMeta(now);
  const queueReads = [kv.get(KV_KEY_QUEUE_EN), ...REGION_QUEUE_LANGS.map((lang) => kv.get(KV_KEY_QUEUE_REGION(lang)))];
  const [
    queueEnRaw,
    queueArRaw,
    queueEsRaw,
    queuePtRaw,
    queueJaRaw,
    queueKoRaw,
    sentTodayRaw,
    count403Raw,
    attemptsRaw
  ] = await Promise.all([
    ...queueReads,
    kv.get(KV_KEY_DAILY_COUNT(dateStr)),
    kv.get(KV_KEY_403_WINDOW_EN(dateStr, slot15)),
    kv.get(KV_KEY_ATTEMPT_WINDOW_EN(dateStr, slot15))
  ]);

  const queueLengths = {
    en: parseQueueValue(queueEnRaw).length,
    ar: parseQueueValue(queueArRaw).length,
    es: parseQueueValue(queueEsRaw).length,
    pt: parseQueueValue(queuePtRaw).length,
    ja: parseQueueValue(queueJaRaw).length,
    ko: parseQueueValue(queueKoRaw).length
  };
  queueLengths.total = Object.values(queueLengths).reduce((acc, n) => acc + n, 0);

  return {
    dateStr,
    slot15,
    queueLengths,
    sentToday: parseCount(sentTodayRaw),
    count403CurrentSlot: parseCount(count403Raw),
    attemptsCurrentSlot: parseCount(attemptsRaw),
    attemptCapPer15min: EN_QUEUE_ATTEMPT_CAP_PER_15MIN
  };
}

async function getSalesToday(now) {
  const dateStr = now.toISOString().split("T")[0];
  const [affiliateMinimalRaw, affiliateRegularRaw, rawMinimalRaw, rawRegularRaw] = await Promise.all([
    kv.get(AFFILIATE_CONVERSION_COUNT_KEY("minimal", dateStr)),
    kv.get(AFFILIATE_CONVERSION_COUNT_KEY("regular", dateStr)),
    kv.get(CONVERSION_COUNT_KEY("minimal", dateStr)),
    kv.get(CONVERSION_COUNT_KEY("regular", dateStr))
  ]);
  const minimal = parseCount(affiliateMinimalRaw);
  const regular = parseCount(affiliateRegularRaw);
  const rawMinimal = parseCount(rawMinimalRaw);
  const rawRegular = parseCount(rawRegularRaw);
  return {
    date: dateStr,
    minimal,
    regular,
    total: minimal + regular,
    rawMinimal,
    rawRegular,
    rawTotal: rawMinimal + rawRegular
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!kv) {
    return res.status(503).json({ error: "KV not available" });
  }

  const includeHistory = req.query?.history === "1";
  const historyLimit = Math.min(200, Math.max(1, Number(req.query?.limit || 20)));
  const shouldCollect = req.query?.collect !== "0";

  if (!shouldCollect) {
    const latest = parseObject(await kv.get(KV_KEY_KPI_LATEST));
    return res.status(200).json({
      ok: true,
      collected: false,
      latest: latest || null,
      message: latest ? "latest snapshot returned" : "no snapshot yet"
    });
  }

  const now = new Date();
  const { dateStr, slot15, slotKey } = nowUtcMeta(now);
  const previousSnapshot = parseObject(await kv.get(KV_KEY_KPI_LATEST));

  const [
    runtime,
    sent,
    signups,
    signupsAttributed,
    clicks,
    salesToday,
    historyRaw,
    deliveryAggRaw,
    send403RateLatestRaw
  ] = await Promise.all([
    getQueueRuntimeState(now),
    funnel.getSentStats(),
    funnel.getSignupsStats(),
    funnel.getSignupsAttributed(),
    funnel.getClicksAttributed(),
    getSalesToday(now),
    kv.get(KV_KEY_KPI_HISTORY),
    kv.get(KV_KEY_DELIVERY_OUTCOME_AGG),
    kv.get(KV_KEY_SEND_403_RATE_LATEST)
  ]);
  const delivery = buildDeliveryTrend(deliveryAggRaw);
  const send403RateLatest = parseObject(send403RateLatestRaw);

  const summary = {
    sentTotal: sent.total,
    clicksUniqueTotal: clicks.totalUnique,
    clicksTotal: clicks.totalClicks,
    promoterAcceptedTotal: signups.total,
    signupsRawTotal: signups.total,
    signupsAttributedTotal: signupsAttributed.total,
    salesTodayTotal: salesToday.total,
    salesTodayRawWhopTotal: salesToday.rawTotal,
    clickRateTotal: roundPercent(clicks.totalUnique, sent.total),
    signupPerClickTotal: roundPercent(signupsAttributed.total, clicks.totalUnique),
    signupRateTotal: roundPercent(signupsAttributed.total, sent.total)
  };

  const snapshot = {
    capturedAt: now.toISOString(),
    slot: { dateStr, slot15, slotKey },
    summary,
    runtime: {
      sentToday: runtime.sentToday,
      count403CurrentSlot: runtime.count403CurrentSlot,
      attemptsCurrentSlot: runtime.attemptsCurrentSlot,
      count403RateCurrentSlot: roundPercent(runtime.count403CurrentSlot, runtime.attemptsCurrentSlot),
      attemptCapPer15min: runtime.attemptCapPer15min,
      queueLengths: runtime.queueLengths,
      send403RateLatest: send403RateLatest || null
    },
    delivery
  };

  const history = Array.isArray(historyRaw) ? historyRaw : [];
  const nextHistory = history.filter((row) => row?.slot?.slotKey !== slotKey);
  nextHistory.push(snapshot);
  if (nextHistory.length > KPI_HISTORY_MAX) {
    nextHistory.splice(0, nextHistory.length - KPI_HISTORY_MAX);
  }

  await Promise.all([
    kv.set(KV_KEY_KPI_LATEST, snapshot, { ex: KPI_SNAPSHOT_TTL_SECONDS }),
    kv.set(KV_KEY_KPI_SLOT(slotKey), snapshot, { ex: KPI_SNAPSHOT_TTL_SECONDS }),
    kv.set(KV_KEY_KPI_HISTORY, nextHistory, { ex: KPI_SNAPSHOT_TTL_SECONDS })
  ]);

  const delta = {
    sentTotal: pickDelta(summary.sentTotal, previousSnapshot?.summary?.sentTotal),
    clicksUniqueTotal: pickDelta(summary.clicksUniqueTotal, previousSnapshot?.summary?.clicksUniqueTotal),
    clicksTotal: pickDelta(summary.clicksTotal, previousSnapshot?.summary?.clicksTotal),
    signupsAttributedTotal: pickDelta(
      summary.signupsAttributedTotal,
      previousSnapshot?.summary?.signupsAttributedTotal
    ),
    salesTodayTotal: pickDelta(summary.salesTodayTotal, previousSnapshot?.summary?.salesTodayTotal),
    salesTodayRawWhopTotal: pickDelta(
      summary.salesTodayRawWhopTotal,
      previousSnapshot?.summary?.salesTodayRawWhopTotal
    ),
    sentToday: pickDelta(runtime.sentToday, previousSnapshot?.runtime?.sentToday)
  };

  // KPIスナップショットの実数値をログに出し、KV set 成否だけでなく中身も追跡可能にする
  console.log("[affiliate-recruit-kpi] snapshot:", {
    slot: snapshot.slot,
    capturedAt: snapshot.capturedAt,
    summary,
    runtime: snapshot.runtime,
    byLang: {
      sent: sent.byLang,
      clicksUnique: clicks.byLang,
      signupsAttributed: signupsAttributed.byLang
    },
    delivery: snapshot.delivery,
    deltaSincePrevious: delta
  });

  const response = {
    ok: true,
    collected: true,
    capturedAt: snapshot.capturedAt,
    slot: snapshot.slot,
    summary,
    runtime: snapshot.runtime,
    byLang: {
      sent: sent.byLang,
      clicksUnique: clicks.byLang,
      signupsAttributed: signupsAttributed.byLang
    },
    delivery: snapshot.delivery,
    deltaSincePrevious: delta,
    historyMeta: {
      storedSnapshots: nextHistory.length,
      historyLimit: KPI_HISTORY_MAX,
      ttlSeconds: KPI_SNAPSHOT_TTL_SECONDS
    }
  };

  if (includeHistory) {
    response.history = nextHistory.slice(-historyLimit).reverse();
  }

  return res.status(200).json(response);
};
