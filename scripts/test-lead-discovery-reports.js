#!/usr/bin/env node
/**
 * リード発見レポート テスト配信スクリプト
 * 仮データで3種類のレポートをテスト送信
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { generateLeadDiscoveryReport, generateDailyReport, generateWeeklyReport } = require('../services/lead-discovery/leadDiscoveryReport');

/**
 * 実行レポートのテスト送信
 */
async function testExecutionReport() {
  console.log('📊 実行レポート テスト配信中...\n');
  
  // 仮データ
  const mockStats = {
    x: {
      discovered: 32,  // 見積もり29件より多い
      sent: 8,         // ドンピシャリード
      errors: 0,
    },
    queue: {
      total: 24,
      perfectMatch: 8,
    },
  };
  
  try {
    await generateLeadDiscoveryReport(mockStats, { sendEmail: true });
    console.log('✅ 実行レポート送信完了\n');
  } catch (error) {
    console.error('❌ 実行レポート送信失敗:', error.message);
    throw error;
  }
}

/**
 * 日次レポートのテスト送信
 */
async function testDailyReport() {
  console.log('📊 日次レポート テスト配信中...\n');
  
  // 昨日の日付を取得
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  // 仮データ
  const mockCvrStats = {
    totalLeads: 365,        // 見積もり348件より多い
    vsl1Sent: 110,
    conversions: 33,         // 30% CVR
    cvr: 30.0,
    revenue: 4950,          // 33成約 × $150
    perfectMatchLeads: 45,
    perfectMatchConversions: 23, // 51% CVR
    perfectMatchCVR: 51.1,
  };
  
  const mockLangStats = {
    byLanguage: {
      en: { totalLeads: 201, vsl1Sent: 60, conversions: 18, cvr: 30.0, revenue: 2700, perfectMatchLeads: 25, perfectMatchConversions: 13, perfectMatchCVR: 52.0 },
      es: { totalLeads: 73, vsl1Sent: 22, conversions: 7, cvr: 31.8, revenue: 1050, perfectMatchLeads: 9, perfectMatchConversions: 5, perfectMatchCVR: 55.6 },
      'pt-br': { totalLeads: 44, vsl1Sent: 13, conversions: 4, cvr: 30.8, revenue: 600, perfectMatchLeads: 5, perfectMatchConversions: 2, perfectMatchCVR: 40.0 },
      ar: { totalLeads: 7, vsl1Sent: 2, conversions: 1, cvr: 50.0, revenue: 150, perfectMatchLeads: 1, perfectMatchConversions: 1, perfectMatchCVR: 100.0 },
      ja: { totalLeads: 29, vsl1Sent: 9, conversions: 2, cvr: 22.2, revenue: 300, perfectMatchLeads: 3, perfectMatchConversions: 1, perfectMatchCVR: 33.3 },
      ko: { totalLeads: 11, vsl1Sent: 4, conversions: 1, cvr: 25.0, revenue: 150, perfectMatchLeads: 2, perfectMatchConversions: 1, perfectMatchCVR: 50.0 },
      other: { totalLeads: 0, vsl1Sent: 0, conversions: 0, cvr: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0, perfectMatchCVR: 0 },
    },
  };
  
  const mockWhopStats = {
    totalMembers: 1245,
    newMembers: 5,
    totalRevenue: 4950,
    monthlyRevenue: 187200,
    planStats: {
      'Basic Plan': { count: 448, revenue: 4350 },
      'Pro Plan': { count: 598, revenue: 117900 },
      'Elite Plan': { count: 199, revenue: 59250 },
    },
  };
  
  try {
    await generateDailyReport({ 
      date: dateStr,
      mockData: {
        cvrStats: mockCvrStats,
        langStats: mockLangStats,
        whopStats: mockWhopStats,
      },
    });
    console.log('✅ 日次レポート送信完了\n');
  } catch (error) {
    console.error('❌ 日次レポート送信失敗:', error.message);
    throw error;
  }
}

/**
 * 週次レポートのテスト送信
 */
