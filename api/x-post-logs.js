// api/x-post-logs.js
// 投稿ログ取得API（PDCA用）

const { getLogsForDate, getRecentLogs } = require('../services/core/postLogger');

/**
 * 投稿ログ取得API
 * GET /api/x-post-logs?date=2026-01-26&days=7
 */
module.exports = async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date, days } = req.query;
    
    let logs = [];
    
    if (date) {
      // 指定日のログを取得
      logs = await getLogsForDate(date);
    } else {
      // 最近のログを取得（デフォルト: 7日）
      const daysNum = parseInt(days) || 7;
      logs = await getRecentLogs(daysNum);
    }
    
    // 統計情報を計算
    const stats = {
      total: logs.length,
      success: logs.filter(log => log.type === 'POST_SUCCESS').length,
      failure: logs.filter(log => log.type === 'POST_FAILURE').length,
      byType: {},
      byLang: {},
    };
    
    logs.forEach(log => {
      // タイプ別
      const postType = log.postType || 'unknown';
      stats.byType[postType] = (stats.byType[postType] || 0) + 1;
      
      // 言語別
      const lang = log.lang || 'unknown';
      stats.byLang[lang] = (stats.byLang[lang] || 0) + 1;
    });
    
    return res.status(200).json({
      success: true,
      date: date || `last ${days || 7} days`,
      stats,
      logs,
    });
  } catch (error) {
    console.error('[Post Logs API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
