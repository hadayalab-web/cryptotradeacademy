// scripts/test-email-delivery.js
// 定期配信と緊急配信のメール送信テスト

// cron.jsと同じ方法で環境変数を読み込む
// プロジェクトルートの.envを確実に読み込む（cron.jsはdotenvを使っていないが、Vercel環境では自動読み込み）
// テスト環境では明示的に読み込む必要がある
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
  
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      console.log(`[Response ${this.statusCode}]`, JSON.stringify(body, null, 2));
      logs.push({ status: this.statusCode, body });
      return this;
    },
    getLogs() {
      return logs;
    },
  };
}

/**
 * 定期配信のテスト
 */
async function testRegularDelivery() {
  console.log('\n📧 ===== 定期配信（REGULAR）テスト =====\n');
  
  const req = createMockRequest({ type: 'REGULAR', force: true });
  const res = createMockResponse();
  
  try {
    await cronHandler(req, res);
    
    if (res.statusCode === 200) {
      console.log('✅ 定期配信テスト: 成功');
      const logs = res.getLogs();
      if (logs.length > 0) {
        console.log('📊 レスポンス:', logs[0].body);
      }
    } else {
      console.error('❌ 定期配信テスト: 失敗', `Status: ${res.statusCode}`);
    }
  } catch (error) {
    console.error('❌ 定期配信テスト: エラー', error.message);
    console.error(error.stack);
  }
}

/**
 * 緊急配信のテスト
 */
async function testEmergencyDelivery() {
  console.log('\n🚨 ===== 緊急配信（EMERGENCY）テスト =====\n');
  
  const req = createMockRequest({ type: 'EMERGENCY', force: true });
  const res = createMockResponse();
  
  try {
    console.log('[Test] Request:', JSON.stringify({ 
      query: req.query, 
      hasAuth: !!req.headers.authorization 
    }, null, 2));
    
    console.log('[Test] Calling cronHandler...');
    await cronHandler(req, res);
    
    console.log('[Test] Handler completed. Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      console.log('✅ 緊急配信テスト: 成功');
      const logs = res.getLogs();
      if (logs.length > 0) {
        console.log('📊 レスポンス:', JSON.stringify(logs[0].body, null, 2));
      } else {
        console.log('📊 レスポンス: ログが記録されていません');
      }
    } else {
      console.error('❌ 緊急配信テスト: 失敗', `Status: ${res.statusCode}`);
      const logs = res.getLogs();
      if (logs.length > 0) {
        console.error('📊 エラーレスポンス:', JSON.stringify(logs[0].body, null, 2));
      }
    }
  } catch (error) {
    console.error('❌ 緊急配信テスト: エラー', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 メール配信テストを開始します...\n');
  console.log('環境変数チェック:');
  console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`- EMAIL_RECIPIENTS: ${process.env.EMAIL_RECIPIENTS ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`- EMAIL_RECIPIENTS_EN: ${process.env.EMAIL_RECIPIENTS_EN ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`- ENABLE_TELEGRAM: ${process.env.ENABLE_TELEGRAM || 'false'}`);
  console.log('');

  // 環境変数チェック
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEYが設定されていません。');
    console.error('   .envファイルまたは環境変数に以下を設定してください:');
    console.error('   RESEND_API_KEY=re_xxxxxxxxxxxxx');
    console.error('');
    console.error('   Resend API Keyは以下から取得できます:');
    console.error('   https://resend.com/api-keys');
    console.error('');
    console.error('⚠️ テストを続行しますが、実際のメール送信は行われません。');
    console.error('');
  }

  if (!process.env.EMAIL_RECIPIENTS && !process.env.EMAIL_RECIPIENTS_EN) {
    console.warn('⚠️ EMAIL_RECIPIENTSが設定されていません。');
    console.warn('   環境変数に以下を設定してください:');
    console.warn('   EMAIL_RECIPIENTS=your-email@example.com');
    console.warn('   または');
    console.warn('   EMAIL_RECIPIENTS_EN=your-email@example.com');
    console.warn('');
    console.warn('⚠️ テストを続行しますが、実際のメール送信は行われません。');
    console.warn('');
  }

  // 定期配信テスト
  await testRegularDelivery();
  
  // 少し待機
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 緊急配信テスト
  await testEmergencyDelivery();
  
  console.log('\n✅ すべてのテストが完了しました。');
  console.log('\n📧 メールが送信されたか確認してください:');
  console.log('   - 受信トレイ');
  console.log('   - 迷惑メールフォルダ');
  console.log('   - Resend Dashboard: https://resend.com/emails');
}

// 実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { testRegularDelivery, testEmergencyDelivery };
