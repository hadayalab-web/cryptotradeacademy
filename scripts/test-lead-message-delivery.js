#!/usr/bin/env node
/**
 * リードへのメッセージ送信テストスクリプト
 * X/Twitter経由とTelegram経由の両方のリードへのメッセージ送信をテスト
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { replyVSL1ToLead } = require('../services/lead-discovery/xLeadDiscovery');
const { sendVSL1ToLead } = require('../services/lead-discovery/telegramGroupMonitor');
const { generateVSL1Message } = require('../services/telegram/messages/vsl1');
const { getTelegramDeepLink } = require('../api/vsl1-post');
const { sendMessageToUser, sendPhotoToUser } = require('../services/telegram/bot');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';

/**
 * テスト用のリードデータを生成
 */
function createTestLead(type = 'telegram', lang = 'en') {
  const baseLead = {
    userId: type === 'telegram' ? process.argv[2] || '6770292419', // デフォルトのテストユーザーID
    username: 'test_user',
    lang,
    text: 'I lost my BTC in a hack attack',
    keywords: ['lost', 'BTC', 'hack'],
    priority: 'high',
    score: 0.85,
    isPerfectMatch: true,
    timestamp: new Date().toISOString(),
  };

  if (type === 'x') {
    return {
      ...baseLead,
      tweetId: process.argv[2] || '1234567890123456789', // デフォルトのテストツイートID
      userId: null,
    };
  }

  return {
    ...baseLead,
    chatId: baseLead.userId,
  };
}

/**
 * Telegram経由のリードへのメッセージ送信テスト
 */
