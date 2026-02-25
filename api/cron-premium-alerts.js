// api/cron-premium-alerts.js
// KIBA: 条件を満たしたときだけ Regular Briefing チャンネル（BTC 各言語）に流す。5分ごと実行。
// データは KV の btc:snapshot（kiba-5min / cron が更新）を参照。

require("../utils/suppressKnownWarnings");
const { getKV } = require("../utils/kv");
const { checkAlertConditions } = require("../services/premium/realtimeAlert");
const { sendMessageToChannel } = require("../services/telegram/bot");

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

function getMarketCode(lang) {
  const m = { en: "EN", es: "ES", "pt-br": "PT_BR", ar: "AR", ja: "JA", ko: "KO" };
  return (m[lang] || "EN").replace("-", "_");
}

/** btc:snapshot / asset:snapshot:BTC の形 → checkAlertConditions 用の currentData */
function snapshotToMarketData(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot.raw || {};
  const trapDetection = snapshot.trapDetection || {};
  const cqDeep = snapshot.cqDeep || {};
  const trapScore100 = trapDetection.trapScore != null ? Number(trapDetection.trapScore) : null;
  const trapScore10 = trapScore100 != null ? trapScore100 / 10 : null;
  return {
    price: raw.priceUsd ?? snapshot.priceUsd ?? null,
    change24h: raw.change24h ?? snapshot.change24h ?? 0,
    trapScore: trapScore10 ?? (cqDeep.trapScore != null ? Number(cqDeep.trapScore) / 10 : null),
    exchangeNetflow: raw.inflow ?? cqDeep.exchangeNetflow ?? snapshot.trapData?.exchangeNetflow ?? 0,
    mpi: raw.mpi ?? cqDeep.mpi ?? cqDeep.minerMPI ?? 0,
    fearGreedIndex: undefined,
    fundingRate: undefined
  };
}

/** デフォルトのアラート設定（閾値で発火） */
const DEFAULT_ALERT_SETTINGS = {
  priceChangeAlert: { enabled: true, threshold: 3 },
  trapScoreAlert: { enabled: true, threshold: 7 },
  exchangeNetflowAlert: { enabled: true, threshold: 100 },
  mpiAlert: { enabled: true, threshold: 1.5 },
  fearGreedAlert: { enabled: false },
  fundingRateAlert: { enabled: false }
};

/** 発火したアラートから1本の短文を作る（全言語同じで送る） */
function buildKibaAlertMessage(alerts) {
  const parts = alerts.slice(0, 3).map((a) => {
    if (a.type === "trap_score") return `Trap Score ${a.data.currentScore}/10`;
    if (a.type === "exchange_netflow") return `Netflow ${a.data.currentNetflow?.toFixed(0) ?? "?"} BTC`;
    if (a.type === "mpi") return `MPI ${a.data.currentMpi?.toFixed(2) ?? "?"}`;
    if (a.type === "price_change") return `Price ${a.data.changePercent?.toFixed(1) ?? "?"}%`;
    return a.type;
  });
  return `🚨 KIBA Alert — ${parts.join(" · ")}. Check your Regular Briefing for full analysis.`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (process.env.ENABLE_TELEGRAM === "false") {
    return res.status(200).json({ ok: true, sent: 0, reason: "Telegram disabled" });
  }

  try {
    const kv = getKV();
    const snapshot = kv
      ? await kv.get("btc:snapshot") || await kv.get("asset:snapshot:BTC")
      : null;
    const marketData = snapshotToMarketData(snapshot);
    if (!marketData || (marketData.trapScore == null && marketData.price == null)) {
      return res.status(200).json({
        ok: true,
        sent: 0,
        reason: "No snapshot in KV or missing price/trapScore"
      });
    }

    const alerts = checkAlertConditions(marketData, DEFAULT_ALERT_SETTINGS);
    if (!alerts || alerts.length === 0) {
      return res.status(200).json({
        ok: true,
        sent: 0,
        reason: "No alert conditions met",
        marketData: {
          trapScore: marketData.trapScore,
          exchangeNetflow: marketData.exchangeNetflow,
          mpi: marketData.mpi
        }
      });
    }

    const text = buildKibaAlertMessage(alerts);
    let sent = 0;
    for (const lang of SUPPORTED_LANGS) {
      try {
        const marketCode = getMarketCode(lang);
        await sendMessageToChannel(text, "BTC", marketCode, { parse_mode: undefined });
        sent++;
        console.log("[KIBA] Sent to Regular", lang);
      } catch (e) {
        console.warn("[KIBA] Send failed for", lang, e?.message);
      }
    }

    return res.status(200).json({
      ok: true,
      sent,
      triggered: true,
      alerts: alerts.map((a) => a.type),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[KIBA] Error:", error?.message);
    return res.status(500).json({
      ok: false,
      error: error?.message
    });
  }
};
