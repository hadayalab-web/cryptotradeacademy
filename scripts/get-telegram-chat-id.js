// scripts/get-telegram-chat-id.js
// Telegram Botの最新の更新を取得してチャットIDを表示

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8150215039:AAHMpuZRugBj2mtubi3Xa0wwc7gxFv_lbwc';

async function getUpdates() {
  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API Error: ${data.description}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📋 Telegram Bot の最新更新');
    console.log('='.repeat(80));
    
    if (data.result && data.result.length > 0) {
      console.log(`\n✅ ${data.result.length}件の更新が見つかりました\n`);
      
      data.result.forEach((update, index) => {
        if (update.message) {
          const chat = update.message.chat;
          const from = update.message.from;
          
          console.log(`\n📨 更新 #${index + 1}:`);
          console.log(`   チャットID: ${chat.id}`);
          console.log(`   チャットタイプ: ${chat.type}`);
          if (chat.title) console.log(`   タイトル: ${chat.title}`);
          if (chat.username) console.log(`   ユーザー名: @${chat.username}`);
          if (from) {
            console.log(`   送信者: ${from.first_name} ${from.last_name || ''}`);
            if (from.username) console.log(`   送信者ユーザー名: @${from.username}`);
          }
          if (update.message.text) {
            console.log(`   メッセージ: ${update.message.text.substring(0, 50)}...`);
          }
        }
      });
      
      // 最新のチャットIDを表示
      const latestUpdate = data.result[data.result.length - 1];
      if (latestUpdate.message) {
        const chatId = latestUpdate.message.chat.id;
        console.log('\n' + '─'.repeat(80));
        console.log(`\n💡 最新のチャットID: ${chatId}`);
        console.log(`\nこのIDを使ってメッセージを送信できます:`);
        console.log(`node scripts/send-vsl1-test-telegram.js ${chatId}`);
      }
    } else {
      console.log('\n⚠️ 更新が見つかりませんでした');
      console.log('\nBotにメッセージを送信してから、再度このスクリプトを実行してください。');
    }
    
    console.log('\n' + '='.repeat(80));
    
    return data;
  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

getUpdates();
