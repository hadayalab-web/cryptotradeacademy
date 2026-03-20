/**
 * Slice markers MUST match services/telegram/messages/user/<lang>/regular.*.js
 * lines.push('📊 …') and 💊 / 💎 section headers.
 */

const LOCALES = {
  en: {
    formatterLang: 'en',
    markers: {
      data_backed: '\n📊 Data-Backed Evidence',
      psychological: '\n💊 Psychological Insight (Dr. Grok)',
      trap_value: '\n💎 Trap Defence Value',
    },
    banner: [
      '📣 PUBLIC SAMPLE — Regular briefing format (illustrative-only demo, not live data).',
      'Subscribers receive the full timely briefing end-to-end.',
      '',
    ].join('\n'),
    footerLead: '➡️ Trap Defence Regular · link in bio / pinned.',
    disclaimer: 'For educational purposes only. Not financial advice.',
    highResX:
      'Retail timeline noise is elevated: narrative spikes cluster around leverage and funding, while spot conviction looks thinner — a common pre-volatility silence pattern.',
    /** X auto-post: live snapshot excerpt line */
    liveExcerptPrefix: '🔎 Regular — public excerpt (subscriber briefing goes deeper).',
    /** Open-loop / Zeigarnik hook */
    xZeigarnik:
      '⏸ Paused here on purpose (open loop). Next in full Regular: data-backed trap evidence + complete psych map + the rest of the stack.',
    xCtaBio: 'Trap Defence Regular (full version) → link in bio.',
    /** When REGULAR_TEASER_UPGRADE_URL is set */
    xCtaUrlPrefix: 'Trap Defence Regular (full) →',
    xShortDisclaimer: 'Educational only. Not financial advice.',
  },
  es: {
    formatterLang: 'es',
    markers: {
      data_backed: '\n📊 Evidencia Basada en Datos',
      psychological: '\n💊 Insight Psicológico (Dr. Grok)',
      trap_value: '\n💎 Valor de Trap Defence',
    },
    banner: [
      '📣 MUESTRA PÚBLICA — Formato del Regular briefing (demo ilustrativa; no son datos en vivo).',
      'Los suscriptores reciben el briefing completo y actualizado.',
      '',
    ].join('\n'),
    footerLead: '➡️ Trap Defence Regular · enlace en la biografía / fijado.',
    disclaimer: 'Solo con fines educativos. No es asesoramiento financiero.',
    highResX:
      'El ruido narrativo en el retail está elevado: picos alrededor del apalancamiento y el funding, mientras la convicción spot parece más delgada — un patrón habitual antes de fases de volatilidad.',
    liveExcerptPrefix: '🔎 Regular — extracto público (los suscriptores reciben el briefing completo).',
    xZeigarnik:
      '⏸ Cortamos aquí a propósito (gancho). Siguiente en Regular completo: evidencia basada en datos + mapa psicológico completo + el resto del stack.',
    xCtaBio: 'Trap Defence Regular (versión completa) → enlace en la biografía.',
    xCtaUrlPrefix: 'Trap Defence Regular (completo) →',
    xShortDisclaimer: 'Solo educativo. No es asesoramiento financiero.',
  },
  'pt-br': {
    formatterLang: 'pt-br',
    markers: {
      data_backed: '\n📊 Evidência Baseada em Dados',
      psychological: '\n💊 Insight Psicológico (Dr. Grok)',
      trap_value: '\n💎 Valor do Trap Defence',
    },
    banner: [
      '📣 AMOSTRA PÚBLICA — Formato do Regular briefing (demo ilustrativa; não são dados ao vivo).',
      'Assinantes recebem o briefing completo e em dia.',
      '',
    ].join('\n'),
    footerLead: '➡️ Trap Defence Regular · link na bio / fixado.',
    disclaimer: 'Apenas para fins educacionais. Não é aconselhamento financeiro.',
    highResX:
      'O ruído narrativo no varejo está elevado: picos em alavancagem e funding, enquanto a convicção no spot parece mais fina — um padrão comum antes da expansão de volatilidade.',
    liveExcerptPrefix: '🔎 Regular — trecho público (assinantes recebem o briefing completo).',
    xZeigarnik:
      '⏸ Pausa intencional (gancho). A seguir no Regular completo: evidência baseada em dados + mapa psicológico completo + o restante.',
    xCtaBio: 'Trap Defence Regular (completo) → link na bio.',
    xCtaUrlPrefix: 'Trap Defence Regular (completo) →',
    xShortDisclaimer: 'Apenas educativo. Não é aconselhamento financeiro.',
  },
  ar: {
    formatterLang: 'ar',
    markers: {
      data_backed: '\n📊 أدلة مبنية على البيانات',
      psychological: '\n💊 الرؤية النفسية (Dr. Grok)',
      trap_value: '\n💎 قيمة Trap Defence',
    },
    banner: [
      '📣 عيّنة عامة — تنسيق Regular briefing (عرض توضيحي؛ ليست بيانات حيّة).',
      'يصل المشتركون إلى النص الكامل في الوقت المناسب.',
      '',
    ].join('\n'),
    footerLead: '➡️ Trap Defence Regular · الرابط في السيرة / المنشور المثبّت.',
    disclaimer: 'لأغراض تعليمية فقط. وليس نصيحة مالية.',
    highResX:
      'ضجيج السرد في تداول التجزئة مرتفع: ذروات حول الرافعة والتمويل بينما يبدو إصرار السبوت أنحف — نمط شائع قبل توسع التقلبات.',
    liveExcerptPrefix: '🔎 Regular — مقتطف عام (المشتركون يحصلون على النسخة الكاملة).',
    xZeigarnik:
      '⏸ توقف هنا عن عمد (حلقة مفتوحة). التالي في Regular الكامل: أدلة قائمة على البيانات + الخريطة النفسية الكاملة + بقية الطبقات.',
    xCtaBio: 'Trap Defence Regular (الكامل) ← رابط في البايو.',
    xCtaUrlPrefix: 'Trap Defence Regular (كامل) ←',
    xShortDisclaimer: 'تعليمي فقط. وليس نصيحة مالية.',
  },
  ko: {
    formatterLang: 'ko',
    markers: {
      data_backed: '\n📊 데이터 기반 근거',
      psychological: '\n💊 심리 인사이트 (Dr. Grok)',
      trap_value: '\n💎 Trap Defence 가치',
    },
    banner: [
      '📣 공개 샘플 — Regular 브리핑 형식 (예시용 데모, 실시간 데이터 아님).',
      '구독자는 전체 브리핑을 시의적절하게 받습니다.',
      '',
    ].join('\n'),
    footerLead: '➡️ Trap Defence Regular · 바이오/고정에서 링크.',
    disclaimer: '교육 목적일 뿐이며 투자 조언이 아닙니다.',
    highResX:
      '리테일 타임라인 노이즈가 높음: 레버리지·펀딩 주변으로 내러티브 스파이크가 몰리는 반면 스팟 확신은 얇아 보이기 쉬움 — 변동성 확대 전 흔한 패턴.',
    liveExcerptPrefix: '🔎 Regular — 공개 발췌 (구독자는 전체 브리핑 수신).',
    xZeigarnik:
      '⏸ 의도적으로 여기서 끊음(미완성 효과). 전체 Regular에서 이어짐: 데이터 기반 근거 + 심리 맵 전부 + 나머지 스택.',
    xCtaBio: 'Trap Defence Regular(전체) → 바이오 링크.',
    xCtaUrlPrefix: 'Trap Defence Regular(전체) →',
    xShortDisclaimer: '교육 목적. 투자 조언 아님.',
  },
  ja: {
    formatterLang: 'ja',
    markers: {
      data_backed: '\n📊 データに基づく理由',
      psychological: '\n💊 心理インサイト (Dr. Grok)',
      trap_value: '\n💎 Trap Defence価値',
    },
    banner: [
      '📣 公開サンプル — Regularブリーフィング形式（例示用デモ／ライブデータではありません）。',
      '加入者はタイムリーに全文ブリーフィングを受け取れます。',
      '',
    ].join('\n'),
    footerLead: '➡️ Trap Defence Regular · プロフィール／固定から。',
    disclaimer: '教育目的のみ。金融アドバイスではありません。',
    highResX:
      'リテールのタイムライン騒音が高い：レバレッジ／ファンディング周りにナラティブのスパイクが束ねられ、スポットの確信は薄く見えやすい——ボラ拡大前の典型的なパターン。',
    liveExcerptPrefix: '🔎 Regular — 公開抜粋（加入者は全文ブリーフィングを受信）。',
    xZeigarnik:
      'ここで一旦区切ります（オープンループ）。全文 Regular では続き：データに基づく根拠・心理マップの残り・スタック全体。',
    xCtaBio: 'Trap Defence Regular（全文）→ プロフィールのリンクへ。',
    xCtaUrlPrefix: 'Trap Defence Regular（全文）→',
    xShortDisclaimer: '教育のみ。金融アドバイスではありません。',
  },
};

const SUPPORTED_LANGS = Object.freeze(['en', 'es', 'pt-br', 'ar', 'ko', 'ja']);

function getLocale(lang) {
  const key = String(lang || 'en').toLowerCase();
  return LOCALES[key] || LOCALES.en;
}

function buildFooter(locale) {
  return [
    '',
    '—',
    locale.footerLead,
    '',
    locale.disclaimer,
  ].join('\n');
}

module.exports = {
  LOCALES,
  SUPPORTED_LANGS,
  getLocale,
  buildFooter,
};
