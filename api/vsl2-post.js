// api/vsl2-post.js
// ⚠️ DISABLED: 無料版チャンネル全体へのVSL2配信は誤った挙動のため無効化されました
// VSL2は個別ユーザーへの配信のみ（/api/vsl2-free-usersで処理）
// VSL2自動投稿（Telegram MINIMALチャンネル） - 無料版ユーザーへのアップセル/クーポン配信
// VSL1は無料版オプトイン誘導用（X/Twitterのみ）、VSL2は無料版チャンネルに配信

const { sendMessageToAsset, sendPhotoToAsset } = require('../services/telegram/bot');
const { generateVSL2Message } = require('../services/telegram/messages/vsl2');
const fs = require('fs');
const path = require('path');

// VSL2リンク: 環境変数が設定されていない場合、正しいVSL2リンクを使用
// VSL1リンクとの混同を防ぐため、明示的にチェック
let VSL2_YOUTUBE_LINK_RAW = process.env.VSL2_YOUTUBE_LINK || process.env.VSL_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';
if (VSL2_YOUTUBE_LINK_RAW.includes('OqvqngJOiXc')) {
  console.error('❌ CRITICAL ERROR: VSL2_YOUTUBE_LINK is set to VSL1 link! Using correct VSL2 link.');
  VSL2_YOUTUBE_LINK_RAW = 'https://youtu.be/fXgVsKhqDjI';
}
const VSL2_YOUTUBE_LINK = VSL2_YOUTUBE_LINK_RAW;
const PROMO_CODE = 'DEFEND50';

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

  // 2. ENチャンネルにフォールバック
  const enChatId = process.env.TELEGRAM_CHAT_ID_MINIMAL_EN;
  if (enChatId) {
    console.warn(`⚠️ ${lang}言語用チャンネルIDが未設定、ENチャンネルにフォールバック`);
    return enChatId;
  }

  // 3. デフォルトチャンネルにフォールバック
  return process.env.TELEGRAM_CHAT_ID_MINIMAL || null;
}

// 言語別Whop URLマッピング
const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

function getWhopProductUrl(lang) {
  const normalized = normalizeLang(lang) || DEFAULT_LANG;
  return WHOP_PRODUCT_URLS[normalized] || WHOP_PRODUCT_URLS['en'];
}

function getTargetLanguages() {
  const explicitList = parseLangList(process.env.VSL2_LANGS);
  if (explicitList.length > 0) return explicitList;

  const useMultiLang = parseBoolean(process.env.VSL2_MULTI_LANG, false);
  if (useMultiLang) return SUPPORTED_LANGS;

  return [LANG];
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
    vsl2MultiLang: process.env.VSL2_MULTI_LANG || '',
    vsl2Langs: process.env.VSL2_LANGS || '',
  };
}

/**
 * VSL2メッセージ用のインラインボタンを生成
 * @param {string} lang - 言語コード
 * @returns {Object} Telegram Inline Keyboard Markup
 */
function generateVSL2InlineKeyboard(lang = DEFAULT_LANG) {
  const whopProductUrl = getWhopProductUrl(lang);
  return {
    inline_keyboard: [
      [
        {
          text: '🎬 Watch Why Pros Always Win',
          url: VSL2_YOUTUBE_LINK
        }
      ],
      [
        {
          text: '🚀 Get 50% OFF Now',
          url: `${whopProductUrl}?promo=${PROMO_CODE}`
        }
      ]
    ]
  };
}

async function postVSL2() {
  // ⚠️ DISABLED: 無料版チャンネル全体へのVSL2配信は無効化されました
  // VSL2は個別ユーザーへの配信のみ（/api/vsl2-free-usersで処理）
  console.warn('⚠️ postVSL2() is disabled. VSL2 should only be sent to individual users via /api/vsl2-free-users');
  return {
    success: false,
    message: 'VSL2 channel posting is disabled. Use /api/vsl2-free-users for individual user delivery.',
    results: { telegram: { success: false, sent: 0, total: 0, byLang: {}, config: {} } },
  };
  
  /* DISABLED CODE - DO NOT USE
  try {
    const results = {
      telegram: null,
    };

    const targetLangs = getTargetLanguages();
    const telegramResults = {};
    let telegramSuccessCount = 0;
    const telegramConfig = getTelegramConfigStatus(targetLangs);
    if (!telegramConfig.botTokenSet) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set. Telegram posting will be skipped.');
    }

    // サムネイル画像の準備
    let vsl2ThumbnailDataUrl = null;
    try {
      const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl2_thumbnail.png');
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath);
        const base64Image = imageBuffer.toString('base64');
        vsl2ThumbnailDataUrl = `data:image/png;base64,${base64Image}`;
        console.log('🖼️ VSL2 Thumbnail loaded successfully');
      } else {
        console.log('ℹ️ VSL2 Thumbnail not found at:', thumbnailPath);
      }
    } catch (err) {
      console.error('❌ Error loading VSL2 thumbnail:', err.message);
    }

    // Telegram MINIMALチャンネルに投稿（言語別）
    // VSL2は無料版ユーザーへのアップセル/クーポン配信のため、無料版チャンネルに配信
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
        
        const userWhopUrl = getWhopProductUrl(lang);
        // VSL2メッセージを生成（ユーザー名は「there」を使用）
        const message = generateVSL2Message(lang, 'there', VSL2_YOUTUBE_LINK, userWhopUrl, PROMO_CODE);
        
        // インラインボタンを追加
        const inlineKeyboard = generateVSL2InlineKeyboard(lang);
        
        if (vsl2ThumbnailDataUrl) {
          // サムネイル付きで送信
          await sendPhotoToAsset(vsl2ThumbnailDataUrl, message, 'MINIMAL', lang, {
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          });
          console.log(`✅ VSL2 posted (with photo) to Telegram MINIMAL/${lang.toUpperCase()}`);
        } else {
          // テキストのみ送信
          await sendMessageToAsset(message, 'MINIMAL', lang, {
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          });
          console.log(`✅ VSL2 posted (text only) to Telegram MINIMAL/${lang.toUpperCase()}`);
        }
        
        telegramResults[lang] = { success: true };
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
    
    return { 
      success: true, 
      message: 'VSL2 posted successfully to MINIMAL channels',
      results,
    };
  } catch (error) {
    console.error('❌ VSL2 post failed:', error.message);
    throw error;
  }
  */
}

// Vercel Cron実行時（VSL1と同じスケジュール: UTC 9時と21時、JST 18時と6時）
// ⚠️ DISABLED: このエンドポイントは無効化されました（vercel.jsonからも削除済み）
module.exports = async (req, res) => {
  // ⚠️ DISABLED: 無料版チャンネル全体へのVSL2配信は無効化されました
  console.warn('⚠️ /api/vsl2-post endpoint is disabled. VSL2 should only be sent to individual users via /api/vsl2-free-users');
  return res.status(410).json({ 
    error: 'This endpoint is disabled',
    message: 'VSL2 channel posting is disabled. Use /api/vsl2-free-users for individual user delivery.',
    disabled: true
  });
  
  /* DISABLED CODE - DO NOT USE
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await postVSL2();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
  */
};

module.exports.postVSL2 = postVSL2;
module.exports.generateVSL2InlineKeyboard = generateVSL2InlineKeyboard;
