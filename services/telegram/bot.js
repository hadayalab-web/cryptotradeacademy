// services/telegram/bot.js
// Node.js 18+ 標準 fetch を使用した Telegram Bot クライアント

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in .env.local");
}

/**
 * Send a message to the configured Telegram chat.
 * @param {string} text
 */
async function sendMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ Telegram credentials are missing. Skipping sendMessage.");
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`);
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "Markdown"
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    console.log("📨 Telegram sent:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("❌ Telegram sendMessage failed:", error.message);
    throw error;
  }
}

module.exports = { sendMessage };
