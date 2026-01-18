// scripts/track-traffic-sources.js
// トラフィックソースの追跡と分析

require('dotenv').config();
const { listMemberships, listPromoCodes, getProduct } = require('../services/whop/client');

const PRODUCT_IDS = [
  'prod_6RjqaJMGyEw1F', // EN
  'prod_756mUZhSfLAkL', // JA
  'prod_HouQTKTN1F7vD', // KO
  'prod_Eg1V8et0WTg69', // ES
  'prod_l4ipnvNhwFpdQ', // AR
  'prod_Cpz4oQla16GUB', // PT-BR
];

/**
 * トラフィックソースを分析
 */
async function analyzeTrafficSources(productId, days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

    // メンバーシップデータを取得
    const memberships = await listMemberships({
      product_id: productId,
      status: 'active',
    });

    // プロモコード使用状況を取得
    const promoCodes = await listPromoCodes({
      product_id: productId,
    });

    // 最近のメンバーシップをフィルタリング
    const recentMemberships = memberships.filter(m => {
      const createdAt = m.created_at || m.started_at || 0;
      return createdAt >= cutoffTimestamp;
    });

    // トラフィックソース分析
    const sources = {
      direct: 0,
      promo: 0,
      affiliate: 0,
      unknown: 0,
    };

    recentMemberships.forEach(m => {
      // プロモコード使用の確認
      if (m.promo_code_id) {
        sources.promo++;
      } else {
        sources.direct++;
      }
    });

    // プロモコード別の使用状況
    const promoUsage = {};
    promoCodes.forEach(pc => {
      promoUsage[pc.code] = {
        uses: pc.uses || 0,
        stock: pc.stock || 0,
        unlimited_stock: pc.unlimited_stock || false,
      };
    });

    return {
      productId,
      period: `${days}日間`,
      totalMemberships: recentMemberships.length,
      sources,
      promoUsage,
    };
  } catch (error) {
    console.error(`[Traffic Analysis] Error for product ${productId}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('Whopトラフィックソース分析');
  console.log('='.repeat(80));
  console.log('');

  try {
    const results = [];

    for (const productId of PRODUCT_IDS) {
      const product = await getProduct(productId);
      const title = product.title || product.name || productId;
      
      console.log(`📦 ${title}`);
      console.log(`   ID: ${productId}`);
      
      const analysis = await analyzeTrafficSources(productId, 30);
      results.push({ title, ...analysis });

      console.log(`   期間: ${analysis.period}`);
      console.log(`   総メンバーシップ数: ${analysis.totalMemberships}`);
      console.log(`   トラフィックソース:`);
      console.log(`     直接: ${analysis.sources.direct}`);
      console.log(`     プロモコード: ${analysis.sources.promo}`);
      console.log(`     アフィリエイト: ${analysis.sources.affiliate}`);
      console.log('');

      if (Object.keys(analysis.promoUsage).length > 0) {
        console.log(`   プロモコード使用状況:`);
        Object.entries(analysis.promoUsage).forEach(([code, usage]) => {
          console.log(`     ${code}: ${usage.uses}回使用`);
        });
        console.log('');
      }
    }

    console.log('='.repeat(80));
    console.log('📊 総合分析:');
    console.log('');

    const totalMemberships = results.reduce((sum, r) => sum + r.totalMemberships, 0);
    const totalDirect = results.reduce((sum, r) => sum + r.sources.direct, 0);
    const totalPromo = results.reduce((sum, r) => sum + r.sources.promo, 0);

    console.log(`   総メンバーシップ数: ${totalMemberships}`);
    console.log(`   直接トラフィック: ${totalDirect} (${totalMemberships > 0 ? Math.round(totalDirect / totalMemberships * 100) : 0}%)`);
    console.log(`   プロモコード経由: ${totalPromo} (${totalMemberships > 0 ? Math.round(totalPromo / totalMemberships * 100) : 0}%)`);
    console.log('');

    console.log('='.repeat(80));
    console.log('💡 トラフィック検証の推奨事項:');
    console.log('');
    console.log('1. UTMパラメータを活用:');
    console.log('   - トラッキングリンクにUTMパラメータを追加');
    console.log('   - 例: ?utm_source=facebook&utm_medium=ad&utm_campaign=vs1');
    console.log('');
    console.log('2. プロモコード別のトラッキング:');
    console.log('   - 各キャンペーンに固有のプロモコードを割り当て');
    console.log('   - プロモコード使用状況を追跡');
    console.log('');
    console.log('3. 外部アナリティクス統合:');
    console.log('   - Google Analyticsでトラフィックソースを確認');
    console.log('   - Meta Pixelで広告トラッキング');
    console.log('   - 各プラットフォームのデータを比較');
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

module.exports = { main, analyzeTrafficSources };
