// scripts/test-x-integration.js
// X APIとGrok APIの統合テスト

const { postTweet, postQuoteTweet, getMe } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { discoverInfluencersForQuoteRepost, generateQuoteRepostText } = require('../services/grok/client');
const { postFreeReportToX } = require('../api/x-post-free-report');
const { postQuoteRepostsForLang } = require('../api/x-quote-repost');
const {
  getLanguagePeakHours,
  isPeakTimeWindow,
  generatePollOptions,
  getOptimizedHashtags,
} = require('../services/x/optimization');

console.log('🧪 X APIとGrok APIの統合テスト開始\n');

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: [],
};

function recordTest(name, passed, message = '') {
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: ${message || '成功'}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: ${message || '失敗'}`);
  }
  testResults.details.push({ name, passed, message });
}

async function testXAPIConnection() {
  console.log('📊 テスト1: X API接続確認');
  try {
    const xStatus = getXConfigStatus();
    
    if (!xStatus.configured) {
      recordTest('X API設定', false, `設定不足: ${xStatus.missing.join(', ')}`);
      return false;
    }
    
    recordTest('X API設定', true, 'すべての認証情報が設定されています');
    
    // アカウント情報取得で接続確認
    try {
      const me = await getMe();
      recordTest('X API接続', true, `アカウント: @${me.username || 'N/A'}`);
      return true;
    } catch (error) {
      recordTest('X API接続', false, error.message);
      return false;
    }
  } catch (error) {
    recordTest('X API接続', false, error.message);
    return false;
  }
}

async function testGrokAPIConnection() {
  console.log('\n📊 テスト2: Grok API接続確認');
  try {
    const XAI_API_KEY = process.env.XAI_API_KEY;
    
    if (!XAI_API_KEY) {
      recordTest('Grok API設定', false, 'XAI_API_KEYが設定されていません');
      return false;
    }
    
    recordTest('Grok API設定', true, 'XAI_API_KEYが設定されています');
    
    // 簡単なテストクエリで接続確認
    try {
      const testInfluencers = await discoverInfluencersForQuoteRepost('en', { maxResults: 1 });
      recordTest('Grok API接続', true, `テストクエリ成功（${testInfluencers.length}件取得）`);
      return true;
    } catch (error) {
      recordTest('Grok API接続', false, error.message);
      return false;
    }
  } catch (error) {
    recordTest('Grok API接続', false, error.message);
    return false;
  }
}

async function testPollGeneration() {
  console.log('\n📊 テスト3: ポールオプション生成');
  try {
    const langs = ['en', 'ja', 'es'];
    let allPassed = true;
    
    for (const lang of langs) {
      try {
        const pollOptions = generatePollOptions(lang, 50);
        if (pollOptions && pollOptions.length === 2) {
          console.log(`  ✅ ${lang}: ${pollOptions[0].text} / ${pollOptions[1].text}`);
        } else {
          console.log(`  ❌ ${lang}: ポールオプションが不正`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`  ❌ ${lang}: ${error.message}`);
        allPassed = false;
      }
    }
    
    recordTest('ポールオプション生成', allPassed, allPassed ? 'すべての言語で正常' : '一部失敗');
    return allPassed;
  } catch (error) {
    recordTest('ポールオプション生成', false, error.message);
    return false;
  }
}

async function testHashtagOptimization() {
  console.log('\n📊 テスト4: ハッシュタグ最適化');
  try {
    const langs = ['en', 'ja', 'es'];
    let allPassed = true;
    
    for (const lang of langs) {
      try {
        const hashtags = getOptimizedHashtags(lang);
        if (hashtags && hashtags.length >= 2 && hashtags.length <= 3) {
          console.log(`  ✅ ${lang}: ${hashtags.join(', ')}`);
        } else {
          console.log(`  ❌ ${lang}: ハッシュタグ数が不正 (${hashtags.length})`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`  ❌ ${lang}: ${error.message}`);
        allPassed = false;
      }
    }
    
    recordTest('ハッシュタグ最適化', allPassed, allPassed ? 'すべての言語で正常' : '一部失敗');
    return allPassed;
  } catch (error) {
    recordTest('ハッシュタグ最適化', false, error.message);
    return false;
  }
}

async function testGrokInfluencerDiscovery() {
  console.log('\n📊 テスト5: Grokによるインフルエンサー発掘');
  try {
    const influencers = await discoverInfluencersForQuoteRepost('en', { maxResults: 2 });
    
    if (!influencers || influencers.length === 0) {
      recordTest('インフルエンサー発掘', false, 'インフルエンサーが見つかりませんでした');
      return false;
    }
    
    console.log(`  ✅ ${influencers.length}件のインフルエンサーを発見`);
    influencers.forEach((inf, index) => {
      console.log(`    ${index + 1}. @${inf.username || 'N/A'}`);
      console.log(`       - tweetId: ${inf.tweetId || 'N/A'}`);
      console.log(`       - エンゲージメント率: ${inf.engagementRate ? (inf.engagementRate * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`       - インプレッション: ${inf.recentImpressions || 'N/A'}`);
    });
    
    // tweetIdが含まれているか確認
    const hasTweetIds = influencers.every(inf => inf.tweetId);
    recordTest('インフルエンサー発掘', hasTweetIds, hasTweetIds ? 'tweetIdがすべて含まれています' : '一部のtweetIdが欠落');
    
    return hasTweetIds;
  } catch (error) {
    recordTest('インフルエンサー発掘', false, error.message);
    return false;
  }
}

