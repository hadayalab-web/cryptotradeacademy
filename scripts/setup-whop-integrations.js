// scripts/setup-whop-integrations.js
// Whop統合設定の確認とトラフィック検証の準備

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

async function main() {
  console.log('='.repeat(80));
  console.log('Whop統合設定確認・トラフィック検証準備');
  console.log('='.repeat(80));
  console.log('');

  console.log('📋 サポートされている統合:');
  console.log('  1. Google Analytics - トラフィック分析');
  console.log('  2. Meta (Facebook/Instagram) Pixel - 広告トラッキング');
  console.log('  3. TikTok Pixel - TikTok広告トラッキング');
  console.log('  4. Twitter / X Pixel - X広告トラッキング');
  console.log('  5. Pinterest Pixel - Pinterest広告トラッキング');
  console.log('  6. Reddit Pixel - Reddit広告トラッキング');
  console.log('  7. Hyros - 高度なトラッキング・アトリビューション');
  console.log('');

  console.log('⚠️ 注意: 統合設定はAPIでは管理できません');
  console.log('   ダッシュボード経由で設定する必要があります');
  console.log('   Dashboard → Settings → Analytics');
  console.log('');

  try {
    const products = await listProducts();
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = p;
    });

    console.log('📦 プロダクト情報確認:');
    console.log('');

    for (const productId of PRODUCT_IDS) {
      const product = productMap[productId] || await getProduct(productId);
      const title = product.title || product.name || productId;
      const visibility = product.visibility || 'unknown';
      
      console.log(`  ${title}`);
      console.log(`    ID: ${productId}`);
      console.log(`    可視性: ${visibility}`);
      console.log(`    ストアURL: https://whop.com/${productId}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('🔧 次のステップ:');
    console.log('');
    console.log('1. ダッシュボードで統合設定:');
    console.log('   - Dashboard → Settings → Analytics');
    console.log('   - 各プラットフォームのトラッキングID/APIキーを入力');
    console.log('   - 統合を有効化');
    console.log('');
    console.log('2. トラッキングリンクの活用:');
    console.log('   - Whopのトラッキングリンク機能を使用');
    console.log('   - UTMパラメータを追加してトラフィックソースを追跡');
    console.log('');
    console.log('3. API経由でのデータ取得:');
    console.log('   - メンバーシップデータを取得してトラフィックを分析');
    console.log('   - プロモコード使用状況を追跡');
    console.log('');
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

module.exports = { main };
