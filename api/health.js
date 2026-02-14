/**
 * Trap Defence OS — 統合ヘルスチェック API
 * GET /api/health
 * 判定: CQ 404→ok（フォールバック正常）, 500/timeout→error. kiba 200→ok, 401→error.
 * BWE 直近投稿 24h 以内→ok, 以上→error. cron 2スロット(12h)以内→ok.
 */
require("../utils/suppressKnownWarnings");
const { getKV } = require("../utils/kv");
const { fetchCryptoQuant } = require("../services/cryptoquant/client");

const CRON_SLOT_MS = 6 * 60 * 60 * 1000;
const CRON_STALE_SLOTS = 2;
const BWE_STALE_MS = 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const kv = getKV();
  const now = Date.now();

  let cq = { status: "ok", lastResponse: null };
  try {
    const data = await fetchCryptoQuant("/btc/exchange-flows/netflow", {
      exchange: "all_exchange",
      window: "day",
      limit: 1
    });
    if (data === null) {
      cq.lastResponse = 404;
    } else {
      cq.lastResponse = 200;
    }
  } catch (e) {
    cq = { status: "error", lastResponse: null };
  }

  let kiba = { status: "ok", lastRun: null, lastStatus: null };
  if (kv) {
    try {
      const [lastRun, lastStatus] = await Promise.all([
        kv.get("health:kiba:lastRun"),
        kv.get("health:kiba:lastStatus")
      ]);
      kiba.lastRun = lastRun != null ? Number(lastRun) : null;
      kiba.lastStatus = lastStatus != null ? Number(lastStatus) : null;
      if (kiba.lastStatus === 401) kiba.status = "error";
      else if (kiba.lastRun == null && kiba.lastStatus == null) kiba.status = "ok";
    } catch (_) {
      kiba.status = "error";
    }
  } else {
    kiba.status = "error";
  }

  let bwe = { status: "ok", lastPost: null };
  if (kv) {
    try {
      const lastPost = await kv.get("health:bwe:lastPost");
      const ts = lastPost != null ? Number(lastPost) : null;
      bwe.lastPost = ts;
      if (ts != null && now - ts > BWE_STALE_MS) bwe.status = "error";
      else if (ts == null) bwe.status = "ok";
    } catch (_) {
      bwe.status = "error";
    }
  } else {
    bwe.status = "error";
  }

  let cron = { lastExecution: null };
  if (kv) {
    try {
      const lastExecution = await kv.get("health:cron:lastExecution");
      const ts = lastExecution != null ? Number(lastExecution) : null;
      cron.lastExecution = ts;
      if (ts != null && now - ts > CRON_SLOT_MS * CRON_STALE_SLOTS) {
        cron.status = "error";
      } else {
        cron.status = ts != null ? "ok" : "unknown";
      }
    } catch (_) {
      cron.status = "error";
    }
  } else {
    cron.status = "error";
  }
  if (cron.status === undefined) cron.status = "ok";

  let kvChecks = { btcSnapshotExists: false, kibaSnapshotExists: false };
  if (kv) {
    try {
      const [btc, kibaSnap] = await Promise.all([
        kv.get("btc:snapshot"),
        kv.get("kiba:snapshot:latest")
      ]);
      kvChecks.btcSnapshotExists = btc != null;
      kvChecks.kibaSnapshotExists = kibaSnap != null;
    } catch (_) {}
  }

  const body = {
    cq,
    kiba,
    bwe,
    cron,
    kv: kvChecks
  };

  const anyError =
    cq.status === "error" ||
    kiba.status === "error" ||
    bwe.status === "error" ||
    cron.status === "error";

  return res.status(200).json(body);
};
