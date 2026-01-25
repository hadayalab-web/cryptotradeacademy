// services/x/postPerformanceAnalyzer.js
// 投稿パフォーマンス分析サービス（再利用可能なサービス層）

const { getPostsForDate } = require('./postTracker');
const { getInfluencersFromStock } = require('./influencerStock');

// KVストレージから直接取得
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Post Performance Analyzer] @vercel/kv not available:', error.message);
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

// コンバージョン率の推定値
const CONVERSION_RATES = {
  telegramClickRate: {
    conservative: 0.02,
    moderate: 0.035,
    optimistic: 0.05,
  },
  whopClickRate: {
    conservative: 0.01,
    moderate: 0.02,
    optimistic: 0.03,
  },
  telegramOptInRate: {
    conservative: 0.30,
    moderate: 0.40,
    optimistic: 0.50,
  },
  whopConversionRate: {
    conservative: 0.02,
    moderate: 0.035,
    optimistic: 0.05,
  },
};

// 期待パフォーマンスを計算
function calculateExpectedPerformance(impressions, engagementRate, hasTelegramLink, hasWhopLink) {
  const expectedEngagements = impressions * (engagementRate / 100);
  
  const telegramClicks = hasTelegramLink ? {
    conservative: Math.round(impressions * CONVERSION_RATES.telegramClickRate.conservative),
    moderate: Math.round(impressions * CONVERSION_RATES.telegramClickRate.moderate),
    optimistic: Math.round(impressions * CONVERSION_RATES.telegramClickRate.optimistic),
  } : null;
  
  const telegramOptIns = telegramClicks ? {
    conservative: Math.round(telegramClicks.conservative * CONVERSION_RATES.telegramOptInRate.conservative),
    moderate: Math.round(telegramClicks.moderate * CONVERSION_RATES.telegramOptInRate.moderate),
    optimistic: Math.round(telegramClicks.optimistic * CONVERSION_RATES.telegramOptInRate.optimistic),
  } : null;
  
  const whopClicks = hasWhopLink ? {
    conservative: Math.round(impressions * CONVERSION_RATES.whopClickRate.conservative),
    moderate: Math.round(impressions * CONVERSION_RATES.whopClickRate.moderate),
    optimistic: Math.round(impressions * CONVERSION_RATES.whopClickRate.optimistic),
  } : null;
  
  const whopConversions = whopClicks ? {
    conservative: Math.round(whopClicks.conservative * CONVERSION_RATES.whopConversionRate.conservative),
    moderate: Math.round(whopClicks.moderate * CONVERSION_RATES.whopConversionRate.moderate),
    optimistic: Math.round(whopClicks.optimistic * CONVERSION_RATES.whopConversionRate.optimistic),
  } : null;
  
  return {
    impressions,
    engagementRate,
    expectedEngagements: Math.round(expectedEngagements),
    telegramClicks,
    telegramOptIns,
    whopClicks,
    whopConversions,
  };
}

/**
 * 指定日の投稿パフォーマンスを分析
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Object>} 分析結果
 */
