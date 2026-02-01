// config/quoteRepostTemplatesMinimalOptin.js
// 引用リポスト用テンプレート: 無料版（Minimal Version）オプトイン導線
// 1. 有名ヘッドライン風フック（トレード依存症・深層心理を揺さぶる）
// 2. ツァイガルニク効果（Minimal/Regular TG配信の切り抜きチラ見せ→未完で気になる）
// 3. VSL: https://youtu.be/OqvqngJOiXc（6言語共通・字幕あり）→ 言語別 Whop Minimal チェックアウト
// Xプレミアム長文ポスト対応（最大25,000文字）。最適文字数は Grok/Gemini 分析結果を参照。

const { getMinimalVersionCheckoutUrl } = require("../services/telegram/whop-links");

const VSL_YOUTUBE_URL = "https://youtu.be/OqvqngJOiXc";

/**
 * テンプレート1: Minimal オプトイン導線（6言語）
 * @param {string} lang - 言語コード (en, es, pt-br, ar, ko, ja)
 * @param {Object} options - { influencerUsername, utm_content, variant: 'A'|'B'|'C' }
 * @returns {string} 引用リポスト用テキスト（長文ポスト時は25,000文字まで可）
 */
function getMinimalOptinQuoteTemplate(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const whopUrl =
    getMinimalVersionCheckoutUrl(normalizedLang, {
      utm_content: options.influencerUsername
        ? `influencer_${options.influencerUsername}`
        : "minimal_optin",
      ...options
    }) || getMinimalVersionCheckoutUrl("en", options);

  // バリアントA: 「やめられない」＋ 罠スコア見せる / 出口マップは無料版
  const variantA = {
    en: () =>
      `Can't stop trading? We show the trap score. The exit map? That's in the free tier. Watch (subs): ${VSL_YOUTUBE_URL} Free: ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `「待てない」で負けてない？罠スコアは見せる。出口マップは無料版の奥にある。視聴（字幕あり）: ${VSL_YOUTUBE_URL} 無料登録: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `¿No puedes dejar de operar? Mostramos el trap score. ¿El mapa de salida? Está en el tier gratis. Mira (subs): ${VSL_YOUTUBE_URL} Gratis: ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Não para de operar? Mostramos o trap score. O mapa de saída? Está no tier grátis. Assista (legendas): ${VSL_YOUTUBE_URL} Grátis: ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `ما تقدر توقف التداول؟ نوري trap score. خريطة الخروج؟ في التير المجاني. شوف (ترجمة): ${VSL_YOUTUBE_URL} مجاني: ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `못 참고 매매해? 트랩 스코어는 보여줌. 출구 맵? 무료 티어 안에 있어. 시청(자막): ${VSL_YOUTUBE_URL} 무료: ${whopUrl} #BTC #TrapDefence`
  };

  // バリアントB: 「彼らは笑った」風 ＋ Regular の一切れチラ見せ（ツァイガルニク）
  const variantB = {
    en: () =>
      `They laughed when I said "wait for the trap." Then the dump came. Snippet from today's briefing: "Score 12/100. Exit map—inside." Watch: ${VSL_YOUTUBE_URL} Free: ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `「罠を待て」と言ったら笑われた。そのあとダンプが来た。本日のブリーフ一切れ:「スコア12/100。出口マップは中に。」視聴: ${VSL_YOUTUBE_URL} 無料: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `Se rieron cuando dije "espera la trampa." Luego vino el dump. Fragmento de hoy: "Score 12/100. Mapa de salida—dentro." Mira: ${VSL_YOUTUBE_URL} Gratis: ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Riram quando falei "espere a armadilha." Veio o dump. Trecho de hoje: "Score 12/100. Mapa de saída—dentro." Assista: ${VSL_YOUTUBE_URL} Grátis: ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `ضحكوا لما قلت "استنى الفخ." بعدين جت الـ dump. مقتطف اليوم: "Score 12/100. خريطة الخروج—جوا." شوف: ${VSL_YOUTUBE_URL} مجاني: ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `"함정 기다려" 하니까 비웃더라. 그다음 덤프 왔음. 오늘 브리핑 한 조각: "스코어 12/100. 출구 맵—안에." 시청: ${VSL_YOUTUBE_URL} 무료: ${whopUrl} #BTC #TrapDefence`
  };

  // バリアントC: 「90%が嵌る罠」＋ Minimal/Regular の「途中で切る」チラ見せ
  const variantC = {
    en: () =>
      `The trap 90% of traders fall into. We show the score. We don't show the "where to exit"—that's in the free tier. Watch: ${VSL_YOUTUBE_URL} Free: ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `トレーダー90%が嵌る罠。スコアは見せる。「どこで出口」は見せない—無料版の奥にある。視聴: ${VSL_YOUTUBE_URL} 無料: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `La trampa en la que caen 90% de traders. Mostramos el score. No mostramos "dónde salir"—está en el tier gratis. Mira: ${VSL_YOUTUBE_URL} Gratis: ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `A armadilha em que 90% dos traders caem. Mostramos o score. "Onde sair" fica no tier grátis. Assista: ${VSL_YOUTUBE_URL} Grátis: ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `الفخ اللي 90% من المتداولين يقعوا فيه. نوري السكور. "وين تخرج"—في التير المجاني. شوف: ${VSL_YOUTUBE_URL} مجاني: ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `트레이더 90%가 걸리는 함정. 스코어는 보여줌. "어디서 출구"는 무료 티어 안에. 시청: ${VSL_YOUTUBE_URL} 무료: ${whopUrl} #BTC #TrapDefence`
  };

  const variant = options.variant || "A";
  const map = variant === "B" ? variantB : variant === "C" ? variantC : variantA;
  const fn = map[normalizedLang] || map.en;
  return fn();
}

/**
 * 全言語のテンプレートを一括取得（プレビュー・A/B用）
 */
function getAllMinimalOptinTemplates(options = {}) {
  const langs = ["en", "ja", "es", "pt-br", "ar", "ko"];
  return Object.fromEntries(
    langs.map((lang) => [lang, getMinimalOptinQuoteTemplate(lang, options)])
  );
}

/** Minimal オプトイン用バリアント名（A/B/C ローテーション用） */
const MINIMAL_OPTIN_VARIANTS = ["A", "B", "C"];

module.exports = {
  VSL_YOUTUBE_URL,
  MINIMAL_OPTIN_VARIANTS,
  getMinimalOptinQuoteTemplate,
  getAllMinimalOptinTemplates
};
