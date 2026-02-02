// config/quoteRepostTemplatesIntegrated.js
// 引用リポスト用テンプレート: 無料版（Minimal）と有料版（Regular）導線を1投稿に統合
// 設計: 1投稿内で「無料でスコア→VSL」「有料でブリーフ・出口マップ」の両方へ誘導する。
// ペルソナ決め打ち: バリアントEは config/personaStrategy.js の CORE_PHRASES.state を参照する。

const {
  getMinimalVersionCheckoutUrl,
  getWhopProductUrl,
  getPromoCode,
  getRegularTrialCta
} = require("../services/telegram/whop-links");
const { CORE_PHRASES } = require("./personaStrategy");
const { VSL_MINIMAL, VSL_REGULAR } = require("./vslLinks");

const VSL_MINIMAL_URL = VSL_MINIMAL.url;
const VSL_REGULAR_URL = VSL_REGULAR.url;

/** 有料導線: Whopはリンクだけ（X投稿ポリシー・リッチプレビューを避ける） */
function getRegularCtaLine(lang) {
  return getRegularWhopLinkOnly(lang);
}

/**
 * 統合テンプレート: 無料＋有料の両導線を1投稿で出す
 * @param {string} lang - 言語コード (en, es, pt-br, ar, ko, ja)
 * @param {Object} options - { influencerUsername, utm_content, variant: 'A'|'B'|'C'|'D'|'E' }
 * @returns {string} 引用リポスト用テキスト
 */
function getIntegratedMinimalRegularQuoteTemplate(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const minimalUrl =
    getMinimalVersionCheckoutUrl(normalizedLang, {
      utm_content: options.influencerUsername
        ? `influencer_${options.influencerUsername}`
        : "integrated",
      ...options
    }) || getMinimalVersionCheckoutUrl("en", options);
  const regularCta = getRegularCtaLine(normalizedLang);
  const priceHookEn = CORE_PHRASES.price.en;
  const priceHookJa = CORE_PHRASES.price.ja;

  // バリアントA: 「やめられない」＋ 無料スコア・有料はPRO ＋ 価格フレーミング（CVR/LTV）
  const variantA = {
    en: () =>
      `Can't stop trading? We show the trap score (free). Exit map? That's in PRO. ${priceHookEn} Watch: ${VSL_MINIMAL_URL} Free: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ja: () =>
      `「待てない」で負けてない？罠スコアは無料で。出口マップはPROの奥に。${priceHookJa} 視聴: ${VSL_MINIMAL_URL} 無料: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    es: () =>
      `¿No puedes dejar de operar? Mostramos el trap score (gratis). ¿Mapa de salida? En PRO. Mira: ${VSL_MINIMAL_URL} Gratis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    "pt-br": () =>
      `Não para de operar? Mostramos o trap score (grátis). Mapa de saída? Está no PRO. Assista: ${VSL_MINIMAL_URL} Grátis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ar: () =>
      `ما تقدر توقف التداول؟ نوري trap score (مجاني). خريطة الخروج؟ في PRO. شوف: ${VSL_MINIMAL_URL} مجاني: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ko: () =>
      `못 참고 매매해? 트랩 스코어는 무료. 출구 맵? PRO 안에 있어. 시청: ${VSL_MINIMAL_URL} 무료: ${minimalUrl} ${regularCta} #BTC #TrapDefence`
  };

  // バリアントB: 「彼らは笑った」＋ 無料/有料のチラ見せ
  const variantB = {
    en: () =>
      `They laughed when I said "wait for the trap." Then the dump came. Score + exit map: free tier & PRO. Watch: ${VSL_MINIMAL_URL} Free: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ja: () =>
      `「罠を待て」と言ったら笑われた。そのあとダンプが来た。スコア＋出口は無料とPROで。視聴: ${VSL_MINIMAL_URL} 無料: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    es: () =>
      `Se rieron cuando dije "espera la trampa." Luego vino el dump. Score + mapa salida: gratis y PRO. Mira: ${VSL_MINIMAL_URL} Gratis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    "pt-br": () =>
      `Riram quando falei "espere a armadilha." Veio o dump. Score + mapa saída: grátis e PRO. Assista: ${VSL_MINIMAL_URL} Grátis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ar: () =>
      `ضحكوا لما قلت "استنى الفخ." بعدين جت الـ dump. سكور + خريطة خروج: مجاني و PRO. شوف: ${VSL_MINIMAL_URL} مجاني: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ko: () =>
      `"함정 기다려" 하니까 비웃더라. 그다음 덤프 왔음. 스코어+출구: 무료랑 PRO. 시청: ${VSL_MINIMAL_URL} 무료: ${minimalUrl} ${regularCta} #BTC #TrapDefence`
  };

  // バリアントC: 「90%が嵌る罠」＋ 無料でスコア・有料で全文
  const variantC = {
    en: () =>
      `The trap 90% of traders fall into. Score free; "where to exit" in PRO. Watch: ${VSL_MINIMAL_URL} Free: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ja: () =>
      `トレーダー90%が嵌る罠。スコアは無料。「どこで出口」はPROで。視聴: ${VSL_MINIMAL_URL} 無料: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    es: () =>
      `La trampa en la que caen 90% de traders. Score gratis; "dónde salir" en PRO. Mira: ${VSL_MINIMAL_URL} Gratis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    "pt-br": () =>
      `A armadilha em que 90% dos traders caem. Score grátis; "onde sair" no PRO. Assista: ${VSL_MINIMAL_URL} Grátis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ar: () =>
      `الفخ اللي 90% من المتداولين يقعوا فيه. سكور مجاني؛ "وين تخرج" في PRO. شوف: ${VSL_MINIMAL_URL} مجاني: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ko: () =>
      `트레이더 90%가 걸리는 함정. 스코어 무료. "어디서 출구"는 PRO에. 시청: ${VSL_MINIMAL_URL} 무료: ${minimalUrl} ${regularCta} #BTC #TrapDefence`
  };

  // バリアントD: ドローダウン・リスクオフ特化（無料スコア＋有料で守り）
  const variantD = {
    en: () =>
      `Market bleeding? Don't jump in without the trap score. Free score; exit map in PRO. ${VSL_MINIMAL_URL} Free: ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    ja: () =>
      `相場が血の海のとき、スコア見ずに飛び込むな。無料スコア；出口マップはPROで。${VSL_MINIMAL_URL} 無料: ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    es: () =>
      `¿Mercado en rojo? No entres sin el trap score. Score gratis; mapa salida en PRO. ${VSL_MINIMAL_URL} Gratis: ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    "pt-br": () =>
      `Mercado sangrando? Não entre sem o trap score. Score grátis; mapa saída no PRO. ${VSL_MINIMAL_URL} Grátis: ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    ar: () =>
      `السوق ينزف؟ لا تدخل بدون trap score. سكور مجاني؛ خريطة خروج في PRO. ${VSL_MINIMAL_URL} مجاني: ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    ko: () =>
      `시장 피터지는데 스코어 안 보고 들어가? 무료 스코어；출구 맵은 PRO에. ${VSL_MINIMAL_URL} 무료: ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`
  };

  // バリアントE: ペルソナ決め打ち（personaStrategy.CORE_PHRASES.state をSSOTとして使用）
  const stateHookEn = CORE_PHRASES.state.en;
  const stateHookJa = CORE_PHRASES.state.ja;
  const variantE = {
    en: () =>
      `${stateHookEn} Trap Score = data vs gut. Free: ${minimalUrl} ${regularCta} Watch: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    ja: () =>
      `${stateHookJa} Trap Scoreでdata vs gut。無料: ${minimalUrl} ${regularCta} 視聴: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    es: () =>
      `¿Atrapado en el bucle de "solo mirar" con pérdida no realizada? Sin reglas = cada movimiento una suposición. Trap Score = datos vs instinto. Gratis: ${minimalUrl} ${regularCta} Mira: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    "pt-br": () =>
      `Preso no loop de "só assistir" com perda não realizada? Sem regras = cada movimento um chute. Trap Score = dados vs gut. Grátis: ${minimalUrl} ${regularCta} Assista: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    ar: () =>
      `عالق في حلقة "فقط أشاهد" مع خسارة غير محققة؟ بدون قواعد = كل خطوة تخمين. Trap Score = بيانات vs غريزة. مجاني: ${minimalUrl} ${regularCta} شوف: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    ko: () =>
      `미실현 손실로 "그냥 보기" 루프에 갇혀? 룰 없음 = 매번 추측. Trap Score = 데이터 vs 직감. 무료: ${minimalUrl} ${regularCta} 시청: ${VSL_MINIMAL_URL} #BTC #TrapDefence`
  };

  const variant = options.variant || "A";
  const map =
    variant === "B"
      ? variantB
      : variant === "C"
        ? variantC
        : variant === "D"
          ? variantD
          : variant === "E"
            ? variantE
            : variantA;
  const fn = map[normalizedLang] || map.en;
  return fn();
}

/** 統合テンプレートのバリアント名（A〜E、ドローダウン時はDを加重可能） */
const INTEGRATED_VARIANTS = ["A", "B", "C", "D", "E"];

function getAllIntegratedTemplates(options = {}) {
  const langs = ["en", "ja", "es", "pt-br", "ar", "ko"];
  return Object.fromEntries(
    langs.map((lang) => [lang, getIntegratedMinimalRegularQuoteTemplate(lang, options)])
  );
}

module.exports = {
  VSL_MINIMAL_URL,
  VSL_REGULAR_URL,
  INTEGRATED_VARIANTS,
  getIntegratedMinimalRegularQuoteTemplate,
  getAllIntegratedTemplates,
  getRegularCtaLine,
  getRegularWhopLinkOnly
};
