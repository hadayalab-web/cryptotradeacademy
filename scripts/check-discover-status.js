// scripts/check-discover-status.js
// ディスカバーステータス確認と条件チェック

require('dotenv').config();
const { getProduct, listProducts } = require('../services/whop/client');

const PRODUCT_IDS = [
  'prod_6RjqaJMGyEw1F', // EN
  'prod_756mUZhSfLAkL', // JA
  'prod_HouQTKTN1F7vD', // KO
  'prod_Eg1V8et0WTg69', // ES
  'prod_l4ipnvNhwFpdQ', // AR
  'prod_Cpz4oQla16GUB', // PT-BR
];

async function checkDiscoverRequirements(product) {
  const checks = {
    visibility: product.visibility === 'visible',
    hasTitle: !!(product.title || product.name),
    hasDescription: !!product.description,
    hasHeadline: !!product.headline,
    hasHighlights: Array.isArray(product.product_highlights) && product.product_highlights.length > 0,
    hasPlans: Array.isArray(product.plans) && product.plans.length > 0,
    hasExperiences: Array.isArray(product.experiences) && product.experiences.length > 0,
  };
  
  const allMet = Object.values(checks).every(v => v === true);
  return { checks, allMet };
}

async function main() {
  console.log('='.repeat(80));
  console.log('Whopディスカバーステータス確認');
  console.log('='.repeat(80));
  console.log('');
  console.log('⚠️ 重要: ディスカバーステータスはAPIでは制御できません');
  console.log('   ダッシュボードで「List on Discover」を有効にする必要があります');
  console.log('   審査は通常5-10分で完了します');
  console.log('');

  try {
    const products = await listProducts();
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = p;
    });

    console.log('各プロダクトのディスカバー掲載条件チェック:');
    console.log('');

    for (const productId of PRODUCT_IDS) {
      const product = productMap[productId] || await getProduct(productId, ['plans', 'experiences']);
      const { checks, allMet } = await checkDiscoverRequirements(product);
      const title = product.title || product.name || productId;

      console.log(`📦 ${title}`);
      console.log(`   ID: ${productId}`);
      console.log(`   可視性: ${product.visibility || 'unknown'}`);
      console.log(`   ディスカバー掲載条件:`);
      console.log(`     ✅ 可視性: ${checks.visibility ? '✅' : '❌'}`);
      console.log(`     ${checks.hasTitle ? '✅' : '❌'} タイトル: ${checks.hasTitle ? 'あり' : 'なし'}`);
      console.log(`     ${checks.hasDescription ? '✅' : '❌'} 説明文: ${checks.hasDescription ? 'あり' : 'なし'}`);
      console.log(`     ${checks.hasHeadline ? '✅' : '❌'} ヘッドライン: ${checks.hasHeadline ? 'あり' : 'なし'}`);
      console.log(`     ${checks.hasHighlights ? '✅' : '❌'} 機能説明: ${checks.hasHighlights ? 'あり' : 'なし'}`);
      console.log(`     ${checks.hasPlans ? '✅' : '❌'} プラン: ${checks.hasPlans ? 'あり' : 'なし'}`);
      console.log(`     ${checks.hasExperiences ? '✅' : '❌'} エクスペリエンス: ${checks.hasExperiences ? 'あり' : 'なし'}`);
      
      if (allMet) {
        console.log(`   🎯 すべての条件を満たしています → ディスカバーに掲載可能`);
      } else {
        console.log(`   ⚠️  条件未達成 → 不足している項目を確認してください`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('次のステップ:');
    console.log('1. ダッシュボードにログイン');
    console.log('2. 各プロダクトの「Manage Whop」→「List on Discover」を有効化');
    console.log('3. 審査完了を待つ（通常5-10分）');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, checkDiscoverRequirements };
