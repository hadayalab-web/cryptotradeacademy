/**
 * X DM リクルート文案（6言語）— 募集要項・プロ版
 * EN/ES/PT/AR/KO/JA で行構造・情報密度・UI幅・トーンを統一。X DM 最適化。
 * プレースホルダー: {inviteUrl}, {whopAffiliateUrl}, {handle}
 * 訴求軸: saas / ai_saas / crypto（全軸 50% recurring 訴求）
 */

const RECRUIT_ANGLES = ["saas", "ai_saas", "crypto"];
const DEFAULT_RECRUIT_ANGLE = "crypto";

function resolveRecruitAngle(angle) {
  const normalized = String(angle || "").toLowerCase();
  return RECRUIT_ANGLES.includes(normalized) ? normalized : DEFAULT_RECRUIT_ANGLE;
}

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

function getRecruitDmTemplate(lang, angle = DEFAULT_RECRUIT_ANGLE) {
  const templates = DM_TEMPLATES[lang] || DM_TEMPLATES.en;
  const resolvedAngle = resolveRecruitAngle(angle);
  return templates[resolvedAngle] || templates[DEFAULT_RECRUIT_ANGLE];
}

function fillRecruitDmTemplate(lang, options = {}) {
  const { inviteUrl, whopAffiliateUrl, handle = "", angle } = options;
  const resolvedAngle = resolveRecruitAngle(angle);
  const template = getRecruitDmTemplate(lang, resolvedAngle);
  const url = inviteUrl || whopAffiliateUrl || "{inviteUrl}";
  const text = template
    .replace(/\{inviteUrl\}/g, url)
    .replace(/\{whopAffiliateUrl\}/g, whopAffiliateUrl || url)
    .replace(/\{handle\}/g, handle);
  return { text, variant: 0, variantName: `recruitment_spec_${resolvedAngle}`, angle: resolvedAngle };
}

module.exports = {
  DM_TEMPLATES,
  RECRUIT_ANGLES,
  getRecruitDmTemplate,
  fillRecruitDmTemplate
};
