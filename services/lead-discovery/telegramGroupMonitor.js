// services/lead-discovery/telegramGroupMonitor.js
// TG Cryptoグループ監視ボット（100グループ監視）

const { detectKeywords, isPerfectMatch, calculateLeadScore } = require('./keywordMonitor');
const { sendMessageToUser } = require('../telegram/bot');
const { addFreeUser } = require('../free-users/manager');

/**
 * TG Cryptoグループ監視設定
 * 100グループを監視対象とする
 */
const MONITORED_GROUPS = {
  en: [
    // グローバルCryptoコミュニティ（例）
    '@cryptosignals', '@bitcoin', '@cryptotrading', '@btcnews',
    // 実際のグループIDは環境変数から取得
  ],
  es: [
    // LatAm Cryptoコミュニティ
    '@criptomonedas', '@bitcoinlatam', '@tradingcripto',
  ],
  'pt-br': [
    // ブラジルDeFiコミュニティ
    '@bitcoinbrasil', '@criptobrasil', '@tradingcripto',
  ],
  ar: [
    // 中東Crypto投資家
    '@bitcoinarab', '@cryptoarab', '@tradingarab',
  ],
  ja: [
    // 日本BTC損失フォーラム
    '@bitcoinjapan', '@cryptojapan', '@tradingjapan',
  ],
  ko: [
    // 韓国アルトコイン勢
    '@bitcoinkorea', '@cryptokorea', '@tradingkorea',
  ],
};

/**
 * グループメッセージを監視してリードを発見
 * @param {Object} message - Telegramメッセージオブジェクト
 * @param {string} groupId - グループID
 * @param {string} lang - 言語コード
 * @returns {Object|null} リード情報（発見時）またはnull
 */
async function monitorGroupMessage(message, groupId, lang = 'en') {
  if (!message || !message.text) return null;
  
  // キーワード検出
  const detectionResult = detectKeywords(message.text, lang);
  
  if (!detectionResult.matched) return null;
  
  // リード品質スコア計算
  const userData = {
    engagementRate: message.reactions ? calculateEngagementRate(message.reactions) : 0,
  };
  
  const score = calculateLeadScore(detectionResult, userData);
  const isPerfect = isPerfectMatch(detectionResult, userData);
  
  // リード情報を返す
  return {
    userId: message.from?.id,
    username: message.from?.username || message.from?.first_name,
    chatId: message.chat?.id,
    groupId,
    lang: detectionResult.lang,
    text: message.text.substring(0, 200), // 最初の200文字
    keywords: detectionResult.keywords,
    priority: detectionResult.priority,
    score,
    isPerfectMatch: isPerfect,
    timestamp: new Date().toISOString(),
  };
}

/**
 * エンゲージメント率を計算
 * @param {Object} reactions - Telegramリアクション
 * @returns {number} エンゲージメント率（0-1）
 */
function calculateEngagementRate(reactions) {
  if (!reactions || !Array.isArray(reactions)) return 0;
  
  // リアクション数からエンゲージメント率を推定
  const totalReactions = reactions.reduce((sum, r) => sum + (r.count || 0), 0);
  // 簡易計算: リアクション数 / 100（グループサイズを仮定）
  return Math.min(totalReactions / 100, 1.0);
}

/**
 * 発見したリードにVSL1 DMを送信
 * @param {Object} lead - リード情報
 * @returns {Promise<boolean>} 送信成功時true
 */
