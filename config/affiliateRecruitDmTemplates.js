/**
 * X DM リクルート文案（6言語）— 募集要項・プロ版
 * EN/ES/PT/AR/KO/JA で行構造・情報密度・UI幅・トーンを統一。X DM 最適化。
 * プレースホルダー: {inviteUrl}, {whopAffiliateUrl}, {handle}, {angleLabel}, {productName}
 * 訴求軸: crypto / ai_saas / side_hustle（A/B: 募集要項型 vs 提案型）
 */

const {
  normalizeRecruitAngle,
  pickRecruitDmVariantByKey,
  getRecruitProductName,
  getRecruitAngleLabel,
  RECRUIT_DM_VARIANTS
} = require("./affiliateRecruitConfig");

const RECRUIT_ANGLES = ["crypto", "ai_saas", "side_hustle", "saas"];
const DEFAULT_RECRUIT_ANGLE = "crypto";
const DM_VARIANT_CONTROL = "v1_requirements";
const DM_VARIANT_CHALLENGER = "v2_partnership";

const DM_TEMPLATES = {
  en: {
    saas:
      "You have been selected for an exclusive invitation.\n\nTrap Defence BTC — SaaS Affiliate Program\n• Commission: 50% recurring\n• Offer Type: High-payout SaaS affiliate offer\n• Assets: Complete promotional copy package (DM scripts, post text, descriptions)\n• Product: Subscription-style BTC market intelligence via Telegram (sold on Whop)\n• Participation: No specialized skills required; use your existing distribution channels\n• Registration: {inviteUrl}\n\nP.S. You don't need to hard-sell.",
    ai_saas:
      "You have been selected for an exclusive invitation.\n\nTrap Defence BTC — AI SaaS Affiliate Program\n• Commission: 50% recurring\n• Offer Type: High-payout AI SaaS affiliate offer\n• Assets: Complete promotional copy package (DM scripts, post text, descriptions)\n• Product: AI-assisted BTC market intelligence via Telegram (sold on Whop)\n• Participation: No specialized skills required; use your existing distribution channels\n• Registration: {inviteUrl}\n\nP.S. You don't need to hard-sell.",
    crypto:
      "You have been selected for an exclusive invitation.\n\nTrap Defence BTC — Crypto Affiliate Program\n• Commission: 50% recurring\n• Offer Type: High-payout Crypto affiliate offer\n• Assets: Complete promotional copy package (DM scripts, post text, descriptions)\n• Product: BTC market briefing via Telegram (sold on Whop)\n• Participation: No specialized skills required; use your existing distribution channels\n• Registration: {inviteUrl}\n\nP.S. You don't need to hard-sell."
  },
  es: {
    saas:
      "Has sido seleccionado para una invitación exclusiva.\n\nTrap Defence BTC — Programa de Afiliados SaaS\n• Comisión: 50% recurrente\n• Tipo de oferta: afiliación SaaS de alta remuneración\n• Materiales: paquete completo de copy promocional (mensajes DM, textos de publicación, descripciones)\n• Producto: inteligencia de mercado BTC con enfoque de suscripción vía Telegram (vendido en Whop)\n• Participación: no se requieren habilidades especiales; usa tus canales actuales de distribución\n• Registro: {inviteUrl}\n\nP.D. No necesitas hacer venta agresiva.",
    ai_saas:
      "Has sido seleccionado para una invitación exclusiva.\n\nTrap Defence BTC — Programa de Afiliados AI SaaS\n• Comisión: 50% recurrente\n• Tipo de oferta: afiliación AI SaaS de alta remuneración\n• Materiales: paquete completo de copy promocional (mensajes DM, textos de publicación, descripciones)\n• Producto: inteligencia de mercado BTC asistida por IA vía Telegram (vendido en Whop)\n• Participación: no se requieren habilidades especiales; usa tus canales actuales de distribución\n• Registro: {inviteUrl}\n\nP.D. No necesitas hacer venta agresiva.",
    crypto:
      "Has sido seleccionado para una invitación exclusiva.\n\nTrap Defence BTC — Programa de Afiliados Crypto\n• Comisión: 50% recurrente\n• Tipo de oferta: afiliación Crypto de alta remuneración\n• Materiales: paquete completo de copy promocional (mensajes DM, textos de publicación, descripciones)\n• Producto: briefing de mercado BTC por Telegram (vendido en Whop)\n• Participación: no se requieren habilidades especiales; usa tus canales actuales de distribución\n• Registro: {inviteUrl}\n\nP.D. No necesitas hacer venta agresiva."
  },
  pt: {
    saas:
      "Você foi selecionado para um convite exclusivo.\n\nTrap Defence BTC — Programa de Afiliados SaaS\n• Comissão: 50% recorrente\n• Tipo de oferta: afiliação SaaS de alta remuneração\n• Materiais: pacote completo de copy promocional (mensagens DM, textos de postagem, descrições)\n• Produto: inteligência de mercado BTC em modelo de assinatura via Telegram (vendido na Whop)\n• Participação: nenhuma habilidade especial necessária; utilize seus canais atuais de divulgação\n• Registro: {inviteUrl}\n\nP.S. Você não precisa fazer venda agressiva.",
    ai_saas:
      "Você foi selecionado para um convite exclusivo.\n\nTrap Defence BTC — Programa de Afiliados AI SaaS\n• Comissão: 50% recorrente\n• Tipo de oferta: afiliação AI SaaS de alta remuneração\n• Materiais: pacote completo de copy promocional (mensagens DM, textos de postagem, descrições)\n• Produto: inteligência de mercado BTC com apoio de IA via Telegram (vendido na Whop)\n• Participação: nenhuma habilidade especial necessária; utilize seus canais atuais de divulgação\n• Registro: {inviteUrl}\n\nP.S. Você não precisa fazer venda agressiva.",
    crypto:
      "Você foi selecionado para um convite exclusivo.\n\nTrap Defence BTC — Programa de Afiliados Crypto\n• Comissão: 50% recorrente\n• Tipo de oferta: afiliação Crypto de alta remuneração\n• Materiais: pacote completo de copy promocional (mensagens DM, textos de postagem, descrições)\n• Produto: briefing de mercado BTC via Telegram (vendido na Whop)\n• Participação: nenhuma habilidade especial necessária; utilize seus canais atuais de divulgação\n• Registro: {inviteUrl}\n\nP.S. Você não precisa fazer venda agressiva."
  },
  ar: {
    saas:
      "لقد تم اختيارك للحصول على دعوة حصرية.\n\nTrap Defence BTC — برنامج أفلييت SaaS\n• العمولة: 50% متكررة\n• نوع العرض: عرض أفلييت SaaS عالي العائد\n• المواد: حزمة كاملة من النسخ الترويجية (رسائل DM، نصوص النشر، الوصف)\n• المنتج: ذكاء سوق BTC بنموذج اشتراك عبر تيليغرام (يباع على Whop)\n• شروط المشاركة: لا تتطلب مهارات خاصة؛ يمكنك استخدام قنوات التوزيع الحالية لديك\n• التسجيل: {inviteUrl}\n\nملاحظة: لا تحتاج إلى بيع مباشر.",
    ai_saas:
      "لقد تم اختيارك للحصول على دعوة حصرية.\n\nTrap Defence BTC — برنامج أفلييت AI SaaS\n• العمولة: 50% متكررة\n• نوع العرض: عرض أفلييت AI SaaS عالي العائد\n• المواد: حزمة كاملة من النسخ الترويجية (رسائل DM، نصوص النشر، الوصف)\n• المنتج: ذكاء سوق BTC مدعوم بالذكاء الاصطناعي عبر تيليغرام (يباع على Whop)\n• شروط المشاركة: لا تتطلب مهارات خاصة؛ يمكنك استخدام قنوات التوزيع الحالية لديك\n• التسجيل: {inviteUrl}\n\nملاحظة: لا تحتاج إلى بيع مباشر.",
    crypto:
      "لقد تم اختيارك للحصول على دعوة حصرية.\n\nTrap Defence BTC — برنامج أفلييت Crypto\n• العمولة: 50% متكررة\n• نوع العرض: عرض أفلييت Crypto عالي العائد\n• المواد: حزمة كاملة من النسخ الترويجية (رسائل DM، نصوص النشر، الوصف)\n• المنتج: موجز سوق BTC عبر تيليغرام (يباع على Whop)\n• شروط المشاركة: لا تتطلب مهارات خاصة؛ يمكنك استخدام قنوات التوزيع الحالية لديك\n• التسجيل: {inviteUrl}\n\nملاحظة: لا تحتاج إلى بيع مباشر."
  },
  ko: {
    saas:
      "당신은 특별 초대 대상자로 선정되었습니다.\n\nTrap Defence BTC — SaaS 제휴 프로그램\n• 커미션: 50% 반복 지급\n• 오퍼 유형: 고수익 SaaS 제휴 오퍼\n• 제공물: 프로모션용 카피 패키지 일체 (DM 스크립트, 게시문, 설명문)\n• 상품: 구독형 BTC 마켓 인텔리전스 텔레그램 브리핑 (Whop에서 판매)\n• 참여 조건: 특별한 기술 불필요·기존 배포 채널 그대로 활용 가능\n• 등록: {inviteUrl}\n\nP.S. 강한 영업은 필요 없습니다.",
    ai_saas:
      "당신은 특별 초대 대상자로 선정되었습니다.\n\nTrap Defence BTC — AI SaaS 제휴 프로그램\n• 커미션: 50% 반복 지급\n• 오퍼 유형: 고수익 AI SaaS 제휴 오퍼\n• 제공물: 프로모션용 카피 패키지 일체 (DM 스크립트, 게시문, 설명문)\n• 상품: AI 보조 BTC 마켓 인텔리전스 텔레그램 브리핑 (Whop에서 판매)\n• 참여 조건: 특별한 기술 불필요·기존 배포 채널 그대로 활용 가능\n• 등록: {inviteUrl}\n\nP.S. 강한 영업은 필요 없습니다.",
    crypto:
      "당신은 특별 초대 대상자로 선정되었습니다.\n\nTrap Defence BTC — Crypto 제휴 프로그램\n• 커미션: 50% 반복 지급\n• 오퍼 유형: 고수익 Crypto 제휴 오퍼\n• 제공물: 프로모션용 카피 패키지 일체 (DM 스크립트, 게시문, 설명문)\n• 상품: BTC 마켓 브리핑 텔레그램 서비스 (Whop에서 판매)\n• 참여 조건: 특별한 기술 불필요·기존 배포 채널 그대로 활용 가능\n• 등록: {inviteUrl}\n\nP.S. 강한 영업은 필요 없습니다."
  },
  ja: {
    saas:
      "あなたは特別ご招待の対象として選出されました。\n\nTrap Defence BTC — SaaSアフィリエイト募集要項\n• 報酬：50％リカーリング\n• 訴求軸：高報酬SaaSアフィリエイト案件\n• 提供物：プロモーション用コピー一式（DM・投稿文・説明文）\n• 商材：サブスク型BTCマーケットTGブリーフィング（Whopにて販売）\n• 参加条件：特別なスキル不要・既存の配布チャネルでそのまま運用可能\n• 登録：{inviteUrl}\n\n追伸：強い売り込みは不要です。",
    ai_saas:
      "あなたは特別ご招待の対象として選出されました。\n\nTrap Defence BTC — AI SaaSアフィリエイト募集要項\n• 報酬：50％リカーリング\n• 訴求軸：高報酬AI SaaSアフィリエイト案件\n• 提供物：プロモーション用コピー一式（DM・投稿文・説明文）\n• 商材：AI支援型BTCマーケットTGブリーフィング（Whopにて販売）\n• 参加条件：特別なスキル不要・既存の配布チャネルでそのまま運用可能\n• 登録：{inviteUrl}\n\n追伸：強い売り込みは不要です。",
    crypto:
      "あなたは特別ご招待の対象として選出されました。\n\nTrap Defence BTC — Cryptoアフィリエイト募集要項\n• 報酬：50％リカーリング\n• 訴求軸：高報酬Cryptoアフィリエイト案件\n• 提供物：プロモーション用コピー一式（DM・投稿文・説明文）\n• 商材：BTCマーケットTGブリーフィング（Whopにて販売）\n• 参加条件：特別なスキル不要・既存の配布チャネルでそのまま運用可能\n• 登録：{inviteUrl}\n\n追伸：強い売り込みは不要です。"
  }
};

