#!/usr/bin/env node
/**
 * リードへのメッセージ順次テスト配信スクリプト
 * VSL1メッセージ（初回配信）から順に4種類のメッセージをテスト配信
 * 
 * 実行順序:
 * 1. VSL1メッセージ（初回配信）
 * 2. VSL1リマインドメッセージ
 * 3. VSL2 Last Callメッセージ
 * 4. VSL2メッセージ（アップセル）
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { generateVSL1Message } = require('../services/telegram/messages/vsl1');
const { generateVSL2Message } = require('../services/telegram/messages/vsl2');
const { generateVSL2LastCallMessage } = require('../services/telegram/messages/vsl2-last-call');
const { getTelegramDeepLink, generateVSL1InlineKeyboard } = require('../api/vsl1-post');
const { generateVSL2InlineKeyboard } = require('../api/vsl2-free-users');
const { generateVSL2LastCallInlineKeyboard } = require('../api/vsl2-last-call');
const { sendMessageToUser, sendPhotoToUser } = require('../services/telegram/bot');
// VSL1リマインドメッセージは testVSL1ReminderMessage 関数内で直接インポート
const fs = require('fs');
const path = require('path');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
const VSL2_YOUTUBE_LINK = process.env.VSL2_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';
const PROMO_CODE = process.env.PROMO_CODE || 'DEFEND50';
const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL || 'https://whop.com/aio-media-llc/trap-defense-btc/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PT_BR || 'https://whop.com/aio-media-llc/trap-defense-btc-pt-br/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/trap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

const SUPPORTED_LANGS = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];

function normalizeLang(lang) {
  if (!lang) return 'en';
  const normalized = lang.toLowerCase().replace('_', '-');
  return SUPPORTED_LANGS.includes(normalized) ? normalized : 'en';
}

function getWhopProductUrl(lang) {
  const normalized = normalizeLang(lang);
  return WHOP_PRODUCT_URLS[normalized] || WHOP_PRODUCT_URLS['en'];
}

/**
 * VSL1サムネイル画像を読み込む
 */
function loadVSL1Thumbnail() {
  try {
    const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl1_thumbnail.png');
    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath);
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ VSL1サムネイル読み込みエラー:', error.message);
    return null;
  }
}

/**
 * VSL2サムネイル画像を読み込む
 */
function loadVSL2Thumbnail() {
  try {
    const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl2_thumbnail.png');
    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath);
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ VSL2サムネイル読み込みエラー:', error.message);
    return null;
  }
}

/**
 * VSL2 Last Callサムネイル画像を読み込む
 */
function loadVSL2LastCallThumbnail() {
  try {
    const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl2_last_call_thumbnail.png');
    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath);
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    }
    // フォールバック: VSL2サムネイルを使用
    return loadVSL2Thumbnail();
  } catch (error) {
    console.warn('⚠️ VSL2 Last Callサムネイル読み込みエラー:', error.message);
    return loadVSL2Thumbnail(); // フォールバック
  }
}

/**
 * VSL1メッセージ（初回配信）のテスト送信
 */
