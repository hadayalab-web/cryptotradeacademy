// scripts/test-ar-delivery-actual.js
// AR版の無料版（Minimal Version）と有料版（Regular Briefing）の実際のテスト配信

// 環境変数を読み込む
const path = require('path');
const dotenv = require('dotenv');

// 親ディレクトリの.envを読み込む（優先）
const parentEnvPath = path.resolve(__dirname, '..', '..', '.env');
if (require('fs').existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath, override: false });
}

// cryptosignal-ai/.envも読み込む（存在する場合、上書き）
const localEnvPath = path.resolve(__dirname, '..', '.env');
if (require('fs').existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

// デフォルトの.envも読み込む（現在のディレクトリ）
dotenv.config({ override: false });

// 環境変数を設定（AR版のみに配信）
process.env.LANG = 'ar';
process.env.REGULAR_MULTI_LANG = 'false'; // AR版のみ
process.env.MINIMAL_MULTI_LANG = 'false'; // AR版のみ

// cron.jsのハンドラーをインポート
const cronModule = require('../api/cron');
const cronHandler = cronModule.default || cronModule;

// テスト用のRequest/Responseオブジェクトを作成
function createMockRequest(options = {}) {
  const { type = 'REGULAR', force = true } = options;
  
  return {
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
    },
    query: {
      force: force ? 'true' : 'false',
      type: type, // 'REGULAR' or 'EMERGENCY'
    },
  };
}

function createMockResponse() {
  const logs = [];
  let statusCode = 200;
  
  const res = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      statusCode = code;
      return this;
    },
    json: function(body) {
      logs.push({ statusCode, body, timestamp: new Date().toISOString() });
      console.log(`[Response ${statusCode}]`, JSON.stringify(body, null, 2));
      return this;
    },
    getLogs: function() {
      return logs;
    },
  };
  
  return res;
}

/**
 * AR版の定期配信（REGULAR）テスト
 */
async function testRegularDelivery() {
  console.log('\n📧 ===== AR版 有料版（Regular Briefing）テスト配信 =====\n');
  
  const req = createMockRequest({ type: 'REGULAR', force: true });
  const res = createMockResponse();
  
  try {
    console.log('[Test] 環境変数確認:');
    console.log(`  LANG: ${process.env.LANG}`);
    console.log(`  REGULAR_MULTI_LANG: ${process.env.REGULAR_MULTI_LANG}`);
    console.log(`  MINIMAL_MULTI_LANG: ${process.env.MINIMAL_MULTI_LANG}`);
    console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '設定済み' : '未設定'}`);
    console.log(`  TELEGRAM_CHAT_ID_BTC_AR: ${process.env.TELEGRAM_CHAT_ID_BTC_AR ? '設定済み' : '未設定'}`);
    console.log('');
    
    await cronHandler(req, res);
    
    if (res.statusCode === 200) {
      console.log('\n✅ AR版 有料版（Regular Briefing）テスト配信: 成功');
      const logs = res.getLogs();
      if (logs.length > 0) {
        console.log('📊 レスポンス:', JSON.stringify(logs[0].body, null, 2));
      }
    } else {
      console.error('\n❌ AR版 有料版（Regular Briefing）テスト配信: 失敗', `Status: ${res.statusCode}`);
      const logs = res.getLogs();
      if (logs.length > 0) {
        console.error('📊 エラーレスポンス:', JSON.stringify(logs[0].body, null, 2));
      }
    }
  } catch (error) {
    console.error('\n❌ AR版 有料版（Regular Briefing）テスト配信: エラー', error.message);
    console.error(error.stack);
  }
}

/**
 * AR版の無料版（MINIMAL）テスト
 */
async function testMinimalDelivery() {
  console.log('\n🆓 ===== AR版 無料版（Minimal Version）テスト配信 =====\n');
  
  const req = createMockRequest({ type: 'REGULAR', force: true });
  const res = createMockResponse();
  
  try {
    console.log('[Test] 環境変数確認:');
    console.log(`  LANG: ${process.env.LANG}`);
    console.log(`  REGULAR_MULTI_LANG: ${process.env.REGULAR_MULTI_LANG}`);
    console.log(`  MINIMAL_MULTI_LANG: ${process.env.MINIMAL_MULTI_LANG}`);
    console.log(`  TELEGRAM_BOT_TOKEN_MINIMAL: ${process.env.TELEGRAM_BOT_TOKEN_MINIMAL ? '設定済み' : '未設定'}`);
    console.log(`  TELEGRAM_CHAT_ID_MINIMAL_AR: ${process.env.TELEGRAM_CHAT_ID_MINIMAL_AR ? '設定済み' : '未設定'}`);
    console.log(`  TELEGRAM_CHAT_ID_MINIMAL: ${process.env.TELEGRAM_CHAT_ID_MINIMAL ? '設定済み' : '未設定'}`);
    console.log('');
    
    await cronHandler(req, res);
    
    if (res.statusCode === 200) {
      console.log('\n✅ AR版 無料版（Minimal Version）テスト配信: 成功');
      const logs = res.getLogs();
      if (logs.length > 0) {
        console.log('📊 レスポンス:', JSON.stringify(logs[0].body, null, 2));
      }
    } else {
      console.error('\n❌ AR版 無料版（Minimal Version）テスト配信: 失敗', `Status: ${res.statusCode}`);
      const logs = res.getLogs();
      if (logs.length > 0) {
        console.error('📊 エラーレスポンス:', JSON.stringify(logs[0].body, null, 2));
      }
    }
  } catch (error) {
    console.error('\n❌ AR版 無料版（Minimal Version）テスト配信: エラー', error.message);
    console.error(error.stack);
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 AR版テスト配信を開始します...\n');
  console.log('⚠️  注意: このスクリプトは実際にTelegramに配信します\n');
  
  // 有料版（Regular Briefing）のテスト
  await testRegularDelivery();
  
  // 少し待機（ログの見やすさのため）
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 無料版（Minimal Version）のテスト
  await testMinimalDelivery();
  
  console.log('\n✅ AR版テスト配信が完了しました');
  console.log('\n📱 Telegramで実際のUIを確認してください');
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ テスト配信中にエラーが発生しました:', error);
    process.exit(1);
  });
}

module.exports = { testRegularDelivery, testMinimalDelivery };
