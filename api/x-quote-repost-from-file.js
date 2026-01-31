// api/x-quote-repost-from-file.js
// ファイルシステムからインフルエンサーを取得して引用リポスト（1日1000投稿対応）
// KV廃止: Git管理のJSON/CSVファイルから読み込み

const { getInfluencersFromStock } = require('../services/x/influencerStockFromFile');
const { postQuoteTweet } = require('../services/x/client');
const { getWhopProductUrl } = require('../services/telegram/whop-links');

// 1日1000投稿 = 1時間あたり約42投稿 = 1分ごとに1回実行して約0.7投稿
const POSTS_PER_DAY = 1000;
const POSTS_PER_HOUR = Math.ceil(POSTS_PER_DAY / 24); // 約42投稿/時間
const POSTS_PER_MINUTE = POSTS_PER_HOUR / 60; // 約0.7投稿/分
const POSTS_PER_EXECUTION = Math.ceil(POSTS_PER_MINUTE); // 1回の実行で1投稿

const LANGUAGES = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const POSTS_PER_LANG_PER_DAY = Math.ceil(POSTS_PER_DAY / LANGUAGES.length); // 約167投稿/言語/日

/**
 * 引用リポストを実行（1分ごとに1回実行）
 */
async function executeQuoteRepost() {
  console.log(`[QuoteRepost] 実行開始: ${new Date().toISOString()}`);
  
  const results = {
    success: 0,
    failed: 0,
    byLang: {}
  };
  
  // 1回の実行で1言語を処理（ローテーション）
  // 6言語を6分で1サイクル → 1日240サイクル = 1440回実行 = 1440投稿（目標1000投稿を超える）
  const currentMinute = new Date().getMinutes();
  const langIndex = currentMinute % LANGUAGES.length;
  const lang = LANGUAGES[langIndex];
  
  try {
    // 言語別にインフルエンサーを取得（ローテーション用）
    const influencers = getInfluencersFromStock(lang, {
      activeOnly: true,
      excludeShadowbanned: true,
      limit: 1000 // 十分な数
    });
    
    if (influencers.length === 0) {
      console.warn(`[QuoteRepost] [${lang.toUpperCase()}] インフルエンサーが見つかりません`);
      return results;
    }
    
    // ランダムに1人選択（ローテーション）
    const randomIndex = Math.floor(Math.random() * influencers.length);
    const influencer = influencers[randomIndex];
    
    console.log(`[QuoteRepost] [${lang.toUpperCase()}] 選択: @${influencer.username} (tweetId: ${influencer.tweetId})`);
    
    // 引用リポスト用のテキストを生成
    const quoteText = generateQuoteText(influencer, lang);
    
    // 引用リポストを実行
    const result = await postQuoteTweet({
      quoteTweetId: influencer.tweetId,
      text: quoteText
    });
    
    if (result && result.id) {
      results.success++;
      results.byLang[lang] = (results.byLang[lang] || 0) + 1;
      console.log(`[QuoteRepost] [${lang.toUpperCase()}] ✅ 成功: ${result.id}`);
    } else {
      results.failed++;
      console.error(`[QuoteRepost] [${lang.toUpperCase()}] ❌ 失敗:`, result);
    }
    
  } catch (error) {
    results.failed++;
    console.error(`[QuoteRepost] [${lang.toUpperCase()}] ❌ エラー: ${error.message}`);
    console.error(`[QuoteRepost] Stack:`, error.stack);
  }
  
  console.log(`[QuoteRepost] 実行完了: 成功${results.success}件, 失敗${results.failed}件`);
  return results;
}

/**
 * 引用リポスト用のテキストを生成
 */
function generateQuoteText(influencer, lang) {
  const whopLink = getWhopProductUrl(lang) + '?promo=DEFEND50';
  
  const texts = {
    'en': `This is exactly why Trap Defence BTC exists 🚀 ${whopLink} What's your biggest fear in this market? Reply! #BTC #TrapDefence`,
    'es': `Esto es exactamente por qué existe Trap Defence BTC 🚀 ${whopLink} ¿Cuál es tu mayor miedo en este mercado? ¡Responde! #BTC #TrapDefence`,
    'pt-br': `É exatamente por isso que Trap Defence BTC existe 🚀 ${whopLink} Qual é o seu maior medo neste mercado? Responda! #BTC #TrapDefence`,
    'ar': `هذا بالضبط سبب وجود Trap Defence BTC 🚀 ${whopLink} ما هو أكبر خوفك في هذا السوق؟ رد! #BTC #TrapDefence`,
    'ja': `これがまさにTrap Defence BTCが存在する理由です 🚀 ${whopLink} この市場で最も大きな恐怖は何ですか？リプライ！ #BTC #TrapDefence`,
    'ko': `이것이 바로 Trap Defence BTC가 존재하는 이유입니다 🚀 ${whopLink} 이 시장에서 가장 큰 두려움은 무엇입니까? 답장하세요! #BTC #TrapDefence`
  };
  
  return texts[lang] || texts['en'];
}

/**
 * Vercel CronJob用のエクスポート
 */
module.exports = async (req, res) => {
  try {
    const results = await executeQuoteRepost();
    res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QuoteRepost] API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  executeQuoteRepost,
  POSTS_PER_DAY,
  POSTS_PER_HOUR,
  INTERVAL_MINUTES
};
