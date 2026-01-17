// scripts/send-lang-completion-dm-campaign.js
// 既存ユーザーへの言語補完DMキャンペーン
// Grok CSO+CFO推奨: 既存ユーザーの言語情報を99%補完

require('dotenv').config({ path: '.env' });
const { loadFreeUsers, saveFreeUsers } = require('../services/free-users/manager');
const { sendMessageToUser } = require('../services/telegram/bot');
const { retryWithExponentialBackoff } = require('../utils/retry');

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

// 言語別メッセージテンプレート
const LANG_COMPLETION_MESSAGES = {
  en: `Hi! 👋

To provide you with the best experience, please let us know your preferred language:

🇺🇸 English
🇪🇸 Español
🇧🇷 Português (Brasil)
🇸🇦 العربية
🇯🇵 日本語
🇰🇷 한국어

Reply with: EN / ES / PT / AR / JA / KO

Or click one of the buttons below.`,
  es: `¡Hola! 👋

Para brindarte la mejor experiencia, por favor indícanos tu idioma preferido:

🇺🇸 English
🇪🇸 Español
🇧🇷 Português (Brasil)
🇸🇦 العربية
🇯🇵 日本語
🇰🇷 한국어

Responde con: EN / ES / PT / AR / JA / KO`,
  'pt-br': `Olá! 👋

Para oferecer a melhor experiência, por favor nos informe seu idioma preferido:

🇺🇸 English
🇪🇸 Español
🇧🇷 Português (Brasil)
🇸🇦 العربية
🇯🇵 日本語
🇰🇷 한국어

Responda com: EN / ES / PT / AR / JA / KO`,
  ar: `مرحباً! 👋

لتقديم أفضل تجربة، يرجى إخبارنا بلغتك المفضلة:

🇺🇸 English
🇪🇸 Español
🇧🇷 Português (Brasil)
🇸🇦 العربية
🇯🇵 日本語
🇰🇷 한국어

رد بـ: EN / ES / PT / AR / JA / KO`,
  ja: `こんにちは！👋

最適な体験を提供するため、ご希望の言語をお知らせください：

🇺🇸 English
🇪🇸 Español
🇧🇷 Português (Brasil)
🇸🇦 العربية
🇯🇵 日本語
🇰🇷 한국어

返信: EN / ES / PT / AR / JA / KO`,
  ko: `안녕하세요! 👋

최상의 경험을 제공하기 위해 선호하는 언어를 알려주세요:

🇺🇸 English
🇪🇸 Español
🇧🇷 Português (Brasil)
🇸🇦 العربية
🇯🇵 日本語
🇰🇷 한국어

답장: EN / ES / PT / AR / JA / KO`,
};

/**
 * 言語補完DMキャンペーンを実行
 */
async function sendLangCompletionDMCampaign() {
  try {
    console.log('🔄 言語補完DMキャンペーンを開始...\n');
    
    const users = await loadFreeUsers();
    console.log(`📊 総ユーザー数: ${users.length}`);
    
    // 言語情報が無いユーザーを抽出
    const usersWithoutLang = users.filter(user => {
      const userObj = typeof user === 'string' ? {
        chatId: user,
        lang: null,
      } : user;
      return !normalizeLang(userObj.lang);
    });
    
    console.log(`📋 言語情報が無いユーザー数: ${usersWithoutLang.length}`);
    
    if (usersWithoutLang.length === 0) {
      console.log('✅ すべてのユーザーに言語情報が設定されています');
      return { success: true, sent: 0, total: 0 };
    }
    
    // デフォルト言語を決定（環境変数から、またはEN）
    const defaultLang = normalizeLang(process.env.LANG || 'en') || 'en';
    const defaultMessage = LANG_COMPLETION_MESSAGES[defaultLang] || LANG_COMPLETION_MESSAGES.en;
    
    let sent = 0;
    let failed = 0;
    let updated = 0;
    
    for (const user of usersWithoutLang) {
      try {
        const userObj = typeof user === 'string' ? {
          chatId: user,
          lang: null,
        } : user;
        
        const chatId = userObj.chatId;
        
        // 指数バックオフ・リトライロジックで送信
        await retryWithExponentialBackoff(async () => {
          await sendMessageToUser(chatId, defaultMessage);
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 30000,
        });
        
        sent++;
        console.log(`✅ DM送信完了: ${chatId}`);
        
        // レート制限対策（20メッセージ/秒 = 50ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ DM送信失敗: ${userObj.chatId} - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 キャンペーン結果');
    console.log('='.repeat(80));
    console.log(`  総ユーザー数: ${users.length}`);
    console.log(`  言語情報なし: ${usersWithoutLang.length}`);
    console.log(`  送信成功: ${sent}`);
    console.log(`  送信失敗: ${failed}`);
    console.log(`  更新済み: ${updated}`);
    console.log('='.repeat(80));
    
    return {
      success: true,
      sent,
      failed,
      total: usersWithoutLang.length,
      totalUsers: users.length,
    };
  } catch (error) {
    console.error('❌ 言語補完DMキャンペーンエラー:', error.message);
    throw error;
  }
}

// 実行
if (require.main === module) {
  sendLangCompletionDMCampaign()
    .then((result) => {
      console.log('\n✅ キャンペーン完了');
      if (result.success) {
        console.log(`📊 結果: ${result.sent}/${result.total} ユーザーにDM送信`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { sendLangCompletionDMCampaign };
