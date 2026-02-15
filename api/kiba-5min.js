/**
 * KIBA 5分クロン: CQ を 5 分ごとに取得し、CQ で異常を検知したときだけ Grok を呼ぶ
 * vercel.json: "schedule": 5分間隔 (cron: 5min interval)
 *
 * 流れ: (1) CQ のみ取得 → (2) CQ ベースで異常チェック（kibaScore 閾値）→ (3) 異常時のみ Grok 取得
 *       → (4) runKibaOnce で本判定 → 発火時は Telegram アラート送信
 */
require("../utils/suppressKnownWarnings");

const { getKV } = require("../utils/kv");
const { getCQDeepMetrics } = require("../services/cryptoquant/deepMetrics");
const { writeCqLatest } = require("../services/snapshot/cqLatestWriter");
const { analyzeXSentimentHighResolutionCompat } = require("../services/grok/highResolution");
const { analyzeXSentimentLive } = require("../services/grok/client");
const { runKibaOnce } = require("./kiba/run");
const { runKibaEngine } = require("../core/kiba/kiba_engine");
const { getKibaLatestKey } = require("../services/snapshot/kibaSnapshotSchema");
const { sendMessageToChannel } = require("../services/telegram/bot");

const ENABLE_KIBA = process.env.ENABLE_KIBA !== "false";
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM !== "false";
const BTC_SNAPSHOT_KEYS = ["asset:snapshot:BTC", "btc:snapshot"];
const ALERT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"];
/** CQ のみでこのスコア以上なら「異常」とみなし、Grok を呼ぶ */
const CQ_ANOMALY_KIBA_SCORE_THRESHOLD = 40;

function getMarketCode(lang) {
  const m = { en: "EN", ja: "JA", ko: "KO", es: "ES", "pt-br": "PT-BR", ar: "AR" };
  return m[lang] || "EN";
}

async function getFirstSnapshot(kv, keys) {
  for (const key of keys) {
    try {
      const value = await kv.get(key);
      if (value) return { key, value };
    } catch (_) {}
  }
  return { key: null, value: null };
}

