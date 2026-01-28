// scripts/calculate-telegram-roi.js
// Telegram投稿戦略のROI分析（X APIと同様の分析）

require('dotenv').config({ path: '.env' });

/**
 * Telegram APIのコスト構造
 * Telegram Bot APIは基本的に無料ですが、レート制限があります
 * - メッセージ送信: 無料（レート制限: 30メッセージ/秒）
 * - チャンネル投稿: 無料（レート制限: 20メッセージ/秒）
 * - メディア送信: 無料（ファイルサイズ制限: 50MB）
 */
const TELEGRAM_API_COST_PER_MESSAGE = 0; // 無料
const TELEGRAM_RATE_LIMIT_MESSAGES_PER_SECOND = 30;
const TELEGRAM_RATE_LIMIT_CHANNEL_POSTS_PER_SECOND = 20;

/**
 * 現在のTelegram投稿頻度を分析
 */
function analyzeCurrentTelegramPostingFrequency() {
  // vercel.jsonからCron設定を確認
  const cronJobs = {
    'vsl1-post': { schedule: '0 1,13,21 * * *', frequency: '1日2回（UTC 1時、13時、21時）', actual: 2 },
    'vsl2-free-users': { schedule: '0 * * * *', frequency: '1時間ごと', actual: 24 },
    'vsl1-reminder': { schedule: '0 */12 * * *', frequency: '12時間ごと', actual: 2 },
    'vsl2-last-call': { schedule: '0 * * * *', frequency: '1時間ごと', actual: 24 },
  };
  
  // 言語別の投稿頻度（VSL1投稿は6言語対応）
  const supportedLangs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
  const vsl1PostsPerDay = cronJobs['vsl1-post'].actual * supportedLangs.length; // 2回 × 6言語 = 12投稿/日
  
  // VSL2配信はユーザー数に依存（仮に100ユーザー/日と仮定）
  const estimatedVsl2UsersPerDay = 100; // 実際の数値に置き換え可能
  const vsl2PostsPerDay = cronJobs['vsl2-free-users'].actual * estimatedVsl2UsersPerDay; // 24時間 × 100ユーザー = 2,400投稿/日
  
  // VSL1リマインダーはユーザー数に依存（仮に50ユーザー/日と仮定）
  const estimatedReminderUsersPerDay = 50;
  const reminderPostsPerDay = cronJobs['vsl1-reminder'].actual * estimatedReminderUsersPerDay; // 2回 × 50ユーザー = 100投稿/日
  
  // VSL2ラストコールはユーザー数に依存（仮に30ユーザー/日と仮定）
  const estimatedLastCallUsersPerDay = 30;
  const lastCallPostsPerDay = cronJobs['vsl2-last-call'].actual * estimatedLastCallUsersPerDay; // 24時間 × 30ユーザー = 720投稿/日
  
  const totalPostsPerDay = vsl1PostsPerDay + vsl2PostsPerDay + reminderPostsPerDay + lastCallPostsPerDay;
  
  return {
    cronJobs,
    supportedLangs,
    daily: {
      vsl1Posts: vsl1PostsPerDay,
      vsl2Posts: vsl2PostsPerDay,
      reminderPosts: reminderPostsPerDay,
      lastCallPosts: lastCallPostsPerDay,
      total: totalPostsPerDay,
    },
    monthly: {
      vsl1Posts: vsl1PostsPerDay * 30,
      vsl2Posts: vsl2PostsPerDay * 30,
      reminderPosts: reminderPostsPerDay * 30,
      lastCallPosts: lastCallPostsPerDay * 30,
      total: totalPostsPerDay * 30,
    },
  };
}

/**
 * Telegramエンゲージメント率の推定
 * Telegramチャンネルの一般的なエンゲージメント率:
 * - チャンネル投稿: 5-15%（Xより高い傾向）
 * - DM: 20-40%（プッシュ通知のため）
 */
