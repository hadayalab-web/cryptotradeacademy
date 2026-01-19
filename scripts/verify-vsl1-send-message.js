// scripts/verify-vsl1-send-message.js
// 実際に送信されるVSL1メッセージを検証

const { generateVSL1Message } = require('../services/telegram/messages/vsl1');

const VSL1_YOUTUBE_LINK = 'https://youtu.be/OqvqngJOiXc';
const TELEGRAM_BOT_USERNAME = 'dr_grok_bot';
const deepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=minimal_en`;

// 実際の送信コードと同じ処理
const fullMessage = generateVSL1Message('en', deepLink, VSL1_YOUTUBE_LINK);
const plainText = fullMessage.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
const replyText = `${plainText.substring(0, 200)}... ${VSL1_YOUTUBE_LINK}`;

console.log('\n' + '='.repeat(80));
console.log('🔍 実際に送信されるVSL1メッセージ検証');
console.log('='.repeat(80));

console.log('\n📄 完全版メッセージ:');
console.log(fullMessage);

console.log('\n\n📝 プレーンテキスト変換後:');
console.log(plainText);
console.log(`文字数: ${plainText.length}`);

console.log('\n\n📤 実際にXに送信されるメッセージ:');
console.log(replyText);
console.log(`文字数: ${replyText.length} / 280文字`);

// 問題点の確認
console.log('\n\n⚠️ 問題点の確認:');
if (replyText.length > 280) {
  console.log(`❌ 280文字制限を超過: ${replyText.length}文字`);
} else {
  console.log(`✅ 280文字制限内: ${replyText.length}文字`);
}

if (!plainText.includes('**')) {
  console.log(`✅ 太字マークダウン（**）は削除済み`);
} else {
  console.log(`❌ 太字マークダウン（**）が残っている`);
}

if (replyText.includes(VSL1_YOUTUBE_LINK)) {
  console.log(`✅ YouTubeリンクは含まれている`);
} else {
  console.log(`❌ YouTubeリンクが含まれていない`);
}

if (replyText.includes(deepLink)) {
  console.log(`✅ Telegramリンクは含まれている`);
} else {
  console.log(`❌ Telegramリンクが含まれていない（切り詰めで削除された可能性）`);
}

console.log('\n' + '='.repeat(80));
