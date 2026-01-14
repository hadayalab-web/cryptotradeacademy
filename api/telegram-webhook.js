// api/telegram-webhook.js
// Telegram Bot Webhookエンドポイント（無料版登録用コマンド処理）

const { handleBotCommand } = require('../services/telegram/bot-commands');

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

    // Telegram Updateオブジェクトの検証
    if (!update || !update.update_id) {
      return res.status(400).json({ error: 'Invalid Telegram update' });
    }

    // コマンドを処理
    const result = await handleBotCommand(update);

    if (result.success) {
      return res.status(200).json({ ok: true, result });
    } else {
      // コマンドではない、または処理不要なメッセージの場合は200を返す（Telegramの要件）
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
