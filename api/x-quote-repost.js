// api/x-quote-repost.js
// 引用リポスト自動化（Grokがインフルエンサー発掘 + 引用リポスト）
// 24投稿/日（6言語 × 2人 × 2投稿）

const { postQuoteTweet } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { discoverInfluencersForQuoteRepost, generateQuoteRepostText } = require('../services/grok/client');
const {
  isPeakTimeWindow,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  getOptimizedHashtags,
} = require('../services/x/optimization');
const { QUOTE_REPOST_TEMPLATES } = require('./x-post-free-report');

// Vercel KV（投稿履歴追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Quote Repost] @vercel/kv not available:', error.message);
}

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const normalizedBase = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(normalizedBase) ? normalizedBase : null;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalizedValue = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalizedValue)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalizedValue)) return false;
  return defaultValue;
}

function getTelegramDeepLinkWithSource(lang, source = 'x_quote') {
  let botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  botUsername = botUsername.replace(/^@/, '');
  const normalizedLang = normalizeLang(lang) || 'en';
  
  const startParam = `minimal_${normalizedLang}_${source}`;
  return `https://t.me/${botUsername}?start=${startParam}`;
}

// 言語別引用リポストテンプレート（Xアルゴリズム最適化版: 140文字以内）
// x-post-free-report.jsからインポート、またはフォールバック用に定義
const FALLBACK_QUOTE_REPOST_TEMPLATES = {
  en: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const netflowStr = exchangeNetflow ? `Inflow +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const question = trapScore <= 25 ? 'You waiting or trading?' : 'Protecting capital or chasing?';
    
    return `🚨 Trap Score ${trapScore}/100: VERY LOW RISK! BTC ${priceStr} ${changeStr} ${netflowStr}. Patience wins! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  ja: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? '待機中？それとも取引中？' : '資本保護？それとも追いかけ中？';
    
    return `🚨 Trap Score ${trapScore}/100: 極低リスク！BTC ${priceStr} ${changeStr}。忍耐が勝利！${question} #BTC #TrapDefence ${deepLink}`;
  },
  es: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? '¿Esperando o operando?' : '¿Protegiendo capital o persiguiendo?';
    
    return `🚨 Trap Score ${trapScore}/100: ¡RIESGO MUY BAJO! BTC ${priceStr} ${changeStr}. ¡La paciencia gana! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  'pt-br': (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? 'Esperando ou operando?' : 'Protegendo capital ou perseguindo?';
    
    return `🚨 Trap Score ${trapScore}/100: RISCO MUITO BAIXO! BTC ${priceStr} ${changeStr}. Paciência vence! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  ar: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? 'هل تنتظر أم تتداول؟' : 'هل تحمي رأس المال أم تطارد؟';
    
    return `🚨 Trap Score ${trapScore}/100: مخاطر منخفضة جداً! BTC ${priceStr} ${changeStr}. الصبر يفوز! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  ko: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? '대기 중인가요? 거래 중인가요?' : '자본 보호 중인가요? 추격 중인가요?';
    
    return `🚨 Trap Score ${trapScore}/100: 매우 낮은 리스크! BTC ${priceStr} ${changeStr}. 인내가 승리! ${question} #BTC #TrapDefence ${deepLink}`;
  },
};

/**
 * Grokが引用リポスト用のテキストを生成（Grok APIを使用）
 */
async function generateQuoteRepostTextWithGrok(lang, influencerTweet, reportData = null) {
  try {
    const deepLink = getTelegramDeepLinkWithSource(lang, 'x_quote');
    const quoteText = await generateQuoteRepostText(lang, influencerTweet, reportData, deepLink);
    return quoteText;
  } catch (error) {
    console.error(`[Quote Repost] Failed to generate text with Grok for ${lang}:`, error.message);
    // フォールバック: テンプレートを使用
    const template = QUOTE_REPOST_TEMPLATES[lang] || QUOTE_REPOST_TEMPLATES.en;
    return template(getTelegramDeepLinkWithSource(lang, 'x_quote'));
  }
}

/**
 * 1日の投稿数を取得（Vercel KV）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<number>} 投稿数
 */
async function getDailyPostCount(dateString) {
  if (!kv) return 0;
  try {
    const count = await kv.get(`x:posts:${dateString}`) || 0;
    return typeof count === 'number' ? count : parseInt(count) || 0;
  } catch (error) {
    console.warn('[Quote Repost] Failed to get daily post count:', error.message);
    return 0;
  }
}