function estimateTelegramEngagementRate(messageType = 'channel') {
  const engagementRates = {
    channel: {
      conservative: 0.05,  // 5%
      average: 0.10,       // 10%
      good: 0.15,          // 15%
      excellent: 0.20,     // 20%
    },
    dm: {
      conservative: 0.20,  // 20%
      average: 0.30,       // 30%
      good: 0.35,          // 35%
      excellent: 0.40,     // 40%
    },
  };
  
  return engagementRates[messageType] || engagementRates.channel;
}

/**
 * Telegramリーチ数の推定
 * Telegramチャンネルのリーチ数は購読者数に依存
 * 仮に各言語チャンネルに10,000購読者と仮定
 */
function estimateTelegramReach(langCount = 6, subscribersPerChannel = 10000) {
  const totalSubscribers = langCount * subscribersPerChannel;
  
  return {
    subscribersPerChannel,
    totalSubscribers,
    // チャンネル投稿のリーチ数（購読者数の80-100%が表示）
    channelReach: {
      conservative: Math.round(totalSubscribers * 0.80),
      average: Math.round(totalSubscribers * 0.90),
      good: Math.round(totalSubscribers * 0.95),
      excellent: totalSubscribers,
    },
    // DMのリーチ数（送信したユーザー数 = 100%）
    dmReach: {
      conservative: 0, // ユーザー数に依存
      average: 0,
      good: 0,
      excellent: 0,
    },
  };
}

/**
 * Telegram投稿戦略のROIを計算
 */
