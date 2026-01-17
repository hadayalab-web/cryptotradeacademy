// api/vsl2-free-users.js
// 無料版ユーザーへのVSL2自動配信（24時間後）
// Gemini CMO提案: 48時間→24時間に短縮（ユーザーの熱量が高いうちにアプローチ）

const { sendMessage } = require('../services/telegram/bot');
const { getFreeUsersForVSL2, markVSL2Sent } = require('../services/free-users/manager');

const VSL2_YOUTUBE_LINK = process.env.VSL2_YOUTUBE_LINK || process.env.VSL_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
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
 * 無料版ユーザーへのVSL2配信メッセージを生成
 * Gemini CMO提案: 共感→証明→提案の構成
 * 注意: Whopプロモコードには動的な時間制限は設定できないため、時間制限の表現を削除
 */
function generateVSL2Message(userName = 'there') {
  // Gemini CMO提案: 共感→証明→提案の構成
  return `🎁 Special Offer for You, ${userName}!

💭 Still manually watching charts every day?

📊 **Proof**: Over the past 30 days, Trap Defence BTC has:
• Identified traps before they hit
• Saved users from significant losses
• Maintained high win rate

🎬 Watch this: ${VSL2_YOUTUBE_LINK}

💰 Use Promo Code: **${PROMO_CODE}** for 50% OFF!

🚀 Get the pro's weapon at half price:
${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}

💡 Limited availability - Don't miss out!`;
}

/**
 * VSL2メッセージ用のインラインボタンを生成
 * Gemini CMO提案: インラインボタンでワンタップアクセスを実現
 * @returns {Object} Telegram Inline Keyboard Markup
 */
function generateVSL2InlineKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: '🎬 Watch VSL2 Video',
          url: VSL2_YOUTUBE_LINK
        }
      ],
      [
        {
          text: '🚀 Get 50% OFF Now',
          url: `${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}`
        }
      ]
    ]
  };
}


/**
 * 無料版ユーザーにVSL2を送信
 */
async function sendVSL2ToFreeUsers() {
  try {
    // 24時間経過した無料版ユーザーを取得（VSL2未送信）
    // Gemini CMO提案: 48時間→24時間に短縮
    const freeUsers = await getFreeUsersForVSL2();
    
    if (freeUsers.length === 0) {
      console.log('ℹ️ No free users to send VSL2 (24 hours passed, not sent yet)');
      return { success: true, sent: 0, message: 'No users to send' };
    }
    
    console.log(`📊 Found ${freeUsers.length} free users ready for VSL2`);
    
    let sent = 0;
    let failed = 0;
    
    for (const user of freeUsers) {
      try {
        const message = generateVSL2Message(user.userName || 'there');
        
        // Telegram DM送信（ユーザーID直接指定）
        const botToken = process.env.TELEGRAM_BOT_TOKEN_EN || process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          throw new Error('TELEGRAM_BOT_TOKEN_EN or TELEGRAM_BOT_TOKEN not set');
        }
        
        // Gemini CMO提案: インラインボタンを追加
        const inlineKeyboard = generateVSL2InlineKeyboard();
        
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
        
        // VSL2送信済みフラグを設定
        await markVSL2Sent(user.chatId);
        
        sent++;
        console.log(`✅ VSL2 sent to user ${user.chatId}`);
        
        // レート制限対策（20メッセージ/秒 = 50ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ Failed to send VSL2 to user ${user.chatId}:`, error.message);
      }
    }
    
    return { success: true, sent, failed, total: freeUsers.length };
  } catch (error) {
    console.error('❌ VSL2 free users send failed:', error.message);
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
    const result = await sendVSL2ToFreeUsers();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports.sendVSL2ToFreeUsers = sendVSL2ToFreeUsers;
module.exports.generateVSL2InlineKeyboard = generateVSL2InlineKeyboard;
