// api/vsl1-post.js
// VSL1自動投稿（X/Twitterのみ） - 無料版オプトイン誘導
// 注意: VSL1は無料版オプトイン誘導用のため、無料版チャンネル（MINIMAL）には配信しない
// 無料版チャンネルに配信すると、既に無料版に登録しているユーザーに不要なメッセージが届いてしまう
// VSL1はX/Twitterのみに配信し、無料版に登録していない人（Grokが見つけてきたリスト）に対してオプトインを促す

const { sendMessageToAsset, sendPhotoToAsset } = require('../services/telegram/bot');
const { analyzeXSentimentLive } = require('../services/grok/client');
const { postTweet } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { selectVsl1Variant, buildVsl1Tweet } = require('../services/x/vsl1-strategy');
const { generateVSL1Message } = require('../services/telegram/messages/vsl1');
const { optimizeVSL1Message } = require('../services/gemini/messageOptimizer');
const { getVariant, recordABTestEvent } = require('../utils/ab-test');
const fs = require('fs');
const path = require('path');

// VSL1リンク: 環境変数が設定されていない場合、正しいVSL1リンクを使用
// VSL2リンクとの混同を防ぐため、明示的にチェック
let VSL1_YOUTUBE_LINK_RAW = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
if (VSL1_YOUTUBE_LINK_RAW.includes('fXgVsKhqDjI')) {
  console.error('❌ CRITICAL ERROR: VSL1_YOUTUBE_LINK is set to VSL2 link! Using correct VSL1 link.');
  VSL1_YOUTUBE_LINK_RAW = 'https://youtu.be/OqvqngJOiXc';
}
const VSL1_YOUTUBE_LINK = VSL1_YOUTUBE_LINK_RAW;
const X_VSL1_SENTIMENT_PROMPT = process.env.X_VSL1_SENTIMENT_PROMPT ||
  'latest BTC price action, funding, liquidations, whale activity, ETF flows on X';

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const normalizedBase = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(normalizedBase) ? normalizedBase : null;
}

// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const DEFAULT_LANG = normalizeLang(process.env.LANG || 'en') || 'en';
const LANG = DEFAULT_LANG;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalizedValue = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalizedValue)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalizedValue)) return false;
  return defaultValue;
}

function parseLangList(value) {
  if (!value) return [];
  const langs = value
    .split(',')
    .map((entry) => normalizeLang(entry))
    .filter((lang) => lang && SUPPORTED_LANGS.includes(lang));
  const unique = [];
  const seen = new Set();
  for (const lang of langs) {
    if (!seen.has(lang)) {
      seen.add(lang);
      unique.push(lang);
    }
  }
  return unique;
}

function toTelegramHtml(text) {
  if (!text) return text;
  // HTMLエスケープ
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // **bold** / *bold* を <b> に変換
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  escaped = escaped.replace(/\*([^*]+)\*/g, '<b>$1</b>');
  return escaped;
}

function getTargetLanguages() {
  const explicitList = parseLangList(process.env.VSL1_LANGS);
  if (explicitList.length > 0) return explicitList;

  const useMultiLang = parseBoolean(process.env.VSL1_MULTI_LANG, false);
  if (useMultiLang) return SUPPORTED_LANGS;

  return [LANG];
}

function getTelegramDeepLink(lang) {
  let botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  // @記号を削除（TelegramのDeep Linkでは不要）
  botUsername = botUsername.replace(/^@/, '');
  const normalizedLang = normalizeLang(lang);
  const startParam = normalizedLang ? `minimal_${normalizedLang}` : 'minimal';
  return `https://t.me/${botUsername}?start=${startParam}`;
}

