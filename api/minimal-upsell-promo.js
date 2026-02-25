// api/minimal-upsell-promo.js
// Minimal 購読者向けアップセルプロモ配信（Minimal とは別に 1日2回送る想定）
// 6言語 × 2パターン（A/B）をローテ。?pattern=A|B で指定、未指定時は UTC 時刻で A/B を切り替え。

require("../utils/suppressKnownWarnings");
const { sendMessageToAsset } = require("../services/telegram/bot");
const promoTemplates = require("../config/minimalUpsellPromoTemplates");

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

/** A か B を決定。?pattern=A|B があればそれ、なければ UTC 時 0–11 → A, 12–23 → B */
function getPattern(req) {
  const q = (req.query && req.query.pattern) || "";
  const p = String(q).toUpperCase();
  if (p === "A" || p === "B") return p;
  const hour = new Date().getUTCHours();
  return hour < 12 ? "A" : "B";
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

  if (process.env.ENABLE_TELEGRAM === "false") {
    return res.status(200).json({ ok: true, skipped: true, reason: "Telegram disabled" });
  }

  const pattern = getPattern(req);
  const results = { sent: [], errors: [], pattern };

  for (const targetLang of targetLangs) {
    try {
      const langTemplates = promoTemplates[targetLang] || promoTemplates.en;
      const text = langTemplates[pattern] || langTemplates.A;
      if (!text || typeof text !== "string") {
        results.errors.push({ lang: targetLang, error: "No template" });
        continue;
      }

      const chatId = resolveMinimalChatId(targetLang);
      if (!chatId) {
        results.errors.push({ lang: targetLang, error: "No chat ID" });
        continue;
      }

      const langCode = targetLang.toUpperCase().replace("-", "_");
      const sendResult = await sendMessageToAsset(text, "MINIMAL", langCode);
      const messageId = sendResult?.result?.message_id ?? sendResult?.message_id;
      results.sent.push({ lang: targetLang, message_id: messageId });
      console.log(`[Minimal Upsell Promo] ${pattern} ${targetLang}:`, messageId ?? "N/A");
    } catch (err) {
      console.error(`[Minimal Upsell Promo] Error ${targetLang}:`, err.message);
      results.errors.push({ lang: targetLang, error: err.message });
    }
  }

  return res.status(200).json({
    ok: true,
    sent: results.sent.length,
    errors: results.errors.length,
    pattern,
    details: results
  });
};
