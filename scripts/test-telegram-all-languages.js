// Telegram全言語版チャンネル接続テスト
// cryptosignal-aiディレクトリ内で実行

const path = require('path');
const dotenv = require('dotenv');

// .envファイルを読み込む（ルートディレクトリから）
const envPath = path.join(__dirname, '..', '..', '.env');
console.log(`📁 Loading .env from: ${envPath}`);
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('⚠️ .envファイルの読み込みエラー:', envResult.error.message);
} else {
  console.log('✅ .envファイルを読み込みました\n');
}

const { sendMessageToChannel, sendMessageToAsset } = require('../services/telegram/bot');

// テスト対象の言語リスト
const LANGUAGES = [
  { code: 'EN', name: 'English', series: 'BTC' },
  { code: 'ES', name: 'Spanish', series: 'BTC' },
  { code: 'AR', name: 'Arabic', series: 'BTC' },
  { code: 'PT_BR', name: 'Portuguese', series: 'BTC' }, // PT-BRは環境変数でPT_BR
  { code: 'KO', name: 'Korean', series: 'BTC' },
  { code: 'JA', name: 'Japanese', series: 'BTC' },
];

async function testLanguage(lang) {
  const results = {
    paid: { success: false, error: null },
    free: { success: false, error: null },
  };

  console.log(`\n🌍 ${lang.name}版 (${lang.code}) のテスト開始...\n`);

  // 有料チャンネルへのテスト送信
  console.log(`📺 ${lang.name}版有料チャンネルへのテスト送信...`);
  try {
    const paidTestMessage = `🧪 Test Message - ${lang.name} Paid Channel

This is a test message to verify the connection.

✅ Connection successful!
Timestamp: ${new Date().toISOString()}`;

    const paidResult = await sendMessageToChannel(paidTestMessage, lang.series, lang.code);
    console.log(`✅ ${lang.name}版有料チャンネルへの送信成功！`);
    const paidMessageId = paidResult?.result?.message_id || paidResult?.message_id || 'N/A';
    const paidChatTitle = paidResult?.result?.chat?.title || paidResult?.chat?.title || paidResult?.result?.sender_chat?.title || 'N/A';
    console.log(`   Message ID: ${paidMessageId}`);
    console.log(`   Chat: ${paidChatTitle}`);
    results.paid.success = true;
  } catch (error) {
    console.error(`❌ ${lang.name}版有料チャンネルへの送信失敗:`);
    console.error(`   Error: ${error.message}`);
    results.paid.error = error.message;
  }

  // 無料チャンネルへのテスト送信
  // 直接Telegram APIを呼び出して送信
  const minimalEnvVar = `TELEGRAM_CHAT_ID_MINIMAL_${lang.code}`;
  const minimalChannelId = process.env[minimalEnvVar];
  
  if (minimalChannelId) {
    console.log(`📺 ${lang.name}版無料チャンネルへのテスト送信...`);
    try {
      const freeTestMessage = `🧪 Test Message - ${lang.name} Free Channel

This is a test message to verify the connection for the free version channel.

✅ Connection successful!
Timestamp: ${new Date().toISOString()}`;

      // 直接Telegram APIを呼び出し
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: minimalChannelId,
          text: freeTestMessage,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
      }

      const freeResult = await response.json();
      console.log(`✅ ${lang.name}版無料チャンネルへの送信成功！`);
      const freeMessageId = freeResult?.result?.message_id || 'N/A';
      const freeChatTitle = freeResult?.result?.chat?.title || freeResult?.result?.sender_chat?.title || 'N/A';
      console.log(`   Message ID: ${freeMessageId}`);
      console.log(`   Chat: ${freeChatTitle}`);
      results.free.success = true;
    } catch (error) {
      console.error(`❌ ${lang.name}版無料チャンネルへの送信失敗:`);
      console.error(`   Error: ${error.message}`);
      results.free.error = error.message;
    }
  } else {
    console.log(`⚠️ ${lang.name}版無料チャンネルIDが設定されていないため、スキップします。`);
    console.log(`   (環境変数 ${minimalEnvVar} が設定されていません)`);
  }

  return results;
}

