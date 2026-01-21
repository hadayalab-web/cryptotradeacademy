// services/whop/promo-monitor.js
// プロモコードの残り枠監視とリマインド送信

const { getRemainingStock, updatePromoCode } = require('./client');
const { loadFreeUsers } = require('../free-users/manager');

// KVストレージ（送信履歴管理用）
let kvStorage = null;
try {
  const { kv } = require('@vercel/kv');
  kvStorage = kv;
} catch (error) {
  console.warn('[PromoMonitor] KV storage not available:', error.message);
}

// プロモコードID（環境変数から取得、またはデフォルト値）
const PROMO_CODE_ID = process.env.WHOP_PROMO_CODE_ID || process.env.PROMO_CODE_ID;
const PROMO_CODE = process.env.WHOP_PROMO_CODE || 'DEFEND50';

// 自動補充設定（環境変数から取得）
const AUTO_RESTOCK_ENABLED = process.env.WHOP_AUTO_RESTOCK_ENABLED === 'true';
const AUTO_RESTOCK_THRESHOLD = parseInt(process.env.WHOP_AUTO_RESTOCK_THRESHOLD || '20', 10); // デフォルト: 20枚以下で自動補充
const AUTO_RESTOCK_TARGET = parseInt(process.env.WHOP_AUTO_RESTOCK_TARGET || '200', 10); // デフォルト: 200枚に補充

// しきい値設定（残り枠数がこの値を下回ったときにリマインドを送信）
const STOCK_THRESHOLDS = [
  { threshold: 50, message: '50 spots left' },
  { threshold: 25, message: '25 spots left' },
  { threshold: 10, message: 'Only 10 spots left!' },
  { threshold: 5, message: 'Only 5 spots left!' },
  { threshold: 1, message: 'LAST SPOT AVAILABLE!' },
];

// 言語別Whop URLマッピング
const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

// LANG を正規化
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';
const WHOP_PRODUCT_URL = WHOP_PRODUCT_URLS[LANG] || WHOP_PRODUCT_URLS['en'];

/**
 * 無料版ユーザーの正規化
 * @param {Object|string} user - ユーザーオブジェクトまたはチャットID文字列
 * @returns {Object} 正規化されたユーザーオブジェクト
 */
function normalizeFreeUser(user) {
  if (typeof user === 'string') {
    return {
      chatId: user,
      joinedAt: new Date(0).toISOString(),
      vsl2Sent: false,
      vsl2LastCallSent: false,
      userName: null,
    };
  }

  return {
    chatId: user.chatId,
    joinedAt: user.joinedAt,
    vsl2Sent: Boolean(user.vsl2Sent),
    vsl2LastCallSent: Boolean(user.vsl2LastCallSent),
    userName: user.userName || null,
  };
}

/**
 * プロモコードリマインド対象の無料版ユーザーを取得
 * VSL2を受け取ったユーザーのみ対象
 * @returns {Promise<Array<Object>>} {chatId, joinedAt, userName}
 */
async function getFreeUsersForPromoReminder() {
  const users = await loadFreeUsers();
  return users
    .map(normalizeFreeUser)
    .filter(user => user.vsl2Sent && user.chatId)
    .map(user => ({
      chatId: user.chatId,
      joinedAt: user.joinedAt,
      userName: user.userName,
    }));
}

/**
 * 残り枠数に基づいたリマインドメッセージを生成
 * @param {number|null} remainingStock - 残り枠数（無制限の場合はnull）
 * @param {string} userName - ユーザー名
 * @returns {string|null} リマインドメッセージ（送信不要の場合はnull）
 */
function generateStockReminderMessage(remainingStock, userName = 'there') {
  if (remainingStock === null) {
    // 無制限の場合はリマインド不要
    return null;
  }

  if (remainingStock <= 0) {
    // 残り枠が0の場合は送信不要
    return null;
  }

  // しきい値をチェック
  const threshold = STOCK_THRESHOLDS.find(t => remainingStock <= t.threshold);
  if (!threshold) {
    // しきい値を下回っていない場合は送信不要
    return null;
  }

  // メッセージを生成
  const urgencyEmoji = remainingStock <= 5 ? '🚨' : remainingStock <= 10 ? '⚠️' : '💡';
  
  const lastChanceMessage = remainingStock <= 5 
    ? '⏰ This is your LAST CHANCE! Don\'t miss out!' 
    : '💡 Limited availability - Secure your spot now!';
  
  return `${urgencyEmoji} **${threshold.message.toUpperCase()}**

🎁 Special Reminder for You, ${userName}!

The promo code **${PROMO_CODE}** (50% OFF) is running out of spots.

📊 **Current Status**: Only ${remainingStock} spot${remainingStock > 1 ? 's' : ''} remaining!

💰 Use Promo Code: **${PROMO_CODE}** for 50% OFF!

🚀 Get the pro's weapon at half price:
${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}

${lastChanceMessage}`;
}

