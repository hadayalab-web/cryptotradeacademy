/**
 * X DM リクルート文案（6言語）— 募集要項・プロ版
 * EN/ES/PT/AR/KO/JA で行構造・情報密度・UI幅・トーンを統一。X DM 最適化。
 * プレースホルダー: {inviteUrl}, {whopAffiliateUrl}, {handle}
 */

const DM_TEMPLATES = {
  en:
    "You have been selected for an exclusive invitation.\n\nTrap Defence BTC — Affiliate Program\n• Commission: 50% recurring\n• Assets: Complete promotional copy package (DM scripts, post text, descriptions)\n• Product: BTC market briefing via Telegram (sold on Whop)\n• Participation: No specialized skills required; use your existing distribution channels\n• Registration: {inviteUrl}\n\nP.S. You don't need to sell.",
  es:
    "Has sido seleccionado para una invitación exclusiva.\n\nTrap Defence BTC — Programa de Afiliados\n• Comisión: 50% recurrente\n• Materiales: paquete completo de copy promocional (mensajes DM, textos de publicación, descripciones)\n• Producto: briefing de mercado BTC por Telegram (en Whop)\n• Participación: no se requieren habilidades especiales; usa tus canales actuales de distribución\n• Unirse: {inviteUrl}\n\nP.D. No necesitas vender.",
  pt:
    "Você foi selecionado para um convite exclusivo.\n\nTrap Defence BTC — Programa de Afiliados\n• Comissão: 50% recorrente\n• Materiais: pacote completo de copy promocional (mensagens DM, textos de postagem, descrições)\n• Produto: briefing de mercado BTC via Telegram (vendido na Whop)\n• Participação: nenhuma habilidade especial necessária; utilize seus canais atuais de divulgação\n• Registro: {inviteUrl}\n\nP.S. Você não precisa vender.",
  ar:
    "لقد تم اختيارك للحصول على دعوة حصرية.\n\nTrap Defence BTC — برنامج التسويق بالعمولة\n• العمولة: 50% متكررة\n• المواد: حزمة كاملة من النسخ الترويجية (رسائل DM، نصوص النشر، الوصف)\n• المنتج: موجز سوق الـBTC عبر تيليغرام (يُباع على Whop)\n• شروط المشاركة: لا تتطلب مهارات خاصة؛ يمكنك استخدام قنوات التوزيع الحالية لديك\n• التسجيل: {inviteUrl}\n\nملاحظة: لست بحاجة للبيع.",
  ko:
    "당신은 특별 초대 대상자로 선정되었습니다.\n\nTrap Defence BTC — 제휴 프로그램\n• 커미션: 50% 반복 지급\n• 제공물: 프로모션용 카피 패키지 일체 (DM 스크립트, 게시문, 설명문)\n• 상품: 텔레그램 기반 BTC 마켓 브리핑 (Whop에서 판매)\n• 참여 조건: 특별한 기술 불필요·기존 배포 채널 그대로 활용 가능\n• 등록: {inviteUrl}\n\nP.S. 판매할 필요 없습니다.",
  ja:
    "あなたは特別ご招待の対象として選出されました。\n\nTrap Defence BTC — アフィリエイト募集要項\n• 報酬：50％リカーリング\n• 提供物：プロモーション用コピー一式（DM・投稿文・説明文）\n• 商材：BTCマーケットTGブリーフィング（Whopにて販売）\n• 参加条件：特別なスキル不要・既存の配布チャネルでそのまま運用可能\n• 登録：{inviteUrl}\n\n追伸：あなたは売る必要はありません。"
};

function getRecruitDmTemplate(lang) {
  return DM_TEMPLATES[lang] || DM_TEMPLATES.en;
}

function fillRecruitDmTemplate(lang, options = {}) {
  const { inviteUrl, whopAffiliateUrl, handle = "" } = options;
  const template = DM_TEMPLATES[lang] || DM_TEMPLATES.en;
  const url = inviteUrl || whopAffiliateUrl || "{inviteUrl}";
  const text = template
    .replace(/\{inviteUrl\}/g, url)
    .replace(/\{whopAffiliateUrl\}/g, whopAffiliateUrl || url)
    .replace(/\{handle\}/g, handle);
  return { text, variant: 0, variantName: "recruitment_spec" };
}

module.exports = {
  DM_TEMPLATES,
  getRecruitDmTemplate,
  fillRecruitDmTemplate
};
