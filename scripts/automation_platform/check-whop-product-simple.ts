/**
 * WhopプロダクトのFAQ情報をチェックするスクリプト（簡易版）
 */

import { getWhopProduct, whopRequestSafe } from '../api/unified-api';

const PRODUCT_ID = 'prod_6RjqaJMGyEw1F'; // EN

async function main() {
  console.log('🚀 WhopプロダクトFAQチェック開始...\n');
  
  try {
    // 通常の取得
    console.log('1. 通常のプロダクト情報取得...');
    const result = await getWhopProduct(PRODUCT_ID);
    console.log('✅ 取得成功');
    console.log('データ構造:', Object.keys(result.data || result));
    console.log('生データ:', JSON.stringify(result.data || result, null, 2).substring(0, 1000));
    
    // expandパラメータ付きで取得
    console.log('\n2. expandパラメータ付きで取得...');
    const expanded = await whopRequestSafe("GET", `/products/${PRODUCT_ID}?expand[]=experiences`);
    console.log('✅ 取得成功');
    console.log('データ構造:', Object.keys(expanded.data || expanded));
    
    if (expanded.data?.experiences) {
      console.log('\n3. Experiences詳細:');
      const experiences = Array.isArray(expanded.data.experiences) 
        ? expanded.data.experiences 
        : [];
      experiences.forEach((exp: any, idx: number) => {
        console.log(`   Experience ${idx + 1}:`, typeof exp === 'object' ? Object.keys(exp) : exp);
        if (exp && typeof exp === 'object') {
          console.log('     詳細:', JSON.stringify(exp, null, 2).substring(0, 500));
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

main().catch(console.error);
