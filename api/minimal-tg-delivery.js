// api/minimal-tg-delivery.js
// 無料版（Minimal Version）TG配信専用。Regular と同時刻にしないため、別 Cron で別時刻に実行する。
// cron が書き出す btc:snapshot / btc:snapshot:early を読んで 6 言語配信する。minimal:btc:latest は移行期フォールバック。

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

const {
  getMinimalVersionCheckoutUrl,
  getLandingPageUrl,
  getPromoCode,
  getVidalyticsLink
} = require("../services/telegram/lp-links");

/** 有料版（Regular Briefing）アップセル文言：3行構成（見出し／視聴／申し込み） */
function getUpsellBlock(lang = "en") {
  const vidUrl = getVidalyticsLink(lang === "pt-br" ? "pt" : lang, "regular");
  const lpUrl = getLandingPageUrl(lang);
  const code = (getPromoCode() || "defend50").toUpperCase();
  const heading = {
    en: "⬆️ Upgrade: Regular Briefing — full structure + 5-min pulse (KIBA)",
    es: "⬆️ Upgrade: Regular Briefing — estructura completa + pulso 5min (KIBA)",
    "pt-br": "⬆️ Upgrade: Regular Briefing — estrutura completa + pulso 5min (KIBA)",
    ar: "⬆️ ترقية: Regular Briefing — هيكل كامل + نبض 5 دقائق (KIBA)",
    ja: "⬆️ 有料版（Regular Briefing）：構造全体＋5分パルス（KIBA）",
    ko: "⬆️ 업그레이드: Regular Briefing — 전체 구조 + 5분 펄스 (KIBA)"
  };
  const watchLabel = { en: "▶ Watch →", es: "▶ Ver →", "pt-br": "▶ Ver →", ar: "▶ شاهد →", ja: "▶ 視聴 →", ko: "▶ 시청 →" };
  const accessLabel = {
    en: "▶ Get access (50% off) →",
    es: "▶ Acceso (50% dto) →",
    "pt-br": "▶ Acesso (50% off) →",
    ar: "▶ الدخول (خصم 50%) →",
    ja: "▶ 申し込み（50%オフ）→",
    ko: "▶ 접속 (50% 할인) →"
  };
  const h = heading[lang] || heading.en;
  const w = (watchLabel[lang] || watchLabel.en) + " " + vidUrl;
  const a = (accessLabel[lang] || accessLabel.en) + " " + lpUrl + "  Code: " + code;
  return [h, w, a].join("\n");
}

const HASHTAG = "#TrapDefence";

/** ツイート文言テンプレート（@trapdefence 言及 + ハッシュタグ） */
const TWEET_TEMPLATES = {
  en: "Trap Defence BTC is helping me avoid traps. @trapdefence " + HASHTAG,
  es: "Trap Defence BTC me está ayudando a evitar trampas. @trapdefence " + HASHTAG,
  "pt-br": "Trap Defence BTC está me ajudando a evitar armadilhas. @trapdefence " + HASHTAG,
  ar: "Trap Defence BTC يساعدني على تجنب الفخاخ. @trapdefence " + HASHTAG,
  ja: "Trap Defence BTC、トラップ回避の視点が役に立っています。@trapdefence " + HASHTAG,
  ko: "Trap Defence BTC 덕분에 함정 피해가고 있어요. @trapdefence " + HASHTAG
};

/** ボタン1つのみ：Xで仲間と共有する（コミュニティ訴求） */
function getSocialProofButton(lang = "en") {
  const buttonLabels = {
    en: "Share with the community on X →",
    es: "Comparte con la comunidad en X →",
    "pt-br": "Compartilhe com a comunidade no X →",
    ar: "شارك مع المجتمع على X →",
    ja: "Xで仲間と共有する →",
    ko: "X에서 커뮤니티와 공유하기 →"
  };
  const text = TWEET_TEMPLATES[lang] || TWEET_TEMPLATES.en;
  const intentUrl = "https://x.com/intent/tweet?text=" + encodeURIComponent(text);
  return {
    inline_keyboard: [[{ text: buttonLabels[lang] || buttonLabels.en, url: intentUrl }]]
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

  // full snapshot を優先（Regular と同一データ源で整合）。無ければ early にフォールバック。
  let payload = await kv.get("btc:snapshot")
    || await kv.get("btc:snapshot:early");
  if (!payload) {
    payload = await kv.get("minimal:btc:latest");
  }
  if (!payload) {
    return res.status(503).json({
      error: "No snapshot in KV (btc:snapshot, btc:snapshot:early, or minimal:btc:latest fallback). Run /api/cron first."
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
      // 無料版なので末尾のアップセル（Upgrade / Whop CTA）は付けない
      const minimalText = formatMinimal(payload, targetLang);

      const chatId = resolveMinimalChatId(targetLang);
      if (!chatId) {
        results.errors.push({ lang: targetLang, error: "No chat ID" });
        continue;
      }

      const langCode = targetLang.toUpperCase().replace("-", "_");
      const sendResult = await sendMessageToAsset(minimalText, "MINIMAL", langCode, {
        reply_markup: getSocialProofButton(targetLang)
      });
      const messageId = sendResult?.result?.message_id ?? sendResult?.message_id;
      results.sent.push({ lang: targetLang, message_id: messageId });
      console.log(`[Minimal TG] Sent ${targetLang}:`, messageId ?? "N/A");
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
