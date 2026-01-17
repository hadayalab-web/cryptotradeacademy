// scripts/test-whop-product-api.js
// Whop API v2のプロダクトエンドポイントをテスト
// プロダクト説明文・機能フィールドの調査用

require('dotenv').config();
const { getProduct, updateProduct, listProducts } = require('../services/whop/client');

// テスト対象のプロダクトID（EN版）
const PRODUCT_ID = process.env.WHOP_PRODUCT_ID_EN || 'prod_6RjqaJMGyEw1F';

// 関数は services/whop/client.js からインポート済み

/**
 * メイン実行関数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Whop API v2 プロダクトエンドポイントテスト');
  console.log('='.repeat(80));
  console.log(`Product ID: ${PRODUCT_ID}`);
  console.log('');

  try {
    // 1. プロダクト情報を取得（expandなし）
    console.log('1. プロダクト情報を取得（基本）');
    console.log('-'.repeat(80));
    const productBasic = await getProduct(PRODUCT_ID);
    console.log('取得したフィールド:');
    console.log(JSON.stringify(Object.keys(productBasic), null, 2));
    console.log('');
    
    // 説明文関連のフィールドを確認
    const descriptionFields = [
      'description',
      'headline',
      'title',
      'name',
      'features',
      'highlights',
      'product_highlights',  // 機能説明5項目に相当する可能性
      'benefits',
      'custom_fields',
      'metadata',
    ];
    
    console.log('説明文・機能関連フィールドの確認:');
    descriptionFields.forEach(field => {
      if (productBasic[field] !== undefined) {
        const value = productBasic[field];
        if (Array.isArray(value)) {
          console.log(`  ✓ ${field}: 配列 (${value.length}件)`);
          if (value.length > 0 && typeof value[0] === 'object') {
            console.log(`    最初の要素のフィールド: ${Object.keys(value[0]).join(', ')}`);
            console.log(`    最初の要素: ${JSON.stringify(value[0], null, 6)}`);
          }
        } else if (typeof value === 'string') {
          console.log(`  ✓ ${field}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        } else {
          console.log(`  ✓ ${field}: ${JSON.stringify(value).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}`);
        }
      } else {
        console.log(`  ✗ ${field}: フィールドが存在しません`);
      }
    });
    console.log('');
    
    // product_highlightsの詳細確認
    if (productBasic.product_highlights) {
      console.log('product_highlights の詳細:');
      console.log(`  件数: ${productBasic.product_highlights.length}`);
      productBasic.product_highlights.forEach((highlight, idx) => {
        console.log(`  [${idx + 1}]`);
        console.log(`    Type: ${highlight.highlightType || 'N/A'}`);
        console.log(`    Title: ${highlight.title || 'N/A'}`);
        console.log(`    Content: ${highlight.content ? highlight.content.substring(0, 80) + '...' : 'N/A'}`);
      });
      console.log('');
    }

    // 2. プロダクト情報を取得（expand付き）
    console.log('2. プロダクト情報を取得（experiences, plansをexpand）');
    console.log('-'.repeat(80));
    console.log(`[Test] GET /products/${PRODUCT_ID}?expand[]=experiences&expand[]=plans`);
    const productExpanded = await getProduct(PRODUCT_ID, ['experiences', 'plans']);
    
    if (productExpanded.experiences && productExpanded.experiences.length > 0) {
      console.log(`Experiences (${productExpanded.experiences.length}件):`);
      productExpanded.experiences.forEach((exp, idx) => {
        console.log(`  [${idx + 1}] ${exp.name || exp.id}`);
        console.log(`      Description: ${exp.description || 'N/A'}`);
        console.log(`      Fields: ${Object.keys(exp).join(', ')}`);
      });
      console.log('');
    }
    
    if (productExpanded.plans && productExpanded.plans.length > 0) {
      console.log(`Plans (${productExpanded.plans.length}件):`);
      productExpanded.plans.forEach((plan, idx) => {
        console.log(`  [${idx + 1}] ${plan.id}`);
        console.log(`      Payment Link Description: ${plan.payment_link_description || 'N/A'}`);
        console.log(`      Fields: ${Object.keys(plan).join(', ')}`);
      });
      console.log('');
    }

    // 3. プロダクトの全フィールド構造を表示
    console.log('3. プロダクトの全フィールド構造');
    console.log('-'.repeat(80));
    console.log(JSON.stringify(productBasic, null, 2));
    console.log('');

    // 4. プロダクト更新のテスト（読み取り専用で実行、実際の更新はコメントアウト）
    console.log('4. プロダクト更新エンドポイントのテスト（dry-run）');
    console.log('-'.repeat(80));
    console.log('注意: 実際の更新は実行しません（dry-runモード）');
    console.log('');
    
    // 更新可能なフィールドの例を表示（product_highlightsを含む）
    const updateFields = {
      description: 'Test description update',
      headline: 'Test headline update',
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
    
    console.log('更新可能なフィールドの例（product_highlights含む）:');
    console.log(JSON.stringify(updateFields, null, 2));
    console.log('');
    console.log('実際に更新する場合は、以下のコードのコメントを外してください:');
    console.log('// const updated = await updateProduct(PRODUCT_ID, updateFields);');
    console.log('');

    // 5. プロダクトリストを取得（比較用）
    console.log('5. プロダクトリストを取得（比較用）');
    console.log('-'.repeat(80));
    const products = await listProducts({ visibility: 'visible' });
    console.log(`取得したプロダクト数: ${products.length}`);
    if (products.length > 0) {
      console.log('最初のプロダクトのフィールド:');
      console.log(JSON.stringify(Object.keys(products[0]), null, 2));
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

// 関数は services/whop/client.js からエクスポート済み
