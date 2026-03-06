// api/x-post-minimal.js
// 1日2回、無料版（Minimal Version）の配信メッセージを途中で切り、TGチャンネルへ誘導（リードマグネット）

require("../utils/suppressKnownWarnings");
const { getKV } = require("../utils/kv");
const { postTweet } = require("../services/x/client");
const { getMinimalTelegramInviteLink } = require("../config/minimalTelegramInviteLinks");

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];
const POSTS_PER_DAY = 2;
function kvKeyCountForDate(dateStr) {
  return `x_post_minimal:count:${dateStr}`;
}
const DELAY_BETWEEN_TWEETS_MS = 1 * 60 * 1000; // 1分（600s タイムアウト内に6本完了させるため）
const X_LONG_POST_MAX = 25000; // X API 上限
/** X投稿で見せる配信本文の最大文字数（ここで切って「続きはTGで」へ誘導） */
const TEASER_MAX_CHARS = 480;

function loadMinimalFormatter(lang) {
  try {
    const mod = require(`../services/telegram/messages/user/${lang}/minimal-high-quality.${lang}`);
    return mod.formatMinimalBriefing || mod.formatMinimalBriefingOSv26 || null;
  } catch (e) {
    const en = require("../services/telegram/messages/user/en/minimal-high-quality.en");
    return en.formatMinimalBriefing || en.formatMinimalBriefingOSv26 || null;
  }
}

/**
 * Minimal 用フックコピー（X投稿の先頭に付与。言語別、未定義は EN にフォールバック）
 */
const MINIMAL_HOOK_COPY_BY_LANG = {
  en:
    "If you keep trading like this, the market will keep eating you alive.\n\n" +
    "Trap Defence Minimal is for traders who open charts out of habit, react to every move, stack positions, and only later notice their balance shrinking. BTC moves on hidden structures—fear spikes, thin liquidity, whale setups. Entering blind means repeating losses.\n\n" +
    "Minimal sends Trap Score, risk signals, sentiment, and net‑flow four times a day. No complex analysis—just simple indicators showing whether to approach or avoid.\n\n",
  es:
    "El mercado seguirá devorándote.\n\n" +
    "Trap Defence Minimal es para quienes abren el gráfico por impulso, reaccionan a cada movimiento, acumulan posiciones y luego ven que su saldo cae. El mercado de BTC se mueve con estructuras ocultas: picos de miedo, liquidez débil y maniobras de ballenas. Entrar sin verlas es repetir pérdidas.\n\n" +
    "Minimal envía Trap Score, riesgo, sentimiento y flujos cuatro veces al día. Sin análisis complejo: solo indicadores simples que muestran si debes acercarte o alejarte.\n\n",
  "pt-br":
    "O mercado vai continuar a devorar você.\n\n" +
    "Trap Defence Minimal é para quem abre o gráfico por impulso, reage a cada movimento, empilha posições e só depois percebe que o saldo cai. O mercado de BTC se move por estruturas ocultas—picos de medo, liquidez fraca e armadilhas de baleias. Entrar sem ver isso é repetir perdas.\n\n" +
    "O Minimal envia Trap Score, risco, sentimento e fluxos quatro vezes ao dia. Nada de análise complexa—apenas indicadores simples que mostram se deve se aproximar ou evitar.\n\n",
  ar:
    "إذا واصلت التداول هكذا، سيستمر السوق في التهام أموالك.\n\n" +
    "Trap Defence Minimal مخصّصة لمن يفتحون الرسم البياني بدافع العادة، ويتفاعلون مع كل حركة، ويكدّسون المراكز ثم يكتشفون أن رصيدهم يتناقص. يتحرك سوق BTC بهياكل خفية—تقلبات يقودها الخوف، سيولة ضعيفة، وحركات مفاجئة من الحيتان. الدخول دون رؤية هذه الفخاخ يعني تكرار الخسائر.\n\n" +
    "يوفّر Minimal Trap Score وإشارات المخاطر والمشاعر وتدفّقات السوق أربع مرات يوميًا (UTC 0:00 / 6:00 / 12:00 / 18:00). لا حاجة لتحليل معقّد—فقط مؤشرات بسيطة تخبرك إن كان عليك الاقتراب أو الابتعاد.\n\n",
  ko:
    "지금처럼 계속하면 시장은 계속해서 당신의 자금을 먹어치울 것이다.\n\n" +
    "Trap Defence Minimal은 차트를 습관처럼 열고, 가격 움직임에 즉각 반응하며, 포지션을 쌓다가 뒤늦게 잔고가 줄어든 것을 깨닫는 트레이더를 위한 무료 방어 인텔리전스입니다. BTC 시장은 공포 기반 급등락, 얇은 유동성, 고래의 의도된 움직임 같은 보이지 않는 구조로 움직입니다. 이를 모른 채 진입하면 같은 손실을 반복할 뿐입니다.\n\n" +
    "Minimal은 Trap Score, 주요 리스크 신호, 센티먼트, 네트플로우 데이터를 하루 4회(UTC 0:00 / 6:00 / 12:00 / 18:00) 제공합니다. 복잡한 분석은 필요 없습니다. 지금 시장에 다가가야 할지, 멀어져야 할지 즉시 판단할 수 있는 단순한 지표만 전달합니다.\n\n" +
    "이메일만 입력하면 즉시 시작됩니다.\n" +
    "텔레그램 채널에 자동으로 추가되며, 그 순간부터 방어가 시작됩니다.\n\n",
  ja:
    "このままでは、相場に食われ続ける。\n\n" +
    "Trap Defence Minimal は、気づけばチャートを開き、値動きに反応してポジションを重ね、気がつくと資金が減っている──そんな"負のループ"から抜け出せない人のための無料防御インテリジェンスです。BTC市場は、恐怖主導の急変、薄い流動性、クジラの仕掛けなど、個人には見えない構造で動いています。知らずに飛び込めば、同じパターンで損失を繰り返すだけです。\n\n" +
    "Minimal では、Trap Score、主要リスク指標、センチメント、ネットフローなど、相場の危険信号をつかむための"最低限の防御情報"を1日4回（UTC 0:00 / 6:00 / 12:00 / 18:00）受け取れます。複雑な分析は不要。今の相場が「近づくべきか離れるべきか」を即座に判断するためのシンプルな指標だけを届けます。\n\n"
};
function getMinimalHookCopy(lang) {
  return MINIMAL_HOOK_COPY_BY_LANG[lang] || MINIMAL_HOOK_COPY_BY_LANG.en;
}