function resolveMinimalChatId(lang) {
  const normalizedLangCode = normalizeLang(lang);
  if (!normalizedLangCode) {
    // ENチャンネルを優先、なければデフォルト
    return process.env.TELEGRAM_CHAT_ID_MINIMAL_EN || process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
  }
  
  const normalizedBaseCode = normalizedLangCode.toUpperCase().replace('-', '_');
  const variants = [normalizedBaseCode];
  if (normalizedBaseCode === 'PT_BR') variants.push('PTBR');
  if (normalizedBaseCode === 'JA') variants.push('JP');
  if (normalizedBaseCode === 'KO') variants.push('KR');

  // 1. 言語別チャンネルIDを優先
  for (const variant of variants) {
    const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${variant}`;
    const resolvedChatId = process.env[envVarName];
    if (resolvedChatId) return resolvedChatId;
  }

  // 2. ENチャンネルにフォールバック（Grok CSO+CFO推奨）
  const enChatId = process.env.TELEGRAM_CHAT_ID_MINIMAL_EN;
  if (enChatId) {
    console.warn(`⚠️ ${lang}言語用チャンネルIDが未設定、ENチャンネルにフォールバック`);
    return enChatId;
  }

  // 3. デフォルトチャンネルにフォールバック
  return process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
}

function getTelegramConfigStatus(targetLangs) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN_MINIMAL;
  const missingChatIds = [];
  for (const lang of targetLangs) {
    if (!resolveMinimalChatId(lang)) {
      missingChatIds.push(lang);
    }
  }

  return {
    botTokenSet: !!botToken,
    missingChatIds,
    targetLangs,
    vsl1MultiLang: process.env.VSL1_MULTI_LANG || '',
    vsl1Langs: process.env.VSL1_LANGS || '',
  };
}

function getXPostLang(targetLangs) {
  const configured = normalizeLang(process.env.X_VSL1_LANG);
  if (configured) return configured;
  if (Array.isArray(targetLangs) && targetLangs.length > 0) return targetLangs[0];
  return LANG;
}

/**
 * VSL1投稿メッセージを生成（多言語対応）
 * Gemini CMO提案: CTA最適化（損失回避を活用）+ Deep Link実装
 * Grok CSO+CFO推奨: Gemini動的メッセージ生成（CTR最適化）
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション（engagementData, marketSentiment）
 * @returns {Promise<string>} 生成されたメッセージ
 */
async function generateVSL1Post(lang, options = {}) {
  const telegramDeepLink = getTelegramDeepLink(lang);
  const useDynamicGeneration = parseBoolean(process.env.VSL1_USE_DYNAMIC_GENERATION, false);
  
  if (useDynamicGeneration) {
    try {
      // Grok CSO+CFO推奨: Gemini動的メッセージ生成
      const optimizedMessage = await optimizeVSL1Message({
        lang: lang || 'en',
        deepLink: telegramDeepLink,
        vsl1Link: VSL1_YOUTUBE_LINK,
        engagementData: options.engagementData,
        marketSentiment: options.marketSentiment,
      });
      return toTelegramHtml(optimizedMessage);
    } catch (error) {
      console.warn(`[VSL1] Dynamic generation failed, using template: ${error.message}`);
    }
  }
  
  // フォールバック: 既存のテンプレート
  return toTelegramHtml(generateVSL1Message(lang || 'en', telegramDeepLink, VSL1_YOUTUBE_LINK));
}

/**
 * VSL1投稿を実行（言語別）
 */
async function buildXPostPayload(lang) {
  const useGrokSentiment = parseBoolean(process.env.X_VSL1_USE_GROK_SENTIMENT, true);
  let sentiment = null;
  let variantInfo = { variant: 'neutral', reason: 'default' };

  if (useGrokSentiment) {
    try {
      const grokResult = await analyzeXSentimentLive(X_VSL1_SENTIMENT_PROMPT, lang || LANG);
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

  const tweetDeepLink = getTelegramDeepLink(lang || LANG);
  const tweet = buildVsl1Tweet({
    vsl1Link: VSL1_YOUTUBE_LINK,
    deepLink: tweetDeepLink,
    variant: variantInfo.variant,
    lang: lang || LANG, // Grok CSO+CFO推奨: 言語別ツイート生成
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
    const results = {
      telegram: null,
      x: null,
    };

    const targetLangs = getTargetLanguages();
    const telegramResults = {};
    let telegramSuccessCount = 0;
    const telegramConfig = getTelegramConfigStatus(targetLangs);
    if (!telegramConfig.botTokenSet) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set. Telegram posting will be skipped.');
    }

    // サムネイル画像の準備
    let vsl1ThumbnailDataUrl = null;
    try {
      const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl1_thumbnail.png');
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath);
        const base64Image = imageBuffer.toString('base64');
        vsl1ThumbnailDataUrl = `data:image/png;base64,${base64Image}`;
        console.log('🖼️ VSL1 Thumbnail loaded successfully');
      } else {
        console.log('ℹ️ VSL1 Thumbnail not found at:', thumbnailPath);
      }
    } catch (err) {
      console.error('❌ Error loading VSL1 thumbnail:', err.message);
    }

    // VSL1投稿は無料版オプトイン誘導用のため、無料版チャンネル（MINIMAL）には配信しない
    // 無料版チャンネルに配信すると、既に無料版に登録しているユーザーに不要なメッセージが届いてしまう
    // VSL1はX/Twitterのみに配信し、無料版に登録していない人（Grokが見つけてきたリスト）に対してオプトインを促す
    console.log('ℹ️ VSL1 is for opt-in lead generation, skipping Telegram MINIMAL channel (already registered users)');
    console.log('ℹ️ VSL1 will be posted to X/Twitter only to reach new prospects');

    results.telegram = {
      success: telegramSuccessCount === targetLangs.length && targetLangs.length > 0,
      sent: telegramSuccessCount,
      total: targetLangs.length,
      byLang: telegramResults,
      config: telegramConfig,
    };
    
    // X（Twitter）投稿（Grok CSO+CFO推奨: 言語別投稿自動化）
    try {
      const xStatus = getXConfigStatus();
      const enableMultiLangX = parseBoolean(process.env.X_VSL1_MULTI_LANG, false);
      
      if (!xStatus.postingEnabled) {
        console.log('ℹ️ X posting disabled by X_POSTING_ENABLED');
        results.x = { success: false, skipped: true, error: 'X posting disabled' };
      } else if (!xStatus.configured) {
        console.log(`ℹ️ X API not configured, missing: ${xStatus.missing.join(', ')}`);
        results.x = { success: false, error: 'X API credentials missing', missing: xStatus.missing };
      } else {
        // 多言語投稿が有効な場合、全言語に投稿
        const xLangs = enableMultiLangX ? targetLangs : [getXPostLang(targetLangs)];
        const xResults = [];
        let xSuccessCount = 0;
        
        for (const xLang of xLangs) {
          try {
            const xPayload = await buildXPostPayload(xLang);
            if (xStatus.dryRun) {
              console.log(`🧪 X dry-run enabled (${xLang}), skipping post`);
              xResults.push({
                lang: xLang,
                success: true,
                dryRun: true,
                tweet: xPayload.tweet,
                variant: xPayload.variant,
                reason: xPayload.reason,
              });
            } else {
              const tweetResult = await postTweet(xPayload.tweet);
              xResults.push({
                lang: xLang,
                success: true,
                tweetId: tweetResult.id,
                variant: xPayload.variant,
                reason: xPayload.reason,
              });
              xSuccessCount++;
              console.log(`✅ VSL1 posted to X (Twitter) [${xLang}]: ${tweetResult.id}`);
              
              // レート制限対策（X API: 50投稿/15分）
              if (xLangs.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
              }
            }
          } catch (error) {
            xResults.push({
              lang: xLang,
              success: false,
              error: error.message,
            });
            console.error(`❌ X post failed [${xLang}]: ${error.message}`);
          }
        }
        
        results.x = {
          success: xSuccessCount > 0,
          sent: xSuccessCount,
          total: xLangs.length,
          multiLang: enableMultiLangX,
          byLang: xResults,
        };
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
