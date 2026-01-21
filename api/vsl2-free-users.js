// api/vsl2-free-users.js
// 無料版ユーザーへのVSL2自動配信（24時間後）
// Gemini CMO提案: 48時間→24時間に短縮（ユーザーの熱量が高いうちにアプローチ）

const { sendMessage, sendPhotoToUser, sendMessageToUser } = require('../services/telegram/bot');
const { getFreeUsersForVSL2, markVSL2Sent } = require('../services/free-users/manager');
const { generateVSL2Message, addSubtitleParamsToYouTubeUrl } = require('../services/telegram/messages/vsl2');
const { retryWithExponentialBackoff } = require('../utils/retry');
const fs = require('fs');
const path = require('path');

// VSL2リンク: 環境変数が設定されていない場合、正しいVSL2リンクを使用
// VSL1リンクとの混同を防ぐため、明示的にチェック
let VSL2_YOUTUBE_LINK_RAW = process.env.VSL2_YOUTUBE_LINK || process.env.VSL_YOUTUBE_LINK || 'https://youtu.be/fXgVsKhqDjI';
if (VSL2_YOUTUBE_LINK_RAW.includes('OqvqngJOiXc')) {
  console.error('❌ CRITICAL ERROR: VSL2_YOUTUBE_LINK is set to VSL1 link! Using correct VSL2 link.');
  VSL2_YOUTUBE_LINK_RAW = 'https://youtu.be/fXgVsKhqDjI';
}
const VSL2_YOUTUBE_LINK = VSL2_YOUTUBE_LINK_RAW;
const PROMO_CODE = 'DEFEND50';

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const base = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

const DEFAULT_LANG = normalizeLang(process.env.LANG || 'en') || 'en';

// 言語別Whop URLマッピング
const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

function getWhopProductUrl(lang) {
  const normalized = normalizeLang(lang) || DEFAULT_LANG;
  return WHOP_PRODUCT_URLS[normalized] || WHOP_PRODUCT_URLS['en'];
}

function getUserLang(user) {
  return normalizeLang(user?.lang) || DEFAULT_LANG;
}

/**
 * VSL2メッセージ用のインラインボタンを生成（多言語対応）
 * Gemini CMO提案: インラインボタンでワンタップアクセスを実現
 * @param {string} lang - 言語コード
 * @returns {Object} Telegram Inline Keyboard Markup
 */
function generateVSL2InlineKeyboard(lang = DEFAULT_LANG) {
  const normalizedLang = normalizeLang(lang) || DEFAULT_LANG;
  const whopProductUrl = getWhopProductUrl(normalizedLang);
  
  // YouTubeリンクに字幕パラメータを追加
  const vsl2LinkWithSubtitles = addSubtitleParamsToYouTubeUrl(VSL2_YOUTUBE_LINK, normalizedLang);
  
  // 言語別のボタンテキスト（クリック率向上のため最適化）
  // 戦略: 緊急性・ベネフィット・行動喚起を強調
  const buttonTexts = {
    'en': {
      video: '🎬 Watch Why Pros Always Win',
      purchase: '🚀 Get 50% OFF Now'
    },
    'ja': {
      video: '🎬 勝てる人の理由を見る',
      purchase: '🚀 50%OFFで今すぐ購入'
    },
    'es': {
      video: '🎬 Ver Por Qué Ganan los Pros',
      purchase: '🚀 Obtener 50% OFF Ahora'
    },
    'pt-br': {
      video: '🎬 Ver Por Que Pros Sempre Vencem',
      purchase: '🚀 Obter 50% OFF Agora'
    },
    'ar': {
      video: '🎬 شاهد لماذا يربح المحترفون',
      purchase: '🚀 احصل على 50% خصم الآن'
    },
    'ko': {
      video: '🎬 상위 1%가 이기는 이유 보기',
      purchase: '🚀 50% 할인 지금 받기'
    }
  };
  
  const texts = buttonTexts[normalizedLang] || buttonTexts['en'];
  
  return {
    inline_keyboard: [
      [
        {
          text: texts.video,
          url: vsl2LinkWithSubtitles
        }
      ],
      [
        {
          text: texts.purchase,
          url: `${whopProductUrl}?promo=${PROMO_CODE}`
        }
      ]
    ]
  };
}


/**
 * 無料版ユーザーにVSL2を送信
 */
