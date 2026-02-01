// config/quoteRepostTemplatesRegularOptin.js
// 引用リポスト用テンプレート: 有料版（Regular Briefing）直導線
// 1. 有名ヘッドライン風フック（トレード依存症・深層心理を揺さぶる）
// 2. ツァイガルニク効果（Regular Briefing の Grok/Gemini 記事切り抜きチラ見せ→未完で気になる）
// 3. VSL: https://youtu.be/fXgVsKhqDjI → プロモ defend50 → 言語別 Whop Regular
// Xプレミアム長文ポスト対応（最大25,000文字）。最適文字数は Grok/Gemini 分析結果を参照。

const { getWhopProductUrl, getPromoCode } = require("../services/telegram/whop-links");

const VSL_REGULAR_YOUTUBE_URL = "https://youtu.be/fXgVsKhqDjI";

function buildRegularWhopUrl(lang, options = {}) {
  const base = getWhopProductUrl(lang);
  const promo = getPromoCode();
  const sep = base.includes("?") ? "&" : "?";
  const utm = options.utm_campaign
    ? `&utm_campaign=${encodeURIComponent(options.utm_campaign)}`
    : "";
  return `${base}${sep}promo=${promo}${utm}`;
}

/**
 * 有料版（Regular Briefing）直導線テンプレート（6言語 × 3バリアント）
 * @param {string} lang - 言語コード (en, es, pt-br, ar, ko, ja)
 * @param {Object} options - { influencerUsername, utm_content, variant: 'A'|'B'|'C' }
 * @returns {string} 引用リポスト用テキスト（長文ポスト時は25,000文字まで可）
 */
function getRegularOptinQuoteTemplate(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const whopUrl = buildRegularWhopUrl(normalizedLang, {
    utm_campaign: options.influencerUsername
      ? `regular_influencer_${options.influencerUsername}`
      : "regular_optin",
    ...options
  });
  const promo = (getPromoCode() || "defend50").toUpperCase();

  // バリアントA: 「負け続けた男」風 ＋ Regular 記事の一行チラ見せ
  const variantA = {
    en: () =>
      `I lost 6 times in a row. Then I read one line from their briefing. Watch: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `6連敗した。そのあと彼らのブリーフの「一行」を読んだ。視聴: ${VSL_REGULAR_YOUTUBE_URL} 50%OFF（${promo}）: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `Perdí 6 veces seguidas. Luego leí una línea de su briefing. Mira: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Perdi 6 vezes seguidas. Depois li uma linha do briefing deles. Assista: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `خسرت 6 مرات متتالية. بعدين قرأت سطر واحد من البريفينغ. شوف: ${VSL_REGULAR_YOUTUBE_URL} خصم 50% (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `6연패했음. 그다음 브리핑 '한 줄' 봤음. 시청: ${VSL_REGULAR_YOUTUBE_URL} 50% 할인 (${promo}): ${whopUrl} #BTC #TrapDefence`
  };

  // バリアントB: 「彼らは知っていた」風 ＋ Grok/Gemini 記事の冒頭チラ見せ
  const variantB = {
    en: () =>
      `They knew where the trap was. We don't show the full article—just the hook. Watch: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `彼らは罠の場所を知っていた。記事の全文は見せない—フックだけ。視聴: ${VSL_REGULAR_YOUTUBE_URL} 50%OFF（${promo}）: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `Sabían dónde estaba la trampa. No mostramos el artículo completo—solo el gancho. Mira: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Eles sabiam onde estava a armadilha. Não mostramos o artigo inteiro—só o gancho. Assista: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `كانوا عارفين وين الفخ. ما نوري المقال كامل—الغانش بس. شوف: ${VSL_REGULAR_YOUTUBE_URL} خصم 50% (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `그들은 함정 위치를 알았음. 전문은 안 보여줌—훅만. 시청: ${VSL_REGULAR_YOUTUBE_URL} 50% 할인 (${promo}): ${whopUrl} #BTC #TrapDefence`
  };

  // バリアントC: 「90%は知らない」風 ＋ Regular の「途中で切る」チラ見せ
  const variantC = {
    en: () =>
      `What 90% of traders never see. Snippet from today's Grok briefing: "Whales loading. Score 12/100. Exit map—" Watch: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `トレーダー90%が知らないこと。本日のGrokブリーフ一切れ:「クジラ積み中。スコア12/100。出口マップ—」視聴: ${VSL_REGULAR_YOUTUBE_URL} 50%OFF（${promo}）: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `Lo que 90% de traders nunca ve. Fragmento del briefing Grok de hoy: "Ballenas cargando. Score 12/100. Mapa salida—" Mira: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `O que 90% dos traders nunca veem. Trecho do briefing Grok de hoje: "Baleias carregando. Score 12/100. Mapa saída—" Assista: ${VSL_REGULAR_YOUTUBE_URL} 50% OFF (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `اللي 90% من المتداولين ما يشوفوه. مقتطف من بريفينغ Grok اليوم: "حيتان تحمّل. Score 12/100. خريطة خروج—" شوف: ${VSL_REGULAR_YOUTUBE_URL} خصم 50% (${promo}): ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `트레이더 90%가 못 보는 것. 오늘 Grok 브리핑 한 조각: "고래 로딩. 스코어 12/100. 출구 맵—" 시청: ${VSL_REGULAR_YOUTUBE_URL} 50% 할인 (${promo}): ${whopUrl} #BTC #TrapDefence`
  };

  const variant = options.variant || "A";
  const map = variant === "B" ? variantB : variant === "C" ? variantC : variantA;
  const fn = map[normalizedLang] || map.en;
  return fn();
}

function getAllRegularOptinTemplates(options = {}) {
  const langs = ["en", "ja", "es", "pt-br", "ar", "ko"];
  return Object.fromEntries(
    langs.map((lang) => [lang, getRegularOptinQuoteTemplate(lang, options)])
  );
}

const REGULAR_OPTIN_VARIANTS = ["A", "B", "C"];

module.exports = {
  VSL_REGULAR_YOUTUBE_URL,
  REGULAR_OPTIN_VARIANTS,
  buildRegularWhopUrl,
  getRegularOptinQuoteTemplate,
  getAllRegularOptinTemplates
};
