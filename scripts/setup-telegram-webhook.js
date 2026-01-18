// scripts/setup-telegram-webhook.js
// Telegram Bot Webhook URL設定スクリプト

const path = require('path');
const dotenv = require('dotenv');

// 環境変数を読み込む
const parentEnvPath = path.resolve(__dirname, '..', '..', '.env');
if (require('fs').existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath, override: false });
}

const localEnvPath = path.resolve(__dirname, '..', '.env');
if (require('fs').existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

dotenv.config({ override: false });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;

/**
 * Telegram Bot Webhook URLを設定
 */
async function setTelegramWebhook(webhookUrl) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`);
  
  const body = {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'], // メッセージとコールバッククエリを受け取る
  };

  try {
    console.log(`🔗 Setting webhook URL: ${webhookUrl}`);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      throw new Error(`Failed to set webhook: ${JSON.stringify(data)}`);
    }

    console.log('✅ Webhook set successfully!');
    console.log('📊 Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message);
    throw error;
  }
}

/**
 * 現在のWebhook情報を取得
 */
async function getWebhookInfo() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      throw new Error(`Failed to get webhook info: ${JSON.stringify(data)}`);
    }

    return data.result;
  } catch (error) {
    console.error('❌ Error getting webhook info:', error.message);
    throw error;
  }
}

/**
 * Webhookを削除
 */
async function deleteWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true })
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      throw new Error(`Failed to delete webhook: ${JSON.stringify(data)}`);
    }

    console.log('✅ Webhook deleted successfully!');
    return data;
  } catch (error) {
    console.error('❌ Error deleting webhook:', error.message);
    throw error;
  }
}

// メイン処理
async function main() {
  const command = process.argv[2];
  const webhookUrl = process.argv[3];

  try {
    if (command === 'set') {
      if (!webhookUrl) {
        console.error('❌ Usage: node scripts/setup-telegram-webhook.js set <webhook_url>');
        console.error('   Example: node scripts/setup-telegram-webhook.js set https://your-domain.vercel.app/api/telegram-webhook');
        process.exit(1);
      }
      await setTelegramWebhook(webhookUrl);
    } else if (command === 'info') {
      const info = await getWebhookInfo();
      console.log('📊 Current Webhook Info:');
      console.log(JSON.stringify(info, null, 2));
    } else if (command === 'delete') {
      await deleteWebhook();
    } else {
      console.log('📖 Usage:');
      console.log('  Set webhook:   node scripts/setup-telegram-webhook.js set <webhook_url>');
      console.log('  Get webhook info: node scripts/setup-telegram-webhook.js info');
      console.log('  Delete webhook: node scripts/setup-telegram-webhook.js delete');
      console.log('');
      console.log('📝 Example:');
      console.log('  node scripts/setup-telegram-webhook.js set https://your-domain.vercel.app/api/telegram-webhook');
      console.log('');
      
      // 現在のWebhook情報を表示
      try {
        const info = await getWebhookInfo();
        console.log('📊 Current Webhook Info:');
        console.log(JSON.stringify(info, null, 2));
      } catch (error) {
        console.log('⚠️  Could not get webhook info:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { setTelegramWebhook, getWebhookInfo, deleteWebhook };
