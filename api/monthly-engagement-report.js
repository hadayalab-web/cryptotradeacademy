// api/monthly-engagement-report.js
// 月次エンゲージメント分析レポートAPI
// Grok CSO+CFO推奨: 月次エンゲージメント分析レポート自動化

const { generateMonthlyEngagementReport } = require('../scripts/generate-monthly-engagement-report');

/**
 * 月次エンゲージメント分析レポートを生成
 */
module.exports = async (req, res) => {
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const report = await generateMonthlyEngagementReport();
    
    // Markdownレポートも生成してレスポンスに含める
    const { generateMarkdownReport } = require('../scripts/generate-monthly-engagement-report');
    let markdownReport = null;
    try {
      markdownReport = generateMarkdownReport(report);
    } catch (mdError) {
      console.warn('⚠️ Markdown generation failed:', mdError.message);
    }
    
    return res.status(200).json({
      success: true,
      report: {
        period: report.period,
        summary: report.summary,
        vsl2: report.vsl2,
        timing: report.timing,
        languages: report.languages,
      },
      markdown: markdownReport,
      generatedAt: report.generatedAt,
    });
  } catch (error) {
    console.error('❌ Monthly engagement report generation failed:', error.message);
    return res.status(500).json({ 
      error: error.message,
      success: false,
    });
  }
};
