// scripts/test-lead-discovery.js
// リード発見システムのテストスクリプト

require('dotenv').config({ path: '.env' });

const { searchLeadsOnX, discoverLeadsFromTrends } = require('../services/lead-discovery/xLeadDiscovery');
const { enqueueLead, getQueueStats, getPerfectMatchCount } = require('../services/lead-discovery/priorityQueue');
const { detectKeywords, isPerfectMatch, calculateLeadScore } = require('../services/lead-discovery/keywordMonitor');

/**
 * X検索テスト
 */
async function testXSearch() {
  console.log('🔍 X検索テストを開始します...\n');
  
  try {
    // 英語キーワードで検索
    const query = '"lost" OR "stolen" OR "hack" -is:retweet lang:en';
    console.log(`検索クエリ: ${query}`);
    
    const leads = await searchLeadsOnX(query, 'en', 10);
    console.log(`\n✅ ${leads.length}件のリードを発見しました\n`);
    
    leads.forEach((lead, index) => {
      console.log(`--- リード #${index + 1} ---`);
      console.log(`ツイートID: ${lead.tweetId}`);
      console.log(`ユーザー名: ${lead.username || 'N/A'}`);
      console.log(`テキスト: ${lead.text.substring(0, 100)}...`);
      console.log(`キーワード: ${lead.keywords.join(', ')}`);
      console.log(`優先度: ${lead.priority}`);
      console.log(`スコア: ${lead.score.toFixed(2)}`);
      console.log(`ドンピシャ: ${lead.isPerfectMatch ? '✅' : '❌'}`);
      console.log('');
    });
    
    return leads;
  } catch (error) {
    console.error('❌ X検索テストエラー:', error.message);
    throw error;
  }
}

/**
 * Xトレンドテスト
 */
async function testXTrends() {
  console.log('📈 Xトレンドテストを開始します...\n');
  
  try {
    // 全世界のトレンドからリード発見
    const leads = await discoverLeadsFromTrends('en', 1); // 1 = 全世界
    console.log(`\n✅ ${leads.length}件のリードをトレンドから発見しました\n`);
    
    leads.slice(0, 5).forEach((lead, index) => {
      console.log(`--- トレンドリード #${index + 1} ---`);
      console.log(`ツイートID: ${lead.tweetId}`);
      console.log(`テキスト: ${lead.text.substring(0, 100)}...`);
      console.log(`キーワード: ${lead.keywords.join(', ')}`);
      console.log(`スコア: ${lead.score.toFixed(2)}`);
      console.log('');
    });
    
    return leads;
  } catch (error) {
    console.error('❌ Xトレンドテストエラー:', error.message);
    throw error;
  }
}

/**
 * キーワード検出テスト
 */
function testKeywordDetection() {
  console.log('🔑 キーワード検出テストを開始します...\n');
  
  const testTexts = [
    'I lost my BTC in a hack attack',
    'My wallet was stolen and I lost everything',
    'I\'m afraid to trade because I might lose money',
    'Bitcoin trading is risky but profitable',
    'Just bought some BTC, hope it goes up',
  ];
  
  testTexts.forEach((text, index) => {
    console.log(`--- テストテキスト #${index + 1} ---`);
    console.log(`テキスト: ${text}`);
    
    const detectionResult = detectKeywords(text, 'en');
    console.log(`マッチ: ${detectionResult.matched ? '✅' : '❌'}`);
    
    if (detectionResult.matched) {
      console.log(`キーワード: ${detectionResult.keywords.join(', ')}`);
      console.log(`優先度: ${detectionResult.priority}`);
      
      const score = calculateLeadScore(detectionResult, { engagementRate: 0.1 });
      const isPerfect = isPerfectMatch(detectionResult, { engagementRate: 0.1 });
      console.log(`スコア: ${score.toFixed(2)}`);
      console.log(`ドンピシャ: ${isPerfect ? '✅' : '❌'}`);
    }
    console.log('');
  });
}

/**
 * キューシステムテスト
 */
async function testQueueSystem() {
  console.log('📋 キューシステムテストを開始します...\n');
  
  try {
    // テストリードを作成
    const testLead = {
      userId: 'test_user_123',
      username: 'test_user',
      tweetId: 'test_tweet_123',
      lang: 'en',
      text: 'I lost my BTC in a hack attack',
      keywords: ['lost', 'BTC', 'hack'],
      priority: 'high',
      score: 0.85,
      isPerfectMatch: true,
      timestamp: new Date().toISOString(),
    };
    
    // キューに追加
    console.log('キューにリードを追加中...');
    await enqueueLead(testLead);
    console.log('✅ リードをキューに追加しました\n');
    
    // キュー統計を取得
    const stats = await getQueueStats();
    console.log('--- キュー統計 ---');
    console.log(`総数: ${stats.total}`);
    console.log(`ドンピシャ: ${stats.perfectMatch}`);
    console.log(`高優先度: ${stats.high}`);
    console.log(`中優先度: ${stats.medium}`);
    console.log(`低優先度: ${stats.low}`);
    console.log('');
    
    // ドンピシャリード数を取得
    const perfectMatchCount = await getPerfectMatchCount();
    console.log(`ドンピシャリード数: ${perfectMatchCount}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ キューシステムテストエラー:', error.message);
    throw error;
  }
}

/**
 * メインテスト実行
 */
async function runTests() {
  console.log('🚀 リード発見システムのテストを開始します\n');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // 1. キーワード検出テスト
    testKeywordDetection();
    console.log('='.repeat(60));
    console.log('');
    
    // 2. X検索テスト
    await testXSearch();
    console.log('='.repeat(60));
    console.log('');
    
    // 3. Xトレンドテスト
    await testXTrends();
    console.log('='.repeat(60));
    console.log('');
    
    // 4. キューシステムテスト
    await testQueueSystem();
    console.log('='.repeat(60));
    console.log('');
    
    console.log('✅ すべてのテストが完了しました');
  } catch (error) {
    console.error('\n❌ テストエラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testXSearch,
  testXTrends,
  testKeywordDetection,
  testQueueSystem,
};
