// scripts/generate-tracking-links.js
// UTMパラメータを活用したトラッキングリンク生成

const PRODUCT_IDS = {
  EN: 'prod_6RjqaJMGyEw1F',
  JA: 'prod_756mUZhSfLAkL',
  KO: 'prod_HouQTKTN1F7vD',
  ES: 'prod_Eg1V8et0WTg69',
  AR: 'prod_l4ipnvNhwFpdQ',
  PTBR: 'prod_Cpz4oQla16GUB',
};

/**
 * UTMパラメータを追加したトラッキングリンクを生成
 */
function generateTrackingLink(productId, options = {}) {
  const {
    source = 'direct',
    medium = 'organic',
    campaign = 'default',
    term = '',
    content = '',
    promoCode = '',
  } = options;

  const baseUrl = `https://whop.com/${productId}`;
  const params = new URLSearchParams();

  // UTMパラメータ
  params.append('utm_source', source);
  params.append('utm_medium', medium);
  params.append('utm_campaign', campaign);
  if (term) params.append('utm_term', term);
  if (content) params.append('utm_content', content);

  // プロモコード
  if (promoCode) {
    params.append('promo', promoCode);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * キャンペーン別のトラッキングリンクを一括生成
 */
function generateCampaignLinks(productId, campaignName, sources = []) {
  const links = {};

  sources.forEach(source => {
    const link = generateTrackingLink(productId, {
      source: source.platform || source,
      medium: source.medium || 'ad',
      campaign: campaignName,
      content: source.content || '',
      promoCode: source.promoCode || '',
    });

    links[source.platform || source] = link;
  });

  return links;
}

/**
 * VSLキャンペーン用のトラッキングリンク生成
 */
function generateVSLLinks(productId, vslNumber = 1) {
  const campaign = `vsl${vslNumber}`;
  
  return {
    facebook: generateTrackingLink(productId, {
      source: 'facebook',
      medium: 'ad',
      campaign: campaign,
      content: `vsl${vslNumber}-fb`,
    }),
    instagram: generateTrackingLink(productId, {
      source: 'instagram',
      medium: 'ad',
      campaign: campaign,
      content: `vsl${vslNumber}-ig`,
    }),
    tiktok: generateTrackingLink(productId, {
      source: 'tiktok',
      medium: 'ad',
      campaign: campaign,
      content: `vsl${vslNumber}-tt`,
    }),
    twitter: generateTrackingLink(productId, {
      source: 'twitter',
      medium: 'ad',
      campaign: campaign,
      content: `vsl${vslNumber}-tw`,
    }),
    youtube: generateTrackingLink(productId, {
      source: 'youtube',
      medium: 'ad',
      campaign: campaign,
      content: `vsl${vslNumber}-yt`,
    }),
  };
}

function main() {
  console.log('='.repeat(80));
  console.log('Whopトラッキングリンク生成');
  console.log('='.repeat(80));
  console.log('');

  // VSL1キャンペーン用リンク（EN版）
  console.log('📦 VSL1キャンペーン用トラッキングリンク（EN版）:');
  console.log('');
  const vsl1Links = generateVSLLinks(PRODUCT_IDS.EN, 1);
  Object.entries(vsl1Links).forEach(([platform, link]) => {
    console.log(`  ${platform.toUpperCase()}:`);
    console.log(`    ${link}`);
    console.log('');
  });

  // プロモコード付きリンクの例
  console.log('📦 プロモコード付きトラッキングリンクの例:');
  console.log('');
  const promoLink = generateTrackingLink(PRODUCT_IDS.EN, {
    source: 'facebook',
    medium: 'ad',
    campaign: 'vsl1-promo',
    promoCode: 'defend50',
  });
  console.log(`  ${promoLink}`);
  console.log('');

  // 全言語版のVSL1リンク
  console.log('📦 全言語版VSL1リンク:');
  console.log('');
  Object.entries(PRODUCT_IDS).forEach(([lang, productId]) => {
    const link = generateTrackingLink(productId, {
      source: 'facebook',
      medium: 'ad',
      campaign: 'vsl1',
      content: `vsl1-${lang.toLowerCase()}`,
    });
    console.log(`  ${lang}: ${link}`);
  });
  console.log('');

  console.log('='.repeat(80));
  console.log('💡 使用方法:');
  console.log('');
  console.log('1. 各プラットフォームの広告に適切なリンクを使用');
  console.log('2. Google Analyticsでトラフィックソースを確認');
  console.log('3. プロモコード使用状況を追跡');
  console.log('4. キャンペーン別のパフォーマンスを分析');
  console.log('');
  console.log('='.repeat(80));
}

if (require.main === module) {
  main();
}

module.exports = {
  generateTrackingLink,
  generateCampaignLinks,
  generateVSLLinks,
  PRODUCT_IDS,
};
