// api/weekly-report.js
// 週次検証ログレポート生成APIエンドポイント

const { generateAndSaveWeeklyReport } = require('../scripts/weekly-verification-report');

module.exports = async (req, res) => {
  try {
    const report = await generateAndSaveWeeklyReport();
    
    return res.status(200).json({
      success: true,
      report: {
        period: report.period,
        summary: report.summary,
      },
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
