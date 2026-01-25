// api/x-post-performance-analysis.js
// 投稿パフォーマンス分析APIエンドポイント（再利用可能）

const { analyzePostPerformance } = require('../services/x/postPerformanceAnalyzer');

// KVストレージ
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[X Post Performance Analysis] @vercel/kv not available:', error.message);
}

// レポートをKVに保存
async function saveReportToKV(dateString, report) {
  if (!kv) {
    return;
  }
  try {
    const key = `x:post_performance:${dateString}`;
    await kv.set(key, report, { ex: 86400 * 90 }); // 90日間保持
  } catch (error) {
    console.warn('[X Post Performance Analysis] Failed to save report to KV:', error.message);
  }
}

// KVからレポートを取得
async function getReportFromKV(dateString) {
  if (!kv) {
    return null;
  }
  try {
    const key = `x:post_performance:${dateString}`;
    return await kv.get(key);
  } catch (error) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET/POSTのみ許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // 日付パラメータを取得
    const dateString = req.query.date || req.body?.date || null;
    
    // キャッシュから取得を試みる
    if (dateString) {
      const cachedReport = await getReportFromKV(dateString);
      if (cachedReport) {
        return res.status(200).json({
          cached: true,
          ...cachedReport,
        });
      }
    }
    
    // 分析を実行
    const result = await analyzePostPerformance(dateString);
    
    // KVに保存
    if (result.dateString) {
      await saveReportToKV(result.dateString, result);
    }
    
    return res.status(200).json({
      cached: false,
      ...result,
    });
  } catch (error) {
    console.error('[X Post Performance Analysis] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};
