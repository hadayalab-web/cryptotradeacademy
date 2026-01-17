// api/vsl1-reminder.js
// 無料版ユーザーへのVSL1リマインドメッセージ（12時間後）
// Gemini CMO提案: 12時間後にリマインドメッセージを送信してエンゲージメントを維持

const { getFreeUsersForVSL1Reminder } = require('../services/free-users/manager');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';

/**
 * VSL1リマインドメッセージを生成（EN版）
 * Gemini CMO提案: 実績画像を添付するか、短いプッシュメッセージ
 */
function generateVSL1ReminderMessage(userName = 'there') {
  return `💡 Quick Reminder, ${userName}!

Did you watch the VSL1 video yet? If not, check out this chart:

📊 Yesterday's Performance:
• Trap Defence identified a potential trap
• Users avoided significant losses
• Market moved as predicted

🎬 Watch the full story: ${VSL1_YOUTUBE_LINK}

🚀 Get the trap avoidance logic that pros use (FREE):
→ @TrapDefenceBot /start minimal

⚠️ Don't lose your capital. Watch this 4-minute video before you trade.`;
}

/**
 * 無料版ユーザーにVSL1リマインドを送信
 */
async function sendVSL1Reminder() {
  try {
    // 12-24時間経過した無料版ユーザーを取得（VSL2未送信）
    const freeUsers = await getFreeUsersForVSL1Reminder();
    
    if (freeUsers.length === 0) {
      console.log('ℹ️ No free users to send VSL1 reminder (12-24 hours passed, VSL2 not sent yet)');
      return { success: true, sent: 0, message: 'No users to send' };
    }
    
    console.log(`📊 Found ${freeUsers.length} free users ready for VSL1 reminder`);
    
    let sent = 0;
    let failed = 0;
    
    for (const user of freeUsers) {
      try {
        const message = generateVSL1ReminderMessage(user.userName || 'there');
        
        // Telegram DM送信（ユーザーID直接指定）
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
            parse_mode: 'Markdown'
          })
        });
        
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Telegram API Error: ${response.status} - ${errText}`);
        }
        
        sent++;
        console.log(`✅ VSL1 reminder sent to user ${user.chatId}`);
        
        // レート制限対策（20メッセージ/秒 = 50ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ Failed to send VSL1 reminder to user ${user.chatId}:`, error.message);
      }
    }
    
    return { success: true, sent, failed, total: freeUsers.length };
  } catch (error) {
    console.error('❌ VSL1 reminder send failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時（12時間ごと）
module.exports = async (req, res) => {
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