const DM_TEMPLATES_PARTNERSHIP = {
  en:
    "{handle}, I saw your recent {angleLabel} content.\n\nTrap Defence BTC — Partnership Proposal\n• Commission: 50% recurring\n• Product: {productName}\n• Upside: You can add a new recurring revenue stream to your existing audience immediately.\n\nAll promo assets are already prepared.\nJoin link:\n{inviteUrl}",
  es:
    "{handle}, vi tu contenido reciente sobre {angleLabel}.\n\nTrap Defence BTC — Propuesta de Colaboración\n• Comisión: 50% recurrente\n• Producto: {productName}\n• Beneficio: puedes añadir una nueva fuente de ingresos recurrentes a tu audiencia actual desde hoy.\n\nLos materiales promocionales ya están listos.\nEnlace de participación:\n{inviteUrl}",
  pt:
    "{handle}, vi seu conteúdo recente sobre {angleLabel}.\n\nTrap Defence BTC — Proposta de Parceria\n• Comissão: 50% recorrente\n• Produto: {productName}\n• Benefício: você pode adicionar uma nova fonte de renda recorrente para sua audiência atual imediatamente.\n\nOs materiais promocionais já estão prontos.\nLink de participação:\n{inviteUrl}",
  ar:
    "{handle}، شاهدت محتواك الأخير حول {angleLabel}.\n\nTrap Defence BTC — عرض شراكة\n• العمولة: 50% متكررة\n• المنتج: {productName}\n• الميزة: يمكنك إضافة مصدر دخل متكرر جديد لجمهورك الحالي فوراً.\n\nجميع المواد الترويجية جاهزة.\nرابط الانضمام:\n{inviteUrl}",
  ko:
    "{handle}님, 최근 {angleLabel} 관련 콘텐츠를 보고 연락드립니다.\n\nTrap Defence BTC — 파트너십 제안\n• 커미션: 50% 리커링\n• 상품: {productName}\n• 장점: 기존 팔로워에게 즉시 추가 수익원을 만들 수 있습니다.\n\n프로모션 자료는 모두 준비되어 있습니다.\n참여 링크:\n{inviteUrl}",
  ja:
    "{handle} 様、{angleLabel} 関連の投稿を拝見しご連絡しました。\n\nTrap Defence BTC — パートナーシップのご提案\n• 報酬：50％リカーリング（継続報酬）\n• 商材：{productName}\n• メリット：既存フォロワー向けに追加の収益源を即座に構築できます。\n\nプロモーション素材はすべて用意済みです。\n詳細と参加リンクはこちら：\n{inviteUrl}"
};

