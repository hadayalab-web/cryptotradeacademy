/**
 * Affiliate Recruit KPI 集約 API
 * - 送信/クリック/登録/成約 + キュー在庫 + 403/cooldown 状態を1本で返す
 * - 取得時に KV へスナップショット保存（15分 cron で自動取得を想定）
 */
const { kv } = require("../utils/kv");
const funnel = require("./affiliate-recruit-funnel");

const REGION_QUEUE_LANGS = ["ar", "es", "pt", "ja", "ko"];
const KV_KEY_QUEUE_EN = "affiliate_recruit:queue:en";
const KV_KEY_QUEUE_REGION = (lang) => `affiliate_recruit:queue:${lang}`;
const KV_KEY_DAILY_COUNT = (dateStr) => `affiliate_recruit:daily_count:${dateStr}`;
const KV_KEY_403_WINDOW_EN = (dateStr, slot15) => `affiliate_recruit:403:en:${dateStr}:${slot15}`;
const KV_KEY_OP_NOT_PERMITTED_COOLDOWN_UNTIL_MS = "affiliate_recruit:cooldown:op_not_permitted:until_ms";
const KV_KEY_OP_NOT_PERMITTED_BACKOFF_LEVEL = "affiliate_recruit:cooldown:op_not_permitted:backoff_level";
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
    cooldownUntilRaw,
    backoffLevelRaw
  ] = await Promise.all([
    ...queueReads,
    kv.get(KV_KEY_DAILY_COUNT(dateStr)),
    kv.get(KV_KEY_403_WINDOW_EN(dateStr, slot15)),
    kv.get(KV_KEY_OP_NOT_PERMITTED_COOLDOWN_UNTIL_MS),
    kv.get(KV_KEY_OP_NOT_PERMITTED_BACKOFF_LEVEL)
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

  const cooldownUntilMs = parseNumber(cooldownUntilRaw, 0);
  const nowMs = now.getTime();

  return {
    dateStr,
    slot15,
    queueLengths,
    sentToday: parseCount(sentTodayRaw),
    count403CurrentSlot: parseCount(count403Raw),
    opNotPermittedBackoffLevel: parseCount(backoffLevelRaw),
    opNotPermittedCooldownUntilMs: cooldownUntilMs || null,
    opNotPermittedCooldownUntil: cooldownUntilMs > 0 ? new Date(cooldownUntilMs).toISOString() : null,
    opNotPermittedCooldownActive: cooldownUntilMs > nowMs
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

  const [runtime, sent, signups, signupsAttributed, clicks, salesToday, historyRaw] = await Promise.all([
    getQueueRuntimeState(now),
    funnel.getSentStats(),
    funnel.getSignupsStats(),
    funnel.getSignupsAttributed(),
    funnel.getClicksAttributed(),
    getSalesToday(now),
    kv.get(KV_KEY_KPI_HISTORY)
  ]);

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
      queueLengths: runtime.queueLengths,
      opNotPermittedBackoffLevel: runtime.opNotPermittedBackoffLevel,
      opNotPermittedCooldownActive: runtime.opNotPermittedCooldownActive,
      opNotPermittedCooldownUntil: runtime.opNotPermittedCooldownUntil
    }
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
