// services/telegram/whop-links.js
// 旧 Whop 名の互換レイヤー。実体は lp-links.js に移行済み。
// 新規コードは services/telegram/lp-links.js を直接参照すること。

const {
  getLandingPageUrl,
  getLandingPageUpgradeLink,
  getMinimalVersionCheckoutUrl,
  getPromoCode,
  getRegularTrialCta,
  getRegularLpLinkOnly,
  getMonthlyPriceForLang,
  getVidalyticsLink,
  DEFAULT_PROMO_CODE
} = require("./lp-links");

// 旧関数名との互換エクスポート
function getWhopProductUrl(lang = null) {
  return getLandingPageUrl(lang);
}

function getWhopUpgradeLink() {
  return getLandingPageUpgradeLink();
}

function getRegularWhopLinkOnly(lang = null) {
  return getRegularLpLinkOnly(lang);
}

module.exports = {
  // 新名
  getLandingPageUrl,
  getLandingPageUpgradeLink,
  // 旧名互換
  getWhopProductUrl,
  getWhopUpgradeLink,
  getRegularWhopLinkOnly,
  // 共通ユーティリティ
  getMinimalVersionCheckoutUrl,
  getPromoCode,
  getRegularTrialCta,
  getMonthlyPriceForLang,
  getVidalyticsLink,
  DEFAULT_PROMO_CODE
};