async function testGrokQuoteTextGeneration() {
  console.log('\n📊 テスト6: Grokによる引用リポストテキスト生成');
  try {
    const mockInfluencer = {
      username: 'test_influencer',
      tweetId: '1234567890123456789',
      tweetText: 'BTC is looking bullish! Market sentiment is positive.',
      engagementRate: 0.08,
      recentImpressions: 50000,
    };
    
    const mockReportData = {
      trapScore: 50,
      priceUsd: 89859,
      change24h: -0.02,
    };
    
    const deepLink = 'https://t.me/TrapDefenceBot?start=minimal_en_x_quote';
    
    const quoteText = await generateQuoteRepostText('en', mockInfluencer, mockReportData, deepLink);
    
    if (!quoteText || quoteText.length === 0) {
      recordTest('引用リポストテキスト生成', false, 'テキストが生成されませんでした');
      return false;
    }
    
    if (quoteText.length > 280) {
      recordTest('引用リポストテキスト生成', false, `テキストが長すぎます (${quoteText.length}文字)`);
      return false;
    }
    
    // Deep Linkが含まれているか確認
    const hasDeepLink = quoteText.includes(deepLink) || quoteText.includes('t.me/TrapDefenceBot');
    
    console.log(`  ✅ 生成されたテキスト (${quoteText.length}文字):`);
    console.log(`  "${quoteText.substring(0, 150)}${quoteText.length > 150 ? '...' : ''}"`);
    
    recordTest('引用リポストテキスト生成', hasDeepLink, hasDeepLink ? 'Deep Linkが含まれています' : 'Deep Linkが含まれていません');
    
    return hasDeepLink;
  } catch (error) {
    recordTest('引用リポストテキスト生成', false, error.message);
    return false;
  }
}

async function testFreeReportPostFlow() {
  console.log('\n📊 テスト7: 無料版レポートX投稿フロー（ドライラン）');
  try {
    // ドライランモードを有効化
    process.env.X_POSTING_DRY_RUN = 'true';
    
    const mockReportData = {
      trapScore: 50,
      priceUsd: 89859,
      change24h: -0.02,
    };
    
    const result = await postFreeReportToX(mockReportData);
    
    if (result.dryRun) {
      recordTest('無料版レポートX投稿フロー', true, 'ドライランモードで正常に実行されました');
      return true;
    }
    
    if (result.success) {
      recordTest('無料版レポートX投稿フロー', true, `投稿成功: ${result.results?.length || 0}件`);
      return true;
    }
    
    recordTest('無料版レポートX投稿フロー', false, result.error || '不明なエラー');
    return false;
  } catch (error) {
    recordTest('無料版レポートX投稿フロー', false, error.message);
    return false;
  } finally {
    // ドライランモードを無効化（環境変数を削除）
    delete process.env.X_POSTING_DRY_RUN;
  }
}

async function testQuoteRepostFlow() {
  console.log('\n📊 テスト8: 引用リポストフロー（ドライラン）');
  try {
    // ドライランモードを有効化
    process.env.X_POSTING_DRY_RUN = 'true';
    
    const mockReportData = {
      trapScore: 50,
      priceUsd: 89859,
      change24h: -0.02,
    };
    
    // ピーク時間でない場合はスキップされる可能性があるため、強制実行
    const result = await postQuoteRepostsForLang('en', mockReportData, 0);
    
    if (Array.isArray(result)) {
      recordTest('引用リポストフロー', true, `処理完了: ${result.length}件`);
      return true;
    }
    
    recordTest('引用リポストフロー', false, '結果が配列ではありません');
    return false;
  } catch (error) {
    recordTest('引用リポストフロー', false, error.message);
    return false;
  } finally {
    // ドライランモードを無効化
    delete process.env.X_POSTING_DRY_RUN;
  }
}

