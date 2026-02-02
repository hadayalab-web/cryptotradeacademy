// config/quoteRepostVariantGCopy.js
// バリアントG用: チラ見せスニペット・リンク説明・反論定型・CTAブロック（分析積み上げのSSOT）

const { CORE_PHRASES, PRICE_FRAMING } = require("./personaStrategy");

/** 無料版（Minimal）チラ見せ: 実際のスニペット文（ツァイガルニク） */
const MINIMAL_TEASER = {
  ja: "今日の無料TG一切れ: «トラップスコア12/100。出口はどこ？—» 続きはTelegramで。",
  en: "Today's free TG snippet: «Trap Score 12/100. Where's the exit?—» Rest in Telegram.",
  es: "Hoy en TG gratis: «Trap Score 12/100. ¿Dónde está la salida?—» Resto en Telegram.",
  "pt-br": "Hoje no TG grátis: «Trap Score 12/100. Onde é a saída?—» Resto no Telegram.",
  ar: "اليوم في TG مجاني: «Trap Score 12/100. وين الخروج؟—» الباقي في تيليجرام.",
  ko: "오늘 무료 TG 한 조각: «트랩 스코어 12/100. 출구는?—» 나머지는 TG에서."
};

/** 有料版（Regular）チラ見せ: 実際のスニペット文 */
const REGULAR_TEASER = {
  ja: "有料ブリーフ一切れ: «クジラ積み中。次の罠は48h—» 続きはWhopで。",
  en: "Regular Briefing snippet: «Whales loading. Next trap in 48h—» Rest in Whop.",
  es: "Regular Briefing: «Ballenas cargando. Próxima trampa 48h—» Resto en Whop.",
  "pt-br": "Regular Briefing: «Baleias carregando. Próxima armadilha 48h—» Resto no Whop.",
  ar: "Regular Briefing: «حيتان تحمّل. الفخ الجاي 48h—» الباقي في Whop.",
  ko: "Regular Briefing: «고래 로딩. 다음 함정 48h—» 나머지는 Whop에서."
};

/** 無料VSL＋Whopの説明（リンクの前に置く） */
const MINIMAL_LINK_EXPLANATION = {
  ja: "全体像はVSLで。無料登録（カード不要）はこちら:",
  en: "Full story in the VSL. Free sign-up (no card) here:",
  es: "Historia completa en el VSL. Registro gratis (sin tarjeta) aquí:",
  "pt-br": "História completa no VSL. Cadastro grátis (sem cartão) aqui:",
  ar: "القصة كاملة في الـ VSL. تسجيل مجاني (بدون بطاقة) هنا:",
  ko: "전체 스토리는 VSL에서. 무료 가입(카드 불필요) 여기:"
};

/** 有料VSL＋Whopの説明（リンクの前に置く） */
const REGULAR_LINK_EXPLANATION = {
  ja: "15分アラート＋出口マップ。アップグレードはこちら（コードで50%オフ）:",
  en: "15min Alerts + Exit Map. Upgrade here (50% off with code below):",
  es: "Alertas 15min + Mapa salida. Mejora aquí (50% off con código abajo):",
  "pt-br": "Alertas 15min + Mapa saída. Upgrade aqui (50% off com código abaixo):",
  ar: "تنبيهات 15 دقيقة + خريطة خروج. ترقية هنا (خصم 50% بالكود أدناه):",
  ko: "15분 알림+출구 맵. 업그레이드 여기 (아래 코드로 50% 할인):"
};

