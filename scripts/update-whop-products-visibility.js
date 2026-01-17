// scripts/update-whop-products-visibility.js
// 全プロダクトの可視性を確認・更新（ストアページオープン・ディスカバー対応）

require('dotenv').config();
const { listProducts, updateProduct, getProduct } = require('../services/whop/client');

// 全プロダクトID
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
  console.log('Whopプロダクト可視性確認・更新');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. 全プロダクトの現在の状態を確認
    console.log('1. 全プロダクトの現在の状態を確認中...');
    const products = await listProducts();
    
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = p;
    });

    console.log(`   取得したプロダクト数: ${products.length}`);
    console.log('');

    // 2. 各プロダクトの状態を確認
    console.log('2. 各プロダクトの可視性確認:');
    const statuses = [];
    
    for (const productId of PRODUCT_IDS) {
      const product = productMap[productId] || await getProduct(productId);
      const visibility = product.visibility || 'unknown';
      const title = product.title || product.name || productId;
      
      statuses.push({
        id: productId,
        title,
        visibility,
        needsUpdate: visibility !== 'visible'
      });
      
      console.log(`   ${title}`);
      console.log(`     ID: ${productId}`);
      console.log(`     可視性: ${visibility} ${visibility !== 'visible' ? '⚠️ 要更新' : '✅'}`);
      console.log('');
    }

    // 3. 更新が必要なプロダクトを確認
    const needsUpdate = statuses.filter(s => s.needsUpdate);
    
    if (needsUpdate.length === 0) {
      console.log('3. すべてのプロダクトが既にvisibleです ✅');
      console.log('');
      console.log('='.repeat(80));
      console.log('確認完了 - 更新不要');
      console.log('='.repeat(80));
      return;
    }

    console.log(`3. 更新が必要なプロダクト: ${needsUpdate.length}件`);
    needsUpdate.forEach(s => {
      console.log(`   - ${s.title} (${s.id}): ${s.visibility} → visible`);
    });
    console.log('');

    // 4. 更新を実行（dry-run）
    console.log('4. 更新準備完了');
    console.log('   実際に更新するには、以下のコマンドを実行してください:');
    console.log('');
    
    needsUpdate.forEach(s => {
      console.log(`   node scripts/whop-cli.js products:update --id=${s.id} --data=scripts/whop-samples/product-visibility-update.json --apply`);
    });
    console.log('');

    console.log('='.repeat(80));
    console.log('確認完了（dry-runモード）');
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
