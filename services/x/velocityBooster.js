// services/x/velocityBooster.js
// Velocity Boost: 投稿直後5分以内に子アカウントから高品質リプライを自動投入
// Xアルゴが初期エンゲージメントを重視する最新動向に対応

const { replyToTweet } = require('./client');
const { generateEngagementCTA } = require('./optimization');

// Vercel KV（投稿ID監視用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Velocity Booster] @vercel/kv not available:', error.message);
}

/**
 * 投稿IDを監視キューに追加
 * @param {string} tweetId - 投稿ID
 * @param {string} lang - 言語コード
 * @param {Object} context - コンテキスト（投稿内容、メディアタイプ等）
 */
async function addToVelocityQueue(tweetId, lang, context = {}) {
  if (!kv) {
    console.warn('[Velocity Booster] KV not available, skipping queue addition');
    return;
  }
  
  try {
    const queueKey = `x:velocity_queue:${tweetId}`;
    const queueData = {
      tweetId,
      lang,
      postedAt: new Date().toISOString(),
      context,
      processed: false,
    };
    
    // 5分間保持（5分以内に処理）
    await kv.set(queueKey, queueData, { ex: 300 }); // 300秒 = 5分
    
    console.log(`[Velocity Booster] ✅ Added ${tweetId} to velocity queue`);
  } catch (error) {
    console.error('[Velocity Booster] Failed to add to queue:', error.message);
  }
}

/**
 * 高品質リプライテキストを生成
 * @param {string} lang - 言語コード
 * @param {Object} context - コンテキスト（投稿内容、メディアタイプ等）
 * @returns {Promise<string>} リプライテキスト
 */
async function generateVelocityReply(lang, context = {}) {
  try {
    // Grok推奨: 質問CTA必須（アルゴリズム評価UP）
    const cta = await generateEngagementCTA(lang);
    
    // コンテキストに基づいてリプライを生成
    const { contentType, trapScore, priceUsd } = context;
    
    const templates = {
      en: {
        video: `Great analysis! 🎯 ${cta}`,
        poll: `Interesting poll! What's your take? ${cta}`,
        thread: `Thread is spot on! 💯 ${cta}`,
        default: `Agree! 🚀 ${cta}`,
      },
      ja: {
        video: `素晴らしい分析です！🎯 ${cta}`,
        poll: `興味深いポールですね！どう思いますか？${cta}`,
        thread: `スレッドが的確です！💯 ${cta}`,
        default: `同意します！🚀 ${cta}`,
      },
      es: {
        video: `¡Excelente análisis! 🎯 ${cta}`,
        poll: `¡Encuesta interesante! ¿Qué opinas? ${cta}`,
        thread: `¡El hilo es perfecto! 💯 ${cta}`,
        default: `¡De acuerdo! 🚀 ${cta}`,
      },
      'pt-br': {
        video: `Ótima análise! 🎯 ${cta}`,
        poll: `Enquete interessante! O que você acha? ${cta}`,
        thread: `Thread perfeito! 💯 ${cta}`,
        default: `Concordo! 🚀 ${cta}`,
      },
      ar: {
        video: `تحليل رائع! 🎯 ${cta}`,
        poll: `استطلاع مثير للاهتمام! ما رأيك؟${cta}`,
        thread: `الموضوع مثالي! 💯 ${cta}`,
        default: `موافق! 🚀 ${cta}`,
      },
      ko: {
        video: `훌륭한 분석입니다! 🎯 ${cta}`,
        poll: `흥미로운 설문입니다! 어떻게 생각하시나요?${cta}`,
        thread: `스레드가 정확합니다! 💯 ${cta}`,
        default: `동의합니다! 🚀 ${cta}`,
      },
    };
    
    const langTemplates = templates[lang] || templates.en;
    const template = langTemplates[contentType] || langTemplates.default;
    
    return template;
  } catch (error) {
    console.error('[Velocity Booster] Failed to generate reply:', error.message);
    // フォールバック
    const fallback = {
      en: 'Great post! 🚀',
      ja: '素晴らしい投稿です！🚀',
      es: '¡Excelente publicación! 🚀',
      'pt-br': 'Ótima publicação! 🚀',
      ar: 'منشور رائع! 🚀',
      ko: '훌륭한 게시물입니다! 🚀',
    };
    return fallback[lang] || fallback.en;
  }
}

/**
 * 子アカウントからリプライを投稿
 * @param {string} tweetId - 投稿ID
 * @param {string} lang - 言語コード
 * @param {Object} context - コンテキスト
 * @returns {Promise<Object>} リプライ結果
 */
async function postVelocityReply(tweetId, lang, context = {}) {
  try {
    // リプライテキストを生成
    const replyText = await generateVelocityReply(lang, context);
    
    // 子アカウントからリプライ（現在はメインアカウントから）
    // 将来的に子アカウント管理機能を追加
    // 🔴 CRITICAL FIX: 引数の順序を修正（textが先、inReplyToTweetIdが後）
    const result = await replyToTweet(replyText, tweetId);
    
    console.log(`[Velocity Booster] ✅ Velocity reply posted: ${result.id}`);
    
    return {
      success: true,
      replyTweetId: result.id,
      tweetId,
      lang,
    };
  } catch (error) {
    console.error(`[Velocity Booster] ❌ Failed to post velocity reply:`, error.message);
    return {
      success: false,
      tweetId,
      lang,
      error: error.message,
    };
  }
}

/**
 * キューから投稿IDを取得して処理
 * @param {number} maxProcess - 最大処理数（デフォルト: 10）
 * @returns {Promise<Array>} 処理結果
 */
async function processVelocityQueue(maxProcess = 10) {
  if (!kv) {
    console.warn('[Velocity Booster] KV not available, skipping queue processing');
    return [];
  }
  
  try {
    // 注意: KVストレージでは全キーをスキャンできないため、
    // 実際の実装では、投稿時にキューに追加し、別のCron Jobで処理する
    // または、投稿IDを直接渡して処理する
    
    console.log('[Velocity Booster] Queue processing not fully implemented (KV limitation)');
    console.log('[Velocity Booster] Use postVelocityReply() directly after posting');
    
    return [];
  } catch (error) {
    console.error('[Velocity Booster] Failed to process queue:', error.message);
    return [];
  }
}

/**
 * 投稿直後にVelocity Boostを実行
 * @param {string} tweetId - 投稿ID
 * @param {string} lang - 言語コード
 * @param {Object} context - コンテキスト
 * @returns {Promise<Object>} 実行結果
 */
async function boostVelocity(tweetId, lang, context = {}) {
  try {
    // 投稿直後に即座にリプライを投稿（5分以内）
    // Grok推奨: 投稿後5分以内に子アカウントから高品質リプライを自動投入
    
    // ランダムな遅延（1-3分）を追加して自然な動作を模倣
    const delay = Math.floor(Math.random() * 120000) + 60000; // 1-3分
    
    setTimeout(async () => {
      const result = await postVelocityReply(tweetId, lang, context);
      console.log(`[Velocity Booster] Velocity boost completed:`, result);
    }, delay);
    
    // キューにも追加（バックアップ）
    await addToVelocityQueue(tweetId, lang, context);
    
    return {
      success: true,
      tweetId,
      lang,
      scheduled: true,
      delayMs: delay,
    };
  } catch (error) {
    console.error('[Velocity Booster] Failed to boost velocity:', error.message);
    return {
      success: false,
      tweetId,
      lang,
      error: error.message,
    };
  }
}

module.exports = {
  addToVelocityQueue,
  generateVelocityReply,
  postVelocityReply,
  processVelocityQueue,
  boostVelocity,
};
