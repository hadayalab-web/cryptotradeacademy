// scripts/check-today-posts-direct.js
// 今日の投稿をX APIから直接取得して分析

require('dotenv').config({ path: '.env' });

const { xApiRequest } = require('../services/x/client');

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

async function checkTodayPostsDirect() {
  console.log('📊 今日の投稿をX APIから直接取得して分析中...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // X APIから今日のツイートを取得
  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setUTCHours(0, 0, 0, 0);
  const startTime = todayStart.toISOString();
  
  console.log(`📅 分析対象: ${today.toISOString().split('T')[0]}以降の投稿\n`);
  
  try {
    // X API v2: ユーザーのツイートを取得
    const userId = process.env.X_USER_ID || process.env.X_API_USER_ID;
    if (!userId) {
      console.error('❌ X_USER_ID or X_API_USER_ID not set');
      return;
    }
    
    const endpoint = `/2/users/${userId}/tweets`;
    const params = new URLSearchParams({
      'max_results': '100',
      'start_time': startTime,
      'tweet.fields': 'created_at,public_metrics,referenced_tweets',
      'expansions': 'referenced_tweets.id',
    });
    
    console.log(`🔍 X APIから投稿を取得中...`);
    const response = await xApiRequest(`${endpoint}?${params.toString()}`);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.log('⚠️ 今日の投稿が見つかりませんでした');
      return;
    }
    
    const tweets = response.data;
    console.log(`✅ ${tweets.length}件のツイートが見つかりました\n`);
    
    // 引用ツイート（quote_repost）を抽出
    const quoteTweets = tweets.filter(tweet => 
      tweet.referenced_tweets && 
      tweet.referenced_tweets.some(ref => ref.type === 'quoted')
    );
    
    console.log(`📊 引用ツイート数: ${quoteTweets.length}件\n`);
    
    if (quoteTweets.length === 0) {
      console.log('⚠️ 今日の引用リポストが見つかりませんでした');
      return;
    }
    
    // 引用元ツイートの情報を取得（可能な場合）
    const referencedTweetIds = new Set();
    quoteTweets.forEach(tweet => {
      tweet.referenced_tweets?.forEach(ref => {
        if (ref.type === 'quoted') {
          referencedTweetIds.add(ref.id);
        }
      });
    });
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 今日の引用リポスト分析`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // 各引用ツイートを分析
    let totalExpectedImpressions = 0;
    let totalExpectedEngagements = 0;
    const influencerMap = {};
    
    for (const tweet of quoteTweets) {
      const tweetId = tweet.id;
      const createdAt = tweet.created_at;
      const metrics = tweet.public_metrics || {};
      const actualImpressions = metrics.impression_count || 0;
      const actualEngagements = (metrics.like_count || 0) + 
                                (metrics.retweet_count || 0) + 
                                (metrics.reply_count || 0) + 
                                (metrics.quote_count || 0);
      
      // 引用元ツイートIDを取得
      const quotedTweetId = tweet.referenced_tweets?.find(ref => ref.type === 'quoted')?.id;
      
      console.log(`📝 ツイートID: ${tweetId}`);
      console.log(`   投稿時刻: ${createdAt}`);
      console.log(`   実際のインプレッション: ${actualImpressions.toLocaleString()}`);
      console.log(`   実際のエンゲージメント: ${actualEngagements.toLocaleString()}`);
      if (quotedTweetId) {
        console.log(`   引用元ツイートID: ${quotedTweetId}`);
      }
      console.log('');
      
      // インフルエンサー情報は引用元ツイートから取得する必要があるが、
      // 現時点では直接取得できないため、ストックから推測
      // （実際の実装では、引用元ツイートの作者情報を取得する必要がある）
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 サマリー\n');
    console.log(`📊 総引用リポスト数: ${quoteTweets.length}件`);
    console.log(`📊 総実際インプレッション: ${quoteTweets.reduce((sum, t) => sum + (t.public_metrics?.impression_count || 0), 0).toLocaleString()}`);
    console.log(`📊 総実際エンゲージメント: ${quoteTweets.reduce((sum, t) => {
      const m = t.public_metrics || {};
      return sum + (m.like_count || 0) + (m.retweet_count || 0) + (m.reply_count || 0) + (m.quote_count || 0);
    }, 0).toLocaleString()}`);
    
  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    console.error(`   スタック: ${error.stack}`);
  }
}

// 実行
if (require.main === module) {
  checkTodayPostsDirect()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { checkTodayPostsDirect };
