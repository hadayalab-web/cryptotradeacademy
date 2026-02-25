/**
 * アフィリエイト用 Whop チェックアウト入口（ref 付きセッション作成 → リダイレクト）
 * FirstPromoter のアフィリンクの「行き先」をこの URL にすると、ref が Webhook に載りアフィリに紐づく。
 * 参照: docs/WHOP_SUPPORT_QUESTION_REF_ATTRIBUTION.md
 *
 * GET /api/whop-checkout?ref=REQUIRED&lang=en&plan=monthly
 * - ref: 必須。FirstPromoter の紹介ID（アフィリエイター識別子）
 * - lang: 任意。en|ja|es|pt|ar|ko
 * - plan: 任意。monthly|quarterly|annual。未指定時は月額相当のプランを使用
 *
 * 設定: plan_id は Whop で取りづらいため、Product ID（prod_xxx）で可。
 * WHOP_PRODUCT_ID または WHOP_PRODUCT_ID_EN 等を設定すると、API でプラン一覧を取得し先頭プラン（または billing_period で monthly/quarterly/annual を判定）を使用する。
 */

const { createCheckoutSession, listPlans } = require('../services/whop/client');

const LANGS = ['en', 'ja', 'es', 'pt', 'ar', 'ko'];
const PLAN_TYPES = ['monthly', 'quarterly', 'annual'];

function getProductIdForLang(lang) {
  if (lang && LANGS.includes(lang.toLowerCase())) {
    const key = `WHOP_PRODUCT_ID_${lang.toUpperCase()}`;
    if (process.env[key]) return process.env[key];
  }
  return process.env.WHOP_PRODUCT_ID;
}

/** billing_period から monthly(30) / quarterly(90) / annual(365) を推定 */
function inferPlanType(plan) {
  const p = plan || {};
  const days = p.billing_period || p.billing_period_days || 0;
  if (days <= 31) return 'monthly';
  if (days <= 95) return 'quarterly';
  return 'annual';
}

/**
 * 環境変数で plan_id が直接あればそれを返す。なければ product_id で listPlans して解決。
 * 優先: 言語×プラン → プランのみ → 言語のみ → 単一 → Product ID から取得
 */
async function resolvePlanId(lang, plan) {
  const normLang = lang && LANGS.includes(lang.toLowerCase()) ? lang.toUpperCase() : null;
  const normPlan = plan && PLAN_TYPES.includes(plan.toLowerCase()) ? plan.toUpperCase() : null;

  if (normLang && normPlan) {
    const key = `WHOP_CHECKOUT_PLAN_ID_${normLang}_${normPlan}`;
    const id = process.env[key];
    if (id) return id;
  }
  if (normPlan) {
    const key = `WHOP_CHECKOUT_PLAN_ID_${normPlan}`;
    const id = process.env[key];
    if (id) return id;
  }
  if (normLang) {
    const key = `WHOP_CHECKOUT_PLAN_ID_${normLang}`;
    const id = process.env[key];
    if (id) return id;
  }
  const direct = process.env.WHOP_CHECKOUT_PLAN_ID;
  if (direct) return direct;

  const productId = getProductIdForLang(lang);
  if (!productId) return null;

  const plans = await listPlans({ product_id: productId });
  if (!Array.isArray(plans) || plans.length === 0) return null;

  const wantType = normPlan ? normPlan.toLowerCase() : 'monthly';
  const byType = plans.find((p) => inferPlanType(p) === wantType);
  if (byType && byType.id) return byType.id;
  return plans[0].id;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ref = (req.query.ref || '').trim();
  const lang = (req.query.lang || 'en').toLowerCase();
  const plan = (req.query.plan || '').toLowerCase();

  if (!ref) {
    res.status(400).send(
      'Missing ref. Use: /api/whop-checkout?ref=YOUR_FIRSTPROMOTER_REF&lang=en&plan=monthly'
    );
    return;
  }

  let planId;
  try {
    planId = await resolvePlanId(lang, plan);
  } catch (e) {
    console.error('[whop-checkout] resolvePlanId failed:', e?.message);
    res.status(502).send('Could not resolve plan. Check WHOP_PRODUCT_ID or WHOP_CHECKOUT_PLAN_ID.');
    return;
  }
  if (!planId) {
    console.error('[whop-checkout] No plan_id. Set WHOP_PRODUCT_ID or WHOP_CHECKOUT_PLAN_ID.');
    res.status(503).send('Checkout not configured. Set WHOP_PRODUCT_ID (prod_xxx) or WHOP_CHECKOUT_PLAN_ID.');
    return;
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || '';
    const redirectUrl = baseUrl ? `${baseUrl}/checkout/complete` : undefined;

    const { purchase_url } = await createCheckoutSession({
      plan_id: planId,
      ref,
      redirect_url: redirectUrl,
    });

    res.redirect(302, purchase_url);
  } catch (e) {
    console.error('[whop-checkout] createCheckoutSession failed:', e?.message);
    res.status(502).send('Could not create checkout. Try again or use the direct product link.');
  }
};
