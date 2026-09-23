import { getWhopProduct, getWhopPlans } from '../api/unified-api.js';

const PRODUCT_ID = 'prod_6RjqaJMGyEw1F';

async function main() {
  try {
    console.log('🔍 Whop EN版の詳細情報を取得中...\n');
    
    // プロダクト情報を取得
    const product = await getWhopProduct(PRODUCT_ID);
    
    console.log('📊 プロダクト基本情報:');
    console.log('---');
    console.log(`プロダクトID: ${product.productId}`);
    console.log(`名前: ${product.name || 'N/A'}`);
    console.log(`スラッグ: ${product.slug || 'N/A'}`);
    console.log(`\n説明文:\n${product.description || 'N/A'}`);
    
    // プラン情報を取得
    console.log('\n\n📋 プラン情報を取得中...');
    const plans = await getWhopPlans({ productId: PRODUCT_ID });
    
    if (plans && plans.length > 0) {
      console.log(`\nプラン数: ${plans.length}`);
      plans.forEach((plan: any, index: number) => {
        console.log(`\nプラン ${index + 1}:`);
        console.log(`  ID: ${plan.id || 'N/A'}`);
        console.log(`  名前: ${plan.name || 'N/A'}`);
        console.log(`  価格: $${plan.price || 'N/A'}`);
        console.log(`  説明: ${plan.description || 'N/A'}`);
      });
    }
    
    // 詳細データ構造を確認
    if (product.data) {
      console.log('\n\n📋 詳細データ構造:');
      console.log(JSON.stringify(product.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('スタック:', error.stack);
    }
  }
}

main();