async function testWeeklyReport() {
  console.log('📊 週次レポート テスト配信中...\n');
  
  // 過去7日間の日付範囲を取得
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // 仮データ（週次）
  const mockCvrStats = {
    totalLeads: 2555,       // 見積もり2,436件より多い
    vsl1Sent: 770,
    conversions: 231,       // 30% CVR
    cvr: 30.0,
    revenue: 34650,        // 231成約 × $150
    perfectMatchLeads: 315,
    perfectMatchConversions: 161, // 51% CVR
    perfectMatchCVR: 51.1,
  };
  
  const mockLangStats = {
    byLanguage: {
      en: { totalLeads: 1405, vsl1Sent: 424, conversions: 127, cvr: 30.0, revenue: 19050, perfectMatchLeads: 173, perfectMatchConversions: 88, perfectMatchCVR: 50.9 },
      es: { totalLeads: 511, vsl1Sent: 154, conversions: 49, cvr: 31.8, revenue: 7350, perfectMatchLeads: 63, perfectMatchConversions: 35, perfectMatchCVR: 55.6 },
      'pt-br': { totalLeads: 307, vsl1Sent: 91, conversions: 28, cvr: 30.8, revenue: 4200, perfectMatchLeads: 35, perfectMatchConversions: 14, perfectMatchCVR: 40.0 },
      ar: { totalLeads: 51, vsl1Sent: 15, conversions: 8, cvr: 53.3, revenue: 1200, perfectMatchLeads: 7, perfectMatchConversions: 7, perfectMatchCVR: 100.0 },
      ja: { totalLeads: 204, vsl1Sent: 63, conversions: 14, cvr: 22.2, revenue: 2100, perfectMatchLeads: 21, perfectMatchConversions: 7, perfectMatchCVR: 33.3 },
      ko: { totalLeads: 77, vsl1Sent: 23, conversions: 5, cvr: 21.7, revenue: 750, perfectMatchLeads: 16, perfectMatchConversions: 8, perfectMatchCVR: 50.0 },
      other: { totalLeads: 0, vsl1Sent: 0, conversions: 0, cvr: 0, revenue: 0, perfectMatchLeads: 0, perfectMatchConversions: 0, perfectMatchCVR: 0 },
    },
  };
  
  const mockWhopStats = {
    totalMembers: 1250,
    newMembers: 35,
    totalRevenue: 34650,
    monthlyRevenue: 187500,
    planStats: {
      'Basic Plan': { count: 450, revenue: 43650 },
      'Pro Plan': { count: 600, revenue: 118200 },
      'Elite Plan': { count: 200, revenue: 59400 },
    },
  };
  
  try {
    await generateWeeklyReport({
      startDate: startDateStr,
      endDate: endDateStr,
      mockData: {
        cvrStats: mockCvrStats,
        langStats: mockLangStats,
        whopStats: mockWhopStats,
      },
    });
    console.log('✅ 週次レポート送信完了\n');
  } catch (error) {
    console.error('❌ 週次レポート送信失敗:', error.message);
    throw error;
  }
}

/**
 * すべてのレポートをテスト送信
 */
async function testAllReports() {
  console.log('='.repeat(80));
  console.log('📧 リード発見レポート テスト配信');
  console.log('='.repeat(80));
  console.log('');
  
  // 環境変数チェック（警告のみ、エラーで停止しない）
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEYが設定されていません。メール送信が失敗する可能性があります。');
  }
  
  try {
    // 1. 実行レポート
    await testExecutionReport();
    
    // レート制限対策: 1秒待機（Resend APIは1秒あたり2リクエストまで）
    console.log('⏳ レート制限対策: 1秒待機中...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. 日次レポート
    await testDailyReport();
    
    // レート制限対策: 1秒待機
    console.log('⏳ レート制限対策: 1秒待機中...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 週次レポート
    await testWeeklyReport();
    
    console.log('='.repeat(80));
    console.log('🎉 すべてのレポートテスト配信完了！');
    console.log('='.repeat(80));
    console.log('');
    console.log('📧 メールボックスを確認してください:');
    console.log(`   To: ${process.env.CEO_EMAIL || 'chibaichi.work@gmail.com'}`);
    console.log('   CC: treetop.chiba@gmail.com, ruihadaya@gmail.com');
    console.log('   BCC: kyamada.aio@gmail.com');
    console.log('');
  } catch (error) {
    console.error('\n❌ テスト配信エラー:', error.message);
    console.error('   スタック:', error.stack);
    process.exit(1);
  }
}

// コマンドライン引数で個別にテスト可能
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all'; // 'execution', 'daily', 'weekly', 'all'
  
  if (mode === 'execution') {
    testExecutionReport().catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
  } else if (mode === 'daily') {
    testDailyReport().catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
  } else if (mode === 'weekly') {
    testWeeklyReport().catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
  } else if (mode === 'all') {
    testAllReports().catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
  } else {
    console.error('❌ 無効なモード:', mode);
    console.log('使用方法:');
    console.log('  node test-lead-discovery-reports.js [execution|daily|weekly|all]');
    process.exit(1);
  }
}

module.exports = {
  testExecutionReport,
  testDailyReport,
  testWeeklyReport,
  testAllReports,
};