async function testTelegramLeadDelivery() {
  console.log('\n' + '='.repeat(80));
  console.log('📱 Telegram経由のリードへのメッセージ送信テスト');
  console.log('='.repeat(80));

  const testLangs = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const lang of testLangs) {
    console.log(`\n🌐 言語: ${lang.toUpperCase()}`);
    console.log('─'.repeat(80));

    try {
      const lead = createTestLead('telegram', lang);
      console.log(`📋 リード情報:`);
      console.log(`   User ID: ${lead.userId}`);
      console.log(`   Username: ${lead.username}`);
      console.log(`   Language: ${lead.lang}`);

      // メッセージ生成
      const deepLink = getTelegramDeepLink(lang);
      const message = generateVSL1Message(lang, deepLink, VSL1_YOUTUBE_LINK);
      console.log(`\n📝 生成されたメッセージ (${message.length}文字):`);
      console.log(message.substring(0, 200) + '...');

      // 実際の送信処理をテスト（環境変数で制御）
      const shouldSend = process.env.TEST_SEND_MESSAGES === 'true';
      
      if (shouldSend) {
        console.log('\n⏳ メッセージ送信中...');
        const success = await sendVSL1ToLead(lead);
        
        if (success) {
          console.log('✅ メッセージ送信成功');
          results.success++;
        } else {
          console.log('❌ メッセージ送信失敗（重複送信またはエラー）');
          results.failed++;
        }
      } else {
        console.log('\n⚠️ 実際の送信はスキップされました（TEST_SEND_MESSAGES=false）');
        console.log('   実際に送信する場合は: TEST_SEND_MESSAGES=true node scripts/test-lead-message-delivery.js');
        results.success++; // テストとして成功とみなす
      }
    } catch (error) {
      console.error(`❌ エラー発生: ${error.message}`);
      console.error(`   スタック: ${error.stack}`);
      results.failed++;
      results.errors.push({
        lang,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Telegram経由のテスト結果サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.success}`);
  console.log(`❌ 失敗: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    results.errors.forEach((err, index) => {
      console.log(`\n${index + 1}. 言語: ${err.lang}`);
      console.log(`   エラー: ${err.error}`);
    });
  }

  return results;
}

/**
 * X/Twitter経由のリードへのメッセージ送信テスト
 */
async function testXLeadDelivery() {
  console.log('\n' + '='.repeat(80));
  console.log('🐦 X/Twitter経由のリードへのメッセージ送信テスト');
  console.log('='.repeat(80));

  const testLangs = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const lang of testLangs) {
    console.log(`\n🌐 言語: ${lang.toUpperCase()}`);
    console.log('─'.repeat(80));

    try {
      const lead = createTestLead('x', lang);
      console.log(`📋 リード情報:`);
      console.log(`   Tweet ID: ${lead.tweetId}`);
      console.log(`   Username: ${lead.username}`);
      console.log(`   Language: ${lead.lang}`);

      // メッセージ生成
      const deepLink = getTelegramDeepLink(lang);
      const message = generateVSL1Message(lang, deepLink, VSL1_YOUTUBE_LINK);
      console.log(`\n📝 生成されたメッセージ (${message.length}文字):`);
      console.log(message.substring(0, 200) + '...');

      // 実際の送信処理をテスト（環境変数で制御）
      const shouldSend = process.env.TEST_SEND_MESSAGES === 'true';
      
      if (shouldSend) {
        console.log('\n⏳ リプライ送信中...');
        const success = await replyVSL1ToLead(lead);
        
        if (success) {
          console.log('✅ リプライ送信成功');
          results.success++;
        } else {
          console.log('❌ リプライ送信失敗（重複送信またはエラー）');
          results.failed++;
        }
      } else {
        console.log('\n⚠️ 実際の送信はスキップされました（TEST_SEND_MESSAGES=false）');
        console.log('   実際に送信する場合は: TEST_SEND_MESSAGES=true node scripts/test-lead-message-delivery.js');
        results.success++; // テストとして成功とみなす
      }
    } catch (error) {
      console.error(`❌ エラー発生: ${error.message}`);
      console.error(`   スタック: ${error.stack}`);
      results.failed++;
      results.errors.push({
        lang,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 X/Twitter経由のテスト結果サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.success}`);
  console.log(`❌ 失敗: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    results.errors.forEach((err, index) => {
      console.log(`\n${index + 1}. 言語: ${err.lang}`);
      console.log(`   エラー: ${err.error}`);
    });
  }

  return results;
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 リードへのメッセージ送信テスト開始');
  console.log('='.repeat(80));
  console.log('\n環境変数チェック:');
  console.log(`  VSL1_YOUTUBE_LINK: ${process.env.VSL1_YOUTUBE_LINK || '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN_EN: ${process.env.TELEGRAM_BOT_TOKEN_EN ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  TEST_SEND_MESSAGES: ${process.env.TEST_SEND_MESSAGES || 'false'}`);
  console.log('');

  try {
    // 1. Telegram経由のテスト
    const telegramResults = await testTelegramLeadDelivery();

    // 2. X/Twitter経由のテスト
    const xResults = await testXLeadDelivery();

    // 3. 総合結果
    console.log('\n' + '='.repeat(80));
    console.log('📊 総合テスト結果');
    console.log('='.repeat(80));
    console.log(`\nTelegram経由:`);
    console.log(`  ✅ 成功: ${telegramResults.success}`);
    console.log(`  ❌ 失敗: ${telegramResults.failed}`);
    console.log(`\nX/Twitter経由:`);
    console.log(`  ✅ 成功: ${xResults.success}`);
    console.log(`  ❌ 失敗: ${xResults.failed}`);

    const totalSuccess = telegramResults.success + xResults.success;
    const totalFailed = telegramResults.failed + xResults.failed;

    console.log(`\n合計:`);
    console.log(`  ✅ 成功: ${totalSuccess}`);
    console.log(`  ❌ 失敗: ${totalFailed}`);

    if (totalFailed > 0) {
      console.log('\n⚠️ 一部のテストが失敗しました。エラーログを確認してください。');
      process.exit(1);
    } else {
      console.log('\n✅ すべてのテストが成功しました！');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ テスト実行エラー:', error.message);
    console.error('   スタック:', error.stack);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = {
  testTelegramLeadDelivery,
  testXLeadDelivery,
};
