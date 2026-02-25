/**
 * X DM リクルート文案（6言語）
 * Copilot 最適化版を唯一のテンプレとして使用。痛み→救済→CTA。DM→LP→登録後 の一本血流。
 * 戦略: docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md
 * プレースホルダー: {inviteUrl}, {whopAffiliateUrl}, {handle}
 */

const DM_TEMPLATES = {
  en: "Products not selling?\nThe enemy isn't your traffic—or your skills.\nThe real problem is the product is broken, not you.\nSpecial invite to a 50% industry‑leading offer.\nClaim it free 👉 {inviteUrl}",
  es: "¿Los productos no venden?\nEl enemigo no es tu tráfico ni tu habilidad.\nEl problema real es que el producto está roto, no tú.\nInvitación especial a una oferta del 50%, de las más altas del sector.\nRecíbela gratis 👉 {inviteUrl}",
  pt: "Os produtos não vendem?\nO inimigo não é seu tráfego nem sua habilidade.\nO problema real é que o produto está quebrado — não você.\nConvite especial para uma oferta de 50%, topo do mercado.\nReceba grátis 👉 {inviteUrl}",
  ar: "المنتجات لا تُباع؟\nالعدو ليس الزيارات ولا مهارتك.\nالمشكلة الحقيقية أن المنتج معطّل — لست أنت.\nدعوة خاصة لعرض بعمولة 50٪ من الأعلى في القطاع.\nاحصل عليها مجاناً 👉 {inviteUrl}",
  ko: "제품이 안 팔려요?\n적은 트래픽도 스킬 부족도 아니다.\n진짜 문제는 제품이 망가졌기 때문이지, 당신 때문이 아니다.\n업계 상위 50% 보상의 특별 초대.\n무료로 받기 👉 {inviteUrl}",
  ja: "紹介している商品、売れてない？\n原因はトラフィックでも、あなたのスキルでもありません。\n\"商品そのもの\"に問題があるケースがほとんどです。\n報酬50%・業界最水準の案件を、特別にご案内します。\n無料で受け取る 👉 {inviteUrl}"
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
  return { text, variant: 0, variantName: "optimized" };
}

module.exports = {
  DM_TEMPLATES,
  getRecruitDmTemplate,
  fillRecruitDmTemplate
};
