// services/telegram/lp-links.js
// 言語別 LP（ランディングページ）リンクの取得ユーティリティ
// LP は Carrd に移行済み。Whop 連携は廃止。
// 以前の whop-links.js からロジックのみ移行し、命名を LP ベースに変更。

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

/** 言語別月額表示価格（Regular CTA 用）。環境変数 WHOP_PRICE_* で上書き可。 */
function getMonthlyPriceForLang(lang) {
  const key = (lang || "en").toLowerCase().replace("-", "_");
  const envKey = `WHOP_PRICE_${key.toUpperCase()}`;
  if (process.env[envKey]) return process.env[envKey];
  const defaults = { en: "9", es: "9", pt_br: "9", pt: "9", ar: "9", ja: "9", ko: "9" };
  return defaults[key] || defaults.en;
}

/** Vidalytics / VSL リンク（Minimal 配信・Regular アップセル用）。環境変数 VIDALYTICS_LINK_EN 等で上書き。 */
function getVidalyticsLink(lang, mode = "regular") {
  const n = (lang || "en").toLowerCase().replace("-", "_");
  const key = `VIDALYTICS_LINK_${n.toUpperCase()}`;
  if (process.env[key]) return process.env[key];
  if (process.env.VIDALYTICS_LINK) return process.env.VIDALYTICS_LINK;
  return process.env.VIDALYTICS_LINK_EN || "https://trapdefence.com";
}

/** プロモコード（ユーザー入力用）。環境変数 WHOP_PROMO_CODE で上書き可能。 */
const DEFAULT_PROMO_CODE = process.env.WHOP_PROMO_CODE || "defend50";

function normalizeLang(rawLang) {
  if (!rawLang) return "en";
  const baseLang = rawLang.toLowerCase().split(".")[0].split("_")[0];
  if (baseLang === "pt") return "pt-br";
  return SUPPORTED_LANGS.includes(baseLang) ? baseLang : "en";
}

/** 言語別 LP（Carrd）。CTA クリックで WarriorPlus 決済へ。環境変数 WHOP_PRODUCT_URL_* / LP_URL_* で上書き可。 */
const DEFAULT_LP_URLS = {
  en: "https://trapdefence-btc-en.carrd.co/",
  es: "https://trapdefence-btc-es.carrd.co/",
  "pt-br": "https://trapdefence-btc-pt.carrd.co/",
  ar: "https://trapdefence-btc-ar.carrd.co/",
  ko: "https://trapdefence-btc-ko.carrd.co/",
  ja: "https://trapdefence-btc-ja.carrd.co/"
};

/** 言語別 LP URL（Carrd） */
function getLandingPageUrl(lang = null) {
  const targetLang = normalizeLang(lang || process.env.LANG || "en");
  const urls = {
    en:
      process.env.LP_URL_EN ||
      process.env.WHOP_PRODUCT_URL_EN ||
      process.env.WHOP_PRODUCT_LINK_EN ||
      DEFAULT_LP_URLS["en"],
    es: process.env.LP_URL_ES || process.env.WHOP_PRODUCT_URL_ES || DEFAULT_LP_URLS["es"],
    "pt-br":
      process.env.LP_URL_PT ||
      process.env.LP_URL_PTBR ||
      process.env.WHOP_PRODUCT_URL_PTBR ||
      process.env.WHOP_PRODUCT_URL_PT_BR ||
      DEFAULT_LP_URLS["pt-br"],
    ar: process.env.LP_URL_AR || process.env.WHOP_PRODUCT_URL_AR || DEFAULT_LP_URLS["ar"],
    ko: process.env.LP_URL_KO || process.env.WHOP_PRODUCT_URL_KO || DEFAULT_LP_URLS["ko"],
    ja: process.env.LP_URL_JA || process.env.WHOP_PRODUCT_URL_JA || DEFAULT_LP_URLS["ja"]
  };

  return urls[targetLang] || urls["en"];
}

function getLandingPageUpgradeLink() {
  return process.env.WHOP_UPGRADE_LINK || getLandingPageUrl();
}

/**
 * 無料版（Minimal）誘導用リンク
 * デフォルトで Carrd LP へ。環境変数で WarriorPlus 等の別 URL を指定可能。
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション（UTMパラメータなど）
 * @returns {string} リンク（UTMパラメータ付き）
 */
function getMinimalVersionCheckoutUrl(lang = null, options = {}) {
  const targetLang = normalizeLang(lang || process.env.LANG || "en");

  const checkoutUrls = {
    en:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_EN ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_EN ||
      DEFAULT_LP_URLS["en"],
    es:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_ES ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_ES ||
      DEFAULT_LP_URLS["es"],
    "pt-br":
      process.env.WHOP_MINIMAL_CHECKOUT_URL_PTBR ||
      process.env.WHOP_MINIMAL_CHECKOUT_URL_PT_BR ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_PTBR ||
      DEFAULT_LP_URLS["pt-br"],
    ar:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_AR ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_AR ||
      DEFAULT_LP_URLS["ar"],
    ko:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_KO ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_KO ||
      DEFAULT_LP_URLS["ko"],
    ja:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_JA ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_JA ||
      DEFAULT_LP_URLS["ja"]
  };

  const baseUrl = checkoutUrls[targetLang] || checkoutUrls["en"];

  if (!baseUrl) {
    console.warn(`[LpLinks] LP URL not resolved for ${targetLang}, using EN Carrd LP`);
    return getLandingPageUrl("en");
  }

  const utmParams = new URLSearchParams({
    utm_source: options.source || "x",
    utm_medium: options.medium || "quote_repost",
    utm_campaign: options.campaign || "minimal_version",
    utm_content: options.content || `influencer_${options.influencerUsername || "unknown"}`
  });

  try {
    const url = new URL(baseUrl);
    utmParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  } catch (error) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${utmParams.toString()}`;
  }
}

/** プロモコードを取得（URL クエリ用） */
function getPromoCode() {
  return process.env.WHOP_PROMO_CODE || DEFAULT_PROMO_CODE;
}

/** 有料版 LP リンクのみ（X投稿ポリシー・リッチプレビューを避ける） */
function getRegularLpLinkOnly(lang = null) {
  return getLandingPageUrl(lang);
}

/** 有料版（Regular）月額トライアル CTA 文言（言語別価格・1日トライアル・リスクゼロ訴求） */
function getRegularTrialCta(lang = null) {
  const targetLang = normalizeLang(lang || process.env.LANG || "en");
  const url = getLandingPageUrl(targetLang);
  const price = getMonthlyPriceForLang(targetLang);
  const textByLang = {
    en: `Start $${price}/mo trial (1-day free): ${url}`,
    ja: `今すぐ月$${price}トライアル（1日無料）: ${url}`,
    es: `Prueba $${price}/mes (1 día gratis): ${url}`,
    "pt-br": `Teste $${price}/mês (1 dia grátis): ${url}`,
    ar: `تجربة $${price}/شهر (يوم مجاني): ${url}`,
    ko: `월 $${price} 체험 (1일 무료): ${url}`
  };
  return {
    text: textByLang[targetLang] || textByLang.en,
    url
  };
}

module.exports = {
  getLandingPageUrl,
  getLandingPageUpgradeLink,
  getMinimalVersionCheckoutUrl,
  getPromoCode,
  getRegularTrialCta,
  getRegularLpLinkOnly,
  getMonthlyPriceForLang,
  getVidalyticsLink,
  DEFAULT_PROMO_CODE
};

