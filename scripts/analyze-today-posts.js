// scripts/analyze-today-posts.js
// 今日の投稿履歴を分析し、投稿先インフルエンサーと期待インプレッション・エンゲージメントを計算

require('dotenv').config({ path: '.env' });

const { getPostsForDate, getPostsForLastNDays } = require('../services/x/postTracker');

// KVストレージから直接取得
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.error('❌ @vercel/kv not available:', error.message);
  process.exit(1);
}

const STOCK_KEY_PREFIX = 'x:influencer_stock:';

// KVから直接インフルエンサーを取得
async function getInfluencerFromStock(lang, username) {
  if (!kv) {
    return null;
  }
  try {
    const stockKey = `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
    const influencers = await kv.get(stockKey);
    if (!influencers || !Array.isArray(influencers)) {
      return null;
    }
    return influencers.find(inf => inf.username === username) || null;
  } catch (error) {
    return null;
  }
}

// インプレッション数を数値に変換
function parseImpressions(impressions) {
  if (typeof impressions === 'number') {
    return impressions;
  }
  if (typeof impressions === 'string') {
    const match = impressions.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    const rangeMatch = impressions.match(/(\d+)-(\d+)/);
    if (rangeMatch) {
      return (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
    }
  }
  return 0;
}

async function analyzeTodayPosts() {
  console.log('📊 今日の投稿履歴を分析中...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 今日の日付を取得
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  console.log(`📅 分析対象日: ${todayString}\n`);
  
  // 過去7日間の投稿を取得（KVから直接取得）
  const allPosts = [];
  const now = new Date();
  
  console.log('🔍 過去7日間の投稿履歴を確認中...\n');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    const key = `x:posts:${dateString}`;
    
    try {
      const posts = await kv.get(key);
      if (Array.isArray(posts) && posts.length > 0) {
        console.log(`   ${dateString}: ${posts.length}件`);
        allPosts.push(...posts.map(p => ({ ...p, dateString })));
      } else if (posts) {
        console.log(`   ${dateString}: 予期しないデータ形式 (${typeof posts})`);
      }
    } catch (error) {
      console.log(`   ${dateString}: エラー - ${error.message}`);
    }
  }
  
  console.log('');
  
  // 今日の投稿をフィルタ
  const todayPosts = allPosts.filter(p => p.dateString === todayString);
  
  if (todayPosts.length === 0) {
    if (allPosts.length > 0) {
      console.log(`⚠️ 今日（${todayString}）の投稿は見つかりませんでしたが、過去7日間で${allPosts.length}件の投稿が見つかりました`);
      console.log(`   最新の投稿日: ${allPosts[0]?.dateString || '不明'}`);
    } else {
      console.log('⚠️ 過去7日間の投稿が見つかりませんでした');
    }
    return;
  }
  
  console.log(`✅ 今日の投稿数: ${todayPosts.length}件\n`);
  
  // 投稿タイプ別に分類
  const postsByType = {};
  const influencerPosts = [];
  
  for (const post of todayPosts) {
    const postType = post.postType || 'unknown';
    if (!postsByType[postType]) {
      postsByType[postType] = [];
    }
    postsByType[postType].push(post);
    
    // インフルエンサーへの投稿（quote_repost）を抽出
    if (postType === 'quote_repost' && post.metadata?.influencerUsername) {
      influencerPosts.push(post);
    }
  }
  
  console.log('📋 投稿タイプ別内訳:');
  Object.keys(postsByType).forEach(type => {
    console.log(`   - ${type}: ${postsByType[type].length}件`);
  });
  console.log('');
  
  if (influencerPosts.length === 0) {
    console.log('⚠️ インフルエンサーへの引用リポストが見つかりませんでした');
    return;
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 インフルエンサーへの投稿分析`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  const influencerAnalysis = {};
  let totalExpectedImpressions = 0;
  let totalExpectedEngagements = 0;
  
  for (const post of influencerPosts) {
    const influencerUsername = post.metadata?.influencerUsername;
    const lang = post.lang || 'en';
    
    if (!influencerUsername) {
      continue;
    }
    
    // インフルエンサー情報をストックから取得
    const influencer = await getInfluencerFromStock(lang, influencerUsername);
    
    if (!influencer) {
      console.log(`⚠️ @${influencerUsername} (${lang}) のストックデータが見つかりません`);
      continue;
    }
    
    const engagementRate = (influencer.engagementRate || 0) * 100;
    const expectedImpressions = parseImpressions(influencer.recentImpressions);
    const expectedEngagements = expectedImpressions * (engagementRate / 100);
    
    // インフルエンサーごとに集計
    if (!influencerAnalysis[influencerUsername]) {
      influencerAnalysis[influencerUsername] = {
        username: influencerUsername,
        lang: lang,
        engagementRate: engagementRate,
        expectedImpressions: expectedImpressions,
        expectedEngagements: expectedEngagements,
        postCount: 0,
        tweetIds: [],
      };
    }
    
    influencerAnalysis[influencerUsername].postCount++;
    influencerAnalysis[influencerUsername].tweetIds.push(post.tweetId);
    
    totalExpectedImpressions += expectedImpressions;
    totalExpectedEngagements += expectedEngagements;
  }
  
  // 結果を表示
  const influencers = Object.values(influencerAnalysis);
  
  console.log(`📊 投稿先インフルエンサー数: ${influencers.length}人\n`);
  
  // エンゲージメント率順にソート
  influencers.sort((a, b) => b.engagementRate - a.engagementRate);
  
  console.log('🏆 投稿先インフルエンサー（エンゲージメント率順）:\n');
  
  influencers.forEach((inf, index) => {
    console.log(`${index + 1}. @${inf.username} (${inf.lang.toUpperCase()})`);
    console.log(`   - エンゲージメント率: ${inf.engagementRate.toFixed(2)}%`);
    console.log(`   - 期待インプレッション: ${inf.expectedImpressions.toLocaleString()}`);
    console.log(`   - 期待エンゲージメント: ${Math.round(inf.expectedEngagements).toLocaleString()}`);
    console.log(`   - 投稿数: ${inf.postCount}件`);
    console.log(`   - ツイートID: ${inf.tweetIds.slice(0, 3).join(', ')}${inf.tweetIds.length > 3 ? '...' : ''}`);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 全体サマリー\n');
  console.log(`📊 総投稿数: ${influencerPosts.length}件`);
  console.log(`📊 投稿先インフルエンサー数: ${influencers.length}人`);
  console.log(`📊 総期待インプレッション: ${totalExpectedImpressions.toLocaleString()}`);
  console.log(`📊 総期待エンゲージメント: ${Math.round(totalExpectedEngagements).toLocaleString()}`);
  
  if (influencers.length > 0) {
    const avgEngagementRate = influencers.reduce((sum, inf) => sum + inf.engagementRate, 0) / influencers.length;
    console.log(`📊 平均エンゲージメント率: ${avgEngagementRate.toFixed(2)}%`);
  }
  
  return {
    totalPosts: influencerPosts.length,
    influencerCount: influencers.length,
    totalExpectedImpressions,
    totalExpectedEngagements,
    influencers,
  };
}

// 実行
if (require.main === module) {
  analyzeTodayPosts()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { analyzeTodayPosts };
