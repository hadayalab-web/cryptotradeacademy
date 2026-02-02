// services/telegram/whop-links.js
// 言語別Whopリンクの取得ユーティリティ
// 有料版: trapdefence/btc-regular-{lang} | 無料版: checkout/plan_* (Minimal)

const { getMonthlyPriceForLang } = require("../../config/quoteRepostVariantGCopy");

const SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

/** プロモコード（ユーザー入力用）。環境変数 WHOP_PROMO_CODE で上書き可能。 */
const DEFAULT_PROMO_CODE = process.env.WHOP_PROMO_CODE || "defend50";

function normalizeLang(rawLang) {
  if (!rawLang) return "en";
  const baseLang = rawLang.toLowerCase().split(".")[0].split("_")[0];
  return SUPPORTED_LANGS.includes(baseLang) ? baseLang : "en";
}

/** 有料版（Regular Briefing）デフォルトURL - trapdefence ストア */
const DEFAULT_WHOP_URLS = {
  en: "https://whop.com/trapdefence/btc-regular-en/",
  es: "https://whop.com/trapdefence/btc-regular-es/",
  "pt-br": "https://whop.com/trapdefence/btc-regular-pt/",
  ar: "https://whop.com/trapdefence/btc-regular-ar/",
  ko: "https://whop.com/trapdefence/btc-regular-ko/",
  ja: "https://whop.com/trapdefence/btc-regular-ja/"
};

function getWhopProductUrl(lang = null) {
  const targetLang = normalizeLang(lang || process.env.LANG || "en");
  const urls = {
    en:
      process.env.WHOP_PRODUCT_URL_EN ||
      process.env.WHOP_PRODUCT_LINK_EN ||
      DEFAULT_WHOP_URLS["en"],
    es: process.env.WHOP_PRODUCT_URL_ES || DEFAULT_WHOP_URLS["es"],
    "pt-br":
      process.env.WHOP_PRODUCT_URL_PTBR ||
      process.env.WHOP_PRODUCT_URL_PT_BR ||
      DEFAULT_WHOP_URLS["pt-br"],
    ar: process.env.WHOP_PRODUCT_URL_AR || DEFAULT_WHOP_URLS["ar"],
    ko: process.env.WHOP_PRODUCT_URL_KO || DEFAULT_WHOP_URLS["ko"],
    ja: process.env.WHOP_PRODUCT_URL_JA || DEFAULT_WHOP_URLS["ja"]
  };

  return urls[targetLang] || urls["en"];
}

function getWhopUpgradeLink() {
  return process.env.WHOP_UPGRADE_LINK || getWhopProductUrl();
}

/**
 * 無料版（Minimal Version）用チェックアウトリンク
 * WhopページのCTAボタン表示バグを回避するため、チェックアウトリンクを使用
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション（UTMパラメータなど）
 * @returns {string} チェックアウトリンク（UTMパラメータ付き）
 */
function getMinimalVersionCheckoutUrl(lang = null, options = {}) {
  const targetLang = normalizeLang(lang || process.env.LANG || "en");

  // 環境変数からチェックアウトリンクを取得（言語別）
  // EN無料版チェックアウトリンク: https://whop.com/checkout/plan_9zf3nrYeweovV
  // ES無料版チェックアウトリンク: https://whop.com/checkout/plan_pukjeWHXVbEBK
  // PT-BR無料版チェックアウトリンク: https://whop.com/checkout/plan_wyK2xZcXtsMAV
  // AR無料版チェックアウトリンク: https://whop.com/checkout/plan_wREBLF9wriihy
  // KO無料版チェックアウトリンク: https://whop.com/checkout/plan_BYB0OUOWBrLem
  // JA無料版チェックアウトリンク: https://whop.com/checkout/plan_3hbsrgte6pCma
  const checkoutUrls = {
    en:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_EN ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_EN ||
      "https://whop.com/checkout/plan_9zf3nrYeweovV",
    es:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_ES ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_ES ||
      "https://whop.com/checkout/plan_pukjeWHXVbEBK",
    "pt-br":
      process.env.WHOP_MINIMAL_CHECKOUT_URL_PTBR ||
      process.env.WHOP_MINIMAL_CHECKOUT_URL_PT_BR ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_PTBR ||
      "https://whop.com/checkout/plan_wyK2xZcXtsMAV",
    ar:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_AR ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_AR ||
      "https://whop.com/checkout/plan_wREBLF9wriihy",
    ko:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_KO ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_KO ||
      "https://whop.com/checkout/plan_BYB0OUOWBrLem",
    ja:
      process.env.WHOP_MINIMAL_CHECKOUT_URL_JA ||
      process.env.WHOP_MINIMAL_CHECKOUT_LINK_JA ||
      "https://whop.com/checkout/plan_3hbsrgte6pCma"
  };

  const baseUrl = checkoutUrls[targetLang] || checkoutUrls["en"];

  // チェックアウトリンクが設定されていない場合は、Telegram Deep Linkをフォールバックとして使用
  if (!baseUrl) {
    console.warn(
      `[WhopLinks] Minimal Version checkout URL not configured for ${targetLang}, falling back to Telegram Deep Link`
    );
    return null; // nullを返して、呼び出し側でTelegram Deep Linkを使用
  }

  // UTMパラメータを追加
  const utmParams = new URLSearchParams({
    utm_source: options.source || "x",
    utm_medium: options.medium || "quote_repost",
    utm_campaign: options.campaign || "minimal_version",
    utm_content: options.content || `influencer_${options.influencerUsername || "unknown"}`
  });

  // 既存のクエリパラメータがある場合は結合
  try {
    const url = new URL(baseUrl);
    utmParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  } catch (error) {
    // URL解析エラーの場合は、単純にクエリパラメータを追加
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${utmParams.toString()}`;
  }
}

/** プロモコードを取得（URL クエリ用）。大文字表記は DEFEND50 互換。 */
function getPromoCode() {
  return process.env.WHOP_PROMO_CODE || DEFAULT_PROMO_CODE;
}

/**
 * 有料版（Regular Briefing）Whopリンクのみ（X投稿ポリシー・リッチプレビューを避ける）
 * @param {string} lang - 言語コード
 * @returns {string} Whop商品URL
 */
function getRegularWhopLinkOnly(lang = null) {
  return getWhopProductUrl(lang);
}

/**
 * 有料版（Regular）月額トライアル CTA 文言（言語別価格・1日トライアル・リスクゼロ訴求）
 * X投稿末尾などで「今すぐ月$XXトライアル: [url]」と統一。価格は marketProfiles 準拠。
 * @param {string} lang - 言語コード
 * @returns {{ text: string, url: string }}
 */
function getRegularTrialCta(lang = null) {
  const targetLang = normalizeLang(lang || process.env.LANG || "en");
  const url = getWhopProductUrl(targetLang);
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
  getWhopProductUrl,
  getWhopUpgradeLink,
  getMinimalVersionCheckoutUrl,
  getPromoCode,
  getRegularTrialCta,
  getRegularWhopLinkOnly,
  DEFAULT_PROMO_CODE
};
