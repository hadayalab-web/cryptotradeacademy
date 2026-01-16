// api/value-post.js
// 価値提供型投稿（スパム対策）- Trap Scoreと市場分析を含む自然なオプトイン誘導

const { sendMessageToAsset } = require('../services/telegram/bot');

const TELEGRAM_CHAT_ID_MINIMAL_EN = process.env.TELEGRAM_CHAT_ID_MINIMAL_EN;

/**
 * 価値提供型投稿メッセージを生成（EN版）
 * Trap Scoreと市場分析を含む自然なオプトイン誘導
 */
function generateValuePost(trapScore = null, marketData = null) {
  // Trap Scoreが取得できない場合は、一般的なメッセージを使用
  if (!trapScore) {
    return `📊 Bitcoin Market Update

🔍 Today's Analysis:
• Exchange Inflow: Monitoring
• Miner Position: Tracking
• Market Sentiment: Analyzing

💡 Want daily trap alerts and market insights?

🚀 Get Your Free Daily Trap Score:
→ @TrapDefenceBot /start minimal

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals`;
  }

  // Trap Scoreが取得できた場合
  const scoreEmoji = trapScore >= 70 ? '🔴' : trapScore >= 50 ? '🟡' : '🟢';
  const riskLevel = trapScore >= 70 ? 'High Risk' : trapScore >= 50 ? 'Moderate Risk' : 'Low Risk';

  return `📊 Bitcoin Market Update

${scoreEmoji} Today's Trap Score: ${trapScore}/100
Risk Level: ${riskLevel}

🔍 Quick Analysis:
• Exchange Inflow: ${marketData?.inflow || 'Monitoring'}
• Miner Position: ${marketData?.minerPosition || 'Tracking'}
• Market Sentiment: ${marketData?.sentiment || 'Analyzing'}

💡 Want daily trap alerts and detailed analysis?

🚀 Get Your Free Daily Trap Score:
→ @TrapDefenceBot /start minimal

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals`;
}

/**
 * 価値提供型投稿を実行（EN版）
 */
async function postValueContent() {
  try {
    // TODO: 実際のTrap Scoreを取得（cron.jsから取得するか、簡易版を使用）
    // 現時点では、簡易版メッセージを使用
    const message = generateValuePost();
    
    // Telegram MINIMALチャンネルに投稿（EN）
    if (TELEGRAM_CHAT_ID_MINIMAL_EN) {
      await sendMessageToAsset(message, 'MINIMAL', 'EN');
      console.log('✅ Value post sent to Telegram MINIMAL/EN');
    } else {
      console.warn('⚠️ TELEGRAM_CHAT_ID_MINIMAL_EN not set, skipping Telegram post');
    }
    
    return { success: true, message: 'Value post sent successfully' };
  } catch (error) {
    console.error('❌ Value post failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時（オプション: 1日1回、VSL1と交互に投稿）
module.exports = async (req, res) => {
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await postValueContent();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 手動実行用
module.exports.postValueContent = postValueContent;
