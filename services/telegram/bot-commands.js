// services/telegram/bot-commands.js
// 無料版登録用Telegram Botコマンドハンドラー + Callback Queryハンドラー

const { addFreeUser, isFreeUser, removeFreeUser, getFreeUserCount } = require('../free-users/manager');
const { sendMessageToUser } = require('./bot');
const { getWhopUpgradeLink } = require('./whop-links');
const { incrementSavedCount } = require('./reaction-counter'); // 集計サービス
const { fillScoutKit } = require('../../config/telegramScoutTemplates');
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const SCOUT_LANGS = ['en', 'es', 'pt', 'ko', 'ar'];

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function normalizeLang(value) {
  if (!value) return null;
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

/**
 * /start コマンドのパラメータを解析
 * Grok CSO+CFO推奨: 正規表現強化で抽出精度99%以上
 * ソース追跡対応: minimal_en_x, minimal_en_x_quote などのパターンを解析
 * @param {string} param - /startコマンドのパラメータ
 * @returns {Object} { lang: string|null, referralCode: string|null, source: string|null }
 */
function parseStartParam(param) {
  if (!param) return { lang: null, referralCode: null, source: null };
  
  // 正規化: 空白削除、小文字化
  const normalized = param.trim().toLowerCase();

  // 1. "minimal" のみの場合
  if (normalized === 'minimal') {
    return { lang: null, referralCode: null, source: 'telegram' };
  }

  // 2. "minimal_en_x", "minimal_ja_x_quote", "minimal_en_x_minimal" などのパターン（ソース追跡付き）
  // パターン: minimal_[lang]_[source] または minimal_[lang]_x_quote または minimal_[lang]_x_minimal
  const minimalWithSourceMatch = normalized.match(/^minimal[_-](ja|en|es|pt[-_]?br|ar|ko|jp|kr)(?:_(x(?:_(?:quote|minimal))?))?$/);
  if (minimalWithSourceMatch) {
    let langCode = minimalWithSourceMatch[1];
    const sourcePart = minimalWithSourceMatch[2] || null;
    
    // 別名の正規化
    if (langCode === 'jp') langCode = 'ja';
    if (langCode === 'kr') langCode = 'ko';
    if (langCode === 'ptbr' || langCode === 'pt_br') langCode = 'pt-br';
    
    // ソースの正規化
    let source = 'telegram'; // デフォルト
    if (sourcePart === 'x') {
      source = 'x_direct';
    } else if (sourcePart === 'x_quote') {
      source = 'x_quote';
    } else if (sourcePart === 'x_minimal') {
      source = 'x_minimal';
    }
    
    return { lang: normalizeLang(langCode), referralCode: null, source };
  }

  // 3. "minimal_ja", "minimal-en", "minimal_pt-br" などのパターン（ソースなし）
  const minimalMatch = normalized.match(/^minimal[_-](ja|en|es|pt[-_]?br|ar|ko|jp|kr)$/);
  if (minimalMatch) {
    let langCode = minimalMatch[1];
    // 別名の正規化
    if (langCode === 'jp') langCode = 'ja';
    if (langCode === 'kr') langCode = 'ko';
    if (langCode === 'ptbr' || langCode === 'pt_br') langCode = 'pt-br';
    return { lang: normalizeLang(langCode), referralCode: null, source: 'telegram' };
  }

  // 4. 言語コードのみの場合（ja, en, es, pt-br, ar, ko）
  const lang = normalizeLang(normalized);
  if (lang) {
    return { lang, referralCode: null, source: 'telegram' };
  }

  // 5. リファラルコードとして扱う
  return { lang: null, referralCode: param, source: 'telegram' };
}

/**
 * Telegram Botコマンドを処理する
 * @param {Object} update - Telegram Updateオブジェクト
 * @returns {Promise<Object>} レスポンス
 */
async function handleBotCommand(update) {
  // Callback Query (ボタン押下) の処理
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query);
  }

  // 通常のメッセージコマンドの処理
  if (!update.message || !update.message.text) {
    // エラーではないが、処理対象外
    return { success: false, ignored: true, error: 'Invalid update format' };
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
  } else if (message.startsWith('/getlink')) {
    return handleGetlinkCommand(chatId, message);
  }

  return { success: false, error: 'Unknown command' };
}

/**
 * /getlink [lang] — アフィリエイト用「1分で完了」キットを返す（自動応答・断らせない）
 * 一通目DMで「このBotに /getlink と送ってリンクと素材を取得」と案内する想定。
 */
