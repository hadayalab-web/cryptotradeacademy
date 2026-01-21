// api/vsl1-reminder.js
// 無料版ユーザーへのVSL1リマインドメッセージ（12時間後）
// Gemini CMO提案: 12時間後にリマインドメッセージを送信してエンゲージメントを維持

const { getFreeUsersForVSL1Reminder } = require('../services/free-users/manager');
const { generateVSL1ReminderMessage } = require('../services/telegram/messages/vsl1-reminder');
const { getTelegramDeepLink, generateVSL1InlineKeyboard } = require('./vsl1-post');
const { sendMessageToUser, sendPhotoToUser } = require('../services/telegram/bot');
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

/**
 * 言語コードを正規化
 */
function normalizeLang(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().replace('_', '-');
  const supported = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];
  return supported.includes(normalized) ? normalized : null;
}

/**
 * VSL1リマインドサムネイル画像を読み込む
 */
function loadVSL1ReminderThumbnail() {
  try {
    const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl1_reminder_thumbnail.png');
    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath);
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ VSL1 Reminder thumbnail loading error:', error.message);
    return null;
  }
}

/**
 * 無料版ユーザーにVSL1リマインドを送信（多言語対応）
 */
async function sendVSL1Reminder() {
  try {
    // 12-24時間経過した無料版ユーザーを取得（VSL2未送信）
    const freeUsers = await getFreeUsersForVSL1Reminder();
    
    if (freeUsers.length === 0) {
      console.log('ℹ️ No free users to send VSL1 reminder (12-24 hours passed, VSL2 not sent yet)');
      return { success: true, sent: 0, message: 'No users to send', timestamp: new Date().toISOString() };
    }
    
    console.log(`📊 Found ${freeUsers.length} free users ready for VSL1 reminder`);
    console.log(`🚀 Starting VSL1 reminder delivery to ${freeUsers.length} users at ${new Date().toISOString()}`);
    
    let sent = 0;
    let failed = 0;
    
    for (const user of freeUsers) {
      try {
        // ユーザーの言語を取得（デフォルト: en）
        const userLang = normalizeLang(user.lang) || 'en';
        const userName = user.userName || (userLang === 'ja' ? 'さん' : userLang === 'ko' ? '님' : 'there');
        
        // Deep Linkを生成
        const deepLink = getTelegramDeepLink(userLang);
        
        // 多言語対応のリマインドメッセージを生成
        const message = generateVSL1ReminderMessage(userLang, userName, deepLink, VSL1_YOUTUBE_LINK);
        
        // インラインボタンを生成（VSL1と同じ）
        const inlineKeyboard = generateVSL1InlineKeyboard(userLang);
        
        console.log(`📨 Sending VSL1 reminder to user ${user.chatId} (lang: ${userLang}, userName: ${userName})`);
        
        // サムネイル画像を読み込む
        const thumbnail = loadVSL1ReminderThumbnail();
        
        // Telegram DM送信（画像付き・インラインボタン付き）
        if (thumbnail) {
          await sendPhotoToUser(user.chatId, thumbnail, message, {
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard,
          });
        } else {
          // サムネイルがない場合はテキストのみ
          await sendMessageToUser(user.chatId, message, {
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard,
          });
        }
        
        sent++;
        console.log(`✅ VSL1 reminder sent to user ${user.chatId} (${userLang})`);
        
        // レート制限対策（20メッセージ/秒 = 50ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ Failed to send VSL1 reminder to user ${user.chatId}:`, {
          errorType: error.constructor.name,
          errorMessage: error.message,
          chatId: user.chatId,
          lang: user.lang,
          errorStack: error.stack,
        });
      }
    }
    
    return { success: true, sent, failed, total: freeUsers.length };
  } catch (error) {
    console.error('❌ VSL1 reminder send failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時のハンドラー関数
const handler = async (req, res) => {
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await sendVSL1Reminder();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Vercel Cron実行時（12時間ごと）
module.exports = handler;

// テスト用にエクスポート
module.exports.generateVSL1ReminderMessage = (lang, userName, deepLink, vsl1Link, hoursLeft) => {
  return generateVSL1ReminderMessage(lang, userName, deepLink, vsl1Link, hoursLeft);
};
module.exports.sendVSL1Reminder = sendVSL1Reminder;
