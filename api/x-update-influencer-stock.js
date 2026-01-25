// api/x-update-influencer-stock.js
// インフルエンサーストック更新API

const { updateInfluencerStock, updateAllInfluencerStocks, getInfluencersFromStock, getStockUpdateTime } = require('../services/x/influencerStock');

module.exports = async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  console.log('[Update Influencer Stock] ========================================');
  console.log('[Update Influencer Stock] API triggered at', new Date().toISOString());
  console.log('[Update Influencer Stock] ========================================');
  
  // 認証チェック
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Update Influencer Stock] ❌ Unauthorized: Invalid CRON_SECRET');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { lang, all = false } = req.body || {};
    
    // XAI_API_KEYの確認
    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      console.error('[Update Influencer Stock] ❌ XAI_API_KEY not set');
      return res.status(500).json({ 
        error: 'XAI_API_KEY not configured',
        message: 'XAI_API_KEY environment variable is required' 
      });
    }
    
    console.log('[Update Influencer Stock] ✅ XAI_API_KEY configured');
    
    let results;
    
    if (all) {
      // すべての言語のストックを更新
      console.log('[Update Influencer Stock] 🔄 Updating stocks for all languages...');
      results = await updateAllInfluencerStocks();
      
      // 各言語のストック状況を取得
      const stockStatus = {};
      const langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
      for (const l of langs) {
        const stock = await getInfluencersFromStock(l);
        const updateTime = await getStockUpdateTime(l);
        stockStatus[l] = {
          count: stock.length,
          updateTime: updateTime || null,
        };
      }
      
      return res.status(200).json({
        success: true,
        message: 'All influencer stocks updated',
        results,
        stockStatus,
        timestamp: new Date().toISOString(),
      });
    } else if (lang) {
      // 指定言語のストックを更新
      const targetLang = (lang || 'en').toLowerCase();
      console.log(`[Update Influencer Stock] 🔄 Updating stock for ${targetLang}...`);
      
      const influencers = await updateInfluencerStock(targetLang);
      const updateTime = await getStockUpdateTime(targetLang);
      
      return res.status(200).json({
        success: true,
        lang: targetLang,
        count: influencers.length,
        influencers: influencers.slice(0, 10), // 最初の10人だけ返す
        updateTime: updateTime || null,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 言語が指定されていない場合、エラー
      return res.status(400).json({
        error: 'Bad request',
        message: 'lang parameter is required when all=false',
      });
    }
  } catch (error) {
    console.error('[Update Influencer Stock] ❌ Error:', error.message);
    console.error('[Update Influencer Stock] Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};