/** 反論処理の定型（Gemini廃止・分析に基づく固定文） */
const OBJECTION_FIXED = {
  ja: "この情報はリアルタイムで見ないと意味がない。知っているかどうかで、「勝てる相場」と「ただのギャンブル」の境界線が決まる。1日トライアルで中身を見て、合わなければ即解約。リスクゼロ。",
  en: "This intel only works in real time. Whether you have it or not decides tradeable edge vs pure gamble. 1-day trial—see the report, cancel if it's not for you. Risk zero.",
  es: "Esta info solo sirve en tiempo real. Tenerla o no marca borde tradeable vs apuesta pura. Prueba 1 día—mira el informe, cancela si no encaja. Riesgo cero.",
  "pt-br":
    "Essa info só vale em tempo real. Ter ou não define edge tradeável vs aposta pura. Teste 1 dia—veja o relatório, cancele se não encaixar. Risco zero.",
  ar: "هالمعلومة تخدم فقط بالوقت الحقيقي. وجودها يحدد edge vs قمار. تجربة يوم—شوف التقرير، ألغِ لو ما يناسب. خطر صفر.",
  ko: "이 정보는 실시간으로 봐야 의미 있다. 갖고 있느냐에 따라 트레이더블 엣지 vs 순수 도박이 갈린다. 1일 체험—레포트 보고, 안 맞으면 해지. 리스크 제로."
};

/** CTAブロック: 価格フレーム・トライアル・コード（分析積み上げ） */
function getCtaBlock(lang, promoCode = "defend50") {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const code = (promoCode || "defend50").toUpperCase();

  const blocks = {
    ja: `$99/月 = 含み損の0.2〜0.5%。1日トライアルでリスクゼロ。
あなたに特別に、次の50名までコード ${code} で50%オフ。
▼ Regular Briefing（1日無料トライアル）`,
    en: `$99/mo = 0.2% of a $50k loss. 1-day trial, cancel anytime. Risk zero.
For you: code ${code} = 50% off (next 50 only).
▼ Regular Briefing (1-day free trial)`,
    es: `$99/mes = 0.2% de una pérdida de $50k. Prueba 1 día, cancela cuando quieras. Riesgo cero.
Para ti: código ${code} = 50% off (próximos 50).
▼ Regular Briefing (prueba 1 día gratis)`,
    "pt-br": `$99/mês = 0.2% de uma perda de $50k. Teste 1 dia, cancele quando quiser. Risco zero.
Para você: código ${code} = 50% off (próximos 50).
▼ Regular Briefing (teste 1 dia grátis)`,
    ar: `$99/شهر = 0.2% من خسارة $50k. تجربة يوم، ألغِ متى ما تبي. خطر صفر.
لك: كود ${code} = خصم 50% (أول 50 فقط).
▼ Regular Briefing (يوم مجاني)`,
    ko: `$99/월 = $50k 손실의 0.2%. 1일 체험, 언제든 해지. 리스크 제로.
당신만: 코드 ${code} = 50% 할인 (선착 50명).
▼ Regular Briefing (1일 무료 체험)`
  };

  return blocks[normalizedLang] || blocks.en;
}

function getMinimalTeaser(lang) {
  return MINIMAL_TEASER[(lang || "en").toLowerCase().replace("_", "-")] || MINIMAL_TEASER.en;
}
function getRegularTeaser(lang) {
  return REGULAR_TEASER[(lang || "en").toLowerCase().replace("_", "-")] || REGULAR_TEASER.en;
}
function getMinimalLinkExplanation(lang) {
  return (
    MINIMAL_LINK_EXPLANATION[(lang || "en").toLowerCase().replace("_", "-")] ||
    MINIMAL_LINK_EXPLANATION.en
  );
}
function getRegularLinkExplanation(lang) {
  return (
    REGULAR_LINK_EXPLANATION[(lang || "en").toLowerCase().replace("_", "-")] ||
    REGULAR_LINK_EXPLANATION.en
  );
}
function getObjectionFixed(lang) {
  return OBJECTION_FIXED[(lang || "en").toLowerCase().replace("_", "-")] || OBJECTION_FIXED.en;
}

module.exports = {
  MINIMAL_TEASER,
  REGULAR_TEASER,
  MINIMAL_LINK_EXPLANATION,
  REGULAR_LINK_EXPLANATION,
  OBJECTION_FIXED,
  getCtaBlock,
  getMinimalTeaser,
  getRegularTeaser,
  getMinimalLinkExplanation,
  getRegularLinkExplanation,
  getObjectionFixed
};