/**
 * 1日の投稿数をインクリメント（Vercel KV）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {number} count - インクリメント数（デフォルト: 1）
 * @returns {Promise<number>} 更新後の投稿数
 */
async function incrementDailyPostCount(dateString, count = 1) {
  if (!kv) return 0;
  try {
    const key = `x:posts:${dateString}`;
    const current = await getDailyPostCount(dateString);
    const newCount = current + count;
    await kv.set(key, newCount, { ex: 86400 * 2 }); // 2日間保持
    return newCount;
  } catch (error) {
    console.warn('[Quote Repost] Failed to increment daily post count:', error.message);
    return 0;
  }
}

/**
 * インフルエンサーを発掘して引用リポスト（最適化版）
 * Grok推奨: 12投稿/日、ピーク時間のみ、投稿後15-60分以内
 */
async function postQuoteRepostsForLang(lang, reportData = null, dailyPostCount = null) {
  try {
    const currentHour = new Date().getUTCHours();
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 1日の投稿数を取得（Vercel KV）
    if (dailyPostCount === null) {
      dailyPostCount = await getDailyPostCount(dateString);
    }
    
    // ピーク時間チェック（UTC 12-22のみ）
    if (!isPeakTimeWindow(currentHour)) {
      console.log(`⏰ Skipping quote reposts for ${lang} (not peak time: ${currentHour} UTC)`);
      return [];
    }
    
    // 1日の投稿上限チェック（25投稿/日）
    if (!checkDailyPostLimit(dailyPostCount, 25)) {
      console.log(`⏰ Daily post limit reached (${dailyPostCount}/25), skipping ${lang}`);
      return [];
    }
    
    // Grokがインフルエンサーを発掘（1人に削減: 12投稿/日 = 6言語 × 1人 × 2投稿）
    console.log(`[Quote Repost] Discovering influencers for ${lang}...`);
    const influencers = await discoverInfluencersForQuoteRepost(lang, { maxResults: 1 });
    
    if (!influencers || influencers.length === 0) {
      console.warn(`[Quote Repost] No influencers found for ${lang}`);
      return [];
    }
    
    console.log(`[Quote Repost] Found ${influencers.length} influencers for ${lang}`);
    
    const results = [];
    
    // 1人のインフルエンサーのみ（最適化: 12投稿/日）
    for (const influencer of influencers.slice(0, 1)) {
      try {
        // tweetIdが必須
        if (!influencer.tweetId) {
          console.warn(`[Quote Repost] Skipping influencer @${influencer.username}: no tweetId`);
          continue;
        }
        
        // インフルエンサーの投稿時刻を取得（tweetTextから推測、またはAPIから取得）
        // 実際の実装では、influencerオブジェクトにcreated_atが含まれる想定
        const influencerTweetTime = influencer.createdAt || new Date().toISOString();
        
        // 最適なタイミングかチェック（投稿後15-60分以内）
        if (!shouldPostQuoteRepost(influencerTweetTime)) {
          console.log(`⏰ Skipping quote repost for @${influencer.username} (not optimal timing: ${influencerTweetTime})`);
          continue;
        }
        
        // エンゲージメントチェック（1,000以上推奨）
        const engagement = influencer.recentImpressions || 0;
        if (engagement < 1000) {
          console.log(`⏰ Skipping quote repost for @${influencer.username} (low engagement: ${engagement})`);
          continue;
        }
        
        // Grokが引用リポスト用のテキストを生成（Xアルゴリズム最適化版）
        let quoteText;
        try {
          quoteText = await generateQuoteRepostTextWithGrok(lang, influencer, reportData);
        } catch (error) {
          // フォールバック: Xアルゴリズム最適化版テンプレートを使用
          const template = QUOTE_REPOST_TEMPLATES?.[lang] || FALLBACK_QUOTE_REPOST_TEMPLATES[lang] || FALLBACK_QUOTE_REPOST_TEMPLATES.en;
          const { trapScore = 25, priceUsd = null, change24h = null, exchangeNetflow = null, whaleRatio = null } = reportData || {};
          quoteText = template(trapScore, priceUsd, change24h, getTelegramDeepLinkWithSource(lang, 'x_quote'), exchangeNetflow, whaleRatio);
        }
        
        // ハッシュタグを最適化（テンプレート内に既に含まれているが、必要に応じて調整）
        const optimizedHashtags = getOptimizedHashtags(lang);
        if (quoteText.includes('#BTC') && !quoteText.includes(optimizedHashtags[0])) {
          quoteText = quoteText.replace(/#BTC.*#TrapDefence/g, optimizedHashtags.join(' '));
        }
        
        // 140文字以内に制限（引用リポスト用）
        if (quoteText.length > 140) {
          quoteText = quoteText.substring(0, 137) + '...';
        }
        
        // 引用リポストを投稿
        const result = await postQuoteTweet(quoteText.substring(0, 280), influencer.tweetId);
        
        // 投稿数をインクリメント
        await incrementDailyPostCount(dateString, 1);
        
        results.push({
          lang,
          influencer: influencer.username,
          tweetId: influencer.tweetId,
          quoteTweetId: result.id,
          success: true,
          engagement,
        });
        console.log(`✅ Quote repost posted for ${lang} (@${influencer.username}): ${result.id} (engagement: ${engagement})`);
        
        // レート制限対策（1時間あたり3-4投稿まで）
        await new Promise(resolve => setTimeout(resolve, 900000)); // 15分待機（1時間4投稿まで）
      } catch (error) {
        console.error(`❌ Failed to post quote repost for ${lang} (@${influencer.username}):`, error.message);
        results.push({
          lang,
          influencer: influencer.username,
          tweetId: influencer.tweetId,
          success: false,
          error: error.message,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error(`❌ Failed to post quote reposts for ${lang}:`, error.message);
    return [];
  }
}

/**
 * 引用リポストを実行（全言語）
 */
async function postQuoteReposts(reportData = null) {
  try {
    const xStatus = getXConfigStatus();
    
    if (!xStatus.postingEnabled) {
      console.log('ℹ️ X posting disabled by X_POSTING_ENABLED');
      return { success: false, skipped: true, error: 'X posting disabled' };
    }
    
    if (!xStatus.configured) {
      console.log(`ℹ️ X API not configured, missing: ${xStatus.missing.join(', ')}`);
      return { success: false, error: 'X API credentials missing', missing: xStatus.missing };
    }
    
    if (xStatus.dryRun) {
      console.log('🧪 X dry-run enabled, skipping quote reposts');
      return { success: true, dryRun: true };
    }
    
    const targetLangs = SUPPORTED_LANGS;
    const allResults = [];
    
    // 各言語ごとに引用リポスト（1時間に1言語 = 6時間で完了）
    // 実際の実装では、スケジューラーで1時間ごとに1言語ずつ実行
    for (const lang of targetLangs) {
      const langResults = await postQuoteRepostsForLang(lang, reportData);
      allResults.push(...langResults);
    }
    
    const successCount = allResults.filter(r => r.success).length;
    const totalCount = allResults.length;
    
    return {
      success: successCount > 0,
      sent: successCount,
      total: totalCount,
      byLang: allResults,
    };
  } catch (error) {
    console.error('❌ Quote repost failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時（1時間ごと）
const handler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // リクエストボディからレポートデータを取得
    const reportData = req.body?.reportData || null;
    
    // 1日の投稿数を追跡（簡易版: 実際の実装ではKVストレージを使用）
    const dailyPostCount = req.body?.dailyPostCount || 0;
    
    // 1時間ごとに1言語ずつ実行（6時間で全言語完了）
    const targetLangs = SUPPORTED_LANGS;
    const currentHour = new Date().getUTCHours();
    const langIndex = currentHour % targetLangs.length;
    const targetLang = targetLangs[langIndex];
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 1日の投稿数を取得（Vercel KV）
    const dailyPostCount = await getDailyPostCount(dateString);
    
    console.log(`[Quote Repost] Processing ${targetLang} (hour ${currentHour}, daily count: ${dailyPostCount})`);
    
    // ピーク時間チェック
    if (!isPeakTimeWindow(currentHour)) {
      console.log(`⏰ Skipping quote reposts (not peak time: ${currentHour} UTC)`);
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'not_peak_time',
        lang: targetLang,
        results: [],
        dailyPostCount,
      });
    }
    
    const langResults = await postQuoteRepostsForLang(targetLang, reportData, dailyPostCount);
    
    // 更新後の投稿数を取得
    const updatedDailyPostCount = await getDailyPostCount(dateString);
    
    return res.status(200).json({
      success: true,
      lang: targetLang,
      results: langResults,
      dailyPostCount: updatedDailyPostCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = handler;
module.exports.postQuoteReposts = postQuoteReposts;
module.exports.postQuoteRepostsForLang = postQuoteRepostsForLang;