function resolveRecruitAngle(angle) {
  return normalizeRecruitAngle(angle || DEFAULT_RECRUIT_ANGLE);
}

function resolveDmVariant(variant, recipientKey) {
  const normalized = String(variant || "").toLowerCase().trim();
  if (RECRUIT_DM_VARIANTS.includes(normalized)) return normalized;
  return pickRecruitDmVariantByKey(recipientKey);
}

function getControlTemplate(lang, angle) {
  const templates = DM_TEMPLATES[lang] || DM_TEMPLATES.en;
  return templates[angle] || templates.saas || templates[DEFAULT_RECRUIT_ANGLE];
}

function getPartnershipTemplate(lang) {
  return DM_TEMPLATES_PARTNERSHIP[lang] || DM_TEMPLATES_PARTNERSHIP.en;
}

function getRecruitDmTemplate(lang, angle = DEFAULT_RECRUIT_ANGLE, dmVariant = DM_VARIANT_CONTROL) {
  const resolvedAngle = resolveRecruitAngle(angle);
  const resolvedVariant = resolveDmVariant(dmVariant);
  if (resolvedVariant === DM_VARIANT_CHALLENGER) {
    return getPartnershipTemplate(lang);
  }
  return getControlTemplate(lang, resolvedAngle);
}

function fillRecruitDmTemplate(lang, options = {}) {
  const {
    inviteUrl,
    whopAffiliateUrl,
    handle = "",
    angle,
    variant,
    recipientKey
  } = options;
  const normalizedLang = String(lang || "en").toLowerCase().split("-")[0];
  const resolvedAngle = resolveRecruitAngle(angle);
  const resolvedVariant = resolveDmVariant(variant, recipientKey || handle);
  const template = getRecruitDmTemplate(normalizedLang, resolvedAngle, resolvedVariant);
  const url = inviteUrl || whopAffiliateUrl || "{inviteUrl}";
  const angleLabel = getRecruitAngleLabel(resolvedAngle, normalizedLang);
  const productName = getRecruitProductName(resolvedAngle, normalizedLang);
  const text = template
    .replace(/\{inviteUrl\}/g, url)
    .replace(/\{whopAffiliateUrl\}/g, whopAffiliateUrl || url)
    .replace(/\{handle\}/g, handle)
    .replace(/\{angleLabel\}/g, angleLabel)
    .replace(/\{productName\}/g, productName);
  const variantIndex = resolvedVariant === DM_VARIANT_CONTROL ? 0 : 1;
  return {
    text,
    variant: variantIndex,
    dmVariant: resolvedVariant,
    variantName: `${resolvedVariant}_${resolvedAngle}`,
    angle: resolvedAngle
  };
}

module.exports = {
  DM_TEMPLATES,
  DM_TEMPLATES_PARTNERSHIP,
  RECRUIT_ANGLES,
  getRecruitDmTemplate,
  fillRecruitDmTemplate
};