async function testVSL1Message(chatId, lang = 'en', userName = 'there') {
  console.log('\n' + '='.repeat(80));
  console.log('1️⃣ VSL1メッセージ（初回配信）テスト');
  console.log('='.repeat(80));
  console.log(`📋 配信先: Chat ID ${chatId}, 言語: ${lang.toUpperCase()}, ユーザー名: ${userName}`);

  try {
    const deepLink = getTelegramDeepLink(lang);
    const message = generateVSL1Message(lang, deepLink, VSL1_YOUTUBE_LINK);
    
    console.log(`\n📝 生成されたメッセージ (${message.length}文字):`);
    console.log('─'.repeat(80));
    console.log(message.substring(0, 300) + (message.length > 300 ? '...' : ''));
    console.log('─'.repeat(80));

    const shouldSend = process.env.TEST_SEND_MESSAGES === 'true';
    
    if (shouldSend) {
      console.log('\n⏳ VSL1メッセージ送信中...');
      
      // インラインボタンを生成
      const inlineKeyboard = generateVSL1InlineKeyboard(lang);
      console.log('📱 インラインボタン:');
      console.log(`   - ${inlineKeyboard.inline_keyboard[0][0].text} → YouTube`);
      console.log(`   - ${inlineKeyboard.inline_keyboard[1][0].text} → Telegram Bot`);
      
      const vsl1Thumbnail = loadVSL1Thumbnail();
      if (vsl1Thumbnail) {
        await sendPhotoToUser(chatId, vsl1Thumbnail, message, {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL1メッセージ送信成功（画像付き・インラインボタン付き）');
      } else {
        await sendMessageToUser(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL1メッセージ送信成功（テキストのみ・インラインボタン付き）');
      }
    } else {
      console.log('\n⚠️ 実際の送信はスキップされました（TEST_SEND_MESSAGES=false）');
    }

    return { success: true, messageType: 'VSL1', lang };
  } catch (error) {
    console.error(`❌ VSL1メッセージ送信エラー: ${error.message}`);
    return { success: false, messageType: 'VSL1', lang, error: error.message };
  }
}

/**
 * VSL1リマインドサムネイル画像を読み込む
 */
function loadVSL1ReminderThumbnail() {
  try {
    const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl1_reminder_thumbnail.png');
    if (fs.existsSync(thumbnailPath)) {
      const imageBuffer = fs.readFileSync(thumbnailPath);
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ VSL1 Reminder thumbnail loading error:', error.message);
    return null;
  }
}

/**
 * VSL1リマインドメッセージのテスト送信（多言語対応・画像付き・インラインボタン付き）
 */
async function testVSL1ReminderMessage(chatId, lang = 'en', userName = 'there') {
  console.log('\n' + '='.repeat(80));
  console.log('2️⃣ VSL1リマインドメッセージテスト');
  console.log('='.repeat(80));
  console.log(`📋 配信先: Chat ID ${chatId}, 言語: ${lang.toUpperCase()}, ユーザー名: ${userName}`);

  try {
    const { generateVSL1ReminderMessage } = require('../api/vsl1-reminder');
    const { getTelegramDeepLink, generateVSL1InlineKeyboard } = require('../api/vsl1-post');
    const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
    
    const deepLink = getTelegramDeepLink(lang);
    const message = generateVSL1ReminderMessage(lang, userName, deepLink, VSL1_YOUTUBE_LINK);
    
    console.log(`\n📝 生成されたメッセージ (${message.length}文字):`);
    console.log('─'.repeat(80));
    console.log(message.substring(0, 400) + (message.length > 400 ? '...' : ''));
    console.log('─'.repeat(80));

    const shouldSend = process.env.TEST_SEND_MESSAGES === 'true';
    
    if (shouldSend) {
      console.log('\n⏳ VSL1リマインドメッセージ送信中...');
      
      // インラインボタンを生成（VSL1と同じ）
      const inlineKeyboard = generateVSL1InlineKeyboard(lang);
      console.log('📱 インラインボタン:');
      console.log(`   - ${inlineKeyboard.inline_keyboard[0][0].text} → YouTube`);
      console.log(`   - ${inlineKeyboard.inline_keyboard[1][0].text} → Telegram Bot`);
      
      // サムネイル画像を読み込む
      const thumbnail = loadVSL1ReminderThumbnail();
      
      if (thumbnail) {
        await sendPhotoToUser(chatId, thumbnail, message, {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL1リマインドメッセージ送信成功（画像付き・インラインボタン付き）');
      } else {
        await sendMessageToUser(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL1リマインドメッセージ送信成功（テキストのみ・インラインボタン付き）');
      }
    } else {
      console.log('\n⚠️ 実際の送信はスキップされました（TEST_SEND_MESSAGES=false）');
    }

    return { success: true, messageType: 'VSL1_REMINDER', lang };
  } catch (error) {
    console.error(`❌ VSL1リマインドメッセージ送信エラー: ${error.message}`);
    return { success: false, messageType: 'VSL1_REMINDER', lang, error: error.message };
  }
}

/**
 * VSL2 Last Callメッセージのテスト送信
 */
async function testVSL2LastCallMessage(chatId, lang = 'en', userName = 'there') {
  console.log('\n' + '='.repeat(80));
  console.log('3️⃣ VSL2 Last Callメッセージテスト');
  console.log('='.repeat(80));
  console.log(`📋 配信先: Chat ID ${chatId}, 言語: ${lang.toUpperCase()}, ユーザー名: ${userName}`);

  try {
    const whopUrl = getWhopProductUrl(lang);
    const message = generateVSL2LastCallMessage(lang, userName, VSL2_YOUTUBE_LINK, whopUrl, PROMO_CODE);
    
    console.log(`\n📝 生成されたメッセージ (${message.length}文字):`);
    console.log('─'.repeat(80));
    console.log(message.substring(0, 300) + (message.length > 300 ? '...' : ''));
    console.log('─'.repeat(80));

    const shouldSend = process.env.TEST_SEND_MESSAGES === 'true';
    
    if (shouldSend) {
      console.log('\n⏳ VSL2 Last Callメッセージ送信中...');
      
      const vsl2LastCallThumbnail = loadVSL2LastCallThumbnail();
      const inlineKeyboard = generateVSL2LastCallInlineKeyboard(lang);
      
      // インラインボタンの内容をログ出力
      console.log('📱 インラインボタン:');
      inlineKeyboard.inline_keyboard.forEach((row, rowIndex) => {
        row.forEach((button, btnIndex) => {
          const urlPreview = button.url.length > 50 ? button.url.substring(0, 50) + '...' : button.url;
          console.log(`   ${rowIndex === 0 && btnIndex === 0 ? '1. ' : '2. '}${button.text} → ${urlPreview}`);
        });
      });

      if (vsl2LastCallThumbnail) {
        await sendPhotoToUser(chatId, vsl2LastCallThumbnail, message, {
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL2 Last Callメッセージ送信成功（画像付き・インラインボタン付き）');
      } else {
        await sendMessageToUser(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL2 Last Callメッセージ送信成功（テキストのみ・インラインボタン付き）');
      }
    } else {
      console.log('\n⚠️ 実際の送信はスキップされました（TEST_SEND_MESSAGES=false）');
    }

    return { success: true, messageType: 'VSL2_LAST_CALL', lang };
  } catch (error) {
    console.error(`❌ VSL2 Last Callメッセージ送信エラー: ${error.message}`);
    return { success: false, messageType: 'VSL2_LAST_CALL', lang, error: error.message };
  }
}

/**
 * VSL2メッセージ（アップセル）のテスト送信
 */
async function testVSL2Message(chatId, lang = 'en', userName = 'there') {
  console.log('\n' + '='.repeat(80));
  console.log('4️⃣ VSL2メッセージ（アップセル）テスト');
  console.log('='.repeat(80));
  console.log(`📋 配信先: Chat ID ${chatId}, 言語: ${lang.toUpperCase()}, ユーザー名: ${userName}`);

  try {
    const whopUrl = getWhopProductUrl(lang);
    const message = generateVSL2Message(lang, userName, VSL2_YOUTUBE_LINK, whopUrl, PROMO_CODE);
    
    console.log(`\n📝 生成されたメッセージ (${message.length}文字):`);
    console.log('─'.repeat(80));
    console.log(message.substring(0, 300) + (message.length > 300 ? '...' : ''));
    console.log('─'.repeat(80));

    const shouldSend = process.env.TEST_SEND_MESSAGES === 'true';
    
    if (shouldSend) {
      console.log('\n⏳ VSL2メッセージ送信中...');
      
      const vsl2Thumbnail = loadVSL2Thumbnail();
      const inlineKeyboard = generateVSL2InlineKeyboard(lang);
      
      // インラインボタンの内容をログ出力
      console.log('📱 インラインボタン:');
      inlineKeyboard.inline_keyboard.forEach((row, rowIndex) => {
        row.forEach((button, btnIndex) => {
          const urlPreview = button.url.length > 50 ? button.url.substring(0, 50) + '...' : button.url;
          console.log(`   ${rowIndex === 0 && btnIndex === 0 ? '1. ' : '2. '}${button.text} → ${urlPreview}`);
        });
      });

      if (vsl2Thumbnail) {
        await sendPhotoToUser(chatId, vsl2Thumbnail, message, {
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL2メッセージ送信成功（画像付き・インラインボタン付き）');
      } else {
        await sendMessageToUser(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard,
        });
        console.log('✅ VSL2メッセージ送信成功（テキストのみ・インラインボタン付き）');
      }
    } else {
      console.log('\n⚠️ 実際の送信はスキップされました（TEST_SEND_MESSAGES=false）');
    }

    return { success: true, messageType: 'VSL2', lang };
  } catch (error) {
    console.error(`❌ VSL2メッセージ送信エラー: ${error.message}`);
    return { success: false, messageType: 'VSL2', lang, error: error.message };
  }
}

/**
 * すべてのメッセージを順次テスト送信
 */
async function testAllMessagesSequentially(chatId, lang = 'en', userName = 'there') {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 リードへのメッセージ順次テスト配信');
  console.log('='.repeat(80));
  console.log(`\n📋 テスト設定:`);
  console.log(`   Chat ID: ${chatId}`);
  console.log(`   言語: ${lang.toUpperCase()}`);
  console.log(`   ユーザー名: ${userName}`);
  console.log(`   TEST_SEND_MESSAGES: ${process.env.TEST_SEND_MESSAGES || 'false'}`);
  console.log('');

  const results = [];

  // 1. VSL1メッセージ（初回配信）
  const vsl1Result = await testVSL1Message(chatId, lang, userName);
  results.push(vsl1Result);
  
  // 各メッセージの間に少し待機（レート制限対策）
  if (process.env.TEST_SEND_MESSAGES === 'true') {
    console.log('\n⏳ レート制限対策: 2秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 2. VSL1リマインドメッセージ（多言語対応）
  const vsl1ReminderResult = await testVSL1ReminderMessage(chatId, lang, userName);
  results.push(vsl1ReminderResult);
  
  if (process.env.TEST_SEND_MESSAGES === 'true') {
    console.log('\n⏳ レート制限対策: 2秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 3. VSL2 Last Callメッセージ
  const vsl2LastCallResult = await testVSL2LastCallMessage(chatId, lang, userName);
  results.push(vsl2LastCallResult);
  
  if (process.env.TEST_SEND_MESSAGES === 'true') {
    console.log('\n⏳ レート制限対策: 2秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 4. VSL2メッセージ（アップセル）
  const vsl2Result = await testVSL2Message(chatId, lang, userName);
  results.push(vsl2Result);

  // 結果サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));
  
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const skippedCount = results.filter(r => r.skipped).length;

  results.forEach((result, index) => {
    const status = result.success ? '✅' : (result.skipped ? '⏭️' : '❌');
    console.log(`${index + 1}. ${status} ${result.messageType} (${result.lang.toUpperCase()})`);
    if (result.error) {
      console.log(`   エラー: ${result.error}`);
    }
  });

  console.log(`\n合計:`);
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失敗: ${failedCount}`);
  console.log(`  ⏭️ スキップ: ${skippedCount}`);

  return results;
}

/**
 * メイン実行関数
 */
async function main() {
  const chatId = process.argv[2];
  const lang = normalizeLang(process.argv[3] || 'en');
  const userName = process.argv[4] || 'there';

  if (!chatId) {
    console.error('❌ エラー: Chat IDが必要です');
    console.log('\n使用方法:');
    console.log('  node scripts/test-all-lead-messages-sequential.js <CHAT_ID> [LANG] [USER_NAME]');
    console.log('\n例:');
    console.log('  node scripts/test-all-lead-messages-sequential.js 6770292419 en John');
    console.log('  node scripts/test-all-lead-messages-sequential.js 6770292419 ja 太郎');
    console.log('\n実際に送信する場合:');
    console.log('  TEST_SEND_MESSAGES=true node scripts/test-all-lead-messages-sequential.js <CHAT_ID> [LANG] [USER_NAME]');
    console.log('\n対応言語: en, ja, es, pt-br, ar, ko');
    process.exit(1);
  }

  console.log('\n環境変数チェック:');
  console.log(`  VSL1_YOUTUBE_LINK: ${VSL1_YOUTUBE_LINK}`);
  console.log(`  VSL2_YOUTUBE_LINK: ${VSL2_YOUTUBE_LINK}`);
  console.log(`  PROMO_CODE: ${PROMO_CODE}`);
  console.log(`  TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  TELEGRAM_BOT_TOKEN_EN: ${process.env.TELEGRAM_BOT_TOKEN_EN ? '✅ 設定済み' : '❌ 未設定'}`);

  try {
    const results = await testAllMessagesSequentially(chatId, lang, userName);

    const allSuccess = results.every(r => r.success || r.skipped);
    if (allSuccess) {
      console.log('\n✅ すべてのテストが成功しました！');
      process.exit(0);
    } else {
      console.log('\n⚠️ 一部のテストが失敗しました。エラーログを確認してください。');
      process.exit(1);
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
  testVSL1Message,
  testVSL1ReminderMessage,
  testVSL2LastCallMessage,
  testVSL2Message,
  testAllMessagesSequentially,
};
