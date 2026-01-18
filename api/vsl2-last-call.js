// api/vsl2-last-call.js
// 無料版ユーザーへのVSL2終了直前リマインド（22時間後 = 24時間経過の2時間前）
// Gemini CMO提案: 24時間経過の2時間前（22時間後）に「残り2時間で50%オフが終了します」という通知を送る

const { getFreeUsersForVSL2LastCall, markVSL2LastCallSent } = require('../services/free-users/manager');
const { generateVSL2LastCallMessage } = require('../services/telegram/messages/vsl2-last-call');
const { sendPhotoToUser } = require('../services/telegram/bot');
const { retryWithExponentialBackoff } = require('../utils/retry');
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
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

const DEFAULT_LANG = normalizeLang(process.env.LANG || 'en') || 'en';

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

function getUserLang(user) {
  return normalizeLang(user?.lang) || DEFAULT_LANG;
}

/**
 * VSL2 Last Call用のインラインボタンを生成
 * Gemini CMO提案: インラインボタンでワンタップアクセスを実現
 * @returns {Object} Telegram Inline Keyboard Markup
 */
function generateVSL2LastCallInlineKeyboard(lang = DEFAULT_LANG) {
  const whopProductUrl = getWhopProductUrl(lang);
  return {
    inline_keyboard: [
      [
        {
          text: '🚨 Get 50% OFF Now (Last Call)',
          url: `${whopProductUrl}?promo=${PROMO_CODE}`
        }
      ],
      [
        {
          text: '🎬 Watch VSL2 Video',
          url: VSL2_YOUTUBE_LINK
        }
      ]
    ]
  };
}

/**
 * 無料版ユーザーにVSL2 Last Callを送信
 */
async function sendVSL2LastCall() {
  try {
    // 22時間経過した無料版ユーザーを取得（VSL2未送信、Last Call対象）
    // Gemini CMO提案: 24時間経過の2時間前（22時間後）に通知
    const freeUsers = await getFreeUsersForVSL2LastCall();
    
    if (freeUsers.length === 0) {
      console.log('ℹ️ No free users to send VSL2 Last Call (22 hours passed, VSL2 not sent yet)');
      return { success: true, sent: 0, message: 'No users to send' };
    }
    
    console.log(`📊 Found ${freeUsers.length} free users ready for VSL2 Last Call`);
    
    // サムネイル画像の準備
    let vsl2ThumbnailDataUrl = null;
    try {
      const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl2_thumbnail.png');
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath);
        const base64Image = imageBuffer.toString('base64');
        vsl2ThumbnailDataUrl = `data:image/png;base64,${base64Image}`;
      }
    } catch (err) {
      console.error('❌ Error loading VSL2 thumbnail:', err.message);
    }

    let sent = 0;
    let failed = 0;
    
    for (const user of freeUsers) {
      try {
        const userLang = getUserLang(user);
        const userWhopUrl = getWhopProductUrl(userLang);
        const message = generateVSL2LastCallMessage(
          userLang,
          user.userName || 'there',
          VSL2_YOUTUBE_LINK,
          userWhopUrl,
          PROMO_CODE
        );
        
        // Gemini CMO提案: インラインボタンを追加
        const inlineKeyboard = generateVSL2LastCallInlineKeyboard(userLang);
        
        // Grok CSO+CFO推奨: 指数バックオフ・リトライロジック（最大3回）
        await retryWithExponentialBackoff(async () => {
          if (vsl2ThumbnailDataUrl) {
            // サムネイル付きで送信
            await sendPhotoToUser(user.chatId, vsl2ThumbnailDataUrl, message, {
              reply_markup: inlineKeyboard
            });
            console.log(`✅ VSL2 Last Call sent (with photo) to user ${user.chatId} (${userLang})`);
          } else {
            // テキストのみ送信 (Fallback)
            const botToken = process.env.TELEGRAM_BOT_TOKEN_EN || process.env.TELEGRAM_BOT_TOKEN;
            if (!botToken) {
              throw new Error('TELEGRAM_BOT_TOKEN_EN or TELEGRAM_BOT_TOKEN not set');
            }
            
            const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
            const response = await fetch(url.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.chatId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboard
              })
            });
            
            if (!response.ok) {
              const errText = await response.text();
              const error = new Error(`Telegram API Error: ${response.status} - ${errText}`);
              error.status = response.status;
              throw error;
            }
            console.log(`✅ VSL2 Last Call sent (text only) to user ${user.chatId} (${userLang})`);
          }
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 30000,
        });
        
        // VSL2 Last Call送信済みフラグを設定（重複送信防止）
        await markVSL2LastCallSent(user.chatId);
        
        sent++;
        
        // レート制限対策（20メッセージ/秒 = 50ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ Failed to send VSL2 Last Call to user ${user.chatId} after retries:`, error.message);
      }
    }
    
    return { success: true, sent, failed, total: freeUsers.length };
  } catch (error) {
    console.error('❌ VSL2 Last Call send failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時（1時間ごと）
module.exports = async (req, res) => {
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await sendVSL2LastCall();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports.sendVSL2LastCall = sendVSL2LastCall;
module.exports.generateVSL2LastCallInlineKeyboard = generateVSL2LastCallInlineKeyboard;
