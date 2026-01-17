// scripts/test-x-post.js
// X API投稿テストスクリプト

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { postTweet } = require('../services/x/client');

async function testXPost() {
  console.log('🧪 X API投稿テストを開始します...\n');

  // OAuth 1.0a User Context認証の確認
  const consumerKey = process.env.X_API_CONSUMER_KEY;
  const consumerSecret = process.env.X_API_CONSUMER_KEY_SECRET;
  const accessToken = process.env.X_API_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_API_ACCESS_TOKEN_SECRET;
  
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    console.error('❌ OAuth 1.0a認証情報が不足しています');
    console.log('⚠️  .envファイルに以下を設定してください:');
    console.log('   - X_API_CONSUMER_KEY');
    console.log('   - X_API_CONSUMER_KEY_SECRET');
    console.log('   - X_API_ACCESS_TOKEN');
    console.log('   - X_API_ACCESS_TOKEN_SECRET\n');
    process.exit(1);
  }
  console.log('✅ OAuth 1.0a認証情報検出完了\n');

  // 2. テストツイートの投稿
  try {
    console.log('2️⃣ テストツイートを投稿中...');
    const testMessage = `🧪 X API統合テスト

Trap Defence BTCのX投稿機能をテスト中です。

#Bitcoin #CryptoTrading #TrapDefence

${new Date().toISOString()}`;

    const result = await postTweet(testMessage);
    console.log('✅ ツイート投稿成功:');
    console.log(`   - Tweet ID: ${result.id}`);
    console.log(`   - Text: ${result.text}\n`);
    console.log(`🔗 https://twitter.com/i/web/status/${result.id}\n`);
  } catch (error) {
    console.error('❌ ツイート投稿失敗:', error.message);
    process.exit(1);
  }

  // 3. VSL1メッセージのテスト投稿（オプション）
  const testVSL1 = process.argv.includes('--vsl1');
  if (testVSL1) {
    try {
      console.log('3️⃣ VSL1メッセージのテスト投稿中...');
      const vsl1Message = `🎬 Watch This: Two traders started with the same capital...

https://youtu.be/OqvqngJOiXc

Three months later:
• Trader A: Lost months of profits in 1 week
• Trader B: Secured $5K profit, relaxed

The difference? Trader B used Trap Defence BTC.

⚠️ Before you lose your capital, watch this 4-minute video (VSL1).

🚀 Get the trap avoidance logic that pros use (FREE):
→ https://t.me/TrapDefenceBot?start=minimal

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals`;

      const result = await postTweet(vsl1Message);
      console.log('✅ VSL1ツイート投稿成功:');
      console.log(`   - Tweet ID: ${result.id}`);
      console.log(`🔗 https://twitter.com/i/web/status/${result.id}\n`);
    } catch (error) {
      console.error('❌ VSL1ツイート投稿失敗:', error.message);
      process.exit(1);
    }
  }

  console.log('✅ すべてのテストが完了しました！');
}

// 実行
testXPost().catch(error => {
  console.error('❌ テスト実行エラー:', error);
  process.exit(1);
});