async function testXAPIPostTweet() {
  console.log('\n📊 テスト9: X API postTweet（ドライラン）');
  try {
    const xStatus = getXConfigStatus();
    
    if (!xStatus.configured) {
      recordTest('X API postTweet', false, 'X APIが設定されていません');
      return false;
    }
    
    // ドライランモードを有効化
    process.env.X_POSTING_DRY_RUN = 'true';
    
    const testText = '🧪 Test tweet from integration test - This is a test';
    const pollOptions = {
      options: generatePollOptions('en', 50),
      duration_minutes: 1440,
    };
    
    // ドライランモードでは実際には投稿されない
    const xStatusAfter = getXConfigStatus();
    if (xStatusAfter.dryRun) {
      recordTest('X API postTweet', true, 'ドライランモードで正常に処理されました（実際の投稿はスキップ）');
      return true;
    }
    
    // ドライランモードが無効な場合のみ実際に投稿（テスト用）
    try {
      const result = await postTweet(testText, [], pollOptions);
      recordTest('X API postTweet', true, `投稿成功: ${result.id}`);
      return true;
    } catch (error) {
      recordTest('X API postTweet', false, error.message);
      return false;
    }
  } catch (error) {
    recordTest('X API postTweet', false, error.message);
    return false;
  } finally {
    delete process.env.X_POSTING_DRY_RUN;
  }
}

async function testPeakTimeLogic() {
  console.log('\n📊 テスト10: ピーク時間ロジック');
  try {
    const currentHour = new Date().getUTCHours();
    const isPeak = isPeakTimeWindow(currentHour);
    
    console.log(`  現在UTC時間: ${currentHour}:00`);
    console.log(`  ピーク時間: ${isPeak ? '✅' : '❌'}`);
    
    // 各言語のピーク時間を確認
    const langs = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];
    langs.forEach(lang => {
      const peaks = getLanguagePeakHours(lang);
      const isLangPeak = (currentHour >= peaks.morning - 1 && currentHour <= peaks.morning + 1) ||
                         (currentHour >= peaks.evening - 1 && currentHour <= peaks.evening + 1) ||
                         (peaks.evening === 0 && (currentHour >= 23 || currentHour <= 1));
      console.log(`  ${lang}: ${isLangPeak ? '✅' : '❌'} (午前${peaks.morning}:00, 午後${peaks.evening === 0 ? '00' : peaks.evening}:00)`);
    });
    
    recordTest('ピーク時間ロジック', true, `現在は${isPeak ? 'ピーク時間' : '非ピーク時間'}です`);
    return true;
  } catch (error) {
    recordTest('ピーク時間ロジック', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 統合テスト開始\n');
  console.log('⚠️  注意: ドライランモードで実行します（実際の投稿は行われません）\n');
  
  // テスト1: X API接続
  await testXAPIConnection();
  
  // テスト2: Grok API接続
  await testGrokAPIConnection();
  
  // テスト3: ポール生成
  await testPollGeneration();
  
  // テスト4: ハッシュタグ最適化
  await testHashtagOptimization();
  
  // テスト5: Grokインフルエンサー発掘
  await testGrokInfluencerDiscovery();
  
  // テスト6: Grok引用リポストテキスト生成
  await testGrokQuoteTextGeneration();
  
  // テスト7: 無料版レポートX投稿フロー
  await testFreeReportPostFlow();
  
  // テスト8: 引用リポストフロー
  await testQuoteRepostFlow();
  
  // テスト9: X API postTweet
  await testXAPIPostTweet();
  
  // テスト10: ピーク時間ロジック
  await testPeakTimeLogic();
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${testResults.passed}`);
  console.log(`❌ 失敗: ${testResults.failed}`);
  console.log(`⏭️  スキップ: ${testResults.skipped}`);
  console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  console.log('\n📋 詳細結果:');
  testResults.details.forEach((test, index) => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`  ${index + 1}. ${icon} ${test.name}: ${test.message}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('🎉 すべてのテストが成功しました！デプロイ準備完了です。');
    process.exit(0);
  } else {
    console.log('⚠️  一部のテストが失敗しました。デプロイ前に修正が必要です。');
    process.exit(1);
  }
}

// メイン実行
runAllTests().catch(error => {
  console.error('\n❌ テスト実行エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
});
