/**
 * PQT 本文テンプレート（6言語 × 4–5バリアント）
 * Grok Secret Weapons: Question prefix（Reply +400%）, Double linebreak, Emoji mid-hook, Mirror vocab, No final period → pqtSecretWeapons で適用
 * トーン方針: 緊急感・危機感を前面に（クジラのトラップから救済する趣旨）— 危機リードのバリアントを混在
 * 心理フル加速: 損失回避・緊急性・ツァイガルニク効果を刺激 — 先頭バリアントでめいっぱい効かせる
 */
const PQT_TEMPLATES = {
  en: [
    ({ coin, proofSnippet, link }) =>
      `Don't lose here—what happens next? 90% never check.\n\n${proofSnippet}\n\nMissing piece before you're next → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Don't get trapped here—90% miss this level.\n\n${proofSnippet}\n\nFull checklist before you move → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin} is pumping hard 🚀 I agree this move is real.\n\n${proofSnippet}\n\nI put the full structure + entries here → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `This ${coin} setup is exactly what my system caught earlier.\n\n${proofSnippet}\n\nIf you want the full briefing before you decide → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Spot on! Key level most miss.\n\n${proofSnippet}\n\nChecklist to ride this → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Pumping hard—90% fail here without this checklist.\n\n${proofSnippet}\n\nGrab the briefing → ${link}`,
    ({ coin, proofSnippet, link, mirrorWords }) =>
      `Breakout if ${coin} holds? Key level:\n\n${proofSnippet}\n\nChecklist to ride this → ${link}`,
    ({ coin, proofSnippet, link, mirrorWords }) =>
      `Spot on${mirrorWords ? "—" + mirrorWords : ""}.\n\n${proofSnippet}\n\nGrab here → ${link}`
  ],
  ja: [
    ({ coin, proofSnippet, link }) =>
      `損する前に。この先どうなる？答えを今のうちに:\n\n${proofSnippet}\n\n判断材料ここ → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `ここで巻き込まれないで。要チェック:\n\n${proofSnippet}\n\n判断材料をまとめました → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin}のこの動き、本物だと思う。\n\n${proofSnippet}\n\n裏側の構造を1枚にまとめたので、判断前に一度だけ見てほしい → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin}、確かに強い流れです。\n\n${proofSnippet}\n\nエントリー前の「判断材料」として置いておきます → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `その通りです。要チェック:\n\n${proofSnippet}\n\n判断材料をまとめました → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `この動き本物？要チェック:\n\n${proofSnippet}\n\n判断材料ここ → ${link}`,
    ({ coin, proofSnippet, link, mirrorWords }) =>
      `その通りです${mirrorWords ? "—" + mirrorWords : ""}。\n\n${proofSnippet}\n\nここ → ${link}`
  ],
  es: [
    ({ coin, proofSnippet, link }) =>
      `No pierdas aquí. ¿Qué sigue? La pieza que falta, ahora:\n\n${proofSnippet}\n\nAntes de entrar → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `No te dejes atrapar aquí. Clave:\n\n${proofSnippet}\n\nChecklist antes de entrar → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin} está subiendo fuerte 🚀 Coincido: este movimiento es real.\n\n${proofSnippet}\n\nEstructura completa + entradas aquí → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Este setup de ${coin} es justo lo que mi sistema detectó antes.\n\n${proofSnippet}\n\nSi quieres el briefing completo antes de decidir → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `¡Exacto! Mira esto:\n\n${proofSnippet}\n\nChecklist para este movimiento → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `¿Sostiene ${coin}? Clave:\n\n${proofSnippet}\n\nChecklist aquí → ${link}`,
    ({ coin, proofSnippet, link, mirrorWords }) =>
      `¡Exacto${mirrorWords ? "—" + mirrorWords : ""}!\n\n${proofSnippet}\n\nAquí → ${link}`
  ],
  pt: [
    ({ coin, proofSnippet, link }) =>
      `Não perde aqui. O que vem depois? A peça que falta, agora:\n\n${proofSnippet}\n\nPega antes de entrar → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Não cai na armadilha aqui. Checklist:\n\n${proofSnippet}\n\nPega o briefing antes de entrar → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin} subindo forte 🚀 Concordo que esse movimento é real.\n\n${proofSnippet}\n\nEstrutura completa + entradas aqui → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Esse setup de ${coin} é exatamente o que meu sistema pegou antes.\n\n${proofSnippet}\n\nSe quiser o briefing completo antes de decidir → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Mano, spot on! 🚀\n\n${proofSnippet}\n\nChecklist pra não queimar aqui → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Segura ${coin}? Checklist:\n\n${proofSnippet}\n\nPega o briefing → ${link}`,
    ({ coin, proofSnippet, link, mirrorWords }) =>
      `Mano, spot on${mirrorWords ? "—" + mirrorWords : ""}.\n\n${proofSnippet}\n\nAqui → ${link}`
  ],
  ar: [
    ({ coin, proofSnippet, link }) =>
      `لا تخسر هنا. ماذا بعد؟ القطعة الناقصة الآن:\n\n${proofSnippet}\n\nقبل الدخول → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `لا تقع في الفخ هنا. الأساس:\n\n${proofSnippet}\n\nقائمة التحقق قبل الدخول → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin} يضخ بقوة 🚀 أرى أن هذه الحركة حقيقية.\n\n${proofSnippet}\n\nالبنية الكاملة + الدخول هنا → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `هذا الإعداد لـ ${coin} هو ما رصده نظامي سابقاً.\n\n${proofSnippet}\n\nإذا أردت الإحاطة الكاملة قبل أن تقرر → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `صحيح تماماً. إضافة قيمة:\n\n${proofSnippet}\n\nقائمة التحقق لهذا السيناريو → ${link}`,
    ({ coin, proofSnippet, link, mirrorWords }) =>
      `صحيح تماماً${mirrorWords ? "—" + mirrorWords : ""}.\n\n${proofSnippet}\n\nهنا → ${link}`
  ],
  ko: [
    ({ coin, proofSnippet, link }) =>
      `여기서 손실 전에. 다음은? 답은 지금 여기:\n\n${proofSnippet}\n\n들어가기 전에 → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `여기서 휩쓸리지 마. 체크리스트:\n\n${proofSnippet}\n\n들어가기 전에 여기 → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin} 강하게 올라가는 중 🚀 이 움직임 진짜라고 봐.\n\n${proofSnippet}\n\n전체 구조 + 엔트리 여기 → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `이 ${coin} 세팅은 내 시스템이 아까 포착한 그거야.\n\n${proofSnippet}\n\n결정 전에 풀 브리핑 원하면 → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `맞아요, 여기에 체크리스트:\n\n${proofSnippet}\n\n이 셋업 브리핑 여기 → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `이동 유지되면? 체크리스트:\n\n${proofSnippet}\n\n여기 → ${link}`,
    ({ coin, proofSnippet, link, mirrorWords }) =>
      `맞아요${mirrorWords ? "—" + mirrorWords : ""}.\n\n${proofSnippet}\n\n여기 → ${link}`
  ]
};

module.exports = { PQT_TEMPLATES };
