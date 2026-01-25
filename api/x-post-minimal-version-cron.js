// api/x-post-minimal-version-cron.js
// Grok推奨: 無料版（Minimal Version）のX投稿（UTC 8:00実行）
// Grok戦略: UTC 8:00にMV投稿、UTC 14:00に引用リポスト（6時間後）

const { postMinimalVersionToX } = require('./x-post-minimal-version');

// Vercel KV（最新の市場データ取得用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[X Post Minimal Cron] @vercel/kv not available:', error.message);
}

/**
 * 最新の市場データを取得（CryptoQuant APIから）
 */
async function fetchLatestMarketData() {
  try {
    // CryptoQuant APIから最新データを取得
    const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
    const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');
    
    // 価格データを取得
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const priceData = await priceRes.json();
    const priceUsd = priceData?.bitcoin?.usd || 0;
    const change24h = priceData?.bitcoin?.usd_24h_change || 0;
    
    // CryptoQuantデータを取得
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow().catch(() => null),
      getMinerPositionIndex().catch(() => null),
    ]);
    
    const exchangeNetflow = inflowData?.value || null;
    const mpi = mpiData?.value || null;
    
    // 深掘りデータを取得（Trap Score用）
    let trapScore = 25; // デフォルト
    let whaleRatio = null;
    
    try {
      const deepData = await getCQDeepMetrics('EN', {
        upbitPrice: priceUsd,
        usdKrwRate: 1300,
      });
      
      if (deepData?.trapScore != null) {
        trapScore = deepData.trapScore;
      }
      if (deepData?.whaleFlows?.whaleRatio != null) {
        whaleRatio = deepData.whaleFlows.whaleRatio;
      }
    } catch (error) {
      console.warn('[X Post Minimal Cron] Failed to fetch deep metrics, using defaults:', error.message);
    }
    
    return {
      trapScore,
      priceUsd,
      change24h,
      exchangeNetflow,
      whaleRatio,
      mpi,
    };
  } catch (error) {
    console.error('[X Post Minimal Cron] Failed to fetch latest market data:', error.message);
    // フォールバック: デフォルト値を使用
    return {
      trapScore: 25,
      priceUsd: 89859,
      change24h: -0.02,
      exchangeNetflow: null,
      whaleRatio: null,
      mpi: null,
    };
  }
}

/**
 * Vercel Serverless Function Handler
 * Grok推奨: UTC 8:00に実行（ピーク時間）
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Cron認証チェック
    const authHeader = req.headers.authorization;
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('[X Post Minimal Cron] Starting minimal version X posting...');
    
    // 最新の市場データを取得
    const marketData = await fetchLatestMarketData();
    
    // Grok推奨: 6言語すべてに対応
    const targetLangs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
    
    // レポートデータを準備
    const reportData = {
      trapScore: marketData.trapScore,
      priceUsd: marketData.priceUsd,
      change24h: marketData.change24h,
      trapData: {
        exchangeNetflow: marketData.exchangeNetflow,
        whaleRatio: marketData.whaleRatio,
      },
      marketData: {
        mpi: marketData.mpi,
        priceUsd: marketData.priceUsd,
        change24h: marketData.change24h,
      },
      sentimentData: {
        sentiment: 'NEUTRAL', // デフォルト、実際のデータがあれば使用
      },
    };
    
    // 無料版（Minimal Version）をXに投稿
    const result = await postMinimalVersionToX(targetLangs, reportData);
    
    console.log('[X Post Minimal Cron] ✅ Minimal version X posting completed:', result);
    
    return res.status(200).json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[X Post Minimal Cron] Handler error:', error);
    return res.status(500).json({ error: error.message });
  }
};
