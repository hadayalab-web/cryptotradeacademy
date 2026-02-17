// api/minimal-tg-delivery.js
// 無料版（Minimal Version）TG配信専用。Regular と同時刻にしないため、別 Cron で別時刻に実行する。
// cron が書き出す btc:snapshot:early / btc:snapshot を読んで 6 言語配信する。minimal:btc:latest は移行期フォールバック。

require("../utils/suppressKnownWarnings");
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

const { getMinimalVersionCheckoutUrl, getWhopProductUrl, getPromoCode } = require("../services/telegram/whop-links");
const { pickVidalyticsLink } = require("../config/buzzweaveLinks");

/** 有料版（Regular Briefing）アップセル文言：Vidalytics・Whop・クーポンコード */
function getUpsellBlock(lang = "en") {
  const vidUrl = pickVidalyticsLink(lang === "pt-br" ? "pt" : lang, "regular");
  const whopUrl = getWhopProductUrl(lang);
  const code = (getPromoCode() || "defend50").toUpperCase();
  const labels = {
    en: "⬆️ Upgrade to Regular Briefing: full structure + 5-min pulse (KIBA). Watch →",
    es: "⬆️ Pásate a Regular: estructura completa + pulso 5min (KIBA). Ver →",
    "pt-br": "⬆️ Upgrade para Regular: estrutura completa + pulso 5min (KIBA). Ver →",
    ar: "⬆️ ترقية لـ Regular: هيكل كامل + نبض 5 دقائق (KIBA). شاهد →",
    ja: "⬆️ Regularへ: 構造全体＋5分パルス（KIBA）。視聴 →",
    ko: "⬆️ Regular 업그레이드: 전체 구조 + 5분 펄스 (KIBA). 시청 →"
  };
  const getLabel = { en: "Get access →", es: "Acceso →", "pt-br": "Acesso →", ar: "الدخول →", ja: "アクセス →", ko: "접속 →" };
  const line = (labels[lang] || labels.en) + " " + vidUrl + " | " + (getLabel[lang] || getLabel.en) + " " + whopUrl + " | Code: " + code;
  return line;
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
  const ctaTexts = { en: "Free: Get the edge →", es: "Gratis →", "pt-br": "Grátis →", ar: "مجاني →", ja: "無料でエッジ →", ko: "무료 엣지 →" };
  const regularCta = { en: "Get Regular (50% off) →", es: "Regular 50% dto →", "pt-br": "Regular 50% off →", ar: "Regular خصم 50% →", ja: "Regular 50%オフ →", ko: "Regular 50% 할인 →" };
  return {
    inline_keyboard: [
      [{ text: texts[lang] || texts.en, callback_data: "action_saved" }, { text: ctaTexts[lang] || ctaTexts.en, url: getMinimalVersionCheckoutUrl(lang) }],
      [{ text: regularCta[lang] || regularCta.en, url: getWhopProductUrl(lang) }]
    ]
  };
}

function loadMinimalFormatter(lang) {
  try {
    const mod = require(`../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`);
    return mod.formatMinimalBriefing || mod.formatMinimalBriefingOSv26 || null;
  } catch (e) {
    const en = require("../services/telegram/messages/user/en/minimal-high-quality.en");
    return en.formatMinimalBriefing || en.formatMinimalBriefingOSv26 || null;
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

  // btc:snapshot:early → btc:snapshot を優先。minimal:btc:latest は移行期フォールバック
  let payload = await kv.get("btc:snapshot:early")
    || await kv.get("btc:snapshot");
  if (!payload) {
    payload = await kv.get("minimal:btc:latest");
  }
  if (!payload) {
    return res.status(503).json({
      error: "No snapshot in KV (btc:snapshot:early, btc:snapshot, or minimal:btc:latest fallback). Run /api/cron first."
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

  const results = { sent: [], errors: [] };

  for (const targetLang of targetLangs) {
    try {
      const formatMinimal = loadMinimalFormatter(targetLang);
      if (!formatMinimal || typeof formatMinimal !== "function") {
        results.errors.push({ lang: targetLang, error: "No formatter" });
        continue;
      }
      // Phase 3: formatMinimalBriefing(snapshot, lang) - accepts btcSnapshot or legacy payload
      let minimalText = formatMinimal(payload, targetLang);
      minimalText = minimalText + "\n\n" + getUpsellBlock(targetLang);

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
