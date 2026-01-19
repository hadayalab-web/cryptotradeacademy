#!/usr/bin/env node
/**
 * リード発見システム レポート送信スクリプト
 * リード発見実行後の統計をCEOに報告
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { generateLeadDiscoveryReport } = require('../services/lead-discovery/leadDiscoveryReport');

/**
 * リード発見実行レポートを送信
 * @param {Object} stats - リード発見統計（オプション、APIから取得する場合は不要）
 */
async function sendLeadDiscoveryReport(stats = null) {
  console.log('📊 リード発見レポートを生成中...\n');

  // statsが提供されていない場合は、デフォルトの空統計を使用
  const reportStats = stats || {
    x: { discovered: 0, sent: 0, errors: 0 },
    queue: { total: 0, perfectMatch: 0 },
  };

  try {
    console.log('📊 環境変数チェック:');
    console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   WHOP_API_KEY: ${process.env.WHOP_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   CEO_EMAIL: ${process.env.CEO_EMAIL || 'chibaichi.work@gmail.com'}`);
    console.log('');
    
    const result = await generateLeadDiscoveryReport(reportStats, { sendEmail: true });
    
    console.log('✅ リード発見レポート送信完了');
    console.log(`   発見リード数: ${reportStats.x.discovered || 0}件`);
    console.log(`   VSL1送信数: ${reportStats.x.sent || 0}件`);
    if (result.cvrStats && !result.cvrStats.error) {
      console.log(`   CVR: ${(result.cvrStats.cvr || 0).toFixed(2)}%`);
      console.log(`   売上: $${(result.cvrStats.revenue || 0).toLocaleString()}`);
    } else {
      console.log('   ⚠️ CVR統計: 取得できませんでした');
    }
    
    // Whop統計の確認（レポート内で取得されているはず）
    console.log('\n📊 Whop統計:');
    if (process.env.WHOP_API_KEY) {
      console.log('   ✅ Whop APIキーが設定されています');
      console.log('   （レポート内でWhop統計が取得・表示されます）');
    } else {
      console.log('   ⚠️ Whop APIキーが設定されていません');
      console.log('   （レポート内でWhop統計は表示されません）');
    }
  } catch (error) {
    console.error('❌ リード発見レポート送信失敗:', error.message);
    console.error('   スタック:', error.stack);
    process.exit(1);
  }
}

/**
 * 日次レポートを送信
 * @param {string} [date] - レポート対象日（YYYY-MM-DD形式、デフォルト: 昨日）
 */
async function sendDailyReport(date = null) {
  console.log('📊 リード発見日次レポートを生成中...\n');

  const { generateDailyReport } = require('../services/lead-discovery/leadDiscoveryReport');

  try {
    console.log('📊 環境変数チェック:');
    console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   WHOP_API_KEY: ${process.env.WHOP_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   CEO_EMAIL: ${process.env.CEO_EMAIL || 'chibaichi.work@gmail.com'}`);
    console.log('');
    
    const result = await generateDailyReport({ date });
    
    console.log('✅ 日次レポート送信完了');
    console.log(`   対象日: ${result.date}`);
    if (result.cvrStats && !result.cvrStats.error) {
      console.log(`   総リード数: ${result.cvrStats.totalLeads || 0}件`);
      console.log(`   VSL1送信数: ${result.cvrStats.vsl1Sent || 0}件`);
      console.log(`   成約数: ${result.cvrStats.conversions || 0}件`);
      console.log(`   CVR: ${(result.cvrStats.cvr || 0).toFixed(2)}%`);
      console.log(`   売上: $${(result.cvrStats.revenue || 0).toLocaleString()}`);
    } else {
      console.log('   ⚠️ CVR統計: 取得できませんでした');
    }
    
    // Whop統計の確認
    console.log('\n📊 Whop統計:');
    if (process.env.WHOP_API_KEY) {
      console.log('   ✅ Whop APIキーが設定されています');
      console.log('   （レポート内でWhop統計が取得・表示されます）');
    } else {
      console.log('   ⚠️ Whop APIキーが設定されていません');
      console.log('   （レポート内でWhop統計は表示されません）');
    }
  } catch (error) {
    console.error('❌ 日次レポート送信失敗:', error.message);
    console.error('   スタック:', error.stack);
    process.exit(1);
  }
}

