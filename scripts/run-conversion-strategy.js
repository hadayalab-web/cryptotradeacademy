// scripts/run-conversion-strategy.js
// フリーミアム転換戦略を実行するスクリプト

const { executeConversionStrategy } = require('../services/freemium/conversion');

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 フリーミアム転換戦略実行スクリプト\n');
  console.log('='.repeat(80));

  // テスト用のユーザーデータ
  const testUserData = {
    email: 'test@example.com',
    signupDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8日前
    loginCount: 12,
    articleViews: 25,
    hasSeenUpgradePrompt: false,
    attemptedFeature: null,
    isPaid: false,
  };

  // テスト用の市場データ
  const testMarketData = {
    price: 88600,
    change24h: -0.81,
    trapScore: 8,
    exchangeNetflow: -40.9,
    mpi: -1.55,
  };

  try {
    const result = await executeConversionStrategy(
      testUserData.email,
      testUserData,
      testMarketData
    );

    console.log('\n📊 転換戦略実行結果:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    if (result.sent) {
      console.log('✅ ナッジ通知を送信しました');
      console.log(`   トリガー: ${result.trigger}`);
      console.log(`   転換確率: ${result.probability}%`);
    } else {
      console.log('ℹ️ ナッジ通知は送信されませんでした');
      console.log(`   理由: ${result.reason}`);
      console.log(`   転換確率: ${result.probability}%`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { main };