async function analyzePostPerformance(dateString) {
  if (!dateString) {
    const today = new Date();
    dateString = today.toISOString().split('T')[0];
  }
  
  // 投稿履歴を取得
  const posts = await getPostsForDate(dateString);
  
  if (posts.length === 0) {
    return {
      dateString,
      posts: [],
      summary: {
        totalPosts: 0,
        postsByType: {},
        totalExpectedImpressions: 0,
        totalExpectedEngagements: 0,
        totalTelegramOptIns: null,
        totalWhopConversions: null,
      },
    };
  }
  
  // 言語別平均インプレッション数を事前計算
  const avgImpressionsByLang = {};
  const languages = ['en', 'es', 'pt-br', 'ar', 'ko', 'ja'];
  for (const lang of languages) {
    try {
      const influencers = await getInfluencersFromStock(lang);
      if (influencers && influencers.length > 0) {
        const totalImpressions = influencers.reduce((sum, inf) => {
          return sum + parseImpressions(inf.recentImpressions || '0');
        }, 0);
        avgImpressionsByLang[lang] = Math.round(totalImpressions / influencers.length);
      } else {
        avgImpressionsByLang[lang] = 100000; // デフォルト値
      }
    } catch (error) {
      avgImpressionsByLang[lang] = 100000;
    }
  }
  
  // 各投稿を分析
  const analyzedPosts = [];
  const postsByType = {};
  let totalExpectedImpressions = 0;
  let totalExpectedEngagements = 0;
  const totalTelegramOptIns = { conservative: 0, moderate: 0, optimistic: 0 };
  const totalWhopConversions = { conservative: 0, moderate: 0, optimistic: 0 };
  
  for (const post of posts) {
    const postType = post.postType || 'unknown';
    if (!postsByType[postType]) {
      postsByType[postType] = 0;
    }
    postsByType[postType]++;
    
    let influencer = null;
    let performance = null;
    
    // インフルエンサー情報を取得（quote_repostの場合）
    if (postType === 'quote_repost' && post.metadata?.influencerUsername) {
      influencer = await getInfluencerFromStock(post.lang, post.metadata.influencerUsername);
    }
    
    // 期待パフォーマンスを計算
    if (influencer) {
      const impressions = parseImpressions(influencer.recentImpressions);
      const engagementRate = (influencer.engagementRate || 0) * 100;
      const hasTelegramLink = postType === 'free_report' || postType === 'minimal_version';
      const hasWhopLink = postType === 'free_report' || postType === 'minimal_version';
      
      performance = calculateExpectedPerformance(impressions, engagementRate, hasTelegramLink, hasWhopLink);
      
      totalExpectedImpressions += impressions;
      totalExpectedEngagements += performance.expectedEngagements;
      
      if (performance.telegramOptIns) {
        totalTelegramOptIns.conservative += performance.telegramOptIns.conservative;
        totalTelegramOptIns.moderate += performance.telegramOptIns.moderate;
        totalTelegramOptIns.optimistic += performance.telegramOptIns.optimistic;
      }
      
      if (performance.whopConversions) {
        totalWhopConversions.conservative += performance.whopConversions.conservative;
        totalWhopConversions.moderate += performance.whopConversions.moderate;
        totalWhopConversions.optimistic += performance.whopConversions.optimistic;
      }
    } else {
      // インフルエンサーなしの場合は平均値を使用
      const avgImpressions = avgImpressionsByLang[post.lang] || 100000;
      const hasTelegramLink = postType === 'free_report' || postType === 'minimal_version';
      const hasWhopLink = postType === 'free_report' || postType === 'minimal_version';
      
      // 平均エンゲージメント率10%を仮定
      performance = calculateExpectedPerformance(avgImpressions, 10, hasTelegramLink, hasWhopLink);
      
      totalExpectedImpressions += avgImpressions;
      totalExpectedEngagements += performance.expectedEngagements;
      
      if (performance.telegramOptIns) {
        totalTelegramOptIns.conservative += performance.telegramOptIns.conservative;
        totalTelegramOptIns.moderate += performance.telegramOptIns.moderate;
        totalTelegramOptIns.optimistic += performance.telegramOptIns.optimistic;
      }
      
      if (performance.whopConversions) {
        totalWhopConversions.conservative += performance.whopConversions.conservative;
        totalWhopConversions.moderate += performance.whopConversions.moderate;
        totalWhopConversions.optimistic += performance.whopConversions.optimistic;
      }
    }
    
    analyzedPosts.push({
      ...post,
      influencer: influencer ? {
        username: influencer.username,
        engagementRate: (influencer.engagementRate || 0) * 100,
        recentImpressions: parseImpressions(influencer.recentImpressions),
      } : null,
      performance,
    });
  }
  
  // 結果をまとめる
  return {
    dateString,
    posts: analyzedPosts,
    summary: {
      totalPosts: posts.length,
      postsByType,
      totalExpectedImpressions,
      totalExpectedEngagements,
      totalTelegramOptIns: Object.keys(totalTelegramOptIns).length > 0 ? totalTelegramOptIns : null,
      totalWhopConversions: Object.keys(totalWhopConversions).length > 0 ? totalWhopConversions : null,
      avgImpressionsByLang,
    },
  };
}

/**
 * 1日の期待値を計算（投稿パターンに基づく）
 * @returns {Promise<Object>} 期待値データ
 */