/**
 * 週次レポートを送信
 * @param {string} [startDate] - 開始日（YYYY-MM-DD形式、デフォルト: 7日前）
 * @param {string} [endDate] - 終了日（YYYY-MM-DD形式、デフォルト: 昨日）
 */
async function sendWeeklyReport(startDate = null, endDate = null) {
  console.log('📊 リード発見週次レポートを生成中...\n');

  const { generateWeeklyReport } = require('../services/lead-discovery/leadDiscoveryReport');

  try {
    console.log('📊 環境変数チェック:');
    console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   WHOP_API_KEY: ${process.env.WHOP_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   CEO_EMAIL: ${process.env.CEO_EMAIL || 'chibaichi.work@gmail.com'}`);
    console.log('');
    
    const result = await generateWeeklyReport({ startDate, endDate });
    
    console.log('✅ 週次レポート送信完了');
    console.log(`   期間: ${result.startDate} ～ ${result.endDate}`);
    if (result.cvrStats && !result.cvrStats.error) {
      console.log(`   総リード数: ${result.cvrStats.totalLeads || 0}件`);
      console.log(`   VSL1送信数: ${result.cvrStats.vsl1Sent || 0}件`);
      console.log(`   成約数: ${result.cvrStats.conversions || 0}件`);
      console.log(`   CVR: ${(result.cvrStats.cvr || 0).toFixed(2)}%`);
      console.log(`   売上: $${(result.cvrStats.revenue || 0).toLocaleString()}`);
    } else {
      console.log('   ⚠️ CVR統計: 取得できませんでした');
    }
    
    if (result.comparison) {
      console.log('\n📊 見積もり vs 実測値:');
      const diff = result.comparison.actual.totalLeads - result.comparison.estimates.leadsPerWeek;
      const diffPercent = ((diff / result.comparison.estimates.leadsPerWeek) * 100).toFixed(1);
      console.log(`   見積もり: ${result.comparison.estimates.leadsPerWeek}件`);
      console.log(`   実測値: ${result.comparison.actual.totalLeads}件`);
      console.log(`   差分: ${diff >= 0 ? '+' : ''}${diff}件 (${diffPercent >= 0 ? '+' : ''}${diffPercent}%)`);
    }
    
    // Whop統計の確認
    console.log('\n📊 Whop統計:');
    if (process.env.WHOP_API_KEY) {
      console.log('   ✅ Whop APIキーが設定されています');
      console.log('   （レポート内でWhop統計が取得・表示されます）');
    } else {
      console.log('   ⚠️ Whop APIキーが設定されていません');
      console.log('   （レポート内でWhop統計は表示されません）');
    }
  } catch (error) {
    console.error('❌ 週次レポート送信失敗:', error.message);
    console.error('   スタック:', error.stack);
    process.exit(1);
  }
}

// コマンドライン引数で実行モードを切り替え
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'daily'; // 'daily', 'weekly', または 'execution'

  if (mode === 'daily') {
    const date = args[1] || null; // オプション: 日付指定
    sendDailyReport(date).catch(error => {
      console.error('❌ 日次レポート生成エラー:', error);
      process.exit(1);
    });
  } else if (mode === 'weekly') {
    const startDate = args[1] || null; // オプション: 開始日指定
    const endDate = args[2] || null; // オプション: 終了日指定
    sendWeeklyReport(startDate, endDate).catch(error => {
      console.error('❌ 週次レポート生成エラー:', error);
      process.exit(1);
    });
  } else if (mode === 'execution') {
    // 実行レポートの場合、statsをJSONで受け取ることも可能
    let stats = null;
    if (args[1]) {
      try {
        stats = JSON.parse(args[1]);
      } catch (error) {
        console.warn('⚠️  statsのパースに失敗、デフォルト値を使用:', error.message);
      }
    }
    sendLeadDiscoveryReport(stats).catch(error => {
      console.error('❌ 実行レポート生成エラー:', error);
      process.exit(1);
    });
  } else {
    console.error('❌ 無効なモード:', mode);
    console.log('使用方法:');
    console.log('  node send-lead-discovery-report.js daily [date]  # 日次レポート');
    console.log('  node send-lead-discovery-report.js weekly [startDate] [endDate]  # 週次レポート');
    console.log('  node send-lead-discovery-report.js execution [stats]  # 実行レポート');
    process.exit(1);
  }
}

module.exports = {
  sendLeadDiscoveryReport,
  sendDailyReport,
  sendWeeklyReport,
};