async function sendVSL1ToLead(lead) {
  if (!lead || !lead.userId) return false;
  
  // 重複送信防止チェック
  const { hasSentVSL1, markVSL1Sent } = require('./duplicatePrevention');
  if (await hasSentVSL1(lead)) {
    console.log(`[Telegram Lead Discovery] VSL1 already sent to user ${lead.userId} (@${lead.username})`);
    return false;
  }
  
  // レート制限チェック
  const { checkTelegramApiRateLimit, waitForRateLimit } = require('./rateLimiter');
  const canProceed = await checkTelegramApiRateLimit();
  if (!canProceed) {
    console.warn('[Telegram Lead Discovery] Rate limit exceeded, waiting...');
    const waited = await waitForRateLimit(checkTelegramApiRateLimit, 30000); // 最大30秒待機
    if (!waited) {
      console.error('[Telegram Lead Discovery] Rate limit wait timeout');
      return false;
    }
  }
  
  try {
    // VSL1メッセージを生成（言語別）
    const { generateVSL1Message } = require('../telegram/messages/vsl1');
    const { getTelegramDeepLink } = require('../../api/vsl1-post');
    const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
    
    const deepLink = getTelegramDeepLink(lead.lang);
    const message = generateVSL1Message(lead.lang, deepLink, VSL1_YOUTUBE_LINK);
    
    console.log(`[Telegram Lead Discovery] Sending VSL1 to user ${lead.userId} (@${lead.username}, lang: ${lead.lang})`);
    
    // DM送信（インラインボタン付き）
    try {
      const { generateVSL1InlineKeyboard } = require('../../api/vsl1-post');
      const inlineKeyboard = generateVSL1InlineKeyboard(lead.lang);
      
      await sendMessageToUser(lead.userId, message, {
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      });
      console.log(`[Telegram Lead Discovery] Message sent successfully to user ${lead.userId} (with inline buttons)`);
    } catch (sendError) {
      console.error(`[Telegram Lead Discovery] Failed to send message to user ${lead.userId}:`, sendError.message);
      console.error(`[Telegram Lead Discovery] Error details:`, {
        userId: lead.userId,
        username: lead.username,
        lang: lead.lang,
        errorType: sendError.constructor.name,
        errorMessage: sendError.message,
        errorStack: sendError.stack,
      });
      throw sendError; // 再スローして外側のcatchで処理
    }
    
    // 送信済みをマーク
    try {
      await markVSL1Sent(lead);
      console.log(`[Telegram Lead Discovery] Marked VSL1 as sent for user ${lead.userId}`);
    } catch (markError) {
      console.warn(`[Telegram Lead Discovery] Failed to mark VSL1 as sent for user ${lead.userId}:`, markError.message);
      // マーク失敗は致命的ではないので続行
    }
    
    // ユーザーを無料版に登録（既に登録済みの場合はスキップ）
    try {
      await addFreeUser({
        chatId: lead.userId,
        userName: lead.username,
        lang: lead.lang,
        joinedAt: new Date().toISOString(),
      });
      console.log(`[Telegram Lead Discovery] Added free user ${lead.userId} to database`);
    } catch (error) {
      // 既に登録済みの場合はエラーを無視
      if (error.message.includes('already exists')) {
        console.log(`[Telegram Lead Discovery] User ${lead.userId} already exists in free users database`);
      } else {
        console.warn(`[Telegram Lead Discovery] Failed to add free user ${lead.userId}:`, error.message);
        // ユーザー登録失敗は致命的ではないので続行
      }
    }
    
    console.log(`[Telegram Lead Discovery] ✅ Successfully sent VSL1 to user ${lead.userId} (@${lead.username})`);
    return true;
  } catch (error) {
    console.error(`[Telegram Lead Discovery] ❌ Failed to send VSL1 to lead:`, {
      userId: lead?.userId,
      username: lead?.username,
      lang: lead?.lang,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return false;
  }
}

/**
 * グループ監視を開始（実際の実装ではTelegram Bot APIのWebhookを使用）
 * @param {string} groupId - 監視対象グループID
 * @param {string} lang - 言語コード
 */
async function startMonitoringGroup(groupId, lang = 'en') {
  // 実際の実装では、Telegram Bot APIのgetUpdatesまたはWebhookを使用
  // ここでは設定のみを返す
  return {
    groupId,
    lang,
    status: 'monitoring',
    keywords: detectKeywords('', lang).keywords.length,
  };
}

module.exports = {
  MONITORED_GROUPS,
  monitorGroupMessage,
  sendVSL1ToLead,
  startMonitoringGroup,
  calculateEngagementRate,
};