async function calculateDailyExpectations() {
  const languages = ['en', 'es', 'pt-br', 'ar', 'ko', 'ja'];
  const impressionsByLang = {};
  
  // 言語別平均インプレッション数を取得
  for (const lang of languages) {
    try {
      const influencers = await getInfluencersFromStock(lang);
      if (influencers && influencers.length > 0) {
        const totalImpressions = influencers.reduce((sum, inf) => {
          return sum + parseImpressions(inf.recentImpressions || '0');
        }, 0);
        impressionsByLang[lang] = Math.round(totalImpressions / influencers.length);
      } else {
        // デフォルト値
        impressionsByLang[lang] = {
          'en': 237500,
          'es': 130000,
          'pt-br': 100000,
          'ar': 188000,
          'ko': 100000,
          'ja': 100000,
        }[lang] || 100000;
      }
    } catch (error) {
      impressionsByLang[lang] = 100000;
    }
  }
  
  // Quote Reposts: 10投稿/日
  const quoteRepostImpressions = 
    (impressionsByLang['ar'] || 0) * 2 +
    (impressionsByLang['ko'] || 0) * 2 +
    (impressionsByLang['en'] || 0) * 2 +
    (impressionsByLang['pt-br'] || 0) * 2 +
    (impressionsByLang['es'] || 0) * 2;
  
  // Free Reports: 5投稿/日
  const freeReportImpressions = 
    (impressionsByLang['en'] || 0) * 1 +
    (impressionsByLang['ko'] || 0) * 1 +
    (impressionsByLang['pt-br'] || 0) * 1 +
    (impressionsByLang['es'] || 0) * 1 +
    (impressionsByLang['ar'] || 0) * 1;
  
  // Minimal Version: 1投稿/日（全6言語）
  const minimalVersionImpressions = 
    (impressionsByLang['en'] || 0) * 1 +
    (impressionsByLang['es'] || 0) * 1 +
    (impressionsByLang['pt-br'] || 0) * 1 +
    (impressionsByLang['ar'] || 0) * 1 +
    (impressionsByLang['ko'] || 0) * 1 +
    (impressionsByLang['ja'] || 0) * 1;
  
  const totalImpressions = quoteRepostImpressions + freeReportImpressions + minimalVersionImpressions;
  
  // Telegram/Whopリンクを含む投稿のインプレッション数
  const telegramLinkImpressions = freeReportImpressions + minimalVersionImpressions;
  const whopLinkImpressions = freeReportImpressions + minimalVersionImpressions;
  
  // 期待値を計算
  const telegramClicks = {
    conservative: Math.round(telegramLinkImpressions * CONVERSION_RATES.telegramClickRate.conservative),
    moderate: Math.round(telegramLinkImpressions * CONVERSION_RATES.telegramClickRate.moderate),
    optimistic: Math.round(telegramLinkImpressions * CONVERSION_RATES.telegramClickRate.optimistic),
  };
  
  const telegramOptIns = {
    conservative: Math.round(telegramClicks.conservative * CONVERSION_RATES.telegramOptInRate.conservative),
    moderate: Math.round(telegramClicks.moderate * CONVERSION_RATES.telegramOptInRate.moderate),
    optimistic: Math.round(telegramClicks.optimistic * CONVERSION_RATES.telegramOptInRate.optimistic),
  };
  
  const whopClicks = {
    conservative: Math.round(whopLinkImpressions * CONVERSION_RATES.whopClickRate.conservative),
    moderate: Math.round(whopLinkImpressions * CONVERSION_RATES.whopClickRate.moderate),
    optimistic: Math.round(whopLinkImpressions * CONVERSION_RATES.whopClickRate.optimistic),
  };
  
  const whopConversions = {
    conservative: Math.round(whopClicks.conservative * CONVERSION_RATES.whopConversionRate.conservative),
    moderate: Math.round(whopClicks.moderate * CONVERSION_RATES.whopConversionRate.moderate),
    optimistic: Math.round(whopClicks.optimistic * CONVERSION_RATES.whopConversionRate.optimistic),
  };
  
  return {
    dailyImpressions: {
      quoteRepost: quoteRepostImpressions,
      freeReport: freeReportImpressions,
      minimalVersion: minimalVersionImpressions,
      total: totalImpressions,
    },
    telegramOptIns: {
      daily: telegramOptIns,
      monthly: {
        conservative: telegramOptIns.conservative * 30,
        moderate: telegramOptIns.moderate * 30,
        optimistic: telegramOptIns.optimistic * 30,
      },
    },
    whopClicks: {
      daily: whopClicks,
      monthly: {
        conservative: whopClicks.conservative * 30,
        moderate: whopClicks.moderate * 30,
        optimistic: whopClicks.optimistic * 30,
      },
    },
    whopConversions: {
      daily: whopConversions,
      monthly: {
        conservative: whopConversions.conservative * 30,
        moderate: whopConversions.moderate * 30,
        optimistic: whopConversions.optimistic * 30,
      },
    },
  };
}

module.exports = {
  analyzePostPerformance,
  calculateExpectedPerformance,
  calculateDailyExpectations,
  parseImpressions,
};