function buildMacroSnapshot(btcSnapshot, nasdaqSnapshot, goldSnapshot) {
  const { buildMacroContextFromAssets } = require("../logic/macroRiskEvaluator");
  const macro = btcSnapshot?.macroContext
    ? {
        nasdaqRegime: btcSnapshot.macroContext.nasdaqRegime ?? null,
        goldWhaleBias: btcSnapshot.macroContext.goldWhaleBias ?? null,
        macroRiskOnOff: btcSnapshot.macroContext.macroRiskOnOff ?? null
      }
    : buildMacroContextFromAssets({ nasdaqSnapshot, goldSnapshot });
  return {
    nasdaq: nasdaqSnapshot || null,
    gold: goldSnapshot || null,
    nasdaqRegime: macro.nasdaqRegime,
    goldWhaleBias: macro.goldWhaleBias,
    macroRiskOnOff: macro.macroRiskOnOff
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!ENABLE_KIBA) {
    return res.status(200).json({ ok: true, skipped: true, reason: "ENABLE_KIBA=false" });
  }

  const start = Date.now();
  try {
    const kv = getKV();
    if (!kv) {
      return res.status(503).json({ ok: false, error: "KV not available" });
    }

    const last = await getFirstSnapshot(kv, BTC_SNAPSHOT_KEYS);
    let btcSnapshot = last.value;
    if (!btcSnapshot || typeof btcSnapshot !== "object") {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "No btc snapshot in KV (run /api/cron first)",
        durationMs: Date.now() - start
      });
    }

    let cqDeep = {};
    try {
      cqDeep = await getCQDeepMetrics("EN", { skipCache: true });
      if (cqDeep && typeof cqDeep === "object") {
        await writeCqLatest(kv, cqDeep);
      }
    } catch (e) {
      console.warn("[kiba-5min] CQ fetch failed:", e?.message);
      cqDeep = btcSnapshot.cqDeep || {};
    }

    const snapshotCqOnly = {
      ...btcSnapshot,
      cqDeep: { ...(btcSnapshot.cqDeep || {}), ...cqDeep },
      xSentiment: { whaleBias: 0, retailFomo: 50, newsImpact: 0 }
    };

    const nasdaqSnapshot = await kv.get("asset:snapshot:NASDAQ");
    const goldSnapshot = await kv.get("asset:snapshot:GOLD");
    const macroSnapshot = buildMacroSnapshot(btcSnapshot, nasdaqSnapshot, goldSnapshot);
    const lastKiba = await kv.get(getKibaLatestKey("BTC"));

    const cqOnlyResult = runKibaEngine({
      btcSnapshot: snapshotCqOnly,
      macroSnapshot,
      lastKibaSnapshot: lastKiba || null,
      asset: "BTC"
    });

    const cqAnomaly = (cqOnlyResult.kibaScore || 0) >= CQ_ANOMALY_KIBA_SCORE_THRESHOLD;
    if (!cqAnomaly) {
      return res.status(200).json({
        ok: true,
        triggered: false,
        cqAnomaly: false,
        cqKibaScore: cqOnlyResult.kibaScore,
        reason: "CQ no anomaly, Grok skipped",
        durationMs: Date.now() - start
      });
    }

    console.log("[kiba-5min] CQ anomaly detected (score=" + cqOnlyResult.kibaScore + "), calling Grok");

    let xSentiment = { whaleBias: 0, retailFomo: 50, newsImpact: 0 };
    let highResX = null;
    try {
      const grokSent = await analyzeXSentimentHighResolutionCompat(
        "latest BTC price action, funding, liquidations, whale activity, ETF flows on X",
        "en"
      );
      highResX = grokSent?._highResolution || null;
      if (grokSent && typeof grokSent === "object") {
        xSentiment = {
          whaleBias: Number(grokSent.whaleBias) || 0,
          retailFomo: Number(grokSent.retailFomo) || 50,
          newsImpact: Number(grokSent.newsImpact) || 0
        };
      }
    } catch (e) {
      console.warn("[kiba-5min] Grok high-res failed:", e?.message);
      try {
        const fallback = await analyzeXSentimentLive(
          "latest BTC price action, funding, liquidations, whale activity, ETF flows on X"
        );
        if (fallback && typeof fallback === "object") {
          xSentiment = {
            whaleBias: Number(fallback.whaleBias) || 0,
            retailFomo: Number(fallback.retailFomo) || 50,
            newsImpact: Number(fallback.newsImpact) || 0
          };
        }
      } catch (_) {}
    }

    const mergedSnapshot = {
      ...btcSnapshot,
      cqDeep: { ...(btcSnapshot.cqDeep || {}), ...cqDeep },
      xSentiment,
      highResX: highResX || btcSnapshot.highResX
    };

    const kibaResult = await runKibaOnce(kv, {
      btcSnapshot: mergedSnapshot,
      nasdaqSnapshot,
      goldSnapshot,
      asset: "BTC"
    });

    if (!kibaResult.triggered) {
      return res.status(200).json({
        ok: true,
        triggered: false,
        cqAnomaly: true,
        grokCalled: true,
        impact: kibaResult.impact?.level || "NONE",
        durationMs: Date.now() - start
      });
    }

    if (ENABLE_TELEGRAM && kibaResult.dispatchPayload?.alerts) {
      const alerts = kibaResult.dispatchPayload.alerts;
      for (const lang of ALERT_LANGS) {
        const text = alerts[lang];
        if (!text || typeof text !== "string") continue;
        try {
          await sendMessageToChannel(text, "BTC", getMarketCode(lang));
          console.log("[kiba-5min] Telegram sent for", lang);
        } catch (e) {
          console.warn("[kiba-5min] Telegram failed for", lang, e?.message);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      triggered: true,
      cqAnomaly: true,
      grokCalled: true,
      impact: kibaResult.impact?.level || "TRIGGERED",
      durationMs: Date.now() - start
    });
  } catch (error) {
    console.error("[kiba-5min] Error:", error?.message);
    return res.status(500).json({
      ok: false,
      error: error?.message,
      durationMs: Date.now() - start
    });
  }
};
