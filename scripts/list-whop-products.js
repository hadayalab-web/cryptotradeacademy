// scripts/list-whop-products.js
// Whop製品リストを取得して構造を確認

require('dotenv').config();
const { listProducts } = require('../services/whop/client');

async function main() {
  console.log('='.repeat(80));
  console.log('Whop製品リスト取得');
  console.log('='.repeat(80));

  try {
    const products = await listProducts({ visibility: 'visible' });
    
    console.log(`\n取得した製品数: ${products.length}\n`);
    
    for (const product of products) {
      console.log(`${'-'.repeat(80)}`);
      console.log(`製品名: ${product.name || product.title || 'N/A'}`);
      console.log(`製品ID: ${product.id}`);
      console.log(`URL: ${product.url || 'N/A'}`);
      console.log(`Slug: ${product.slug || 'N/A'}`);
      console.log(`利用可能なフィールド: ${Object.keys(product).join(', ')}`);
      
      // URLからslugを抽出
      if (product.url) {
        const match = product.url.match(/whop\.com\/[^\/]+\/([^\/]+)\/?$/);
        if (match) {
          console.log(`URLから抽出したslug: ${match[1]}`);
        }
      }
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('JSON出力（最初の製品）');
    console.log(`${'='.repeat(80)}`);
    if (products.length > 0) {
      console.log(JSON.stringify(products[0], null, 2));
    }
  } catch (error) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
