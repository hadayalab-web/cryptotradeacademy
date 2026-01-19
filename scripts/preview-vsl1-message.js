// scripts/preview-vsl1-message.js
// VSL1メッセージのUIプレビューを表示

require('dotenv').config();
const { generateVSL1Message } = require('../services/telegram/messages/vsl1');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'dr_grok_bot';

// 簡易版ディープリンク生成（API依存を排除）
function getTelegramDeepLink(lang) {
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
  const startParam = normalizedLang ? `minimal_${normalizedLang}` : 'minimal';
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${startParam}`;
}

function displayXReplyPreview(lang, message) {
  // Xリプライ形式（280文字制限に合わせて調整）
  const plainText = message.replace(/\*\*/g, '').replace(/\n/g, ' ');
  const replyText = plainText.length > 280 
    ? `${plainText.substring(0, 250)}... ${VSL1_YOUTUBE_LINK}`
    : plainText;

  console.log('\n' + '='.repeat(80));
  console.log(`📱 X（Twitter）リプライプレビュー - ${lang.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ @TrapDefenceBot replied to @username                        │`);
  console.log('├─────────────────────────────────────────────────────────────┤');
  
  // メッセージを行ごとに表示（最大幅70文字）
  const lines = message.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      // 長い行を折り返す
      const maxWidth = 65;
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
  console.log(`\n📏 文字数: ${replyText.length} / 280文字`);
  console.log(`📎 YouTubeリンク: ${VSL1_YOUTUBE_LINK}`);
  console.log(`🔗 Telegramリンク: ${getTelegramDeepLink(lang)}`);
}

function displayFullMessagePreview(lang, message) {
  console.log('\n' + '='.repeat(80));
  console.log(`📄 完全版メッセージ - ${lang.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('\n' + message);
}

function main() {
  console.log('\n🎬 VSL1メッセージUIプレビュー\n');

  const languages = ['en', 'ja', 'es'];
  
  for (const lang of languages) {
    try {
      const deepLink = getTelegramDeepLink(lang);
      const message = generateVSL1Message(lang, deepLink, VSL1_YOUTUBE_LINK);
      
      // 完全版メッセージを表示
      displayFullMessagePreview(lang, message);
      
      // Xリプライ形式を表示
      displayXReplyPreview(lang, message);
      
      console.log('\n');
    } catch (error) {
      console.error(`❌ Error generating message for ${lang}:`, error.message);
      console.error(error.stack);
    }
  }

  // サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 表示言語数: ${languages.length} (en, ja, es)`);
  console.log(`📹 YouTubeリンク: ${VSL1_YOUTUBE_LINK}`);
  console.log(`🤖 Telegram Bot: @${TELEGRAM_BOT_USERNAME}`);
  console.log('\n');
}

if (require.main === module) {
  try {
    main();
    process.exit(0);
  } catch (error) {
    console.error('致命的なエラー:', error);
    process.exit(1);
  }
}

module.exports = { displayXReplyPreview, displayFullMessagePreview };
