// scripts/update-whop-product-highlights.js
// Whopプロダクトの機能説明5項目（product_highlights）を更新するスクリプト

require('dotenv').config();
const { getProduct, updateProduct } = require('../services/whop/client');

// プロダクトID（環境変数から取得、またはデフォルト値）
const PRODUCT_ID = process.env.WHOP_PRODUCT_ID_EN || 'prod_6RjqaJMGyEw1F';

/**
 * 機能説明5項目のテンプレート（EN版）
 * 他の言語版は適宜変更してください
 */
const DEFAULT_HIGHLIGHTS = [
  {
    content: 'Real-time BTC trap detection using AI-powered analysis',
    highlightType: 'benefit',
    title: 'AI Trap Detection'
  },
  {
    content: 'Whale movement tracking and exit liquidity alerts',
    highlightType: 'benefit',
    title: 'Whale Tracking'
  },
  {
    content: 'Advanced metrics and deep analysis tools',
    highlightType: 'benefit',
    title: 'Deep Metrics'
  },
  {
    content: 'Community access and voting rights',
    highlightType: 'benefit',
    title: 'Community Access'
  },
  {
    content: 'Partner Hub invitation and affiliate opportunities',
    highlightType: 'benefit',
    title: 'Partner Hub'
  }
];

/**
 * メイン実行関数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Whopプロダクト機能説明5項目更新スクリプト');
  console.log('='.repeat(80));
  console.log(`Product ID: ${PRODUCT_ID}`);
  console.log('');

  try {
    // 1. 現在のプロダクト情報を取得
    console.log('1. 現在のプロダクト情報を取得中...');
    const currentProduct = await getProduct(PRODUCT_ID);
    console.log(`   プロダクト名: ${currentProduct.title || currentProduct.name || 'N/A'}`);
    console.log(`   現在のproduct_highlights件数: ${currentProduct.product_highlights?.length || 0}`);
    
    if (currentProduct.product_highlights && currentProduct.product_highlights.length > 0) {
      console.log('   現在の機能説明:');
      currentProduct.product_highlights.forEach((h, idx) => {
        console.log(`     [${idx + 1}] ${h.title || 'N/A'}: ${h.content?.substring(0, 50) || 'N/A'}...`);
      });
    }
    console.log('');

    // 2. 更新データの準備
    console.log('2. 更新データの準備...');
    const updateData = {
      product_highlights: DEFAULT_HIGHLIGHTS
    };
    
    console.log('   更新する機能説明:');
    DEFAULT_HIGHLIGHTS.forEach((h, idx) => {
      console.log(`     [${idx + 1}] ${h.title}: ${h.content}`);
    });
    console.log('');

    // 3. 確認プロンプト（実際の更新前に確認）
    console.log('3. 更新の確認');
    console.log('-'.repeat(80));
    console.log('⚠️  注意: このスクリプトは実際にプロダクト情報を更新します！');
    console.log('');
    console.log('更新を実行するには、以下のコードのコメントを外してください:');
    console.log('// await updateProduct(PRODUCT_ID, updateData);');
    console.log('');

    // 実際の更新を実行する場合は、以下のコメントを外してください
    // console.log('4. プロダクト情報を更新中...');
    // const updatedProduct = await updateProduct(PRODUCT_ID, updateData);
    // console.log('   ✅ 更新完了！');
    // console.log('');
    // console.log('更新後のproduct_highlights:');
    // if (updatedProduct.product_highlights) {
    //   updatedProduct.product_highlights.forEach((h, idx) => {
    //     console.log(`     [${idx + 1}] ${h.title || 'N/A'}: ${h.content?.substring(0, 50) || 'N/A'}...`);
    //   });
    // }

    console.log('='.repeat(80));
    console.log('スクリプト完了（dry-runモード）');
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

module.exports = {
  DEFAULT_HIGHLIGHTS,
  updateProductHighlights: async (productId, highlights = DEFAULT_HIGHLIGHTS) => {
    return await updateProduct(productId, { product_highlights: highlights });
  }
};
