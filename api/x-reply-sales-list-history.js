/**
 * Xリプライ直販: リスト取得の実数履歴API
 * リアルタイム追跡・分析用。直近のリスト実行ごとの実数（取得数・キュー数）を返す。
 */
const { kv } = require("../utils/kv");

const KV_KEY_LIST_SUMMARY_LATEST = "x_reply_sales:list_summary:latest";
const KV_KEY_LIST_EVENTS = "x_reply_sales:list_events";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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

/** 1実行分を分析用に圧縮（実数だけ抜き出し） */
function toRunSummary(snapshot) {
  if (!snapshot || snapshot.mode !== "list") return null;
  const gross = snapshot.gross || {};
  const perLang = (snapshot.perLang || []).map((row) => ({
    lang: row?.lang,
    ok: row?.ok,
    pagesFetched: row?.pagesFetched,
    configuredPages: row?.configuredPages,
    fetchedPosts: row?.fetchedPosts,
    discoveredCandidates: row?.discoveredCandidates,
    freshDiscovered: row?.freshDiscovered,
    enqueuedFresh: row?.enqueuedFresh,
    freshEnqueued: row?.freshEnqueued,
    skippedReplyRestricted: row?.skippedReplyRestricted,
    skippedHandled: row?.skippedHandled,
    nextQueueLength: row?.nextQueueLength,
    prevQueueLength: row?.prevQueueLength,
    hotAnalysis: row?.hotAnalysis || null
  }));
  return {
    runAt: snapshot.runAt,
    scope: snapshot.scope,
    targets: gross.targets,
    gross: {
      discoveredCandidatesTotal: gross.discoveredCandidatesTotal,
      freshDiscoveredTotal: gross.freshDiscoveredTotal,
      enqueuedFreshTotal: gross.enqueuedFreshTotal,
      freshEnqueuedTotal: gross.freshEnqueuedTotal,
      skippedReplyRestrictedTotal: gross.skippedReplyRestrictedTotal,
      retainedFromPrevTotal: gross.retainedFromPrevTotal,
      droppedFromPrevByPolicyTotal: gross.droppedFromPrevByPolicyTotal,
      nextQueueTotal: gross.nextQueueTotal
    },
    perLang
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

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(req.query?.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  const [latestRaw, eventsRaw] = await Promise.all([
    kv.get(KV_KEY_LIST_SUMMARY_LATEST),
    kv.get(KV_KEY_LIST_EVENTS)
  ]);

  const latest = parseObject(latestRaw);
  const events = Array.isArray(eventsRaw) ? eventsRaw : [];

  const recentRuns = events
    .slice(-limit)
    .map(toRunSummary)
    .filter(Boolean)
    .reverse();

  return res.status(200).json({
    ok: true,
    capturedAt: new Date().toISOString(),
    latest: latest ? toRunSummary(latest) : null,
    recentRuns,
    meta: {
      limit,
      totalEvents: events.length
    }
  });
};
