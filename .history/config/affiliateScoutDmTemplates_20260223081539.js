/**
 * X DM スカウト文案（言語別）
 * 高品質アフィリエイター候補に送る FirstPromoter 登録誘導メッセージ。
 * 戦略: docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md
 *
 * 商材訴求: アフィ側＝50%報酬・サブスク継続で永続収益。購入者側＝DEFEND50で50%オフ・1日無料トライアル（§6.1）。
 * プレースホルダー: {inviteUrl}, {whopAffiliateUrl}, {handle}
 */

const DM_TEMPLATES = {
  en: [
    "Hi {handle}! We're looking for crypto/trading creators to partner with Trap Defence BTC (Whop). 50% rev share, recurring. If you're interested: {inviteUrl}",
    "Hey {handle} — we're inviting a small group of creators to promote Trap Defence BTC. You get 50% on every sale. Sign up here: {inviteUrl}"
  ],
  es: [
    "Hola {handle}! Buscamos creadores de crypto/trading para Trap Defence BTC (Whop). 50% de comisión recurrente. Si te interesa: {inviteUrl}",
    "Hola {handle} — invitamos a un grupo reducido a promocionar Trap Defence BTC. 50% por venta. Regístrate: {inviteUrl}"
  ],
  pt: [
    "Oi {handle}! Procurando criadores de crypto/trading para Trap Defence BTC (Whop). 50% de receita recorrente. Interessado? {inviteUrl}",
    "Oi {handle} — estamos convidando criadores para promover Trap Defence BTC. 50% por venda. Cadastre-se: {inviteUrl}"
  ],
  ar: [
    "مرحبا {handle}! نبحث عن صناع محتوى كريبتو/تداول لـ Trap Defence BTC (Whop). عمولة 50٪ متكررة. إذا مهتم: {inviteUrl}",
    "مرحبا {handle} — ندعو مجموعة صغيرة للترويج لـ Trap Defence BTC. 50٪ من كل عملية بيع. سجل هنا: {inviteUrl}"
  ],
  ko: [
    "안녕하세요 {handle}! Trap Defence BTC(Whop) 크리에이터 파트너를 찾고 있습니다. 매출의 50% 지급. 관심 있으시면: {inviteUrl}",
    "안녕하세요 {handle} — Trap Defence BTC 프로모터 소수 초대 중. 판매당 50%. 여기서 가입: {inviteUrl}"
  ],
  ja: [
    "こんにちは {handle}！Trap Defence BTC（Whop）のクリプト/トレード系クリエイターを募集しています。売上の50%報酬。ご興味あれば: {inviteUrl}",
    "こんにちは {handle} — Trap Defence BTC のプロモーターを少人数で招待しています。1件あたり50%。登録はこちら: {inviteUrl}"
  ]
};

function getScoutDmTemplate(lang, variant = 0) {
  const templates = DM_TEMPLATES[lang] || DM_TEMPLATES.en;
  const index = Math.abs(variant) % templates.length;
  return templates[index];
}

function fillScoutDmTemplate(lang, options = {}) {
  const { inviteUrl, whopAffiliateUrl, handle = "" } = options;
  const template = getScoutDmTemplate(lang, options.variant);
  const url = inviteUrl || whopAffiliateUrl || "{inviteUrl}";
  return template
    .replace(/\{inviteUrl\}/g, url)
    .replace(/\{whopAffiliateUrl\}/g, whopAffiliateUrl || url)
    .replace(/\{handle\}/g, handle);
}

module.exports = {
  DM_TEMPLATES,
  getScoutDmTemplate,
  fillScoutDmTemplate
};
