// services/telegram/bot-commands.js
// 無料版登録用Telegram Botコマンドハンドラー

const { addFreeUser, isFreeUser, removeFreeUser, getFreeUserCount } = require('../free-users/manager');
const { sendMessageToUser } = require('./bot');

/**
 * Telegram Botコマンドを処理する
 * @param {Object} update - Telegram Updateオブジェクト
 * @returns {Promise<Object>} レスポンス
 */
async function handleBotCommand(update) {
  if (!update.message || !update.message.text) {
    return { success: false, error: 'Invalid update format' };
  }

  const message = update.message.text.trim();
  const chatId = update.message.chat.id.toString();
  const username = update.message.from?.username || null;
  const firstName = update.message.from?.first_name || null;

  // コマンドを解析
  if (message.startsWith('/start')) {
    return handleStartCommand(chatId, username, firstName, message);
  } else if (message.startsWith('/free')) {
    return handleFreeCommand(chatId, username, firstName);
  } else if (message.startsWith('/upgrade')) {
    return handleUpgradeCommand(chatId, username, firstName);
  } else if (message.startsWith('/help')) {
    return handleHelpCommand(chatId, username, firstName);
  } else if (message.startsWith('/status')) {
    return handleStatusCommand(chatId, username, firstName);
  }

  return { success: false, error: 'Unknown command' };
}

/**
 * /start コマンドを処理
 */
async function handleStartCommand(chatId, username, firstName, message) {
  try {
    // リファラルコードをチェック（例: /start minimal または /start ref_abc123）
    const parts = message.split(' ');
    const param = parts.length > 1 ? parts[1] : null;
    const isMinimal = param === 'minimal';
    const referralCode = param && param !== 'minimal' ? param : null;

    // 無料版ユーザーとして登録（ユーザー名も保存）
    const userName = firstName || username || null;
    const isNewUser = addFreeUser(chatId, userName);

    const welcomeMessage = `🌤️ Welcome to Trap Defense BTC - Free Version!

${isNewUser ? '✅ You\'ve been registered! Get the trap avoidance logic that pros use (FREE).' : '👋 Welcome back!'}

📊 What You'll Get:
• Daily Trap Score (0-100) - Identify Bitcoin traps before they hit
• Quick market insights
• Dr. Grok's mental notes
• Basic trap alerts

⚠️ Don't lose your capital. Get free daily trap alerts now.

🚀 Want More?
Upgrade to Full Access for:
• Complete on-chain analysis
• AI-powered insights
• Real-time trap alerts
• Full Dr. Grok support

💡 Commands:
/free - Join free version
/upgrade - Upgrade to full access
/help - Show all commands
/status - Check your status

${referralCode ? `\n📎 Referral code detected: ${referralCode}` : ''}

For educational purposes only. Not financial advice.`;

    // ユーザーに直接メッセージを送信
    await sendMessageToUser(chatId, welcomeMessage);

    return {
      success: true,
      message: welcomeMessage,
      isNewUser,
      referralCode,
      chatId,
    };
  } catch (error) {
    console.error('[BotCommands] Error handling /start:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * /free コマンドを処理
 */
async function handleFreeCommand(chatId, username, firstName) {
  try {
    const userName = firstName || username || null;
    const isNewUser = addFreeUser(chatId, userName);

    const message = isNewUser
      ? `✅ You've been registered for free Trap Defense BTC reports!

You'll receive daily updates with:
• Trap Score
• Quick insights
• Dr. Grok's mental notes

Use /upgrade to unlock full access.`
      : `👋 You're already registered for free reports!

Use /upgrade to unlock full access.`;

    // ユーザーに直接メッセージを送信
    await sendMessageToUser(chatId, message);

    return {
      success: true,
      message,
      isNewUser,
      chatId,
    };
  } catch (error) {
    console.error('[BotCommands] Error handling /free:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * /upgrade コマンドを処理
 */
async function handleUpgradeCommand(chatId, username, firstName) {
  try {
    const whopUpgradeLink = process.env.WHOP_UPGRADE_LINK || process.env.WHOP_PRODUCT_LINK_EN || 'https://whop.com/trap-defense-btc';
    // VSL2: バックエンド（有料版コンバージョン用）
    const vslLink = process.env.VSL2_YOUTUBE_LINK || process.env.VSL_YOUTUBE_LINK || '';

    let message = `🚀 Upgrade to Full Access

Unlock the complete Trap Defense BTC experience:

✨ Full Intelligence Report
• Complete on-chain analysis
• AI-powered insights
• Real-time trap alerts
• Exit Map & Mental Training
• Full Dr. Grok support`;

    // YouTube VSLリンクを追加（サムネイル付きで表示される）
    if (vslLink) {
      message += `\n\n🎬 Watch Our Story (2 min):
${vslLink}`;
    }

    message += `\n\n🎯 Upgrade Now
→ ${whopUpgradeLink}

$69/month • Cancel anytime

After upgrading, you'll automatically receive full reports!`;

    // ユーザーに直接メッセージを送信
    await sendMessageToUser(chatId, message);

    return {
      success: true,
      message,
      upgradeLink: whopUpgradeLink,
      vslLink,
      chatId,
    };
  } catch (error) {
    console.error('[BotCommands] Error handling /upgrade:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * /help コマンドを処理
 */
async function handleHelpCommand(chatId, username, firstName) {
  const message = `📚 Trap Defense BTC - Commands

/free - Join free version (daily Trap Score)
/upgrade - Upgrade to full access
/status - Check your subscription status
/help - Show this help message

💡 Questions?
Contact support or visit our website.

For educational purposes only. Not financial advice.`;

  // ユーザーに直接メッセージを送信
  await sendMessageToUser(chatId, message);

  return {
    success: true,
    message,
    chatId,
  };
}

/**
 * /status コマンドを処理
 */
async function handleStatusCommand(chatId, username, firstName) {
  try {
    const isFree = isFreeUser(chatId);
    const totalFreeUsers = getFreeUserCount();

    const statusMessage = isFree
      ? `✅ Status: Free Version Active

You're receiving:
• Daily Trap Score
• Quick insights
• Dr. Grok's mental notes

📊 Total Free Users: ${totalFreeUsers}

🚀 Want more? Use /upgrade to unlock full access.`
      : `ℹ️ Status: Not Registered

Use /free to join the free version, or /upgrade for full access.`;

    // ユーザーに直接メッセージを送信
    await sendMessageToUser(chatId, statusMessage);

    return {
      success: true,
      message: statusMessage,
      isFreeUser: isFree,
      totalFreeUsers,
      chatId,
    };
  } catch (error) {
    console.error('[BotCommands] Error handling /status:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleBotCommand,
  handleStartCommand,
  handleFreeCommand,
  handleUpgradeCommand,
  handleHelpCommand,
  handleStatusCommand,
};
