// 環境変数チェック用のシンプルなテスト
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
console.log('📁 .env file path:', envPath);
console.log('📁 .env file exists:', fs.existsSync(envPath));

const envResult = dotenv.config({ path: envPath });
console.log('📁 dotenv result:', envResult.error ? 'ERROR: ' + envResult.error.message : 'SUCCESS');

console.log('\n🔍 Environment Variables:');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set (' + process.env.TELEGRAM_BOT_TOKEN.slice(-4) + ')' : 'Not Set');
console.log('TELEGRAM_CHAT_ID_BTC_EN:', process.env.TELEGRAM_CHAT_ID_BTC_EN || 'Not Set');
console.log('TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID || 'Not Set');
console.log('TELEGRAM_CHAT_ID_MINIMAL:', process.env.TELEGRAM_CHAT_ID_MINIMAL || 'Not Set');
