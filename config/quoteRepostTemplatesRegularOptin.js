// config/quoteRepostTemplatesRegularOptin.js
// 引用リポスト用テンプレート: 有料版（Regular Briefing）直導線
// 設計意図: ヘッドライン～リードでトレード依存症のトレーダーを引き込み、
// 無料版・有料版の実際の配信をチラ見させて VSL→LP（Carrd）の導線を表現する（目標 800～1,200 文字）。
// 1. 有名ヘッドライン風フック（トレード依存症・深層心理を揺さぶる）
// 2. ツァイガルニク効果（Regular Briefing の Grok/Gemini 記事切り抜きチラ見せ→未完で気になる）
// VSLリンクはGrokセールスレターのみで使用。Regularオプトインでは LP 導線のみ。
// ポリシー: X投稿では LP はリンクだけ（リッチプレビュー・長いCTA文を避ける）。URLのみ挿入。
// 最適文字数: docs/ai-analysis-results/OPTIMAL_LONG_POST_LENGTH_INTEGRATED.md 参照。

const { getLandingPageUrl, getPromoCode } = require("../services/telegram/lp-links");

function buildRegularLpUrl(lang, options = {}) {
  const base = getLandingPageUrl(lang);
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
 * @param {Object} options - { influencerUsername, utm_content, variant: 'A'|'B'|'C'|'D' }
 * @returns {string} 引用リポスト用テキスト（長文ポスト時は25,000文字まで可）
 */
function getRegularOptinQuoteTemplate(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const lpUrl = buildRegularLpUrl(normalizedLang, {
    utm_campaign: options.influencerUsername
      ? `regular_influencer_${options.influencerUsername}`
      : "regular_optin",
    ...options
  });

  // バリアントA: 「負け続けた男」風 ＋ Regular 記事の一行チラ見せ（Whopはリンクだけ）
  const variantA = {
    en: () =>
      `I lost 6 times in a row. Then I read one line from their briefing. ${lpUrl} #BTC #TrapDefence`,
    ja: () =>
      `6連敗した。そのあと彼らのブリーフの「一行」を読んだ。${lpUrl} #BTC #TrapDefence`,
    es: () =>
      `Perdí 6 veces seguidas. Luego leí una línea de su briefing. ${lpUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Perdi 6 vezes seguidas. Depois li uma linha do briefing deles. ${lpUrl} #BTC #TrapDefence`,
    ar: () =>
      `خسرت 6 مرات متتالية. بعدين قرأت سطر واحد من البريفينغ. ${lpUrl} #BTC #TrapDefence`,
    ko: () =>
      `6연패했음. 그다음 브리핑 '한 줄' 봤음. ${lpUrl} #BTC #TrapDefence`
  };

  // バリアントB: 「彼らは知っていた」風 ＋ Grok/Gemini 記事の冒頭チラ見せ（Whopはリンクだけ）
  const variantB = {
    en: () =>
      `They knew where the trap was. We don't show the full article—just the hook. ${lpUrl} #BTC #TrapDefence`,
    ja: () =>
      `彼らは罠の場所を知っていた。記事の全文は見せない—フックだけ。${lpUrl} #BTC #TrapDefence`,
    es: () =>
      `Sabían dónde estaba la trampa. No mostramos el artículo completo—solo el gancho. ${lpUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Eles sabiam onde estava a armadilha. Não mostramos o artigo inteiro—só o gancho. ${lpUrl} #BTC #TrapDefence`,
    ar: () =>
      `كانوا عارفين وين الفخ. ما نوري المقال كامل—الغانش بس. ${lpUrl} #BTC #TrapDefence`,
    ko: () =>
      `그들은 함정 위치를 알았음. 전문은 안 보여줌—훅만. ${lpUrl} #BTC #TrapDefence`
  };

  // バリアントC: 「90%は知らない」風 ＋ Regular の「途中で切る」チラ見せ（Whopはリンクだけ）
  const variantC = {
    en: () =>
      `What 90% of traders never see. Snippet from today's Grok briefing: "Whales loading. Score 12/100. Exit map—" ${lpUrl} #BTC #TrapDefence`,
    ja: () =>
      `トレーダー90%が知らないこと。本日のGrokブリーフ一切れ:「クジラ積み中。スコア12/100。出口マップ—」${lpUrl} #BTC #TrapDefence`,
    es: () =>
      `Lo que 90% de traders nunca ve. Fragmento del briefing Grok de hoy: "Ballenas cargando. Score 12/100. Mapa salida—" ${lpUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `O que 90% dos traders nunca veem. Trecho do briefing Grok de hoje: "Baleias carregando. Score 12/100. Mapa saída—" ${lpUrl} #BTC #TrapDefence`,
    ar: () =>
      `اللي 90% من المتداولين ما يشوفوه. مقتطف من بريفينغ Grok اليوم: "حيتان تحمّل. Score 12/100. خريطة خروج—" ${lpUrl} #BTC #TrapDefence`,
    ko: () =>
      `트레이더 90%가 못 보는 것. 오늘 Grok 브리핑 한 조각: "고래 로딩. 스코어 12/100. 출구 맵—" ${lpUrl} #BTC #TrapDefence`
  };

  // バリアントD: 市況悪化・ドローダウン特化（Whopはリンクだけ）
  const variantD = {
    en: () =>
      `Drawdown already happened. The next trap is the one that cleans out the rest. We show the score + exit map. ${lpUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    ja: () =>
      `ドローダウンはもう来た。次に来るのは「戻りだと思って嵌る罠」。スコア＋出口マップはこちら。${lpUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    es: () =>
      `El drawdown ya pasó. La próxima trampa es la que limpia a los que quedan. Mostramos score + mapa salida. ${lpUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    "pt-br": () =>
      `O drawdown já veio. A próxima armadilha é a que limpa o resto. Mostramos score + mapa saída. ${lpUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    ar: () =>
      `الدروداون صار. الفخ الجاي هو اللي ينضف الباقي. نوري السكور + خريطة خروج. ${lpUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    ko: () =>
      `드로다운은 이미 왔음. 다음 함정이 남은 사람들 다 쓸어감. 스코어+출구 맵 여기. ${lpUrl} #BTC #TrapScore #RiskOff #TrapDefence`
  };

  const variant = options.variant || "A";
  const map =
    variant === "B" ? variantB : variant === "C" ? variantC : variant === "D" ? variantD : variantA;
  const fn = map[normalizedLang] || map.en;
  return fn();
}

function getAllRegularOptinTemplates(options = {}) {
  const langs = ["en", "ja", "es", "pt-br", "ar", "ko"];
  return Object.fromEntries(
    langs.map((lang) => [lang, getRegularOptinQuoteTemplate(lang, options)])
  );
}

const REGULAR_OPTIN_VARIANTS = ["A", "B", "C", "D"];

module.exports = {
  REGULAR_OPTIN_VARIANTS,
  buildRegularWhopUrl,
  getRegularOptinQuoteTemplate,
  getAllRegularOptinTemplates
};
