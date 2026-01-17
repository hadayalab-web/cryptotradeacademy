// api/vsl1-post.js
// VSL1自動投稿（Telegram/X） - 無料版オプトイン誘導

const { sendMessageToAsset } = require('../services/telegram/bot');
const { analyzeXSentimentLive } = require('../services/grok/client');
const { postTweet } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { selectVsl1Variant, buildVsl1Tweet } = require('../services/x/vsl1-strategy');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
const X_VSL1_SENTIMENT_PROMPT = process.env.X_VSL1_SENTIMENT_PROMPT ||
  'latest BTC price action, funding, liquidations, whale activity, ETF flows on X';

// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function getTelegramDeepLink() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  return `https://t.me/${botUsername}?start=minimal`;
}

/**
 * VSL1投稿メッセージを生成（EN版）
 * Gemini CMO提案: CTA最適化（損失回避を活用）+ Deep Link実装
 */
function generateVSL1Post() {
  const deepLink = getTelegramDeepLink();

  return `🎬 Watch This: Two traders started with the same capital...

${VSL1_YOUTUBE_LINK}

Three months later:
• Trader A: Lost months of profits in 1 week
• Trader B: Secured $5K profit, relaxed

The difference? Trader B used Trap Defence BTC.

⚠️ Before you lose your capital, watch this 4-minute video (VSL1).

🚀 Get the trap avoidance logic that pros use (FREE):
→ ${deepLink}

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals`;
}

/**
 * VSL1投稿を実行（EN版）
 */
async function buildXPostPayload() {
  const useGrokSentiment = parseBoolean(process.env.X_VSL1_USE_GROK_SENTIMENT, true);
  let sentiment = null;
  let variantInfo = { variant: 'neutral', reason: 'default' };

  if (useGrokSentiment) {
    try {
      const grokResult = await analyzeXSentimentLive(X_VSL1_SENTIMENT_PROMPT, LANG);
      if (grokResult && typeof grokResult === 'object') {
        sentiment = grokResult;
        variantInfo = selectVsl1Variant(grokResult);
      } else {
        variantInfo = { variant: 'neutral', reason: 'no_sentiment' };
      }
    } catch (error) {
      variantInfo = { variant: 'neutral', reason: `sentiment_error:${error.message}` };
    }
  }

  const deepLink = getTelegramDeepLink();
  const tweet = buildVsl1Tweet({
    vsl1Link: VSL1_YOUTUBE_LINK,
    deepLink,
    variant: variantInfo.variant,
    lang: LANG,
  });

  return {
    tweet,
    variant: variantInfo.variant,
    reason: variantInfo.reason,
    sentiment,
  };
}

async function postVSL1() {
  try {
    const message = generateVSL1Post();
    const results = {
      telegram: null,
      x: null,
    };
    
    // Telegram MINIMALチャンネルに投稿（言語別）
    try {
      await sendMessageToAsset(message, 'MINIMAL', LANG);
      results.telegram = { success: true };
      console.log(`✅ VSL1 posted to Telegram MINIMAL/${LANG.toUpperCase()}`);
    } catch (error) {
      results.telegram = { success: false, error: error.message };
      console.error(`❌ Telegram post failed: ${error.message}`);
    }
    
    // X（Twitter）投稿
    try {
      const xStatus = getXConfigStatus();
      if (!xStatus.postingEnabled) {
        console.log('ℹ️ X posting disabled by X_POSTING_ENABLED');
        results.x = { success: false, skipped: true, error: 'X posting disabled' };
      } else if (!xStatus.configured) {
        console.log(`ℹ️ X API not configured, missing: ${xStatus.missing.join(', ')}`);
        results.x = { success: false, error: 'X API credentials missing', missing: xStatus.missing };
      } else {
        const xPayload = await buildXPostPayload();
        if (xStatus.dryRun) {
          console.log('🧪 X dry-run enabled, skipping post');
          results.x = {
            success: true,
            dryRun: true,
            tweet: xPayload.tweet,
            variant: xPayload.variant,
            reason: xPayload.reason,
          };
        } else {
          const tweetResult = await postTweet(xPayload.tweet);
          results.x = {
            success: true,
            tweetId: tweetResult.id,
            variant: xPayload.variant,
            reason: xPayload.reason,
          };
          console.log(`✅ VSL1 posted to X (Twitter): ${tweetResult.id}`);
        }
      }
    } catch (error) {
      results.x = { success: false, error: error.message };
      console.error(`❌ X post failed: ${error.message}`);
    }
    
    return { 
      success: true, 
      message: 'VSL1 posted successfully',
      results,
    };
  } catch (error) {
    console.error('❌ VSL1 post failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時
module.exports = async (req, res) => {
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await postVSL1();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