/** 言語ごとの「続きはTGで」CTA（配信本文を途中で切ったあとに付与） */
const CTA_LABELS = {
  en: "Get the full briefing on Telegram →",
  es: "Recibe el briefing completo en Telegram →",
  "pt-br": "Receba o briefing completo no Telegram →",
  ar: "اقرأ الملخص الكامل على تليجرام ←",
  ja: "続きはTGチャンネルで →",
  ko: "전체 브리핑은 텔레그램에서 →"
};

/**
 * 配信本文を TEASER_MAX_CHARS で切り、文末で終わるようにする
 */
function truncateAtTeaser(text) {
  const t = text.trim();
  if (t.length <= TEASER_MAX_CHARS) return t;
  const slice = t.slice(0, TEASER_MAX_CHARS);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("。"),
    slice.lastIndexOf("？"),
    slice.lastIndexOf("！")
  );
  if (lastSentenceEnd >= 0 && lastSentenceEnd > TEASER_MAX_CHARS * 0.5) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }
  return slice.trim() + "…";
}

/**
 * フック + 配信本文（途中で切断）+ 「続きはTGで」+ リンク を組み立て
 */
function buildFullMinimalTweet(lang, payload) {
  const formatMinimal = loadMinimalFormatter(lang);
  if (!formatMinimal || typeof formatMinimal !== "function") {
    return null;
  }
  const fullText = formatMinimal(payload, lang);
  if (!fullText || !fullText.trim()) return null;
  const teaser = truncateAtTeaser(fullText);
  const cta = CTA_LABELS[lang] || CTA_LABELS.en;
  const link = getMinimalTelegramInviteLink(lang);
  const body = `${teaser}\n\n${cta} ${link}`;
  const withHook = `${getMinimalHookCopy(lang)}${body}`;
  if (withHook.length > X_LONG_POST_MAX) {
    return `${teaser}\n\n${cta} ${link}`;
  }
  return withHook;
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

  const dateStr = new Date().toISOString().slice(0, 10);
  const countKey = kvKeyCountForDate(dateStr);
  const countToday = parseInt(await kv.get(countKey) || "0", 10);
  if (countToday >= POSTS_PER_DAY) {
    return res.status(200).json({
      ok: true,
      skipped: true,
      reason: `Already posted ${POSTS_PER_DAY} times today`,
      date: dateStr,
      countToday
    });
  }

  let payload = await kv.get("btc:snapshot") || await kv.get("btc:snapshot:early");
  if (!payload) {
    payload = await kv.get("minimal:btc:latest");
  }
  
  // JSON文字列として保存されていた場合のパース処理
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      console.error("[X Post Minimal] Failed to parse payload:", e.message);
    }
  }

  if (!payload) {
    return res.status(503).json({
      error: "No snapshot in KV. Run /api/cron or wait for minimal-tg-delivery."
    });
  }

  const hasXAuth =
    process.env.X_API_CONSUMER_KEY &&
    process.env.X_API_CONSUMER_KEY_SECRET &&
    process.env.X_API_ACCESS_TOKEN &&
    process.env.X_API_ACCESS_TOKEN_SECRET;
  if (!hasXAuth) {
    return res.status(503).json({ error: "X API credentials not configured" });
  }

  const enableXPost = process.env.X_POST_MINIMAL_ENABLED !== "0";
  if (!enableXPost) {
    return res.status(200).json({ ok: true, skipped: true, reason: "X_POST_MINIMAL_ENABLED=0" });
  }

  const results = { posted: [], errors: [] };

  for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
    const lang = SUPPORTED_LANGS[i];
    try {
      const text = buildFullMinimalTweet(lang, payload);
      if (!text || !text.trim()) {
        results.errors.push({ lang, error: "No formatter or empty content" });
        continue;
      }
      const result = await postTweet(text);
      results.posted.push({ lang, tweetId: result?.id });
      console.log(`[X Post Minimal] Posted full ${lang}:`, result?.id ?? "N/A");
      if (i < SUPPORTED_LANGS.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_TWEETS_MS));
      }
    } catch (err) {
      console.error(`[X Post Minimal] Error ${lang}:`, err.message);
      results.errors.push({ lang, error: err.message });
    }
  }

  if (results.posted.length > 0) {
    const newCount = countToday + 1;
    await kv.set(countKey, String(newCount), { ex: 86400 * 2 });
  }

  return res.status(200).json({
    ok: true,
    date: dateStr,
    posted: results.posted.length,
    errors: results.errors.length,
    details: results
  });
};