async function sendVSL2ToFreeUsers() {
  try {
    // 24時間経過した無料版ユーザーを取得（VSL2未送信）
    // Gemini CMO提案: 48時間→24時間に短縮
    const freeUsers = await getFreeUsersForVSL2();
    
    if (freeUsers.length === 0) {
      console.log('ℹ️ No free users to send VSL2 (24 hours passed, not sent yet)');
      return { success: true, sent: 0, message: 'No users to send', timestamp: new Date().toISOString() };
    }
    
    console.log(`📊 Found ${freeUsers.length} free users ready for VSL2`);
    console.log(`🚀 Starting VSL2 delivery to ${freeUsers.length} users at ${new Date().toISOString()}`);
    
    // サムネイル画像の準備
    let vsl2ThumbnailDataUrl = null;
    try {
      const thumbnailPath = path.join(process.cwd(), 'public/images/thumbnails/vsl2_thumbnail.png');
      if (fs.existsSync(thumbnailPath)) {
        const imageBuffer = fs.readFileSync(thumbnailPath);
        const base64Image = imageBuffer.toString('base64');
        vsl2ThumbnailDataUrl = `data:image/png;base64,${base64Image}`;
        console.log('🖼️ VSL2 Thumbnail loaded successfully');
      }
    } catch (err) {
      console.error('❌ Error loading VSL2 thumbnail:', err.message);
    }

    let sent = 0;
    let failed = 0;
    
    for (const user of freeUsers) {
      try {
        const userLang = getUserLang(user);
        const userWhopUrl = getWhopProductUrl(userLang);
        const message = generateVSL2Message(userLang, user.userName || 'there', VSL2_YOUTUBE_LINK, userWhopUrl, PROMO_CODE);
        
        // Gemini CMO提案: インラインボタンを追加
        const inlineKeyboard = generateVSL2InlineKeyboard(userLang);
        
        // Grok CSO+CFO推奨: 指数バックオフ・リトライロジック（最大3回）
        await retryWithExponentialBackoff(async () => {
          if (vsl2ThumbnailDataUrl) {
            // サムネイル付きで送信
            await sendPhotoToUser(user.chatId, vsl2ThumbnailDataUrl, message, {
              reply_markup: inlineKeyboard
            });
            console.log(`✅ VSL2 sent (with photo) to user ${user.chatId} (${userLang})`);
          } else {
            // テキストのみ送信 (Fallback)
            const botToken = process.env.TELEGRAM_BOT_TOKEN_EN || process.env.TELEGRAM_BOT_TOKEN;
            if (!botToken) {
              throw new Error('TELEGRAM_BOT_TOKEN_EN or TELEGRAM_BOT_TOKEN not set');
            }
            
            const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
            const response = await fetch(url.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.chatId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboard
              })
            });
            
            if (!response.ok) {
              const errText = await response.text();
              const error = new Error(`Telegram API Error: ${response.status} - ${errText}`);
              error.status = response.status;
              throw error;
            }
            console.log(`✅ VSL2 sent (text only) to user ${user.chatId} (${userLang})`);
          }
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 30000,
        });
        
        // VSL2送信済みフラグを設定
        await markVSL2Sent(user.chatId);
        
        sent++;
        
        // レート制限対策（20メッセージ/秒 = 50ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`❌ Failed to send VSL2 to user ${user.chatId} after retries:`, error.message);
      }
    }
    
    const result = { 
      success: true, 
      sent, 
      failed, 
      total: freeUsers.length,
      timestamp: new Date().toISOString(),
      successRate: total > 0 ? Math.round((sent / total) * 100) : 0
    };
    
    console.log(`✅ VSL2 delivery completed: ${sent}/${total} sent successfully (${result.successRate}% success rate)`);
    if (failed > 0) {
      console.warn(`⚠️ ${failed} users failed to receive VSL2`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ VSL2 free users send failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Vercel Cron実行時（1時間ごと）
module.exports = async (req, res) => {
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await sendVSL2ToFreeUsers();
    
    // 緊急修正: VSL2配信完了時にCEOレポートを送信（重要なメトリクスのみ）
    if (result.sent > 0 || result.failed > 0) {
      try {
        const { sendCEOReport } = require('../services/email/ceo-report');
        await sendCEOReport({
          subject: `VSL2配信完了 - ${result.sent}件送信成功`,
          html: `
<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
  ✅ VSL2配信完了レポート
</h2>

<h3 style="color: #555; margin-top: 20px;">📊 配信結果</h3>
<ul style="line-height: 1.8;">
  <li><strong>送信成功:</strong> ${result.sent}件</li>
  <li><strong>送信失敗:</strong> ${result.failed}件</li>
  <li><strong>成功率:</strong> ${result.successRate}%</li>
  <li><strong>実行時刻:</strong> ${result.timestamp}</li>
</ul>

${result.failed > 0 ? `
<h3 style="color: #f44336; margin-top: 20px;">⚠️ 注意</h3>
<p style="color: #666;">
  ${result.failed}件の送信に失敗しました。ログを確認してください。
</p>
` : ''}
          `.trim(),
          category: 'VSL_WORKFLOW',
          metadata: {
            'Sent': `${result.sent}件`,
            'Failed': `${result.failed}件`,
            'Success Rate': `${result.successRate}%`,
          },
        }).catch(error => {
          console.error('[VSL2] Failed to send CEO report:', error.message);
        });
      } catch (error) {
        console.error('[VSL2] CEO report error:', error.message);
      }
    }
    
    return res.status(200).json(result);
  } catch (error) {
    // エラー時もCEOレポートを送信
    try {
      const { sendCEOReport } = require('../services/email/ceo-report');
      await sendCEOReport({
        subject: 'VSL2配信エラー',
        html: `
<h2 style="color: #f44336; border-bottom: 2px solid #f44336; padding-bottom: 10px;">
  ❌ VSL2配信エラー
</h2>

<p style="color: #666; margin-top: 20px;">
  <strong>エラー:</strong> ${error.message}
</p>

<pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">
${error.stack || 'Stack trace not available'}
</pre>
        `.trim(),
        category: 'VSL_WORKFLOW_ERROR',
        metadata: {
          'Error': error.message,
        },
      }).catch(reportError => {
        console.error('[VSL2] Failed to send error report:', reportError.message);
      });
    } catch (reportError) {
      console.error('[VSL2] Error report error:', reportError.message);
    }
    
    return res.status(500).json({ error: error.message });
  }
};

module.exports.sendVSL2ToFreeUsers = sendVSL2ToFreeUsers;
module.exports.generateVSL2InlineKeyboard = generateVSL2InlineKeyboard;
