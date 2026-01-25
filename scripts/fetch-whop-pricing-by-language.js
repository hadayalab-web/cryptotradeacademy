// scripts/fetch-whop-pricing-by-language.js
// 言語別Whop製品のプラン価格を取得して、売上単価（ARPU）を計算

require('dotenv').config();
const { getProduct, listPlans } = require('../services/whop/client');

// 言語別製品URL（slugから製品IDを推測する必要がある）
const PRODUCT_URLS = {
  EN: process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  ES: process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'PT-BR': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  AR: process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  KO: process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  JA: process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

/**
 * URLからslugを抽出
 */
function extractSlugFromUrl(url) {
  const match = url.match(/whop\.com\/[^\/]+\/([^\/]+)\/?$/);
  return match ? match[1] : null;
}

/**
 * 製品リストからslugで製品を検索
 */
async function findProductBySlug(slug) {
  try {
    const { listProducts } = require('../services/whop/client');
    const products = await listProducts({ visibility: 'visible' });
    
    // slugでマッチング（URLの最後の部分）
    const normalizedSlug = slug.toLowerCase().replace(/\/$/, '');
    
    for (const product of products) {
      // product.url または product.slug でマッチング
      if (product.url) {
        const productSlug = extractSlugFromUrl(product.url);
        if (productSlug && productSlug.toLowerCase() === normalizedSlug) {
          return product.id;
        }
      }
      if (product.slug && product.slug.toLowerCase() === normalizedSlug) {
        return product.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[Error] Failed to find product by slug ${slug}:`, error.message);
    return null;
  }
}

/**
 * 製品のプラン情報を取得して価格を分析
 */
async function analyzeProductPricing(productId, lang) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`言語: ${lang}`);
    console.log(`製品ID: ${productId}`);
    console.log(`${'='.repeat(80)}`);

    // 製品情報を取得（plansをexpand）
    const product = await getProduct(productId, ['plans']);
    
    if (!product) {
      console.log(`❌ 製品が見つかりません: ${productId}`);
      return null;
    }

    console.log(`製品名: ${product.name || product.title || 'N/A'}`);
    console.log(`製品URL: ${product.url || 'N/A'}`);

    // プラン情報を取得
    let plans = [];
    if (product.plans && product.plans.length > 0) {
      plans = product.plans;
    } else {
      // plansがexpandされていない場合、別途取得
      plans = await listPlans({ product_id: productId });
    }

    if (!plans || plans.length === 0) {
      console.log(`⚠️ プランが見つかりません`);
      return null;
    }

    console.log(`\nプラン数: ${plans.length}`);
    console.log(`${'-'.repeat(80)}`);

    const planDetails = [];
    let totalARPU = 0;
    const planDistribution = {
      monthly: 0.214,  // 21.4%
      quarterly: 0.357, // 35.7%
      annual: 0.429,    // 42.9%
    };

    for (const plan of plans) {
      const planInfo = {
        id: plan.id,
        name: plan.name || plan.title || 'N/A',
        type: plan.plan_type || 'unknown',
        initialPrice: plan.initial_price || 0,
        renewalPrice: plan.renewal_price || 0,
        billingPeriod: plan.billing_period || 0,
        expirationDays: plan.expiration_days || 0,
        currency: plan.currency || 'USD',
        visibility: plan.visibility || 'unknown',
      };

      // プランタイプを判定
      let planCategory = 'unknown';
      let effectivePrice = 0;
      
      // renewalタイプのプランはrenewal_priceを使用
      if (planInfo.type === 'renewal') {
        if (planInfo.billingPeriod === 30) {
          planCategory = 'monthly';
          effectivePrice = planInfo.renewalPrice || planInfo.initialPrice;
        } else if (planInfo.billingPeriod === 90) {
          planCategory = 'quarterly';
          effectivePrice = planInfo.renewalPrice || planInfo.initialPrice;
        } else if (planInfo.billingPeriod === 365) {
          planCategory = 'annual';
          effectivePrice = planInfo.renewalPrice || planInfo.initialPrice;
        }
      } else if (planInfo.type === 'one_time') {
        // one_timeタイプのプランはinitial_priceを使用
        if (planInfo.expirationDays === 90 || planInfo.billingPeriod === 90) {
          planCategory = 'quarterly';
          effectivePrice = planInfo.initialPrice || planInfo.renewalPrice;
        } else if (planInfo.expirationDays === 365 || planInfo.billingPeriod === 365) {
          planCategory = 'annual';
          effectivePrice = planInfo.initialPrice || planInfo.renewalPrice;
        } else if (planInfo.billingPeriod === 30) {
          planCategory = 'monthly';
          effectivePrice = planInfo.initialPrice || planInfo.renewalPrice;
        }
      } else {
        // その他のプランタイプ
        if (planInfo.billingPeriod === 30) {
          planCategory = 'monthly';
          effectivePrice = planInfo.renewalPrice || planInfo.initialPrice;
        } else if (planInfo.billingPeriod === 90 || planInfo.expirationDays === 90) {
          planCategory = 'quarterly';
          effectivePrice = planInfo.renewalPrice || planInfo.initialPrice;
        } else if (planInfo.billingPeriod === 365 || planInfo.expirationDays === 365) {
          planCategory = 'annual';
          effectivePrice = planInfo.renewalPrice || planInfo.initialPrice;
        }
      }

      planInfo.category = planCategory;
      planInfo.effectivePrice = effectivePrice;

      // ARPU計算に使用する価格を決定
      let arpuContribution = 0;
      if (planCategory === 'monthly') {
        arpuContribution = effectivePrice * planDistribution.monthly;
      } else if (planCategory === 'quarterly') {
        arpuContribution = effectivePrice * planDistribution.quarterly;
      } else if (planCategory === 'annual') {
        arpuContribution = effectivePrice * planDistribution.annual;
      }

      planInfo.arpuContribution = arpuContribution;
      totalARPU += arpuContribution;

      console.log(`\nプラン: ${planInfo.name}`);
      console.log(`  ID: ${planInfo.id}`);
      console.log(`  タイプ: ${planInfo.type} (${planInfo.category})`);
      console.log(`  初期価格: ${planInfo.currency} ${planInfo.initialPrice}`);
      console.log(`  更新価格: ${planInfo.currency} ${planInfo.renewalPrice}`);
      console.log(`  請求期間: ${planInfo.billingPeriod}日`);
      console.log(`  有効期限: ${planInfo.expirationDays}日`);
      console.log(`  実効価格: ${planInfo.currency} ${planInfo.effectivePrice}`);
      console.log(`  ARPU寄与: ${planInfo.currency} ${arpuContribution.toFixed(2)}`);

      planDetails.push(planInfo);
    }

    // ARPU計算
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`📊 ARPU計算（プラン分散考慮）`);
    console.log(`${'-'.repeat(80)}`);
    console.log(`プラン分散:`);
    console.log(`  月額: ${(planDistribution.monthly * 100).toFixed(1)}%`);
    console.log(`  3ヶ月: ${(planDistribution.quarterly * 100).toFixed(1)}%`);
    console.log(`  年間: ${(planDistribution.annual * 100).toFixed(1)}%`);
    console.log(`\n合計ARPU（プロモコード適用前）: $${totalARPU.toFixed(2)}`);

    // プロモコード50%割引適用後
    const arpuAfterPromo = totalARPU * 0.5;
    console.log(`ARPU（プロモコード50%割引適用後）: $${arpuAfterPromo.toFixed(2)}`);

    // Whop手数料3%差し引き後
    const finalARPU = arpuAfterPromo * 0.97;
    console.log(`最終利益ARPU（Whop手数料3%差し引き後）: $${finalARPU.toFixed(2)}`);

    return {
      lang,
      productId,
      productName: product.name || product.title,
      plans: planDetails,
      arpu: {
        beforePromo: totalARPU,
        afterPromo: arpuAfterPromo,
        final: finalARPU,
      },
    };
  } catch (error) {
    console.error(`❌ エラー: ${lang} - ${productId}`, error.message);
    if (error.message.includes('404')) {
      console.log(`   製品IDが存在しないか、アクセス権限がありません`);
    }
    return null;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('言語別Whop製品のプラン価格取得・ARPU計算');
  console.log('='.repeat(80));

  // 製品IDを環境変数から取得（なければ手動で設定）
  // URLから製品IDを抽出するのは困難なため、製品IDを直接指定する必要がある
  // 製品リストから取得した実際の製品ID
  const PRODUCT_IDS = {
    EN: process.env.WHOP_PRODUCT_ID_EN || 'prod_6RjqaJMGyEw1F',
    ES: process.env.WHOP_PRODUCT_ID_ES || 'prod_Eg1V8et0WTg69',
    'PT-BR': process.env.WHOP_PRODUCT_ID_PTBR || process.env.WHOP_PRODUCT_ID_PT_BR || 'prod_Cpz4oQla16GUB',
    AR: process.env.WHOP_PRODUCT_ID_AR || 'prod_l4ipnvNhwFpdQ',
    KO: process.env.WHOP_PRODUCT_ID_KO || 'prod_HouQTKTN1F7vD',
    JA: process.env.WHOP_PRODUCT_ID_JA || 'prod_756mUZhSfLAkL',
  };

  // 製品IDが設定されていない場合、URLからslugを抽出して製品を検索
  // ただし、Whop APIではslugから製品IDを直接取得できないため、
  // 製品リストを取得してslugで検索する必要がある
  // ここでは、まず製品リストを取得してslugでマッチングを試みる

  const results = [];

  // 各言語の製品を分析
  for (const [lang, url] of Object.entries(PRODUCT_URLS)) {
    let productId = PRODUCT_IDS[lang];
    
    // 製品IDが設定されていない場合、URLからslugを抽出して検索
    if (!productId) {
      const slug = extractSlugFromUrl(url);
      if (slug) {
        console.log(`\n🔍 ${lang}: URLからslugを抽出して製品を検索中...`);
        console.log(`   Slug: ${slug}`);
        productId = await findProductBySlug(slug);
        if (productId) {
          console.log(`   ✓ 製品IDを発見: ${productId}`);
        } else {
          console.log(`   ❌ 製品が見つかりませんでした`);
        }
      }
    }
    
    if (!productId) {
      console.log(`\n⚠️ ${lang}: 製品IDが設定されていません`);
      console.log(`   URL: ${url}`);
      console.log(`   環境変数 WHOP_PRODUCT_ID_${lang.replace('-', '_').toUpperCase()} を設定してください`);
      continue;
    }

    const result = await analyzeProductPricing(productId, lang);
    if (result) {
      results.push(result);
    }

    // APIレート制限を避けるため、少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 結果サマリー
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 言語別ARPUサマリー');
  console.log(`${'='.repeat(80)}`);

  if (results.length === 0) {
    console.log('❌ 取得できたデータがありません');
    return;
  }

  console.log(`\n${'言語'.padEnd(10)} | プロモコード適用前 | プロモコード適用後 | 最終利益ARPU`);
  console.log(`${'-'.repeat(80)}`);

  for (const result of results) {
    console.log(
      `${result.lang.padEnd(10)} | $${result.arpu.beforePromo.toFixed(2).padStart(15)} | $${result.arpu.afterPromo.toFixed(2).padStart(17)} | $${result.arpu.final.toFixed(2).padStart(12)}`
    );
  }

  // JSON出力
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('JSON出力');
  console.log(`${'='.repeat(80)}`);
  console.log(JSON.stringify(results, null, 2));
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeProductPricing };
