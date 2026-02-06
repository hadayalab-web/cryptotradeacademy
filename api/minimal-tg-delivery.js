// api/minimal-tg-delivery.js
// 無料版（Minimal Version）TG配信専用。Regular と同時刻にしないため、別 Cron で別時刻に実行する。
// cron が KV に書き出す minimal:payload:latest を読んで 6 言語配信する。

const { getKV } = require("../utils/kv");
const { sendMessageToAsset } = require("../services/telegram/bot");

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return defaultValue;
}

function getTargetLangs() {
  return parseBoolean(process.env.MINIMAL_MULTI_LANG, true)
    ? SUPPORTED_LANGS
    : [process.env.LANG || "en"];
}

function resolveMinimalChatId(lang) {
  const normalized = lang.toUpperCase().replace("-", "_");
  const variants = [normalized];
  if (normalized === "PT_BR") variants.push("PTBR");
  if (normalized === "JA") variants.push("JP");
  if (normalized === "KO") variants.push("KR");
  for (const v of variants) {
    const id = process.env[`TELEGRAM_CHAT_ID_MINIMAL_${v}`];
    if (id) return id;
  }
  return process.env.TELEGRAM_CHAT_ID_MINIMAL_EN || process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
}

function getSocialProofButton(lang = "en") {
  const texts = {
    en: "🔥 I'm Safe (Trap Avoided)",
    es: "🔥 Estoy Seguro (Trampa Evitada)",
    "pt-br": "🔥 Estou Seguro (Armadilha Evitada)",
    ar: "🔥 أنا آمن (تم تجنب الفخ)",
    ja: "🔥 安全です（トラップ回避済み）",
    ko: "🔥 안전합니다 (함정 회피됨)"
  };
  return {
    inline_keyboard: [[{ text: texts[lang] || texts.en, callback_data: "action_saved" }]]
  };
}

function loadMinimalFormatter(lang) {
  try {
    const mod = require(`../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`);
    return mod.formatMinimalHighQualityBriefing || mod.formatMinimalBriefing || null;
  } catch (e) {
    const en = require("../services/telegram/messages/user/en/minimal-high-quality.en");
    return en.formatMinimalHighQualityBriefing || en.formatMinimalBriefing || null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const kv = getKV();
  if (!kv) {
    return res.status(503).json({ error: "KV not available" });
  }

  const payload = await kv.get("minimal:payload:latest");
  if (!payload || !payload.now) {
    return res.status(503).json({
      error: "No minimal payload in KV. Run /api/cron first (it writes payload on regular slot)."
    });
  }

  const hasBot = !!(process.env.TELEGRAM_BOT_TOKEN_MINIMAL || process.env.TELEGRAM_BOT_TOKEN);
  const targetLangs = getTargetLangs();
  const hasAnyChat = targetLangs.some((l) => resolveMinimalChatId(l) !== null);
  if (!hasBot || !hasAnyChat) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: "Minimal bot or chat IDs not configured"
    });
  }

  const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM !== "false";
  if (!ENABLE_TELEGRAM) {
    return res.status(200).json({ ok: true, skipped: true, reason: "Telegram disabled" });
  }

  const {
    now,
    minimalTrapScore,
    priceUsd,
    change24h,
    trapData,
    minimalMarketData,
    sentimentData,
    market_score,
    grokXAnalysis,
    sentimentLabel
  } = payload;

  const results = { sent: [], errors: [] };

  for (const targetLang of targetLangs) {
    try {
      // 統合最適化は廃止（GPT=CQ/Trap、Grok=X/トレーダーサポート、Gemini=SoSoValue記事に役割限定）
      const formatMinimal = loadMinimalFormatter(targetLang);
      if (!formatMinimal || typeof formatMinimal !== "function") {
        results.errors.push({ lang: targetLang, error: "No formatter" });
        continue;
      }

      const nowDate = typeof now === "string" ? new Date(now) : now || new Date();
      const minimalText = formatMinimal({
        now: nowDate,
        trapScore: minimalTrapScore,
        priceUsd,
        change24h,
        trapData: trapData || {},
        marketData: minimalMarketData || {},
        sentimentData: sentimentData || { sentiment: sentimentLabel },
        lang: targetLang,
        score: market_score,
        grokGeminiOptimization: null
      });

      const chatId = resolveMinimalChatId(targetLang);
      if (!chatId) {
        results.errors.push({ lang: targetLang, error: "No chat ID" });
        continue;
      }

      const langCode = targetLang.toUpperCase().replace("-", "_");
      const sendResult = await sendMessageToAsset(minimalText, "MINIMAL", langCode, {
        reply_markup: getSocialProofButton(targetLang)
      });
      results.sent.push({ lang: targetLang, message_id: sendResult?.message_id });
      console.log(`[Minimal TG] Sent ${targetLang}:`, sendResult?.message_id || "N/A");
    } catch (err) {
      console.error(`[Minimal TG] Error ${targetLang}:`, err.message);
      results.errors.push({ lang: targetLang, error: err.message });
    }
  }

  return res.status(200).json({
    ok: true,
    sent: results.sent.length,
    errors: results.errors.length,
    details: results
  });
};
