// scripts/weekly-verification-report.js
// 週次検証ログ集計スクリプト

const fs = require('fs');
const path = require('path');
const { generateWeeklyReport } = require('../logic/tier1_btc/verificationLogger');

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

/**
 * 週次レポートを生成して保存
 */
function generateAndSaveWeeklyReport() {
  const logs = loadVerificationLogs();
  
  // 過去7日間のレポート
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const report = generateWeeklyReport(logs, startDate, endDate);

  // レポートを保存
  const reportDir = path.join(__dirname, '../data/reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportFileName = `weekly_report_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.json`;
  const reportPath = path.join(reportDir, reportFileName);

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('📊 Weekly Verification Report Generated');
  console.log(`   Period: ${report.period.start} to ${report.period.end}`);
  console.log(`   Total Signals: ${report.summary.totalSignals}`);
  console.log(`   Total Trades: ${report.summary.totalTrades}`);
  console.log(`   Total NO TRADE: ${report.summary.totalNoTrade}`);
  console.log(`   Win Rate: ${report.summary.winRate}%`);
  console.log(`   Total P&L: $${report.summary.totalPnl}`);
  console.log(`   Total Avoided Loss: $${report.summary.totalAvoidedLoss}`);
  console.log(`   Report saved to: ${reportPath}`);

  return report;
}

// メイン実行
if (require.main === module) {
  try {
    generateAndSaveWeeklyReport();
  } catch (error) {
    console.error('❌ Error generating weekly report:', error);
    process.exit(1);
  }
}

module.exports = {
  loadVerificationLogs,
  generateAndSaveWeeklyReport,
};
