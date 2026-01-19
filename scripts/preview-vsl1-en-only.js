// scripts/preview-vsl1-en-only.js
// EN版VSL1メッセージのX用とTelegram用プレビュー

require('dotenv').config();
const { generateVSL1Message } = require('../services/telegram/messages/vsl1');
const { buildVsl1Tweet } = require('../services/x/vsl1-strategy');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'dr_grok_bot';

function getTelegramDeepLink(lang) {
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
  const startParam = normalizedLang ? `minimal_${normalizedLang}` : 'minimal';
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${startParam}`;
}

function displayMessageInBox(title, message, maxWidth = 65) {
  console.log(`\n${title}`);
  console.log('─'.repeat(80));
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ ${title.padEnd(63)} │`);
  console.log('├─────────────────────────────────────────────────────────────┤');
  
  const lines = message.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      if (line.length > maxWidth) {
        let remaining = line;
        while (remaining.length > 0) {
          const chunk = remaining.substring(0, maxWidth);
          console.log(`│ ${chunk.padEnd(65)} │`);
          remaining = remaining.substring(maxWidth);
        }
      } else {
        console.log(`│ ${line.padEnd(65)} │`);
      }
    } else {
      console.log(`│ ${' '.padEnd(65)} │`);
    }
  }
  
  console.log('└─────────────────────────────────────────────────────────────┘');
}

function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🎬 EN版VSL1メッセージプレビュー（X用とTelegram用）');
  console.log('='.repeat(80));
  
  const lang = 'en';
  const deepLink = getTelegramDeepLink(lang);
  
  // Telegram用（完全版）
  const telegramMessage = generateVSL1Message(lang, deepLink, VSL1_YOUTUBE_LINK);
  
  // X用（実際のX投稿ロジックを使用）
  const xTweet = buildVsl1Tweet({
    vsl1Link: VSL1_YOUTUBE_LINK,
    deepLink: deepLink,
    variant: 'neutral', // デフォルトバリアント
    lang: lang,
  });
  
  // X用プレビュー
  displayMessageInBox('📱 X（Twitter）投稿用メッセージ', xTweet);
  console.log(`\n📏 文字数: ${xTweet.replace(/\n/g, ' ').length} / 280文字`);
  console.log(`📎 YouTubeリンク: ${VSL1_YOUTUBE_LINK}`);
  console.log(`🔗 Telegramリンク: ${deepLink}`);
  
  // Telegram用プレビュー
  displayMessageInBox('📱 Telegram用メッセージ（完全版）', telegramMessage);
  console.log(`\n📏 文字数: ${telegramMessage.replace(/\*\*/g, '').length}文字`);
  console.log(`📎 YouTubeリンク: ${VSL1_YOUTUBE_LINK}`);
  console.log(`🔗 Telegramリンク: ${deepLink}`);
  
  // 実際の送信テキスト
  console.log('\n\n📤 実際の送信テキスト');
  console.log('─'.repeat(80));
  console.log('\n【X（Twitter）投稿用】');
  console.log(xTweet);
  console.log('\n【Telegram用】');
  console.log(telegramMessage);
  
  console.log('\n' + '='.repeat(80));
}

// 即座に実行
main();
