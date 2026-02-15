/**
 * PQT 本文テンプレート（6言語 × 2バリアント）
 * PQT-ONLY: 4要素のみ — 1.Agree（釣り師に乗る） 2.Proof（1行の構造視点） 3.Soft CTA（押し付けない導線） 4.Link
 * 型: ({ coin, proofSnippet, link }) => string。言語別ニュアンスは languageConfig.tone で管理。
 */
const PQT_TEMPLATES = {
  en: [
    ({ coin, proofSnippet, link }) =>
      `${coin} is pumping hard 🚀 I agree this move is real.\n${proofSnippet}\nI put the full structure + entries here → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `This ${coin} setup is exactly what my system caught earlier.\n${proofSnippet}\nIf you want the full briefing before you decide → ${link}`
  ],
  ja: [
    ({ coin, proofSnippet, link }) =>
      `${coin}のこの動き、本物だと思う。\n${proofSnippet}\n裏側の構造を1枚にまとめたので、判断前に一度だけ見てほしい → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `${coin}、確かに強い流れです。\n${proofSnippet}\nエントリー前の「判断材料」として置いておきます → ${link}`
  ],
  es: [
    ({ coin, proofSnippet, link }) =>
      `${coin} está subiendo fuerte 🚀 Coincido: este movimiento es real.\n${proofSnippet}\nEstructura completa + entradas aquí → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Este setup de ${coin} es justo lo que mi sistema detectó antes.\n${proofSnippet}\nSi quieres el briefing completo antes de decidir → ${link}`
  ],
  pt: [
    ({ coin, proofSnippet, link }) =>
      `${coin} subindo forte 🚀 Concordo que esse movimento é real.\n${proofSnippet}\nEstrutura completa + entradas aqui → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `Esse setup de ${coin} é exatamente o que meu sistema pegou antes.\n${proofSnippet}\nSe quiser o briefing completo antes de decidir → ${link}`
  ],
  ar: [
    ({ coin, proofSnippet, link }) =>
      `${coin} يضخ بقوة 🚀 أرى أن هذه الحركة حقيقية.\n${proofSnippet}\nالبنية الكاملة + الدخول هنا → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `هذا الإعداد لـ ${coin} هو ما رصده نظامي سابقاً.\n${proofSnippet}\nإذا أردت الإحاطة الكاملة قبل أن تقرر → ${link}`
  ],
  ko: [
    ({ coin, proofSnippet, link }) =>
      `${coin} 강하게 올라가는 중 🚀 이 움직임 진짜라고 봐.\n${proofSnippet}\n전체 구조 + 엔트리 여기 → ${link}`,
    ({ coin, proofSnippet, link }) =>
      `이 ${coin} 세팅은 내 시스템이 아까 포착한 그거야.\n${proofSnippet}\n결정 전에 풀 브리핑 원하면 → ${link}`
  ]
};

module.exports = { PQT_TEMPLATES };
