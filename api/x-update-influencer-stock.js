// api/x-update-influencer-stock.js
// インフルエンサーストック更新API

const { updateInfluencerStock, updateAllInfluencerStocks, getInfluencersFromStock, getStockUpdateTime } = require('../services/x/influencerStock');

module.exports = async function handler(req, res) {
  // タイムアウト対策: 開始時刻を記録
  const startTime = Date.now();
  const TIMEOUT_MS = 50000; // 50秒（60秒制限の前に終了）
  
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

  // タイムアウトチェック関数
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > TIMEOUT_MS) {
      throw new Error(`Timeout: Execution time exceeded ${TIMEOUT_MS}ms`);
    }
  };

  try {
    // リクエストボディから取得（Cron Jobのbodyパラメータにも対応）
    const bodyLang = req.body?.lang;
    const bodyAll = req.body?.all;
    const queryLang = req.query?.lang;
    
    const lang = bodyLang || queryLang;
    const all = bodyAll === true || (bodyLang === undefined && queryLang === undefined && bodyAll === undefined);
    
    checkTimeout();
    
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
      // すべての言語のストックを更新（タイムアウト対策: 早期リターン）
      console.log('[Update Influencer Stock] ⚠️ WARNING: Updating all languages may timeout');
      console.log('[Update Influencer Stock] 🔄 Updating stocks for all languages...');
      
      // タイムアウト対策: 即座に202 Acceptedを返してバックグラウンド処理を開始
      res.status(202).json({
        success: true,
        message: 'All influencer stocks update started (processing in background)',
        timestamp: new Date().toISOString(),
      });
      
      // バックグラウンドで処理を続行（レスポンスは既に返している）
      // タイムアウト対策: 45秒のタイムアウトを設定（60秒制限の前に終了）
      updateAllInfluencerStocks(['en', 'es', 'pt-br', 'ar', 'ja', 'ko'], { timeoutMs: 45000 }).then((results) => {
        const successCount = Object.values(results).filter(r => r.success).length;
        console.log(`[Update Influencer Stock] ✅✅✅ Background update completed: ${successCount}/${Object.keys(results).length} languages succeeded`);
      }).catch((error) => {
        console.error('[Update Influencer Stock] ❌ Background update failed:', error.message);
      });
      
      return; // 早期リターン
    } else if (lang) {
      // 指定言語のストックを更新（単一言語なのでタイムアウトリスク低）
      const targetLang = (lang || 'en').toLowerCase();
      console.log(`[Update Influencer Stock] 🔄 Updating stock for ${targetLang}...`);
      
      checkTimeout();
      const influencers = await updateInfluencerStock(targetLang);
      checkTimeout();
      
      const updateTime = await getStockUpdateTime(targetLang);
      const elapsed = Date.now() - startTime;
      
      console.log(`[Update Influencer Stock] ✅ Completed in ${elapsed}ms`);
      
      return res.status(200).json({
        success: true,
        lang: targetLang,
        count: influencers.length,
        influencers: influencers.slice(0, 10), // 最初の10人だけ返す
        updateTime: updateTime || null,
        timestamp: new Date().toISOString(),
        executionTimeMs: elapsed,
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
