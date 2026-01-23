// api/telegram-webhook.js
// Telegram Bot Webhookエンドポイント（無料版登録用コマンド処理 + グループメッセージ監視）

const { handleBotCommand } = require('../services/telegram/bot-commands');
const { monitorGroupMessage } = require('../services/lead-discovery/telegramGroupMonitor');
const { enqueueLead } = require('../services/lead-discovery/priorityQueue');

/**
 * 監視対象グループIDを取得（環境変数から）
 */
function getMonitoredGroupIds() {
  const groups = {
    en: process.env.TELEGRAM_MONITORED_GROUPS_EN?.split(',').map(id => id.trim()) || [],
    es: process.env.TELEGRAM_MONITORED_GROUPS_ES?.split(',').map(id => id.trim()) || [],
    'pt-br': process.env.TELEGRAM_MONITORED_GROUPS_PT_BR?.split(',').map(id => id.trim()) || [],
    ar: process.env.TELEGRAM_MONITORED_GROUPS_AR?.split(',').map(id => id.trim()) || [],
    ja: process.env.TELEGRAM_MONITORED_GROUPS_JA?.split(',').map(id => id.trim()) || [],
    ko: process.env.TELEGRAM_MONITORED_GROUPS_KO?.split(',').map(id => id.trim()) || [],
  };
  
  // すべてのグループIDをフラット化
  const allGroupIds = Object.values(groups).flat();
  
  return { groups, allGroupIds };
}

/**
 * グループメッセージを監視してリードを発見
 */
async function handleGroupMessage(update) {
  const message = update.message;
  if (!message || !message.chat) return null;
  
  const chat = message.chat;
  const chatType = chat.type;
  
  // グループまたはスーパーグループのみ処理
  if (chatType !== 'group' && chatType !== 'supergroup') {
    return null;
  }
  
  const groupId = chat.id.toString();
  const { groups, allGroupIds } = getMonitoredGroupIds();
  
  // 監視対象グループかチェック
  if (!allGroupIds.includes(groupId)) {
    return null; // 監視対象外のグループ
  }
  
  // 言語を判定（グループIDから言語を逆引き）
  let lang = 'en'; // デフォルト
  for (const [langCode, groupIds] of Object.entries(groups)) {
    if (groupIds.includes(groupId)) {
      lang = langCode;
      break;
    }
  }
  
  // グループメッセージを監視してリードを発見
  const lead = await monitorGroupMessage(message, groupId, lang);
  
  if (!lead) {
    return null; // リードが見つからなかった
  }
  
  // リードをキューに追加
  // 新しいワークフローでは、X API経由のリプライ送信（replyVSL1ToLead）を使用します
  // Telegram DM経由の直接送信（sendVSL1ToLead）は削除されました
  try {
    const jobId = await enqueueLead(lead);
    
    // ドンピシャリードの場合も、キューに追加してlead-discovery.jsで処理されます
    // （X API経由のリプライ送信のため）
    
    return { success: true, action: 'lead_enqueued', lead, jobId };
  } catch (error) {
    console.error('[Telegram Webhook] Failed to process group lead:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Telegram Webhook Handler
 * POST /api/telegram-webhook
 */
async function handler(req, res) {
  // POSTのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    // デバッグログ（本番環境では削除推奨）
    console.log('[Telegram Webhook] Received update:', JSON.stringify(update, null, 2));

    // Telegram Updateオブジェクトの検証
    if (!update || !update.update_id) {
      console.warn('[Telegram Webhook] Invalid update object:', update);
      return res.status(400).json({ error: 'Invalid Telegram update' });
    }

    // グループメッセージの監視（コマンド処理の前に実行）
    if (update.message && update.message.chat) {
      const chatType = update.message.chat.type;
      if (chatType === 'group' || chatType === 'supergroup') {
        const groupResult = await handleGroupMessage(update);
        if (groupResult && groupResult.success) {
          console.log('[Telegram Webhook] Group message processed:', groupResult.action);
          // グループメッセージの監視が成功した場合でも、コマンド処理を続行
        }
      }
    }

    // コマンドを処理
    const result = await handleBotCommand(update);

    if (result.success) {
      console.log('[Telegram Webhook] Command processed successfully:', result.action || 'unknown');
      return res.status(200).json({ ok: true, result });
    } else {
      // コマンドではない、または処理不要なメッセージの場合は200を返す（Telegramの要件）
      console.log('[Telegram Webhook] Command ignored:', result.error || 'Not a command');
      return res.status(200).json({ ok: true, ignored: true, reason: result.error || 'Not a command' });
    }
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error.message);
    console.error('[Telegram Webhook] Stack:', error.stack);
    
    // エラーでも200を返す（Telegramの要件）
    return res.status(200).json({ ok: false, error: error.message });
  }
}

module.exports = handler;

// Vercel/Next.js用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = handler;
}