async function calculateTelegramROI() {
  console.log('='.repeat(80));
  console.log('💰 Telegram投稿戦略のROI分析');
  console.log('='.repeat(80));
  console.log('');

  // 現在の投稿頻度を分析
  const postingFrequency = analyzeCurrentTelegramPostingFrequency();
  
  console.log('📊 現在のTelegram投稿頻度:');
  console.log('');
  console.log(`  VSL1投稿（チャンネル）: ${postingFrequency.daily.vsl1Posts}投稿/日（${postingFrequency.monthly.vsl1Posts}投稿/月）`);
  console.log(`  VSL2配信（DM）: ${postingFrequency.daily.vsl2Posts}投稿/日（${postingFrequency.monthly.vsl2Posts}投稿/月）`);
  console.log(`  VSL1リマインダー（DM）: ${postingFrequency.daily.reminderPosts}投稿/日（${postingFrequency.monthly.reminderPosts}投稿/月）`);
  console.log(`  VSL2ラストコール（DM）: ${postingFrequency.daily.lastCallPosts}投稿/日（${postingFrequency.monthly.lastCallPosts}投稿/月）`);
  console.log(`  合計: ${postingFrequency.daily.total}投稿/日（${postingFrequency.monthly.total}投稿/月）`);
  console.log('');

  // コスト計算
  const dailyCost = postingFrequency.daily.total * TELEGRAM_API_COST_PER_MESSAGE;
  const monthlyCost = postingFrequency.monthly.total * TELEGRAM_API_COST_PER_MESSAGE;
  
  console.log('💰 Telegram APIコスト:');
  console.log(`  24時間: $${dailyCost.toFixed(2)}（無料）`);
  console.log(`  1ヶ月: $${monthlyCost.toFixed(2)}（無料）`);
  console.log('');

  // リーチ数とエンゲージメント数の推定
  const reach = estimateTelegramReach(postingFrequency.supportedLangs.length, 10000);
  const channelEngagementRates = estimateTelegramEngagementRate('channel');
  const dmEngagementRates = estimateTelegramEngagementRate('dm');
  
  // チャンネル投稿のエンゲージメント数
  const channelReach = reach.channelReach.average;
  const channelEngagements = {
    conservative: Math.round(channelReach * channelEngagementRates.conservative * postingFrequency.daily.vsl1Posts),
    average: Math.round(channelReach * channelEngagementRates.average * postingFrequency.daily.vsl1Posts),
    good: Math.round(channelReach * channelEngagementRates.good * postingFrequency.daily.vsl1Posts),
    excellent: Math.round(channelReach * channelEngagementRates.excellent * postingFrequency.daily.vsl1Posts),
  };
  
  // DMのエンゲージメント数（送信数 = リーチ数）
  const dmTotalPosts = postingFrequency.daily.vsl2Posts + postingFrequency.daily.reminderPosts + postingFrequency.daily.lastCallPosts;
  const dmEngagements = {
    conservative: Math.round(dmTotalPosts * dmEngagementRates.conservative),
    average: Math.round(dmTotalPosts * dmEngagementRates.average),
    good: Math.round(dmTotalPosts * dmEngagementRates.good),
    excellent: Math.round(dmTotalPosts * dmEngagementRates.excellent),
  };
  
  const totalEngagements = {
    conservative: channelEngagements.conservative + dmEngagements.conservative,
    average: channelEngagements.average + dmEngagements.average,
    good: channelEngagements.good + dmEngagements.good,
    excellent: channelEngagements.excellent + dmEngagements.excellent,
  };
  
  console.log('👁️ Telegramリーチ数とエンゲージメント数の推定:');
  console.log('');
  console.log(`  チャンネル購読者数: ${reach.totalSubscribers.toLocaleString()}人（${reach.subscribersPerChannel.toLocaleString()}人/チャンネル × ${postingFrequency.supportedLangs.length}言語）`);
  console.log(`  チャンネル投稿のリーチ数: ${channelReach.toLocaleString()}人/投稿（購読者数の90%）`);
  console.log('');
  
  console.log('  💬 チャンネル投稿のエンゲージメント数（エンゲージメント率別）:');
  console.log(`    保守的（5%）: ${channelEngagements.conservative.toLocaleString()}エンゲージメント/日`);
  console.log(`    平均的（10%）: ${channelEngagements.average.toLocaleString()}エンゲージメント/日`);
  console.log(`    良好（15%）: ${channelEngagements.good.toLocaleString()}エンゲージメント/日`);
  console.log(`    優秀（20%）: ${channelEngagements.excellent.toLocaleString()}エンゲージメント/日`);
  console.log('');
  
  console.log('  💬 DMのエンゲージメント数（エンゲージメント率別）:');
  console.log(`    保守的（20%）: ${dmEngagements.conservative.toLocaleString()}エンゲージメント/日`);
  console.log(`    平均的（30%）: ${dmEngagements.average.toLocaleString()}エンゲージメント/日`);
  console.log(`    良好（35%）: ${dmEngagements.good.toLocaleString()}エンゲージメント/日`);
  console.log(`    優秀（40%）: ${dmEngagements.excellent.toLocaleString()}エンゲージメント/日`);
  console.log('');
  
  console.log('  📊 合計エンゲージメント数（エンゲージメント率別）:');
  console.log(`    保守的: ${totalEngagements.conservative.toLocaleString()}エンゲージメント/日`);
  console.log(`    平均的: ${totalEngagements.average.toLocaleString()}エンゲージメント/日`);
  console.log(`    良好: ${totalEngagements.good.toLocaleString()}エンゲージメント/日`);
  console.log(`    優秀: ${totalEngagements.excellent.toLocaleString()}エンゲージメント/日`);
  console.log('');

  // コスト効率（無料なので無限大）
  console.log('💎 ROI分析:');
  console.log('');
  console.log('  📈 1投稿あたりのパフォーマンス:');
  console.log(`    コスト: $${TELEGRAM_API_COST_PER_MESSAGE.toFixed(4)}（無料）`);
  console.log(`    チャンネル投稿のリーチ数: ${channelReach.toLocaleString()}人/投稿`);
  console.log(`    DMのリーチ数: 送信したユーザー数 = 100%`);
  console.log('');
  
  console.log('  💰 コスト効率:');
  console.log(`    1エンゲージメントあたりのコスト: $${TELEGRAM_API_COST_PER_MESSAGE.toFixed(8)}（無料）`);
  console.log(`    ROI: 無限大（コストが$0のため）`);
  console.log('');

  // スケーリング分析
  console.log('  🚀 スケーリング分析:');
  console.log('');
  
  const scalingScenarios = [
    { multiplier: 2, label: '2倍スケール' },
    { multiplier: 5, label: '5倍スケール' },
    { multiplier: 10, label: '10倍スケール' },
  ];
  
  for (const scenario of scalingScenarios) {
    const scaledPosts = postingFrequency.daily.total * scenario.multiplier;
    const scaledChannelPosts = postingFrequency.daily.vsl1Posts * scenario.multiplier;
    const scaledDmPosts = dmTotalPosts * scenario.multiplier;
    const scaledChannelEngagements = Math.round(channelReach * channelEngagementRates.average * scaledChannelPosts);
    const scaledDmEngagements = Math.round(scaledDmPosts * dmEngagementRates.average);
    const scaledTotalEngagements = scaledChannelEngagements + scaledDmEngagements;
    const scaledCost = scaledPosts * TELEGRAM_API_COST_PER_MESSAGE;
    
    console.log(`    ${scenario.label}:`);
    console.log(`      投稿数: ${scaledPosts.toLocaleString()}投稿/日`);
    console.log(`      エンゲージメント数: ${scaledTotalEngagements.toLocaleString()}エンゲージメント/日`);
    console.log(`      コスト: $${scaledCost.toFixed(2)}/日（$${(scaledCost * 30).toFixed(2)}/月）- 無料`);
    console.log('');
  }

  // X APIとの比較
  console.log('  🔥 X APIとの比較:');
  console.log('');
  console.log(`    X API（534投稿/日）:`);
  console.log(`      コスト: $2.67/日（$80.10/月）`);
  console.log(`      エンゲージメント数: 13,052,968エンゲージメント/日（エンゲージメント率: 10.24%）`);
  console.log('');
  console.log(`    Telegram（${postingFrequency.daily.total}投稿/日）:`);
  console.log(`      コスト: $${dailyCost.toFixed(2)}/日（$${monthlyCost.toFixed(2)}/月）- 無料`);
  console.log(`      エンゲージメント数: ${totalEngagements.average.toLocaleString()}エンゲージメント/日（エンゲージメント率: チャンネル10%、DM30%）`);
  console.log('');
  console.log(`    💡 Telegramの優位性:`);
  console.log(`      - コスト: 無料（X APIは$2.67/日）`);
  console.log(`      - DMのエンゲージメント率: 30%（X APIの10.24%より高い）`);
  console.log(`      - プッシュ通知: 即座にユーザーに届く`);
  console.log('');

  console.log('='.repeat(80));
  
  return {
    daily: {
      posts: postingFrequency.daily.total,
      channelPosts: postingFrequency.daily.vsl1Posts,
      dmPosts: dmTotalPosts,
      cost: dailyCost,
      engagements: totalEngagements,
      reach: {
        channel: channelReach,
        dm: dmTotalPosts,
      },
    },
    monthly: {
      posts: postingFrequency.monthly.total,
      channelPosts: postingFrequency.monthly.vsl1Posts,
      dmPosts: (dmTotalPosts * 30),
      cost: monthlyCost,
      engagements: {
        conservative: totalEngagements.conservative * 30,
        average: totalEngagements.average * 30,
        good: totalEngagements.good * 30,
        excellent: totalEngagements.excellent * 30,
      },
    },
    comparison: {
      xApiDailyCost: 2.67,
      xApiDailyEngagements: 13052968,
      telegramDailyCost: dailyCost,
      telegramDailyEngagements: totalEngagements.average,
      costAdvantage: '無限大（Telegramは無料）',
      engagementRateAdvantage: 'Telegram DMは30%（X APIの10.24%より高い）',
    },
  };
}

/**
 * メイン処理
 */
async function main() {
  try {
    const report = await calculateTelegramROI();
    
    // JSON形式でも出力（オプション）
    if (process.argv.includes('--json')) {
      console.log('\n📄 JSON形式出力:');
      console.log(JSON.stringify(report, null, 2));
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('致命的なエラー:', error);
    process.exit(1);
  });
}

module.exports = { calculateTelegramROI };