async function handleGetlinkCommand(chatId, message) {
  const parts = message.trim().split(/\s+/);
  const langArg = (parts[1] || '').toLowerCase().split('-')[0];
  const lang = SCOUT_LANGS.includes(langArg) ? langArg : 'en';
  const inviteUrl = process.env.FIRSTPROMOTER_INVITE_URL || 'https://firstpromoter.com';
  const kit = fillScoutKit(lang, { inviteUrl });
  try {
    await sendMessageToUser(chatId, kit);
    return { success: true, message: 'Scout kit sent', lang };
  } catch (error) {
    console.error('[BotCommands] Error sending /getlink kit:', error.message);
    throw error;
  }
}

/**
 * Callback Query (ボタン押下) を処理
 */
async function handleCallbackQuery(query) {
  const { id, data, from } = query;
  
  try {
    // "saved" アクションの処理
    if (data === 'action_saved') {
      const userId = from.id.toString();
      
      try {
        // カウントアップ（非同期、重複防止機能付き）
        const counts = await incrementSavedCount(userId);
        
        // ユーザーにフィードバック（ポップアップ通知）
        // answerCallbackQuery を使用（showAlert: trueで通知を表示）
        let notificationText;
        if (counts.isNewUser) {
          // 新規ユーザーの場合：カウントを表示
          notificationText = `🔥 Defense Confirmed! (Today: ${counts.today} protected)`;
        } else {
          // 既にクリック済みの場合：別のメッセージを表示
          notificationText = `🔥 You've already confirmed today! (Today: ${counts.today} protected)`;
        }
        await answerCallbackQuery(id, notificationText, true);
        
        console.log(`[BotCommands] Callback query processed: action_saved for user ${userId}, counts:`, counts);
        
        return { success: true, action: 'saved', counts };
      } catch (error) {
        console.error(`[BotCommands] Error processing action_saved for user ${userId}:`, error.message);
        // エラー時も通知を表示（カウントは失敗してもユーザー体験を損なわない）
        await answerCallbackQuery(id, '🔥 Defense Confirmed!', false);
        return { success: false, error: error.message };
      }
    }
    
    // 未知のアクション
    await answerCallbackQuery(id, 'Unknown action', false);
    return { success: false, error: 'Unknown callback action' };
    
  } catch (error) {
    console.error('[BotCommands] Error handling callback query:', error);
    // エラー時でも必ずanswerCallbackQueryを呼び出す（Telegramの要件）
    try {
      await answerCallbackQuery(id, 'An error occurred. Please try again.', false);
    } catch (answerError) {
      console.error('[BotCommands] Failed to answer callback query on error:', answerError);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Telegram API: answerCallbackQuery
 * ボタンを押した後のローディング状態を消し、オプションでテキストを表示する
 */
async function answerCallbackQuery(callbackQueryId, text = null, showAlert = false) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[BotCommands] TELEGRAM_BOT_TOKEN is not set');
    return;
  }
  
  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`);
  const body = {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: showAlert
  };
  
  try {
    console.log(`[BotCommands] Answering callback query: id=${callbackQueryId}, text="${text}", showAlert=${showAlert}`);
    
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error(`[BotCommands] answerCallbackQuery failed: ${response.status}`, responseData);
      return false;
    } else {
      console.log(`[BotCommands] Callback query answered successfully:`, responseData);
      return true;
    }
  } catch (error) {
    console.error('[BotCommands] Error answering callback query:', error);
    return false;
  }
}

/**
 * /start コマンドを処理
 */
async function handleStartCommand(chatId, username, firstName, message) {
  try {
    // リファラルコードをチェック（例: /start minimal または /start ref_abc123）
    const parts = message.split(' ');
    const param = parts.length > 1 ? parts[1] : null;
    const { lang: paramLang, referralCode, source } = parseStartParam(param);
    const defaultLang = normalizeLang(process.env.LANG || 'en') || 'en';
    const userLang = paramLang || defaultLang;

    // 無料版ユーザーとして登録（ユーザー名とソースも保存）
    const userName = firstName || username || null;
    const isNewUser = await addFreeUser(chatId, userName, userLang, source || 'telegram');

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
    const defaultLang = normalizeLang(process.env.LANG || 'en') || 'en';
    const isNewUser = await addFreeUser(chatId, userName, defaultLang);

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
    const whopUpgradeLink = getWhopUpgradeLink();
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
    const isFree = await isFreeUser(chatId);
    const totalFreeUsers = await getFreeUserCount();

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
