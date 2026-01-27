// api/x-post-minimal-version-cron.js
// 無料版（Minimal Version）のX投稿（UTC 8:00, 12:00, 18:00, 20:00実行）
// 改善: 投稿頻度を2回/日 → 4回/日に拡大、A/Bテスト機能追加、時間帯別最適化

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
 * fetch with timeout (P1-5対応: 外部API呼び出しにタイムアウトを追加)
 * @param {string} url - リクエストURL
 * @param {Object} options - fetchオプション
 * @param {number} timeoutMs - タイムアウト時間（ミリ秒、デフォルト: 5000 = 5秒）
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * 最新の市場データを取得（CryptoQuant APIから）
 * P1-5対応: 外部API呼び出しにタイムアウトを追加
 */
async function fetchLatestMarketData() {
  try {
    // CryptoQuant APIから最新データを取得
    const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
    const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');
    
    // P1-5対応: 価格データを取得（タイムアウト: 5秒）
    let priceUsd = 89859; // デフォルト値
    let change24h = -0.02; // デフォルト値
    
    try {
      const priceRes = await fetchWithTimeout(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
        {},
        5000 // 5秒タイムアウト
      );
      const priceData = await priceRes.json();
      priceUsd = priceData?.bitcoin?.usd || priceUsd;
      change24h = priceData?.bitcoin?.usd_24h_change || change24h;
    } catch (error) {
      console.warn('[X Post Minimal Cron] Failed to fetch price data (timeout or error), using defaults:', error.message);
    }
    
    // P1-5対応: CryptoQuantデータを取得（タイムアウト: 8秒）
    let exchangeNetflow = null;
    let mpi = null;
    
    try {
      const [inflowData, mpiData] = await Promise.race([
        Promise.all([
          getExchangeInflow().catch(() => null),
          getMinerPositionIndex().catch(() => null),
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CryptoQuant API timeout')), 8000)),
      ]);
      
      exchangeNetflow = inflowData?.value || null;
      mpi = mpiData?.value || null;
    } catch (error) {
      console.warn('[X Post Minimal Cron] Failed to fetch CryptoQuant data (timeout or error), using defaults:', error.message);
    }
    
    // P1-5対応: 深掘りデータを取得（Trap Score用、タイムアウト: 8秒）
    let trapScore = 25; // デフォルト
    let whaleRatio = null;
    
    try {
      const deepDataPromise = getCQDeepMetrics('EN', {
        upbitPrice: priceUsd,
        usdKrwRate: 1300,
      });
      
      const deepData = await Promise.race([
        deepDataPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Deep metrics timeout')), 8000)),
      ]);
      
      if (deepData?.trapScore != null) {
        trapScore = deepData.trapScore;
      }
      if (deepData?.whaleFlows?.whaleRatio != null) {
        whaleRatio = deepData.whaleFlows.whaleRatio;
      }
    } catch (error) {
      console.warn('[X Post Minimal Cron] Failed to fetch deep metrics (timeout or error), using defaults:', error.message);
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
    
    // P0: ジッター（揺らぎ）を適用（GPT-5.2推奨、maxDuration制約を考慮）
    const { applyJitter } = require('../utils/scheduler');
    await applyJitter({ label: 'x-post-minimal-version-cron', minMs: 5000, maxMs: 20000 });
    
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
