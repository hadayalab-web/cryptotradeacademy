// services/telegram/whop-links.js
// 言語別Whopリンクの取得ユーティリティ

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(rawLang) {
  if (!rawLang) return 'en';
  const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
  return SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';
}

const DEFAULT_WHOP_URLS = {
  'en': 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

function getWhopProductUrl() {
  const lang = normalizeLang(process.env.LANG || 'en');
  const urls = {
    'en': process.env.WHOP_PRODUCT_URL_EN || process.env.WHOP_PRODUCT_LINK_EN || DEFAULT_WHOP_URLS['en'],
    'es': process.env.WHOP_PRODUCT_URL_ES || DEFAULT_WHOP_URLS['es'],
    'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || process.env.WHOP_PRODUCT_URL_PT_BR || DEFAULT_WHOP_URLS['pt-br'],
    'ar': process.env.WHOP_PRODUCT_URL_AR || DEFAULT_WHOP_URLS['ar'],
    'ko': process.env.WHOP_PRODUCT_URL_KO || DEFAULT_WHOP_URLS['ko'],
    'ja': process.env.WHOP_PRODUCT_URL_JA || DEFAULT_WHOP_URLS['ja'],
  };

  return urls[lang] || urls['en'];
}

function getWhopUpgradeLink() {
  return process.env.WHOP_UPGRADE_LINK || getWhopProductUrl();
}

module.exports = {
  getWhopProductUrl,
  getWhopUpgradeLink,
};
