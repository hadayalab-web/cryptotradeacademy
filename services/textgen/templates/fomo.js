/**
 * Trap Defence OS v5.0 — FOMO / ATH テンプレート
 */

function buildFomoTemplate({ lang, market, narrative_tag }) {
  const { asset = "BTC", trapScore = "elevated", netflowState = "absorption" } = market || {};

  const hook = {
    ja: `なぜ ${asset} ではなく DOGE と XRP から先に火がついたのか？`,
    ko: `왜 BTC가 아니라 DOGE랑 XRP가 먼저 불붙었을까?`,
    es: `¿Por qué DOGE y XRP se disparan antes que ${asset}?`,
    en: `Why are DOGE and XRP pumping *before* ${asset}?`,
    pt: `Por que DOGE e XRP estão disparando antes de ${asset}?`,
    ar: `لماذا ترتفع DOGE وXRP قبل ${asset}؟`
  }[lang] || `Why are DOGE and XRP moving before ${asset}?`;

  const body = {
    en: `Trap Score is spiking (${trapScore}). Netflow flipped into ${netflowState}. This is not random meme rotation—it's the crowd being stress-tested before the real ${asset} move.`,
    ja: `Trap Score は ${trapScore} まで急上昇し、Netflow は「${netflowState}」に転換している。これは単なるミームのローテーションではなく、本命である ${asset} の波の前に「群衆心理」が試されている状態だ。`,
    ko: `Trap Score는 ${trapScore}까지 치솟았고, Netflow는 '${netflowState}' 상태로 바뀌었다. 이건 그냥 밈 장난이 아니라, 진짜 ${asset} 파동 전에 군중 심리를 테스트하는 구간이다.`,
    es: `Trap Score sube a ${trapScore}. Netflow cambia a '${netflowState}'. No es rotación aleatoria de memes: es una prueba de FOMO antes del movimiento real de ${asset}.`,
    pt: `Trap Score dispara para ${trapScore}. Netflow vira para '${netflowState}'. Não é só meme: é teste de FOMO antes do movimento real de ${asset}.`,
    ar: `Trap Score عند ${trapScore} وNetflow تحولت إلى '${netflowState}'. هذا ليس مجرد ميم، بل اختبار للـFOMO قبل حركة ${asset} الحقيقية.`
  }[lang] || `Trap Score is at ${trapScore}, Netflow is '${netflowState}'. This is a FOMO test before the real ${asset} move.`;

  return { hook, body };
}

function buildAthTemplate({ lang, market }) {
  const { asset = "BTC", athLevel = "$69K–$72K" } = market || {};

  const hook = {
    en: `${asset} is approaching its real ATH battlefield: ${athLevel}.`,
    ja: `${asset} は本当の ATH 戦場 ${athLevel} に近づいている。`,
    ko: `${asset}가 진짜 ATH 전장 ${athLevel} 근처까지 왔다.`,
    es: `${asset} se acerca a su verdadera zona de ATH: ${athLevel}.`,
    pt: `${asset} está chegando na verdadeira zona de ATH: ${athLevel}.`,
    ar: `${asset} يقترب من منطقة ATH الحقيقية: ${athLevel}.`
  }[lang] || `${asset} is nearing its real ATH zone: ${athLevel}.`;

  const body = {
    en: `Whales don't chase candles—they build traps around ATH. The question is not "if" we touch it, but "who becomes exit liquidity" when we do.`,
    ja: `クジラはローソク足を追いかけない。ATH 周辺に「罠」を仕掛ける。問題は「到達するかどうか」ではなく、「到達したときに誰が出口流動性にされるか」だ。`,
    ko: `고래들은 캔들을 쫓지 않는다. ATH 주변에 '함정'을 만든다. 중요한 건 '닿느냐'가 아니라, '닿았을 때 누가 exit liquidity가 되느냐'다.`,
    es: `Las ballenas no persiguen velas: construyen trampas alrededor del ATH. La pregunta no es si llegamos, sino quién será la liquidez de salida cuando pase.`,
    pt: `Baleias não correm atrás de vela: montam armadilhas em torno do ATH. A questão não é se chega, mas quem vira liquidez de saída quando chegar.`,
    ar: `الحيتان لا تطارد الشموع، بل تبني الفخاخ حول ATH. السؤال ليس هل نصل، بل من سيكون سيولة الخروج عند الوصول.`
  }[lang] || `Whales build traps around ATH. The real question is who becomes exit liquidity there.`;

  return { hook, body };
}

function buildCrashTemplate({ lang, market }) {
  const { asset = "BTC" } = market || {};
  return buildFomoTemplate({ lang, market: { ...market, asset }, narrative_tag: "CRASH" });
}

module.exports = { buildFomoTemplate, buildAthTemplate, buildCrashTemplate };
