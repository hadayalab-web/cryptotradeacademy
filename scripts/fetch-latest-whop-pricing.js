// scripts/fetch-latest-whop-pricing.js
// Whop APIから最新の価格・プラン情報を取得

require('dotenv').config();
const { getProduct, listPlans, getPlan } = require('../services/whop/client');
const fs = require('fs');
const path = require('path');

// 言語別プロダクトID（最新の情報）
const PRODUCT_IDS = {
  EN: 'prod_6RjqaJMGyEw1F',
  ES: 'prod_Eg1V8et0WTg69',
  'PT-BR': 'prod_Cpz4oQla16GUB',
  AR: 'prod_l4ipnvNhwFpdQ',
  KO: 'prod_HouQTKTN1F7vD',
  JA: 'prod_756mUZhSfLAkL',
};

/**
 * プラン情報を整形して表示
 */
function formatPlanInfo(plan) {
  return {
    id: plan.id,
    name: plan.name || 'N/A',
    plan_type: plan.plan_type, // 'renewal' or 'one_time'
    initial_price: plan.initial_price,
    renewal_price: plan.renewal_price,
    billing_period: plan.billing_period, // 日数（renewalの場合）
    expiration_days: plan.expiration_days, // 日数（one_timeの場合）
    trial_period: plan.trial_period, // トライアル期間（日数）
    trial_price: plan.trial_price, // トライアル価格
    visibility: plan.visibility, // 'public', 'private', 'unlisted'
    active: plan.active,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  };
}

/**
 * プロダクト情報を整形して表示
 */
function formatProductInfo(product) {
  return {
    id: product.id,
    name: product.name,
    headline: product.headline,
    description: product.description?.substring(0, 200) + '...' || 'N/A',
    visibility: product.visibility,
    active: product.active,
    created_at: product.created_at,
    updated_at: product.updated_at,
    plan_count: product.plans?.length || 0,
  };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔍 Whop APIから最新の価格・プラン情報を取得中...\n');

  const results = {
    timestamp: new Date().toISOString(),
    products: {},
    plans: {},
  };

  try {
    // 各言語のプロダクト情報を取得
    for (const [lang, productId] of Object.entries(PRODUCT_IDS)) {
      console.log(`\n📦 [${lang}] プロダクト情報を取得: ${productId}`);
      
      try {
        // プロダクト情報を取得（plansも展開）
        const product = await getProduct(productId, ['plans']);
        results.products[lang] = formatProductInfo(product);
        
        console.log(`  ✅ プロダクト名: ${product.name}`);
        console.log(`  ✅ プラン数: ${product.plans?.length || 0}`);

        // 各プランの詳細情報を取得
        if (product.plans && product.plans.length > 0) {
          results.plans[lang] = [];
          
          for (const planRef of product.plans) {
            const planId = typeof planRef === 'string' ? planRef : planRef.id;
            console.log(`  📋 プラン詳細を取得: ${planId}`);
            
            try {
              const plan = await getPlan(planId);
              const formattedPlan = formatPlanInfo(plan);
              results.plans[lang].push(formattedPlan);
              
              // 価格情報を表示
              console.log(`    ✅ プラン名: ${plan.name || 'N/A'}`);
              console.log(`    ✅ タイプ: ${plan.plan_type}`);
              if (plan.plan_type === 'renewal') {
                console.log(`    ✅ 月額価格: $${plan.renewal_price || plan.initial_price}`);
                console.log(`    ✅ 請求周期: ${plan.billing_period}日`);
              } else {
                console.log(`    ✅ 初期価格: $${plan.initial_price}`);
                console.log(`    ✅ 有効期間: ${plan.expiration_days}日`);
              }
              console.log(`    ✅ トライアル期間: ${plan.trial_period || 0}日`);
              console.log(`    ✅ トライアル価格: $${plan.trial_price || 0}`);
              console.log(`    ✅ 公開状態: ${plan.visibility}`);
              console.log(`    ✅ アクティブ: ${plan.active ? 'Yes' : 'No'}`);
            } catch (error) {
              console.error(`    ❌ プラン取得エラー: ${error.message}`);
              results.plans[lang].push({ id: planId, error: error.message });
            }
          }
        } else {
          console.log(`  ⚠️  プランが見つかりませんでした`);
          results.plans[lang] = [];
        }
      } catch (error) {
        console.error(`  ❌ プロダクト取得エラー: ${error.message}`);
        results.products[lang] = { id: productId, error: error.message };
        results.plans[lang] = [];
      }
    }

    // 結果をJSONファイルに保存
    const outputPath = path.join(__dirname, '../docs/reports/whop-latest-pricing.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n✅ 結果を保存しました: ${outputPath}`);

    // サマリーを表示
    console.log('\n📊 === サマリー ===');
    for (const [lang, plans] of Object.entries(results.plans)) {
      if (Array.isArray(plans) && plans.length > 0) {
        console.log(`\n[${lang}] プラン一覧:`);
        plans.forEach((plan, index) => {
          if (plan.error) {
            console.log(`  ${index + 1}. ❌ エラー: ${plan.error}`);
          } else {
            const priceInfo = plan.plan_type === 'renewal' 
              ? `$${plan.renewal_price || plan.initial_price}/月 (${plan.billing_period}日)`
              : `$${plan.initial_price} (${plan.expiration_days}日)`;
            const trialInfo = plan.trial_period > 0 
              ? ` | トライアル: ${plan.trial_period}日 ($${plan.trial_price || 0})`
              : ' | トライアルなし';
            console.log(`  ${index + 1}. ${plan.name || plan.id}: ${priceInfo}${trialInfo}`);
          }
        });
      }
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
