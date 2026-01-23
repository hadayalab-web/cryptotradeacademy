// api/weekly-report.js
// 週次検証ログレポート生成APIエンドポイント

const { generateWeeklyReport } = require('../logic/tier1_btc/verificationLogger');
const fs = require('fs');
const path = require('path');

// 検証ログファイルのパス
const LOG_FILE_PATH = path.join(__dirname, '../data/verification_logs.jsonl');

/**
 * 検証ログを読み込む
 */
function loadVerificationLogs() {
  if (!fs.existsSync(LOG_FILE_PATH)) {
    return [];
  }

  const fileContent = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
  const lines = fileContent.trim().split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (error) {
      console.warn(`Failed to parse log line: ${line}`, error.message);
      return null;
    }
  }).filter(log => log !== null);
}

module.exports = async (req, res) => {
  try {
    const logs = loadVerificationLogs();
    
    // 過去7日間のレポート
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const report = generateWeeklyReport(logs, startDate, endDate);
    
    // Vercel環境ではファイルに書き込まず、JSONレスポンスとして返す
    console.log('📊 Weekly Verification Report Generated');
    console.log(`   Period: ${report.period.start} to ${report.period.end}`);
    console.log(`   Total Signals: ${report.summary.totalSignals}`);
    console.log(`   Total Trades: ${report.summary.totalTrades}`);
    console.log(`   Total NO TRADE: ${report.summary.totalNoTrade}`);
    console.log(`   Win Rate: ${report.summary.winRate}%`);
    console.log(`   Total P&L: $${report.summary.totalPnl}`);
    console.log(`   Total Avoided Loss: $${report.summary.totalAvoidedLoss}`);
    
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
