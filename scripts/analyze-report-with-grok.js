// scripts/analyze-report-with-grok.js
// Grokにレポートを分析させるスクリプト（PDCAサイクル用）

const { analyzeReportWithGrok, getReportAnalysis } = require('../services/grok/reportAnalyzer');

async function main() {
  const reportType = process.argv[2] || 'execution'; // 'execution' | 'daily' | 'weekly'
  const includeHistory = process.argv[3] === '--history';
  
  console.log(`\n🔍 Analyzing ${reportType} report with Grok...\n`);
  
  try {
    if (includeHistory) {
      // 詳細分析（履歴を含む）
      const result = await analyzeReportWithGrok(reportType, { includeHistory: true, historyLimit: 5 });
      
      if (!result.success) {
        console.error('❌ Analysis failed:', result.error);
        process.exit(1);
      }
      
      console.log('✅ Analysis completed!\n');
      console.log('='.repeat(80));
      console.log(JSON.stringify(result.analysis, null, 2));
      console.log('='.repeat(80));
    } else {
      // 簡易分析（読みやすい形式）
      const analysis = await getReportAnalysis(reportType);
      console.log(analysis);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
