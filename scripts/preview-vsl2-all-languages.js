// scripts/preview-vsl2-all-languages.js
// VSL2メッセージ全言語版プレビュー

require('dotenv').config();
const { generateVSL2Message, VSL2_MESSAGES } = require('../services/telegram/messages/vsl2');

const VSL2_YOUTUBE_LINK = process.env.VSL2_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';
const PROMO_CODE = 'DEFEND50';

const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

const LANGUAGE_NAMES = {
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'es': 'Español',
  'pt-br': 'Português (Brasil)',
  'ar': 'العربية',
};

function getWhopProductUrl(lang) {
  return WHOP_PRODUCT_URLS[lang] || WHOP_PRODUCT_URLS['en'];
}

function displayMessage(lang, message) {
  const langName = LANGUAGE_NAMES[lang] || lang.toUpperCase();
  
  console.log('\n' + '='.repeat(80));
  console.log(`📱 ${langName} (${lang.toUpperCase()}) - VSL2メッセージ`);
  console.log('='.repeat(80));
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ 📸 [VSL2 Thumbnail Image]                                    │`);
  console.log(`│    "STOP LOSING. START WINNING. 50% OFF LIMITED"              │`);
  console.log('├─────────────────────────────────────────────────────────────┤');
  
  const lines = message.split('\n');
  for (const line of lines) {
    if (line.trim()) {
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
  
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│ [🎬 Watch VSL2 Video]  [🚀 Get 50% OFF Now]                │`);
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log(`\n📏 文字数: ${message.replace(/\*\*/g, '').replace(/\`/g, '').length}文字`);
  console.log(`🔗 VSL2リンク: ${VSL2_YOUTUBE_LINK}`);
  console.log(`💰 プロモコード: ${PROMO_CODE}`);
  console.log(`🛒 Whop URL: ${getWhopProductUrl(lang)}?promo=${PROMO_CODE}`);
}

function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🎬 VSL2メッセージ全言語版プレビュー');
  console.log('='.repeat(80));
  console.log('\n📋 配信形式:');
  console.log('  - サムネイル画像（キャッチーなバナー）');
  console.log('  - メッセージ本文（言語別）');
  console.log('  - インラインボタン（VSL2動画・購入リンク）');
  console.log('\n⏰ 配信タイミング: 無料版ユーザー登録から24時間後（自動）');
  console.log('📤 配信先: Telegram DM（ユーザー個別）');
  
  const languages = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];
  
  for (const lang of languages) {
    try {
      const userName = 'there'; // デフォルトユーザー名
      const whopUrl = getWhopProductUrl(lang);
      const message = generateVSL2Message(lang, userName, VSL2_YOUTUBE_LINK, whopUrl, PROMO_CODE);
      
      displayMessage(lang, message);
    } catch (error) {
      console.error(`❌ ${lang}言語のメッセージ生成エラー:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 サマリー');
  console.log('='.repeat(80));
  console.log(`✅ 対応言語数: ${languages.length}言語`);
  console.log(`📹 VSL2リンク: ${VSL2_YOUTUBE_LINK}`);
  console.log(`💰 プロモコード: ${PROMO_CODE} (50% OFF)`);
  console.log(`🎨 サムネイル: public/images/thumbnails/vsl2_thumbnail.png`);
  console.log(`\n💡 すべての言語で同じ構造で配信されます:`);
  console.log(`   1. キャッチーなサムネイル画像`);
  console.log(`   2. 言語別メッセージ本文`);
  console.log(`   3. インラインボタン（VSL2動画・購入リンク）`);
  console.log('\n' + '='.repeat(80));
}

main();
