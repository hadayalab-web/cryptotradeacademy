/**
 * 送信テストスクリプト
 * 
 * Telegram DM送信とResend Email送信のテスト
 * 環境変数は .env ファイルから読み込む
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// .envファイルの読み込み（プロジェクトルートから）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../..');
const envPath = path.join(projectRoot, '.env');

console.log(`📁 Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ .env file loaded\n');
} else {
  console.error(`❌ .env file not found at: ${envPath}`);
  process.exit(1);
}

/**
 * 環境変数のチェック
 */
function checkEnvVars(): {
  valid: boolean;
  missing: string[];
  present: string[];
} {
  const requiredVars = [
    'XAI_API_KEY',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'TELEGRAM_BOT_TOKEN_EN',
    'TELEGRAM_BOT_TOKEN_AR',
    'TELEGRAM_BOT_TOKEN_KO',
    'TELEGRAM_BOT_TOKEN_JA',
    'TELEGRAM_BOT_TOKEN_ES',
    'TELEGRAM_BOT_TOKEN_PT_BR',
    'RESEND_API_KEY',
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    present,
  };
}

/**
 * Telegram DM送信テスト
 */
async function testTelegramDM(marketCode: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const tokenKey = `TELEGRAM_BOT_TOKEN_${marketCode}`;
  const token = process.env[tokenKey];

  if (!token) {
    return {
      success: false,
      message: `Telegram Bot Token not found: ${tokenKey}`,
    };
  }

  try {
    // Telegram Bot APIを使用してテストメッセージを送信
    // 注意: 実際のテストでは、テスト用のチャットIDが必要です
    const testChatId = process.env.TELEGRAM_TEST_CHAT_ID || 'YOUR_TEST_CHAT_ID';
    
    if (testChatId === 'YOUR_TEST_CHAT_ID') {
      return {
        success: false,
        message: 'TELEGRAM_TEST_CHAT_ID not set. Please set it in .env file.',
        details: {
          tokenKey,
          tokenPresent: !!token,
        },
      };
    }

    const testMessage = `🧪 Test message from Affiliate Scout\n\nMarket: ${marketCode}\nTime: ${new Date().toISOString()}`;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: testChatId,
        text: testMessage,
      }),
    });

    const result = await response.json();

    if (result.ok) {
      return {
        success: true,
        message: `Telegram DM sent successfully to ${testChatId}`,
        details: {
          messageId: result.result.message_id,
          chatId: result.result.chat.id,
          marketCode,
        },
      };
    } else {
      return {
        success: false,
        message: `Telegram API error: ${result.description || 'Unknown error'}`,
        details: result,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Telegram DM test failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * Resend Email送信テスト
 */
async function testResendEmail(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'RESEND_API_KEY not found',
    };
  }

  try {
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    if (testEmail === 'test@example.com') {
      return {
        success: false,
        message: 'TEST_EMAIL not set. Please set it in .env file.',
        details: {
          apiKeyPresent: !!apiKey,
        },
      };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: [testEmail],
        subject: '🧪 Test Email from Affiliate Scout',
        html: `
          <h2>Test Email from Affiliate Scout</h2>
          <p>This is a test email to verify Resend API integration.</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Market:</strong> Test</p>
        `,
      }),
    });

    const result = await response.json();

    if (response.ok && result.id) {
      return {
        success: true,
        message: `Resend email sent successfully to ${testEmail}`,
        details: {
          emailId: result.id,
          to: testEmail,
        },
      };
    } else {
      return {
        success: false,
        message: `Resend API error: ${result.message || JSON.stringify(result)}`,
        details: result,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Resend email test failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * メインテスト実行
 */
async function runSendTests() {
  console.log('🚀 送信テスト開始\n');
  console.log('=' .repeat(60));
  console.log('');

  // 1. 環境変数のチェック
  console.log('📋 環境変数チェック...\n');
  const envCheck = checkEnvVars();

  console.log('✅ 設定済み環境変数:');
  for (const varName of envCheck.present) {
    const value = process.env[varName];
    const maskedValue = value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 'N/A';
    console.log(`  - ${varName}: ${maskedValue}`);
  }

  if (envCheck.missing.length > 0) {
    console.log('\n❌ 不足している環境変数:');
    for (const varName of envCheck.missing) {
      console.log(`  - ${varName}`);
    }
    console.log('\n⚠️  不足している環境変数がありますが、テストを続行します。\n');
  } else {
    console.log('\n✅ すべての必須環境変数が設定されています。\n');
  }

  console.log('=' .repeat(60));
  console.log('');

  // 2. Telegram DM送信テスト
  console.log('📱 Telegram DM送信テスト...\n');
  
  const markets: string[] = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const telegramResults: Array<{
    market: string;
    result: { success: boolean; message: string; details?: any };
  }> = [];

  for (const market of markets) {
    console.log(`  Testing ${market}...`);
    const result = await testTelegramDM(market);
    telegramResults.push({ market, result });
    
    if (result.success) {
      console.log(`    ✅ ${market}: ${result.message}`);
    } else {
      console.log(`    ❌ ${market}: ${result.message}`);
      if (result.details) {
        console.log(`       Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }

  console.log('');

  // 3. Resend Email送信テスト
  console.log('📧 Resend Email送信テスト...\n');
  const emailResult = await testResendEmail();
  
  if (emailResult.success) {
    console.log(`  ✅ ${emailResult.message}`);
  } else {
    console.log(`  ❌ ${emailResult.message}`);
    if (emailResult.details) {
      console.log(`     Details: ${JSON.stringify(emailResult.details, null, 2)}`);
    }
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('');

  // 4. 結果サマリー
  console.log('📊 テスト結果サマリー:\n');
  
  const telegramSuccessCount = telegramResults.filter(r => r.result.success).length;
  console.log(`Telegram DM: ${telegramSuccessCount}/${telegramResults.length} 成功`);
  
  console.log(`Resend Email: ${emailResult.success ? '✅ 成功' : '❌ 失敗'}`);

  console.log('');
  console.log('=' .repeat(60));
  console.log('');

  // 5. 推奨事項
  if (telegramSuccessCount < telegramResults.length || !emailResult.success) {
    console.log('⚠️  推奨事項:\n');
    
    if (telegramSuccessCount < telegramResults.length) {
      console.log('  - Telegram Bot Tokenが不足している市場があります');
      console.log('  - TELEGRAM_TEST_CHAT_IDが設定されているか確認してください');
      console.log('  - テスト用のチャットIDを取得する方法:');
      console.log('    1. Telegram Bot (@BotFather)にメッセージを送信');
      console.log('    2. /start コマンドを実行');
      console.log('    3. チャットIDを取得（例: 123456789）');
      console.log('    4. .envファイルに TELEGRAM_TEST_CHAT_ID=123456789 を追加\n');
    }
    
    if (!emailResult.success) {
      console.log('  - Resend Email送信が失敗しました');
      console.log('  - RESEND_API_KEYが正しく設定されているか確認してください');
      console.log('  - TEST_EMAILが設定されているか確認してください');
      console.log('  - RESEND_FROM_EMAILが設定されているか確認してください\n');
    }
  } else {
    console.log('✅ すべての送信テストが成功しました！\n');
  }
}

// テスト実行
runSendTests().catch((error) => {
  console.error('❌ テスト実行エラー:');
  console.error(error);
  process.exit(1);
});