/**
 * しきい値の送信履歴をチェック（重複送信防止）
 * @param {number} threshold - しきい値
 * @returns {Promise<boolean>} 既に送信済みの場合はtrue
 */
async function hasSentThreshold(threshold) {
  if (!kvStorage || !PROMO_CODE_ID) {
    return false;
  }

  try {
    const key = `promo_reminder_sent_${PROMO_CODE_ID}_${LANG}`;
    const sentThresholds = await kvStorage.get(key) || [];
    return sentThresholds.includes(threshold);
  } catch (error) {
    console.warn('[PromoMonitor] Failed to check sent thresholds:', error.message);
    return false;
  }
}

/**
 * しきい値の送信履歴を記録（重複送信防止）
 * @param {number} threshold - しきい値
 */
async function markThresholdSent(threshold) {
  if (!kvStorage || !PROMO_CODE_ID) {
    return;
  }

  try {
    const key = `promo_reminder_sent_${PROMO_CODE_ID}_${LANG}`;
    const sentThresholds = await kvStorage.get(key) || [];
    if (!sentThresholds.includes(threshold)) {
      sentThresholds.push(threshold);
      await kvStorage.set(key, sentThresholds);
      console.log(`[PromoMonitor] Marked threshold ${threshold} as sent`);
    }
  } catch (error) {
    console.warn('[PromoMonitor] Failed to mark threshold as sent:', error.message);
  }
}

/**
 * プロモコードの残り枠を監視し、必要に応じてリマインドを送信
 * @returns {Promise<Object>} 監視結果 {remainingStock, sent, threshold}
 */
