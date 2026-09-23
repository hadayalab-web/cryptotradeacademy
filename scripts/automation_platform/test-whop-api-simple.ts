/**
 * Whop APIの簡単なテスト
 */

import { getWhopProduct } from '../api/unified-api';

async function test() {
  console.log('テスト開始');
  
  try {
    const product = await getWhopProduct('prod_6RjqaJMGyEw1F');
    console.log('プロダクト名:', product.name);
    console.log('データ:', JSON.stringify(product, null, 2));
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
  
  console.log('テスト終了');
}

test();
