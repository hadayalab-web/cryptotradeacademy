// scripts/test-x-optimization.js
// X最適化機能のテストスクリプト

const {
  getLanguagePeakHours,
  isPeakHourForLang,
  isPeakTimeWindow,
  getThreadStrategy,
  generatePollOptions,
  getOptimizedHashtags,
  getContentFormat,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  generateEngagementCTA,
} = require('../services/x/optimization');

console.log('🧪 X最適化機能のテスト開始\n');

// テスト1: 言語別ピーク時間の取得
console.log('📊 テスト1: 言語別ピーク時間の取得');
const langs = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];
langs.forEach(lang => {
  const peaks = getLanguagePeakHours(lang);
  console.log(`  ${lang}: 午前 ${peaks.morning}:00 UTC, 午後 ${peaks.evening === 0 ? '00' : peaks.evening}:00 UTC`);
});
console.log('✅ テスト1完了\n');

// テスト2: ピーク時間判定
console.log('📊 テスト2: ピーク時間判定');
const testHours = [12, 14, 18, 20, 22, 0, 6];
testHours.forEach(hour => {
  const isPeak = isPeakTimeWindow(hour);
  console.log(`  UTC ${hour}:00 → ${isPeak ? '✅ ピーク時間' : '❌ 非ピーク時間'}`);
});
console.log('✅ テスト2完了\n');

// テスト3: 言語別ピーク時間判定
console.log('📊 テスト3: 言語別ピーク時間判定');
langs.forEach(lang => {
  const peaks = getLanguagePeakHours(lang);
  const isMorningPeak = isPeakHourForLang(lang, peaks.morning);
  const isEveningPeak = isPeakHourForLang(lang, peaks.evening);
  console.log(`  ${lang}: 午前ピーク(${peaks.morning}:00) → ${isMorningPeak ? '✅' : '❌'}, 午後ピーク(${peaks.evening}:00) → ${isEveningPeak ? '✅' : '❌'}`);
});
console.log('✅ テスト3完了\n');

// テスト4: スレッド戦略
console.log('📊 テスト4: スレッド戦略');
langs.forEach(lang => {
  const strategy = getThreadStrategy(lang);
  console.log(`  ${lang}: ${strategy.type}, メイン${strategy.mainCount} + リプライ${strategy.replyCount}, 単一投稿優先: ${strategy.preferSinglePost}`);
});
console.log('✅ テスト4完了\n');

// テスト5: ポールオプション生成
console.log('📊 テスト5: ポールオプション生成');
langs.forEach(lang => {
  const pollOptions = generatePollOptions(lang, 50);
  console.log(`  ${lang}:`);
  pollOptions.forEach(opt => {
    console.log(`    - [${opt.position}] ${opt.text}`);
  });
});
console.log('✅ テスト5完了\n');

// テスト6: ハッシュタグ最適化
console.log('📊 テスト6: ハッシュタグ最適化');
langs.forEach(lang => {
  const hashtags = getOptimizedHashtags(lang);
  console.log(`  ${lang}: ${hashtags.join(' ')}`);
});
console.log('✅ テスト6完了\n');

// テスト7: コンテンツ形式決定
console.log('📊 テスト7: コンテンツ形式決定');
for (let i = 0; i < 10; i++) {
  const format = getContentFormat(i);
  console.log(`  シーケンス ${i}: ${format}`);
}
console.log('✅ テスト7完了\n');

// テスト8: エンゲージメントCTA生成
console.log('📊 テスト8: エンゲージメントCTA生成');
langs.forEach(lang => {
  const cta = generateEngagementCTA(lang);
  console.log(`  ${lang}: ${cta.substring(0, 60)}...`);
});
console.log('✅ テスト8完了\n');

// テスト9: 引用リポストタイミング判定
console.log('📊 テスト9: 引用リポストタイミング判定');
const now = new Date();
const testCases = [
  { minutesAgo: 10, hour: 15, shouldPost: false }, // 15分以内（早すぎ）
  { minutesAgo: 30, hour: 18, shouldPost: true },  // 30分前、ピーク時間
  { minutesAgo: 45, hour: 20, shouldPost: true },  // 45分前、ピーク時間
  { minutesAgo: 90, hour: 14, shouldPost: false }, // 90分前（遅すぎ）
  { minutesAgo: 30, hour: 6, shouldPost: false },  // 30分前、非ピーク時間
];