async function monitorPromoCodeStock() {
  try {
    if (!PROMO_CODE_ID) {
      console.warn('[PromoMonitor] WHOP_PROMO_CODE_ID not set, skipping monitoring');
      return { success: false, error: 'PROMO_CODE_ID not set', skipped: true };
    }

    // 残り枠数を取得
    let remainingStock;
    try {
      remainingStock = await getRemainingStock(PROMO_CODE_ID);
    } catch (error) {
      // プロモコードが見つからない場合のエラーハンドリング
      if (error.message && error.message.includes('404')) {
        console.error(`[PromoMonitor] Promo code ID "${PROMO_CODE_ID}" not found in Whop. Please check WHOP_PROMO_CODE_ID environment variable.`);
        return { success: false, error: `Promo code ID "${PROMO_CODE_ID}" not found`, skipped: true };
      }
      throw error; // その他のエラーは再スロー
    }
    
    if (remainingStock === null) {
      console.log('[PromoMonitor] Promo code has unlimited stock, no reminder needed');
      return { success: true, remainingStock: null, sent: 0 };
    }

    console.log(`[PromoMonitor] Remaining stock: ${remainingStock}`);

    // 自動補充の実行（在庫が少ない場合）
    let autoRestockResult = null;
    if (remainingStock !== null && remainingStock <= AUTO_RESTOCK_THRESHOLD) {
      autoRestockResult = await autoRestockPromoCode(remainingStock);
      
      // 自動補充が成功した場合、在庫数を更新
      if (autoRestockResult && autoRestockResult.success) {
        remainingStock = autoRestockResult.toStock;
        console.log(`[PromoMonitor] Stock updated after auto restock: ${remainingStock}`);
      }
    }

    // 在庫切れ時のCEO通知（緊急対応）
    if (remainingStock === 0) {
      console.error('[PromoMonitor] ⚠️ CRITICAL: Promo code stock is ZERO! CEO notification needed.');
      try {
        const { sendVSLWorkflowReport } = require('../email/ceo-report');
        await sendVSLWorkflowReport({
          status: 'CRITICAL',
          summary: {
            'Promo Code': PROMO_CODE,
            'Remaining Stock': '0 (SOLD OUT)',
            'Action Required': 'Increase stock immediately',
          },
          issues: [
            `⚠️ CRITICAL: Promo code "${PROMO_CODE}" is SOLD OUT (0 remaining).`,
            'Action: Increase stock in Whop Dashboard immediately to prevent revenue loss.',
            'Recommended stock: 100-200 units based on 48h forecast (100-225 conversions expected).',
          ],
        }).catch(error => {
          console.error('[PromoMonitor] Failed to send CEO notification:', error.message);
        });
      } catch (error) {
        console.error('[PromoMonitor] CEO notification error:', error.message);
      }
    }

    // 在庫が少ない場合のCEO警告（10枚以下）
    if (remainingStock > 0 && remainingStock <= 10) {
      console.warn(`[PromoMonitor] ⚠️ WARNING: Promo code stock is low (${remainingStock} remaining). CEO notification needed.`);
      try {
        const { sendVSLWorkflowReport } = require('../email/ceo-report');
        await sendVSLWorkflowReport({
          status: 'WARNING',
          summary: {
            'Promo Code': PROMO_CODE,
            'Remaining Stock': `${remainingStock} (LOW STOCK)`,
            'Action Required': 'Consider increasing stock',
          },
          issues: [
            `⚠️ WARNING: Promo code "${PROMO_CODE}" stock is low (${remainingStock} remaining).`,
            'Action: Consider increasing stock in Whop Dashboard to prevent stockout.',
            'Recommended stock: 100-200 units based on 48h forecast.',
          ],
        }).catch(error => {
          console.error('[PromoMonitor] Failed to send CEO warning:', error.message);
        });
      } catch (error) {
        console.error('[PromoMonitor] CEO warning error:', error.message);
      }
    }

    // しきい値をチェック
    const threshold = STOCK_THRESHOLDS.find(t => remainingStock <= t.threshold);
    if (!threshold) {
      console.log(`[PromoMonitor] Stock (${remainingStock}) above all thresholds, no reminder needed`);
      return { success: true, remainingStock, sent: 0, threshold: null };
    }

    // 既に送信済みかチェック（重複送信防止）
    const alreadySent = await hasSentThreshold(threshold.threshold);
    if (alreadySent) {
      console.log(`[PromoMonitor] Threshold ${threshold.threshold} already sent, skipping`);
      return { success: true, remainingStock, sent: 0, threshold: threshold.threshold, alreadySent: true };
    }

    console.log(`[PromoMonitor] Stock (${remainingStock}) below threshold (${threshold.threshold}), sending reminders`);

    // 無料版ユーザーを取得（VSL2送信済みのユーザー）
    const freeUsers = await getFreeUsersForPromoReminder();
    
    if (freeUsers.length === 0) {
      console.log('[PromoMonitor] No free users to send reminder');
      await markThresholdSent(threshold.threshold);
      return { success: true, remainingStock, sent: 0, threshold: threshold.threshold };
    }

    // リマインドメッセージを生成
    const message = generateStockReminderMessage(remainingStock);
    if (!message) {
      console.log('[PromoMonitor] No reminder message generated');
      await markThresholdSent(threshold.threshold);
      return { success: true, remainingStock, sent: 0, threshold: threshold.threshold };
    }

    // 無料版ユーザーにリマインドを送信
    let sent = 0;
    let failed = 0;

    for (const user of freeUsers) {
      try {
        // ユーザー名をカスタマイズしたメッセージを生成
        const userMessage = generateStockReminderMessage(remainingStock, user.userName || 'there');
        
        if (!userMessage) {
          continue;
        }

        // Telegram DM送信
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
            text: userMessage,
            parse_mode: 'Markdown',
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Telegram API Error: ${response.status} - ${errText}`);
        }

        sent++;
        console.log(`[PromoMonitor] Reminder sent to user ${user.chatId} (remaining stock: ${remainingStock})`);

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`[PromoMonitor] Failed to send reminder to user ${user.chatId}:`, error.message);
      }
    }

    // 送信完了を記録（重複送信防止）
    if (sent > 0) {
      await markThresholdSent(threshold.threshold);
    }

    // 在庫切れまたは在庫が少ない場合の結果に警告フラグを追加
    const result = {
      success: true,
      remainingStock,
      sent,
      failed,
      total: freeUsers.length,
      threshold: threshold.threshold,
    };

    // 自動補充の結果を追加
    if (autoRestockResult) {
      result.autoRestock = autoRestockResult;
    }

    // 在庫切れまたは在庫が少ない場合の警告フラグ
    if (remainingStock === 0) {
      result.stockout = true;
      result.warning = 'CRITICAL: Stock is ZERO!';
    } else if (remainingStock <= 10) {
      result.lowStock = true;
      result.warning = `WARNING: Stock is low (${remainingStock} remaining)`;
    }

    return result;
  } catch (error) {
    console.error('[PromoMonitor] Monitoring failed:', error.message);
    throw error;
  }
}

module.exports = {
  monitorPromoCodeStock,
  generateStockReminderMessage,
  getRemainingStock,
};
