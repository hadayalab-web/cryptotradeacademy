// scripts/test-whop-product-update.js
// Whop API v2のプロダクト更新をテスト（実際の更新を試行）

require('dotenv').config();
const { getProduct, updateProduct } = require('../services/whop/client');

// テスト対象のプロダクトID（EN版）
const PRODUCT_ID = process.env.WHOP_PRODUCT_ID_EN || 'prod_6RjqaJMGyEw1F';

/**
 * メイン実行関数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Whop API v2 プロダクト更新テスト');
  console.log('='.repeat(80));
  console.log(`Product ID: ${PRODUCT_ID}`);
  console.log('');

  try {
    // 1. 現在のプロダクト情報を取得
    console.log('1. 現在のプロダクト情報を取得中...');
    const currentProduct = await getProduct(PRODUCT_ID);
    console.log(`   プロダクト名: ${currentProduct.title || currentProduct.name || 'N/A'}`);
    console.log(`   description: ${currentProduct.description || 'フィールドが存在しません'}`);
    console.log(`   headline: ${currentProduct.headline || 'フィールドが存在しません'}`);
    console.log(`   product_highlights: ${currentProduct.product_highlights ? JSON.stringify(currentProduct.product_highlights) : 'フィールドが存在しません'}`);
    console.log('');

    // 2. 更新データの準備
    console.log('2. 更新データの準備...');
    const updateData = {
      description: 'Test description update via API',
      headline: 'Test headline update via API',
      product_highlights: [
        {
          content: '機能説明1のテキスト',
          highlightType: 'benefit',
          title: '機能1'
        },
        {
          content: '機能説明2のテキスト',
          highlightType: 'benefit',
          title: '機能2'
        },
        {
          content: '機能説明3のテキスト',
          highlightType: 'benefit',
          title: '機能3'
        },
        {
          content: '機能説明4のテキスト',
          highlightType: 'benefit',
          title: '機能4'
        },
        {
          content: '機能説明5のテキスト',
          highlightType: 'benefit',
          title: '機能5'
        }
      ]
    };
    
    console.log('   更新データ:');
    console.log(JSON.stringify(updateData, null, 2));
    console.log('');

    // 3. 実際の更新を試行
    console.log('3. プロダクト情報を更新中...');
    console.log('⚠️  注意: 実際にプロダクト情報を更新します！');
    console.log('');
    
    try {
      const updatedProduct = await updateProduct(PRODUCT_ID, updateData);
      console.log('   ✅ 更新成功！');
      console.log('');
      console.log('更新後のプロダクト情報（全フィールド）:');
      console.log(JSON.stringify(updatedProduct, null, 2));
      console.log('');
      console.log('更新後のプロダクト情報（特定フィールド）:');
      console.log(`   description: ${updatedProduct.description || 'フィールドが存在しません'}`);
      console.log(`   headline: ${updatedProduct.headline || 'フィールドが存在しません'}`);
      console.log(`   product_highlights: ${updatedProduct.product_highlights ? JSON.stringify(updatedProduct.product_highlights, null, 2) : 'フィールドが存在しません'}`);
      console.log('');
      
      // 4. 更新後の情報を再取得して確認
      console.log('4. 更新後の情報を再取得して確認...');
      const refreshedProduct = await getProduct(PRODUCT_ID);
      console.log(`   description: ${refreshedProduct.description || 'フィールドが存在しません'}`);
      console.log(`   headline: ${refreshedProduct.headline || 'フィールドが存在しません'}`);
      console.log(`   product_highlights件数: ${refreshedProduct.product_highlights?.length || 0}`);
      if (refreshedProduct.product_highlights && refreshedProduct.product_highlights.length > 0) {
        console.log('   product_highlights:');
        refreshedProduct.product_highlights.forEach((h, idx) => {
          console.log(`     [${idx + 1}] ${h.title || 'N/A'}: ${h.content || 'N/A'}`);
        });
      }
      
    } catch (updateError) {
      console.error('   ❌ 更新エラー:', updateError.message);
      console.error('   エラー詳細:', updateError.stack);
      console.log('');
      console.log('エラーの可能性:');
      console.log('  - APIキーの権限が不足している可能性');
      console.log('  - フィールド名が正しくない可能性');
      console.log('  - APIバージョンの違いによる可能性');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('テスト完了');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