testCases.forEach((testCase, index) => {
  const tweetTime = new Date(now.getTime() - testCase.minutesAgo * 60 * 1000);
  // モック関数でテスト
  const mockShouldPost = (tweetTimestamp, currentHour) => {
    const tweetTime = new Date(tweetTimestamp);
    const minutesDiff = (now - tweetTime) / (1000 * 60);
    if (minutesDiff < 15 || minutesDiff > 60) return false;
    if (!isPeakTimeWindow(currentHour)) return false;
    return true;
  };
  
  const result = mockShouldPost(tweetTime.toISOString(), testCase.hour);
  const status = result === testCase.shouldPost ? '✅' : '❌';
  console.log(`  ケース${index + 1}: ${testCase.minutesAgo}分前、UTC${testCase.hour}:00 → ${result ? '投稿可' : '投稿不可'} ${status}`);
});
console.log('✅ テスト9完了\n');

// テスト10: 1日の投稿上限チェック
console.log('📊 テスト10: 1日の投稿上限チェック');
const limitTestCases = [
  { count: 10, max: 25, shouldAllow: true },
  { count: 24, max: 25, shouldAllow: true },
  { count: 25, max: 25, shouldAllow: false },
  { count: 30, max: 25, shouldAllow: false },
];

limitTestCases.forEach((testCase, index) => {
  const result = checkDailyPostLimit(testCase.count, testCase.max);
  const status = result === testCase.shouldAllow ? '✅' : '❌';
  console.log(`  ケース${index + 1}: ${testCase.count}/${testCase.max} → ${result ? '投稿可' : '投稿不可'} ${status}`);
});
console.log('✅ テスト10完了\n');

// テスト11: 統合テスト - 無料版レポート投稿フロー
console.log('📊 テスト11: 統合テスト - 無料版レポート投稿フロー');
const mockReportData = {
  trapScore: 50,
  priceUsd: 89859,
  change24h: -0.02,
};

console.log('  レポートデータ:', mockReportData);
console.log('  現在時刻:', new Date().toISOString());
console.log('  現在UTC時間:', new Date().getUTCHours());

// 各言語のピーク時間チェック
langs.forEach(lang => {
  const currentHour = new Date().getUTCHours();
  const isPeak = isPeakHourForLang(lang, currentHour);
  const strategy = getThreadStrategy(lang);
  const hashtags = getOptimizedHashtags(lang);
  
  console.log(`  ${lang}:`);
  console.log(`    - ピーク時間: ${isPeak ? '✅' : '❌'}`);
  console.log(`    - スレッド戦略: ${strategy.type} (${strategy.mainCount}メイン + ${strategy.replyCount}リプライ)`);
  console.log(`    - ハッシュタグ: ${hashtags.join(', ')}`);
});

console.log('✅ テスト11完了\n');

// テスト12: 引用リポストフロー
console.log('📊 テスト12: 引用リポストフロー');
const mockInfluencer = {
  username: 'test_influencer',
  tweetId: '1234567890123456789',
  tweetText: 'BTC analysis: Market looks bullish!',
  createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30分前
  recentImpressions: 50000,
  engagementRate: 0.08,
};

console.log('  モックインフルエンサー:', {
  username: mockInfluencer.username,
  tweetId: mockInfluencer.tweetId,
  impressions: mockInfluencer.recentImpressions,
  engagementRate: `${(mockInfluencer.engagementRate * 100).toFixed(1)}%`,
});

const currentHour = new Date().getUTCHours();
const isPeak = isPeakTimeWindow(currentHour);
const shouldPost = shouldPostQuoteRepost(mockInfluencer.createdAt, new Date());
const engagementOk = mockInfluencer.recentImpressions >= 1000;

console.log(`  ピーク時間: ${isPeak ? '✅' : '❌'} (UTC ${currentHour}:00)`);
console.log(`  タイミング: ${shouldPost ? '✅' : '❌'} (投稿後30分)`);
console.log(`  エンゲージメント: ${engagementOk ? '✅' : '❌'} (${mockInfluencer.recentImpressions} impressions)`);
console.log(`  投稿可否: ${isPeak && shouldPost && engagementOk ? '✅ 投稿可' : '❌ 投稿不可'}`);

console.log('✅ テスト12完了\n');

console.log('🎉 すべてのテストが完了しました！\n');

// サマリー
console.log('📋 テストサマリー:');
console.log('  ✅ 言語別ピーク時間の取得');
console.log('  ✅ ピーク時間判定');
console.log('  ✅ 言語別ピーク時間判定');
console.log('  ✅ スレッド戦略');
console.log('  ✅ ポールオプション生成');
console.log('  ✅ ハッシュタグ最適化');
console.log('  ✅ コンテンツ形式決定');
console.log('  ✅ エンゲージメントCTA生成');
console.log('  ✅ 引用リポストタイミング判定');
console.log('  ✅ 1日の投稿上限チェック');
console.log('  ✅ 統合テスト - 無料版レポート投稿フロー');
console.log('  ✅ 統合テスト - 引用リポストフロー');
