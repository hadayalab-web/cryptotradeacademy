// scripts/test-influencer-discovery.js
// インフルエンサー発掘機能のテスト

require('dotenv').config({ path: '.env.local' });

const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');

async function testInfluencerDiscovery() {
  console.log('='.repeat(80));
  console.log('🔍 インフルエンサー発掘機能のテスト');
  console.log('='.repeat(80));
  console.log('');

  // XAI_API_KEYの確認
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    console.error('❌ XAI_API_KEY環境変数が設定されていません');
    console.log('   環境変数にXAI_API_KEYを設定してください');
    process.exit(1);
  }
  console.log('✅ XAI_API_KEY設定済み');
  console.log(`   Key preview: ${xaiApiKey.substring(0, 10)}...`);
  console.log('');

  const languages = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];

  for (const lang of languages) {
    console.log(`📋 ${lang.toUpperCase()}言語のインフルエンサーを発掘中...`);
    console.log('');

    try {
      const influencers = await discoverInfluencersForQuoteRepost(lang, { maxResults: 3 });
      
      if (!influencers || influencers.length === 0) {
        console.log(`   ⚠️ ${lang}言語のインフルエンサーが見つかりませんでした`);
        console.log('');
        continue;
      }

      console.log(`   ✅ ${influencers.length}人のインフルエンサーが見つかりました`);
      console.log('');

      influencers.forEach((inf, idx) => {
        console.log(`   [${idx + 1}] @${inf.username || 'N/A'}`);
        console.log(`       Tweet ID: ${inf.tweetId || '❌ MISSING'}`);
        console.log(`       Tweet Text: ${(inf.tweetText || 'N/A').substring(0, 100)}...`);
        console.log(`       Engagement Rate: ${inf.engagementRate ? (inf.engagementRate * 100).toFixed(2) + '%' : 'N/A'}`);
        console.log(`       Follower Count: ${inf.followerCount || 'N/A'}`);
        console.log(`       Recent Impressions: ${inf.recentImpressions || 'N/A'}`);
        console.log('');
      });

      // tweetIdが必須なので、欠けているものをチェック
      const missingTweetId = influencers.filter(inf => !inf.tweetId);
      if (missingTweetId.length > 0) {
        console.log(`   ⚠️ ${missingTweetId.length}人のインフルエンサーにtweetIdがありません`);
        console.log('   → 引用リポストが実行できません');
        console.log('');
      }

    } catch (error) {
      console.error(`   ❌ ${lang}言語のインフルエンサー発掘に失敗しました`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.log('');
    }

    // レート制限対策（1秒待機）
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));
  console.log('');

  // 全言語で再実行してサマリーを取得
  const summary = {};
  for (const lang of languages) {
    try {
      const influencers = await discoverInfluencersForQuoteRepost(lang, { maxResults: 1 });
      summary[lang] = {
        success: true,
        count: influencers?.length || 0,
        hasTweetId: influencers?.every(inf => inf.tweetId) || false,
        influencers: influencers || [],
      };
    } catch (error) {
      summary[lang] = {
        success: false,
        error: error.message,
      };
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  let successCount = 0;
  let totalInfluencers = 0;
  let missingTweetIdCount = 0;

  for (const [lang, result] of Object.entries(summary)) {
    if (result.success) {
      successCount++;
      totalInfluencers += result.count;
      if (!result.hasTweetId) {
        missingTweetIdCount += result.count;
      }
      const status = result.hasTweetId ? '✅' : '⚠️';
      console.log(`${status} ${lang.toUpperCase()}: ${result.count}人 (tweetId: ${result.hasTweetId ? 'あり' : 'なし'})`);
    } else {
      console.log(`❌ ${lang.toUpperCase()}: エラー - ${result.error}`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log(`📈 統計:`);
  console.log(`   成功した言語: ${successCount}/${languages.length}`);
  console.log(`   発掘されたインフルエンサー総数: ${totalInfluencers}人`);
  console.log(`   tweetIdが欠けているインフルエンサー: ${missingTweetIdCount}人`);
  console.log('='.repeat(80));

  if (successCount === 0) {
    console.log('');
    console.error('❌ すべての言語でインフルエンサー発掘に失敗しました');
    console.log('   → Grok APIの設定を確認してください');
    process.exit(1);
  }

  if (missingTweetIdCount > 0) {
    console.log('');
    console.warn('⚠️ tweetIdが欠けているインフルエンサーがいます');
    console.log('   → 引用リポストが実行できません');
    console.log('   → Grok APIのプロンプトを改善する必要があります');
  }
}

// 実行
testInfluencerDiscovery().catch(error => {
  console.error('❌ テストエラー:', error.message);
  console.error(error.stack);
  process.exit(1);
});
