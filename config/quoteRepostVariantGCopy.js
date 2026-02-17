// config/quoteRepostVariantGCopy.js
// バリアントG用: チラ見せスニペット・リンク説明・反論定型・CTAブロック（分析積み上げのSSOT）

const { CORE_PHRASES, PRICE_FRAMING, getMonthlyPriceForLang } = require("./personaStrategy");

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

/**
 * 無料版（Minimal Version）リンクの説明（引用リポストでリンクの直前に置く・丁寧表現）
 * 仕様: 無料VSLで全体像を伝え、その直下にWhop無料チェックアウトリンクを配置する旨を簡潔に案内する。
 */
const MINIMAL_LINK_EXPLANATION = {
  ja: "無料のビデオで全体像をご覧いただけます。ご登録（カード不要）は下記リンクからお願いいたします。",
  en: "The free video explains the full picture. Please use the link below to sign up (no card required).",
  es: "El vídeo gratuito explica la historia completa. Use el enlace de abajo para registrarse (sin tarjeta).",
  "pt-br":
    "O vídeo grátis explica a história completa. Use o link abaixo para se cadastrar (sem cartão).",
  ar: "الفيديو المجاني يشرح الصورة كاملة. يرجى استخدام الرابط أدناه للتسجيل (بدون بطاقة).",
  ko: "무료 영상에서 전체 스토리를 보실 수 있습니다. 아래 링크에서 가입해 주세요 (카드 불필요)."
};

/**
 * 有料版（Regular Briefing）リンクの説明（引用リポストでリンクの直前に置く・丁寧表現）
 * 仕様: 5分パルス（KIBA）・出口マップ付き有料版を案内し、プロモコードで50%オフとなる旨を明示する。
 */
const REGULAR_LINK_EXPLANATION = {
  ja: "5分パルス（KIBA）と出口マップ付きの有料版は、下記リンクからご案内しております。コード入力で50%オフとなります。",
  en: "The paid plan (5-min pulse KIBA + exit map) is available via the link below. Enter the code for 50% off.",
  es: "El plan de pago (pulso 5min KIBA + mapa de salida) está en el enlace de abajo. Introduzca el código para 50% off.",
  "pt-br":
    "O plano pago (pulso 5min KIBA + mapa de saída) está no link abaixo. Insira o código para 50% off.",
  ar: "الخطة المدفوعة (نبض 5 دقائق KIBA + خريطة خروج) متوفرة عبر الرابط أدناه. أدخل الكود لخصم 50%.",
  ko: "유료 플랜(5분 펄스 KIBA+출구 맵)은 아래 링크에서 안내드립니다. 코드 입력 시 50% 할인됩니다."
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

/**
 * CTAブロック: 価格フレーム・トライアル・コード（引用リポスト用・丁寧表現）
 * 仕様: 言語別月額（marketProfiles）・1日トライアルでリスクゼロ・プロモコードで50%オフを簡潔に案内する。
 */
function getCtaBlock(lang, promoCode = "defend50") {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const code = (promoCode || "defend50").toUpperCase();
  const price = getMonthlyPriceForLang(normalizedLang);

  const blocks = {
    ja: `月額$${price}は、含み損の0.2〜0.5%程度です。1日トライアルで中身をご確認いただき、合わなければ解約いただけます（リスクゼロ）。
ご案内：コード ${code} で50%オフ（先着50名まで）。
▼ Regular Briefing（1日無料トライアル）`,
    en: `$${price}/mo is about 0.2% of a $50k loss. 1-day trial—see the report, cancel if it's not for you. Risk zero.
Code ${code} = 50% off (next 50 only).
▼ Regular Briefing (1-day free trial)`,
    es: `$${price}/mes equivale a ~0.2% de una pérdida de $50k. Prueba de 1 día: vea el informe, cancele si no encaja. Riesgo cero.
Código ${code} = 50% off (próximos 50).
▼ Regular Briefing (prueba 1 día gratis)`,
    "pt-br": `$${price}/mês equivale a ~0.2% de uma perda de $50k. Teste 1 dia: veja o relatório, cancele se não encaixar. Risco zero.
Código ${code} = 50% off (próximos 50).
▼ Regular Briefing (teste 1 dia grátis)`,
    ar: `$${price}/شهر ≈ 0.2% من خسارة $50k. تجربة يوم—شاهد التقرير، ألغِ إن لم يناسب. خطر صفر.
كود ${code} = خصم 50% (أول 50 فقط).
▼ Regular Briefing (يوم مجاني)`,
    ko: `$${price}/월은 $50k 손실의 약 0.2% 수준입니다. 1일 체험 후 레포트를 보시고, 맞지 않으면 해지하시면 됩니다 (리스크 제로).
코드 ${code} = 50% 할인 (선착 50명).
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
  getMonthlyPriceForLang,
  getMinimalTeaser,
  getRegularTeaser,
  getMinimalLinkExplanation,
  getRegularLinkExplanation,
  getObjectionFixed
};
