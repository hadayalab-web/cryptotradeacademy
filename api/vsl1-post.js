// api/vsl1-post.js
// VSL1自動投稿（Telegram/X） - 無料版オプトイン誘導

const { sendMessageToAsset } = require('../services/telegram/bot');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/zdLFYwFJQd4';
const TELEGRAM_CHAT_ID_MINIMAL_EN = process.env.TELEGRAM_CHAT_ID_MINIMAL_EN;

/**
 * VSL1投稿メッセージを生成（EN版）
 * Gemini CMO提案: CTA最適化（損失回避を活用）+ Deep Link実装
 */
function generateVSL1Post() {
  // Gemini CMO提案: Deep Linkを使用してワンタップで登録可能に
  const BOT_USERNAME = 'TrapDefenceBot'; // Botのユーザー名（環境変数から取得可能にする場合は要修正）
  const DEEP_LINK = `https://t.me/${BOT_USERNAME}?start=minimal`;
  
  return `🎬 Watch This: Two traders started with the same capital...

${VSL1_YOUTUBE_LINK}

Three months later:
• Trader A: Lost months of profits in 1 week
• Trader B: Secured $5K profit, relaxed

The difference? Trader B used Trap Defence BTC.

⚠️ Before you lose your capital, watch this 4-minute video (VSL1).

🚀 Get the trap avoidance logic that pros use (FREE):
→ ${DEEP_LINK}

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals`;
}

/**
 * VSL1投稿を実行（EN版）
 */
async function postVSL1() {
  try {
    const message = generateVSL1Post();
    
    // Telegram MINIMALチャンネルに投稿（EN）
    if (TELEGRAM_CHAT_ID_MINIMAL_EN) {
      await sendMessageToAsset(message, 'MINIMAL', 'EN');
      console.log('✅ VSL1 posted to Telegram MINIMAL/EN');
    } else {
      console.warn('⚠️ TELEGRAM_CHAT_ID_MINIMAL_EN not set, skipping Telegram post');
    }
    
    // TODO: X（Twitter）投稿の実装（X API必要）
    // await postToX(message);
    
    return { success: true, message: 'VSL1 posted successfully' };
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
