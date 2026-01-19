// scripts/send-vsl1-test-telegram.js
// VSL1メッセージをTelegramに送信するテストスクリプト（画像付き）

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateVSL1Message } = require('../services/telegram/messages/vsl1');
const { sendPhotoToUser } = require('../services/telegram/bot');

const VSL1_YOUTUBE_LINK = process.env.VSL1_YOUTUBE_LINK || 'https://youtu.be/OqvqngJOiXc';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'dr_grok_bot';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8150215039:AAHMpuZRugBj2mtubi3Xa0wwc7gxFv_lbwc';

function getTelegramDeepLink(lang) {
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
  const startParam = normalizedLang ? `minimal_${normalizedLang}` : 'minimal';
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${startParam}`;
}

function markdownToHtml(text) {
  // MarkdownをHTMLに変換（Telegram HTML形式）
  // まず、Markdownの太字をHTMLに変換
  let html = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  
  // HTMLタグ内のテキストのみエスケープ（URLやハッシュタグはそのまま）
  // <b>タグの内容を保護しながらエスケープ
  const parts = [];
  let lastIndex = 0;
  const tagRegex = /<b>([^<]+)<\/b>/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    // タグの前の部分をエスケープ
    if (match.index > lastIndex) {
      const beforeTag = html.substring(lastIndex, match.index);
      parts.push(escapeHtmlText(beforeTag));
    }
    // タグ内のテキストもエスケープ
    parts.push(`<b>${escapeHtmlText(match[1])}</b>`);
    lastIndex = match.index + match[0].length;
  }
  
  // 残りの部分をエスケープ
  if (lastIndex < html.length) {
    parts.push(escapeHtmlText(html.substring(lastIndex)));
  }
  
  return parts.length > 0 ? parts.join('') : escapeHtmlText(html);
}

function escapeHtmlText(text) {
  // URL、ハッシュタグ、ディープリンクを保護
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hashtagRegex = /(#\w+)/g;
  
  const placeholders = [];
  let escaped = text;
  
  // URLを保護
  escaped = escaped.replace(urlRegex, (match) => {
    const placeholder = `__URL_${placeholders.length}__`;
    placeholders.push(match);
    return placeholder;
  });
  
  // ハッシュタグを保護
  escaped = escaped.replace(hashtagRegex, (match) => {
    const placeholder = `__HASHTAG_${placeholders.length}__`;
    placeholders.push(match);
    return placeholder;
  });
  
  // 特殊文字をエスケープ
  escaped = escaped
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // プレースホルダーを元に戻す
  placeholders.forEach((original, index) => {
    if (original.startsWith('http://') || original.startsWith('https://')) {
      escaped = escaped.replace(`__URL_${index}__`, original);
    } else if (original.startsWith('#')) {
      escaped = escaped.replace(`__HASHTAG_${index}__`, original);
    }
  });
  
  return escaped;
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
    } else {
      console.warn(`⚠️ VSL1サムネイルが見つかりません: ${thumbnailPath}`);
      return null;
    }
  } catch (error) {
    console.error('❌ VSL1サムネイル読み込みエラー:', error.message);
    return null;
  }
}

async function main() {
  // コマンドライン引数からチャットIDと言語を取得
  const chatId = process.argv[2];
  const lang = process.argv[3] || 'en'; // デフォルトは英語
  
  if (!chatId) {
    console.error('❌ エラー: チャットIDが必要です');
    console.log('使用方法: node scripts/send-vsl1-test-telegram.js <CHAT_ID> [LANG]');
    console.log('例: node scripts/send-vsl1-test-telegram.js 6770292419 ja');
    console.log('例: node scripts/send-vsl1-test-telegram.js -1001234567890 en');
    console.log('\n対応言語: en, ja, es, pt-br, ar, ko');
    console.log('\nチャットIDの取得方法:');
    console.log('1. Botにメッセージを送信');
    console.log('2. https://api.telegram.org/bot<TOKEN>/getUpdates にアクセス');
    console.log('3. 返ってきたJSONからchat.idを確認');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📤 VSL1メッセージ送信テスト');
  console.log('='.repeat(80));
  console.log(`\n🤖 Bot: @${TELEGRAM_BOT_USERNAME}`);
  console.log(`💬 チャットID: ${chatId}`);
  console.log(`🌐 言語: ${lang.toUpperCase()}`);
  
  const deepLink = getTelegramDeepLink(lang);
  const message = generateVSL1Message(lang, deepLink, VSL1_YOUTUBE_LINK);
  
  console.log('\n📝 送信メッセージ:');
  console.log('─'.repeat(80));
  console.log(message);
  console.log('─'.repeat(80));
  
  console.log('\n⏳ 送信中...');
  
  try {
    // VSL1サムネイル画像を読み込む
    const vsl1ThumbnailDataUrl = loadVSL1Thumbnail();
    
    if (vsl1ThumbnailDataUrl) {
      // 画像付きで送信
      console.log('📸 画像付きで送信します...');
      // parse_modeを指定せずに送信（プレーンテキスト、Markdown/HTMLパースエラーを回避）
      await sendPhotoToUser(chatId, vsl1ThumbnailDataUrl, message, {});
      console.log('\n✅ 画像付きメッセージ送信完了！');
    } else {
      // 画像がない場合はテキストのみ送信（フォールバック）
      console.log('⚠️ 画像が見つからないため、テキストのみで送信します...');
      const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`);
      const body = {
        chat_id: chatId,
        text: markdownToHtml(message),
        parse_mode: 'HTML',
      };

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
      }

      const data = await response.json();
      console.log('\n✅ テキストメッセージ送信完了！');
    }
  } catch (error) {
    console.error('\n❌ 送信失敗:', error.message);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(80));
}

main();
