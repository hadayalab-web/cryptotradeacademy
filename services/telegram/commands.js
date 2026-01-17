// services/telegram/commands.js
// Telegram Botコマンドハンドラー（無料版登録用）

const { addFreeUser, isFreeUser, removeFreeUser } = require('../free-users/manager');
const { sendMessageToAsset } = require('./bot');
const { getWhopUpgradeLink } = require('./whop-links');

/**
 * /start コマンドハンドラー
 * 無料版への登録を案内
 */
async function handleStartCommand(chatId, username = null) {
  const welcomeMessage = `🌤️ Welcome to Trap Defense BTC!

I'm your AI assistant for crypto market intelligence.

🎯 What I Offer:
• Free daily Trap Score reports
• Market analysis & insights
• Dr. Grok's psychological support

🚀 Get Started:
Type /free to receive daily free reports

💡 Want Full Access?
Upgrade to get complete intelligence reports, real-time trap alerts, and full Dr. Grok support.

For educational purposes only. Not financial advice.`;

  try {
    await sendMessageToAsset(welcomeMessage, 'MINIMAL');
    return { success: true, message: 'Welcome message sent' };
  } catch (error) {
    console.error('[Commands] Error handling /start:', error.message);
    throw error;
  }
}

/**
 * /free コマンドハンドラー
 * 無料版に登録
 */
async function handleFreeCommand(chatId, username = null) {
  try {
    // 既に登録済みかチェック
    if (await isFreeUser(chatId)) {
      const alreadyRegisteredMessage = `✅ You're already registered for free reports!

You'll receive daily Trap Score reports and market insights.

💡 Want more? Type /upgrade to see full access benefits.

For educational purposes only. Not financial advice.`;
      
      await sendMessageToAsset(alreadyRegisteredMessage, 'MINIMAL');
      return { success: true, alreadyRegistered: true };
    }

    // 無料版ユーザーとして登録
    const added = await addFreeUser(chatId);
    
    if (added) {
      const successMessage = `🎉 Welcome to Trap Defense BTC Free!

You're now registered for daily free reports:
• Daily Trap Score
• Market insights
• Dr. Grok's quick tips

📅 Reports are sent daily at scheduled times.

💡 Want Full Intelligence?
Type /upgrade to unlock:
• Complete on-chain analysis
• Real-time trap alerts (AVOID_LONG/AVOID_SHORT)
• Full Dr. Grok psychological support
• Exit Map & Mental Training

For educational purposes only. Not financial advice.`;
      
      await sendMessageToAsset(successMessage, 'MINIMAL');
      return { success: true, registered: true };
    } else {
      throw new Error('Failed to register free user');
    }
  } catch (error) {
    console.error('[Commands] Error handling /free:', error.message);
    throw error;
  }
}

/**
 * /upgrade コマンドハンドラー
 * 有料版へのアップグレードを案内
 */
async function handleUpgradeCommand(chatId, username = null) {
  const whopUpgradeLink = getWhopUpgradeLink();
  const upgradeMessage = `🚀 Upgrade to Full Intelligence Report

Unlock complete market intelligence:

✨ What You Get:
• Complete on-chain analysis (all indicators)
• AI-powered market insights & trap detection
• Real-time alerts: AVOID_LONG / AVOID_SHORT / STANDBY
• Exit Map & Mental Training guidance
• Full Dr. Grok psychological support
• Real-time X sentiment analysis

💡 Why Upgrade?
The difference between protecting capital and losing it is often just one missed trap signal.

🎯 Upgrade Now
→ Upgrade now: ${whopUpgradeLink}
$69/month • Cancel anytime

For educational purposes only. Not financial advice.`;

  try {
    await sendMessageToAsset(upgradeMessage, 'MINIMAL');
    return { success: true, message: 'Upgrade message sent' };
  } catch (error) {
    console.error('[Commands] Error handling /upgrade:', error.message);
    throw error;
  }
}

/**
 * /help コマンドハンドラー
 */
async function handleHelpCommand(chatId, username = null) {
  const helpMessage = `📖 Trap Defense BTC - Help

Available Commands:
/free - Register for free daily reports
/upgrade - See full access benefits
/help - Show this help message

🌤️ About Trap Defense BTC:
We help traders protect their capital by detecting market traps before they happen.

Our approach:
• 70% waiting strategy
• Trap detection & defense
• Mental health support

For educational purposes only. Not financial advice.`;

  try {
    await sendMessageToAsset(helpMessage, 'MINIMAL');
    return { success: true, message: 'Help message sent' };
  } catch (error) {
    console.error('[Commands] Error handling /help:', error.message);
    throw error;
  }
}

/**
 * Webhook経由でTelegram Botコマンドを処理
 * @param {Object} update - Telegram Update object
 */
async function handleTelegramUpdate(update) {
  if (!update.message || !update.message.text) {
    return { success: false, reason: 'No message text' };
  }

  const message = update.message;
  const chatId = message.chat.id.toString();
  const username = message.chat.username || null;
  const text = message.text.trim();

  // コマンドを抽出
  const commandMatch = text.match(/^\/(\w+)/);
  if (!commandMatch) {
    return { success: false, reason: 'Not a command' };
  }

  const command = commandMatch[1].toLowerCase();

  try {
    switch (command) {
      case 'start':
        return await handleStartCommand(chatId, username);
      case 'free':
        return await handleFreeCommand(chatId, username);
      case 'upgrade':
        return await handleUpgradeCommand(chatId, username);
      case 'help':
        return await handleHelpCommand(chatId, username);
      default:
        return { success: false, reason: `Unknown command: /${command}` };
    }
  } catch (error) {
    console.error(`[Commands] Error handling command /${command}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleStartCommand,
  handleFreeCommand,
  handleUpgradeCommand,
  handleHelpCommand,
  handleTelegramUpdate,
};
