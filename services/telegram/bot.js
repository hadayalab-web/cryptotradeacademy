const fetch = require('node-fetch');

// 環境変数から設定を読み込み
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID; // デフォルト配信先
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN) console.warn("⚠️ TELEGRAM_BOT_TOKEN is not set.");

/**
 * Send a message to Telegram
 * @param {string} text - The message text (HTML supported)
 * @param {string} chatId - Target Chat ID (optional, defaults to env channel)
 */
async function sendMessage(text, chatId = CHANNEL_ID) {
  if (!chatId) {
    console.error("❌ Target Chat ID is missing.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Telegram API Error: ${result.description}`);
    }
    console.log(`✅ Message sent to ${chatId}`);
    return result;

  } catch (error) {
    console.error("❌ Failed to send Telegram message:", error);
  }
}

module.exports = { sendMessage };
