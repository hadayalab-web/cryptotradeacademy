// config/quoteRepostTemplatesMinimalOptin.js
// 引用リポスト用テンプレート: 無料版（Minimal Version）オプトイン導線
// 設計意図: ヘッドライン～リードでトレード依存症のトレーダーを引き込み、
// 無料版・有料版の実際の配信をチラ見させて VSL→Whop の導線を表現する（目標 800～1,200 文字）。
// 1. 有名ヘッドライン風フック（トレード依存症・深層心理を揺さぶる）
// 2. ツァイガルニク効果（Minimal/Regular TG配信の切り抜きチラ見せ→未完で気になる）
// VSLリンクはGrokセールスレターのみで使用。MinimalオプトインではWhop導線のみ。
// ポリシー: X投稿ではWhopはリンクだけ（リッチプレビュー・長いCTA文を避ける）。URLのみ挿入。
// 最適文字数: docs/ai-analysis-results/OPTIMAL_LONG_POST_LENGTH_INTEGRATED.md 参照。

const { getMinimalVersionCheckoutUrl } = require("../services/telegram/whop-links");

/**
 * テンプレート1: Minimal オプトイン導線（6言語）
 * @param {string} lang - 言語コード (en, es, pt-br, ar, ko, ja)
 * @param {Object} options - { influencerUsername, utm_content, variant: 'A'|'B'|'C'|'D'|'E' }
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

  // バリアントA: 「やめられない」＋ 罠スコア見せる / 出口マップは無料版（Whopはリンクだけ）
  const variantA = {
    en: () =>
      `Can't stop trading? We show the trap score. The exit map? That's in the free tier. Free: ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `「待てない」で負けてない？罠スコアは見せる。出口マップは無料版の奥にある。無料: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `¿No puedes dejar de operar? Mostramos el trap score. ¿El mapa de salida? Está en el tier gratis. Gratis: ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Não para de operar? Mostramos o trap score. O mapa de saída? Está no tier grátis. Grátis: ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `ما تقدر توقف التداول؟ نوري trap score. خريطة الخروج؟ في التير المجاني. مجاني: ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `못 참고 매매해? 트랩 스코어는 보여줌. 출구 맵? 무료 티어 안에 있어. 무료: ${whopUrl} #BTC #TrapDefence`
  };

  // バリアントB: 「彼らは笑った」風 ＋ Regular の一切れチラ見せ（ツァイガルニク）
  const variantB = {
    en: () =>
      `They laughed when I said "wait for the trap." Then the dump came. Snippet from today's briefing: "Score 12/100. Exit map—inside." Free: ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `「罠を待て」と言ったら笑われた。そのあとダンプが来た。本日のブリーフ一切れ:「スコア12/100。出口マップは中に。」無料: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `Se rieron cuando dije "espera la trampa." Luego vino el dump. Fragmento de hoy: "Score 12/100. Mapa de salida—dentro." Gratis: ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Riram quando falei "espere a armadilha." Veio o dump. Trecho de hoje: "Score 12/100. Mapa de saída—dentro." Grátis: ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `ضحكوا لما قلت "استنى الفخ." بعدين جت الـ dump. مقتطف اليوم: "Score 12/100. خريطة الخروج—جوا." مجاني: ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `"함정 기다려" 하니까 비웃더라. 그다음 덤프 왔음. 오늘 브리핑 한 조각: "스코어 12/100. 출구 맵—안에." 무료: ${whopUrl} #BTC #TrapDefence`
  };

  // バリアントC: 「90%が嵌る罠」＋ Minimal/Regular の「途中で切る」チラ見せ（Whopはリンクだけ）
  const variantC = {
    en: () =>
      `The trap 90% of traders fall into. We show the score. We don't show the "where to exit"—that's in the free tier. Free: ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `トレーダー90%が嵌る罠。スコアは見せる。「どこで出口」は見せない—無料版の奥にある。無料: ${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `La trampa en la que caen 90% de traders. Mostramos el score. No mostramos "dónde salir"—está en el tier gratis. Gratis: ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `A armadilha em que 90% dos traders caem. Mostramos o score. "Onde sair" fica no tier grátis. Grátis: ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `الفخ اللي 90% من المتداولين يقعوا فيه. نوري السكور. "وين تخرج"—في التير المجاني. مجاني: ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `트레이더 90%가 걸리는 함정. 스코어는 보여줌. "어디서 출구"는 무료 티어 안에. 무료: ${whopUrl} #BTC #TrapDefence`
  };

  // バリアントD: 市況悪化・ドローダウン特化（Grok #TrapScore #RiskOff でアルゴブースト、Gemini 心理原則）
  const variantD = {
    en: () =>
      `Market bleeding? Don't jump in without the trap score. The next trap is the one that cleans out the rest. Free: ${whopUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    ja: () =>
      `相場が血の海のとき、スコア見ずに飛び込むな。次に来るのは「戻りだと思って嵌る罠」。無料: ${whopUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    es: () =>
      `¿Mercado en rojo? No entres sin ver el trap score. La próxima trampa es la que limpia a los que quedan. Gratis: ${whopUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    "pt-br": () =>
      `Mercado sangrando? Não entre sem o trap score. A próxima armadilha é a que limpa o resto. Grátis: ${whopUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    ar: () =>
      `السوق ينزف؟ لا تدخل بدون trap score. الفخ الجاي هو اللي ينضف الباقي. مجاني: ${whopUrl} #BTC #TrapScore #RiskOff #TrapDefence`,
    ko: () =>
      `시장 피터지는데 스코어 안 보고 들어가? 다음 함정이 남은 사람들 다 쓸어감. 무료: ${whopUrl} #BTC #TrapScore #RiskOff #TrapDefence`
  };

  // バリアントE: 状態言語化＋gut vs data（Whopはリンクだけ）
  const variantE = {
    en: () =>
      `Stuck in the "just watching" loop with unrealized loss? Many are. No rules = every move a guess. Trap Score = data vs gut. ${whopUrl} #BTC #TrapDefence`,
    ja: () =>
      `含み損で「見るだけ」ループ？多くの人がハマる。ルールなし=都度判断の罠。Trap Scoreでdata vs gut。${whopUrl} #BTC #TrapDefence`,
    es: () =>
      `¿Atrapado en el bucle de "solo mirar" con pérdida no realizada? Muchos. Sin reglas = cada movimiento una suposición. Trap Score = datos vs instinto. ${whopUrl} #BTC #TrapDefence`,
    "pt-br": () =>
      `Preso no loop de "só assistir" com perda não realizada? Muitos. Sem regras = cada movimento um chute. Trap Score = dados vs gut. ${whopUrl} #BTC #TrapDefence`,
    ar: () =>
      `عالق في حلقة "فقط أشاهد" مع خسارة غير محققة؟ كثيرون. بدون قواعد = كل خطوة تخمين. Trap Score = بيانات vs غريزة. ${whopUrl} #BTC #TrapDefence`,
    ko: () =>
      `미실현 손실로 "그냥 보기" 루프에 갇혀? 많은 사람이 그래. 룰 없음 = 매번 추측. Trap Score = 데이터 vs 직감. ${whopUrl} #BTC #TrapDefence`
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

/**
 * 全言語のテンプレートを一括取得（プレビュー・A/B用）
 */
function getAllMinimalOptinTemplates(options = {}) {
  const langs = ["en", "ja", "es", "pt-br", "ar", "ko"];
  return Object.fromEntries(
    langs.map((lang) => [lang, getMinimalOptinQuoteTemplate(lang, options)])
  );
}

/** Minimal オプトイン用バリアント名（A/B/C/D/E ローテーション。E=状態言語化＋gut vs data、ペルソナ解析 2026-02） */
const MINIMAL_OPTIN_VARIANTS = ["A", "B", "C", "D", "E"];

module.exports = {
  MINIMAL_OPTIN_VARIANTS,
  getMinimalOptinQuoteTemplate,
  getAllMinimalOptinTemplates
};
