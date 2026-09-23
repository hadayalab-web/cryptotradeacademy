import { getWhopProduct } from '../api/unified-api.js';

const PRODUCT_ID = 'prod_6RjqaJMGyEw1F';

async function main() {
  try {
    console.log('🔍 Whop EN版の実際の内容を取得中...\n');
    
    const product = await getWhopProduct(PRODUCT_ID);
    
    console.log('📊 プロダクト情報:');
    console.log('---');
    console.log(`プロダクトID: ${product.productId}`);
    console.log(`名前: ${product.name || 'N/A'}`);
    console.log(`スラッグ: ${product.slug || 'N/A'}`);
    console.log(`\n説明文:\n${product.description || 'N/A'}`);
    
    // 実際のデータ構造を確認
    if (product.data) {
      console.log('\n\n📋 詳細データ構造:');
      console.log(JSON.stringify(product.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

main();
