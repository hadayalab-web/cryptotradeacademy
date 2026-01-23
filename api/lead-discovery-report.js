// api/lead-discovery-report.js
// GrokがレポートにアクセスするためのAPIエンドポイント

const { getLatestReport, getReportHistory, getReportById, getReportForGrok } = require('../services/lead-discovery/reportStorage');

module.exports = async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'execution', format = 'json', limit = 10, reportId } = req.query;

  try {
    // 特定のレポートIDで取得
    if (reportId) {
      const report = await getReportById(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }
      return res.status(200).json(report);
    }

    // Grok用のテキスト形式
    if (format === 'grok' || format === 'text') {
      const grokReport = await getReportForGrok(type);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(grokReport);
    }

    // 履歴取得
    if (format === 'history') {
      const history = await getReportHistory(type, parseInt(limit, 10));
      return res.status(200).json({
        type,
        count: history.length,
        reports: history,
      });
    }

    // 最新レポート（JSON形式）
    const report = await getLatestReport(type);
    if (!report) {
      return res.status(404).json({ error: 'No report available' });
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error('[Lead Discovery Report API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
