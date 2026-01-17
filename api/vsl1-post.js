// api/vsl1-post.js
// VSL1自動投稿（Telegram/X） - 無料版オプトイン誘導

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
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const DEFAULT_LANG = normalizeLang(process.env.LANG || 'en') || 'en';
const LANG = DEFAULT_LANG;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
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
  const normalized = normalizeLang(lang);
  const startParam = normalized ? `minimal_${normalized}` : 'minimal';
  return `https://t.me/${botUsername}?start=${startParam}`;
}

function resolveMinimalChatId(lang) {
  const normalized = normalizeLang(lang);
  if (!normalized) {
    // ENチャンネルを優先、なければデフォルト
    return process.env.TELEGRAM_CHAT_ID_MINIMAL_EN || process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
  }
  
  const base = normalized.toUpperCase().replace('-', '_');
  const variants = [base];
  if (base === 'PT_BR') variants.push('PTBR');
  if (base === 'JA') variants.push('JP');
  if (base === 'KO') variants.push('KR');

  // 1. 言語別チャンネルIDを優先
  for (const variant of variants) {
    const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${variant}`;
    const chatId = process.env[envVarName];
    if (chatId) return chatId;
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
  const deepLink = getTelegramDeepLink(lang);
  const useDynamicGeneration = parseBoolean(process.env.VSL1_USE_DYNAMIC_GENERATION, false);
  
  if (useDynamicGeneration) {
    try {
      // Grok CSO+CFO推奨: Gemini動的メッセージ生成
      const optimizedMessage = await optimizeVSL1Message({
        lang: lang || 'en',
        deepLink,
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
  return toTelegramHtml(generateVSL1Message(lang || 'en', deepLink, VSL1_YOUTUBE_LINK));
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

  const deepLink = getTelegramDeepLink(lang || LANG);
  const tweet = buildVsl1Tweet({
    vsl1Link: VSL1_YOUTUBE_LINK,
    deepLink,
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

    // Telegram MINIMALチャンネルに投稿（言語別）
    for (const lang of targetLangs) {
      try {
        const chatId = resolveMinimalChatId(lang);
        if (!chatId) {
          const langCodeUpper = lang.toUpperCase().replace('-', '_');
          telegramResults[lang] = {
            success: false,
            error: `Missing TELEGRAM_CHAT_ID_MINIMAL_${langCodeUpper} (and TELEGRAM_CHAT_ID_MINIMAL)`,
          };
          console.error(`❌ Telegram post skipped (${lang}): missing chat ID`);
          continue;
        }
        if (!telegramConfig.botTokenSet) {
          telegramResults[lang] = {
            success: false,
            error: 'Missing TELEGRAM_BOT_TOKEN (and TELEGRAM_BOT_TOKEN_MINIMAL)',
          };
          console.error(`❌ Telegram post skipped (${lang}): missing bot token`);
          continue;
        }
        
        // Grok CSO+CFO推奨: A/Bテスト（メッセージバリアント）
        const useABTest = parseBoolean(process.env.VSL1_AB_TEST_ENABLED, false);
        let message;
        let variant = 'default';
        
        if (useABTest) {
          // A/Bテスト: テンプレート vs 動的生成
          const testUserId = `lang:${lang}`; // 言語ごとにテスト
          variant = await getVariant('vsl1-message', testUserId, ['template', 'dynamic'], { split: 0.5 });
          
          if (variant === 'dynamic') {
            message = await generateVSL1Post(lang, {
              engagementData: null, // TODO: 過去のエンゲージメントデータを取得
              marketSentiment: null, // TODO: 市場センチメントを取得
            });
          } else {
          message = toTelegramHtml(
            generateVSL1Message(lang || 'en', getTelegramDeepLink(lang), VSL1_YOUTUBE_LINK)
          );
          }
          
          // インプレッションを記録
          await recordABTestEvent('vsl1-message', variant, 'impression', { lang });
        } else {
          message = await generateVSL1Post(lang, {
            engagementData: null,
            marketSentiment: null,
          });
        }
        
        if (vsl1ThumbnailDataUrl) {
          // サムネイル付きで送信
          await sendPhotoToAsset(vsl1ThumbnailDataUrl, message, 'MINIMAL', lang, { parse_mode: 'HTML' });
          console.log(`✅ VSL1 posted (with photo) to Telegram MINIMAL/${lang.toUpperCase()} [${variant}]`);
        } else {
          // テキストのみ送信
          await sendMessageToAsset(message, 'MINIMAL', lang, { parse_mode: 'HTML' });
          console.log(`✅ VSL1 posted (text only) to Telegram MINIMAL/${lang.toUpperCase()} [${variant}]`);
        }
        
        telegramResults[lang] = { success: true, variant };
        telegramSuccessCount += 1;
      } catch (error) {
        telegramResults[lang] = { success: false, error: error.message };
        console.error(`❌ Telegram post failed (${lang}): ${error.message}`);
      }
    }

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
