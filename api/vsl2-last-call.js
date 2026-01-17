// api/vsl2-last-call.js
// 無料版ユーザーへのVSL2終了直前リマインド（22時間後 = 24時間経過の2時間前）
// Gemini CMO提案: 24時間経過の2時間前（22時間後）に「残り2時間で50%オフが終了します」という通知を送る

const { getFreeUsersForVSL2LastCall, markVSL2LastCallSent } = require('../services/free-users/manager');

const VSL2_YOUTUBE_LINK = process.env.VSL2_YOUTUBE_LINK || process.env.VSL_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';
const PROMO_CODE = 'DEFEND50';

// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

// 言語別Whop URLマッピング
const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

// 現在のデプロイメントの言語に対応するWhop URLを取得
const WHOP_PRODUCT_URL = WHOP_PRODUCT_URLS[LANG] || WHOP_PRODUCT_URLS['en'];

/**
 * VSL2 Last Callメッセージを生成（EN版）
 * 注意: Whopプロモコードには動的な時間制限は設定できないため、時間制限の表現を削除
 */
function generateVSL2LastCallMessage(userName = 'there') {
  return `⏰ REMINDER, ${userName}!

💡 Don't forget: You can still get Trap Defence BTC at 50% OFF!

📊 **Why Upgrade Now?**
• Complete on-chain analysis (all indicators)
• AI-powered trap detection
• Real-time alerts: AVOID_LONG / AVOID_SHORT / STANDBY
• Full Dr. Grok psychological support

🎬 Watch this: ${VSL2_YOUTUBE_LINK}

💰 Use Promo Code: **${PROMO_CODE}** for 50% OFF!

🚀 Get the pro's weapon at half price:
${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}

💡 Limited availability - Secure your spot now!`;
}

/**
 * VSL2 Last Call用のインラインボタンを生成
 * Gemini CMO提案: インラインボタンでワンタップアクセスを実現
 * @returns {Object} Telegram Inline Keyboard Markup
 */
function generateVSL2LastCallInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: '🚨 Get 50% OFF Now (2 Hours Left!)',
          url: `${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}`
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
    
    let sent = 0;
    let failed = 0;
    
    for (const user of freeUsers) {
      try {
        const message = generateVSL2LastCallMessage(user.userName || 'there');
        
        // Telegram DM送信（ユーザーID直接指定）
        const botToken = process.env.TELEGRAM_BOT_TOKEN_EN || process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          throw new Error('TELEGRAM_BOT_TOKEN_EN or TELEGRAM_BOT_TOKEN not set');
        }
        
        // Gemini CMO提案: インラインボタンを追加
        const inlineKeyboard = generateVSL2LastCallInlineKeyboard();
        
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
          throw new Error(`Telegram API Error: ${response.status} - ${errText}`);
        }
        
        // VSL2 Last Call送信済みフラグを設定（重複送信防止）
        await markVSL2LastCallSent(user.chatId);
        
        sent++;
        console.log(`✅ VSL2 Last Call sent to user ${user.chatId}`);
        
        // レート制限対策（20メッセージ/秒 = 50ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ Failed to send VSL2 Last Call to user ${user.chatId}:`, error.message);
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