async function main() {
  console.log('='.repeat(80));
  console.log('🧪 Telegram全言語版チャンネル接続テスト');
  console.log('='.repeat(80) + '\n');

  // 環境変数の確認
  console.log('🔍 環境変数の確認...\n');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  console.log(`Bot Token: ${botToken ? '✅ Set (' + botToken.slice(-4) + ')' : '❌ Not Set'}\n`);

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKENが設定されていません。');
    console.error('   .envファイルを確認してください。\n');
    process.exit(1);
  }

  // 各言語の環境変数を確認
  console.log('📋 各言語の環境変数確認:\n');
  LANGUAGES.forEach(lang => {
    const paidEnvVar = `TELEGRAM_CHAT_ID_BTC_${lang.code}`;
    const freeEnvVar = `TELEGRAM_CHAT_ID_MINIMAL_${lang.code}`;
    const paidId = process.env[paidEnvVar];
    const freeId = process.env[freeEnvVar];
    
    console.log(`${lang.name} (${lang.code}):`);
    console.log(`  有料: ${paidId ? '✅ ' + paidId : '❌ Not Set (' + paidEnvVar + ')'}`);
    console.log(`  無料: ${freeId ? '✅ ' + freeId : '❌ Not Set (' + freeEnvVar + ')'}`);
  });
  console.log('');

  // 全言語のテスト結果
  const allResults = {};

  // 各言語を順番にテスト
  for (const lang of LANGUAGES) {
    allResults[lang.code] = await testLanguage(lang);
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));

  let totalPaidSuccess = 0;
  let totalPaidFailed = 0;
  let totalFreeSuccess = 0;
  let totalFreeFailed = 0;
  let totalFreeSkipped = 0;

  LANGUAGES.forEach(lang => {
    const results = allResults[lang.code];
    const paidStatus = results.paid.success ? '✅ 成功' : '❌ 失敗';
    const freeStatus = results.free.success ? '✅ 成功' : (results.free.error ? '❌ 失敗' : '⚠️ スキップ');
    
    console.log(`\n${lang.name} (${lang.code}):`);
    console.log(`  有料チャンネル: ${paidStatus}`);
    if (results.paid.error) {
      console.log(`    エラー: ${results.paid.error}`);
    }
    console.log(`  無料チャンネル: ${freeStatus}`);
    if (results.free.error) {
      console.log(`    エラー: ${results.free.error}`);
    }

    if (results.paid.success) totalPaidSuccess++;
    else totalPaidFailed++;
    
    if (results.free.success) totalFreeSuccess++;
    else if (results.free.error) totalFreeFailed++;
    else totalFreeSkipped++;
  });

  console.log('\n' + '='.repeat(80));
  console.log('📈 総合結果');
  console.log('='.repeat(80));
  console.log(`有料チャンネル: ${totalPaidSuccess}成功 / ${totalPaidFailed}失敗 / ${LANGUAGES.length}合計`);
  console.log(`無料チャンネル: ${totalFreeSuccess}成功 / ${totalFreeFailed}失敗 / ${totalFreeSkipped}スキップ / ${LANGUAGES.length}合計`);
  console.log('='.repeat(80) + '\n');

  if (totalPaidSuccess === LANGUAGES.length && totalFreeSuccess + totalFreeSkipped === LANGUAGES.length) {
    console.log('🎉 全言語版のテストが成功しました！');
    console.log('   チャンネルへの配信準備が完了しています。\n');
    process.exit(0);
  } else {
    console.error('⚠️ 一部のテストが失敗しました。');
    console.error('   エラーメッセージを確認して、環境変数やBotの権限を確認してください。\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  if (error.stack) {
    console.error('スタックトレース:', error.stack.substring(0, 500));
  }
  process.exit(1);
});
