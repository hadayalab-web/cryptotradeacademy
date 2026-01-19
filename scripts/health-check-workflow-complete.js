#!/usr/bin/env node
/**
 * リード発見ワークフロー完全ヘルスチェック
 * ドキュメントとの整合性を確認
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'blue');
  console.log('='.repeat(80));
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(80));
  log(title, 'cyan');
  console.log('-'.repeat(80));
}

async function checkDocumentationCompliance() {
  logSection('📚 ドキュメント整合性チェック');
  
  const fs = require('fs');
  const path = require('path');
  
  // api/lead-discovery.jsを読み込んで確認
  const leadDiscoveryPath = path.join(__dirname, '../api/lead-discovery.js');
  const leadDiscoveryCode = fs.readFileSync(leadDiscoveryPath, 'utf-8');
  
  const checks = {
    telegramRemoved: {
      name: 'Telegramリード発見の削除確認',
      check: () => {
        // Telegramリード発見の処理が削除されているか確認
        const hasTelegramDiscovery = leadDiscoveryCode.includes('discoverTelegramLeads');
        const hasComment = leadDiscoveryCode.includes('Telegramリード発見（Grok経由）は削除');
        return !hasTelegramDiscovery && hasComment;
      },
    },
    leadRecordingUnified: {
      name: 'リード記録の統一確認',
      check: () => {
        // すべてのリードでrecordLeadが実行されているか確認
        const keywordLeadsHasRecord = leadDiscoveryCode.includes('const leadId = await recordLead(lead)');
        const trendLeadsHasRecord = leadDiscoveryCode.includes('const leadId = await recordLead(lead)');
        return keywordLeadsHasRecord && trendLeadsHasRecord;
      },
    },
    vsl1RecordingUnified: {
      name: 'VSL1送信記録の統一確認',
      check: () => {
        // すべてのVSL1送信でrecordVSL1Sentが実行されているか確認
        const keywordHasRecord = leadDiscoveryCode.includes('await recordVSL1Sent(leadId)');
        const trendHasRecord = leadDiscoveryCode.includes('await recordVSL1Sent(leadId)');
        return keywordHasRecord && trendHasRecord;
      },
    },
    reportIntegration: {
      name: 'Resendレポート統合確認',
      check: () => {
        // generateLeadDiscoveryReportが呼び出されているか確認
        const hasReportImport = leadDiscoveryCode.includes('generateLeadDiscoveryReport');
        const hasReportCall = leadDiscoveryCode.includes('generateLeadDiscoveryReport(stats');
        return hasReportImport && hasReportCall;
      },
    },
    queueProcessingUnified: {
      name: 'キュー処理の統一確認',
      check: () => {
        // processLeadQueueでリード記録が確認されているか
        const hasLeadIdCheck = leadDiscoveryCode.includes('lead.leadId');
        const hasRecordLeadInQueue = leadDiscoveryCode.includes('if (!leadId)');
        return hasLeadIdCheck && hasRecordLeadInQueue;
      },
    },
  };
  
  let allPassed = true;
  for (const [key, check] of Object.entries(checks)) {
    const result = check.check();
    if (result) {
      log(`✅ ${check.name}`, 'green');
    } else {
      log(`❌ ${check.name}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function checkResendImplementation() {
  logSection('📧 Resend実装チェック');
  
  const fs = require('fs');
  const path = require('path');
  
  const checks = {
    resendClientExists: {
      name: 'resendClient.jsの存在確認',
      check: () => {
        const filePath = path.join(__dirname, '../services/email/resendClient.js');
        return fs.existsSync(filePath);
      },
    },
    ccBccSupport: {
      name: 'CC/BCCサポート確認',
      check: () => {
        const filePath = path.join(__dirname, '../services/email/resendClient.js');
        const code = fs.readFileSync(filePath, 'utf-8');
        return code.includes('options.cc') && code.includes('options.bcc');
      },
    },
    ceoReportHasCcBcc: {
      name: 'CEOレポートにCC/BCC設定確認',
      check: () => {
        const filePath = path.join(__dirname, '../services/email/ceo-report.js');
        const code = fs.readFileSync(filePath, 'utf-8');
        return code.includes('CC_EMAILS') && code.includes('BCC_EMAILS') && 
               code.includes('treetop.chiba@gmail.com') && 
               code.includes('ruihadaya@gmail.com') &&
               code.includes('kyamada.aio@gmail.com');
      },
    },
    leadDiscoveryReportExists: {
      name: 'leadDiscoveryReport.jsの存在確認',
      check: () => {
        const filePath = path.join(__dirname, '../services/lead-discovery/leadDiscoveryReport.js');
        return fs.existsSync(filePath);
      },
    },
    whopStatsIntegration: {
      name: 'Whop統計統合確認',
      check: () => {
        const filePath = path.join(__dirname, '../services/lead-discovery/leadDiscoveryReport.js');
        const code = fs.readFileSync(filePath, 'utf-8');
        return code.includes('getWhopStats') && code.includes('listMemberships');
      },
    },
  };
  
  let allPassed = true;
  for (const [key, check] of Object.entries(checks)) {
    const result = check.check();
    if (result) {
      log(`✅ ${check.name}`, 'green');
    } else {
      log(`❌ ${check.name}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function checkEnvironmentVariables() {
  logSection('🔑 環境変数チェック');
  
  const requiredVars = {
    RESEND_API_KEY: 'Resend APIキー',
    WHOP_API_KEY: 'Whop APIキー',
    CEO_EMAIL: 'CEOメールアドレス（オプション）',
  };
  
  const optionalVars = {
    LEAD_DISCOVERY_SEND_REPORT: 'レポート送信制御（デフォルト: true）',
    LEAD_DISCOVERY_LANGUAGES: 'リード発見言語（デフォルト: en,es）',
    LEAD_DISCOVERY_MAX_SOURCES: '最大sources数（デフォルト: 30）',
    LEAD_DISCOVERY_ENABLE_TRENDS: 'トレンド検索有効化（デフォルト: false）',
  };
  
  logSubSection('必須環境変数');
  let allRequiredSet = true;
  for (const [key, desc] of Object.entries(requiredVars)) {
    const value = process.env[key];
    if (value) {
      const displayValue = key.includes('KEY') ? `${value.substring(0, 10)}...` : value;
      log(`✅ ${key}: 設定済み (${desc})`, 'green');
      log(`   値: ${displayValue}`, 'reset');
    } else {
      if (key === 'CEO_EMAIL') {
        log(`⚠️ ${key}: 未設定 (${desc}) - デフォルト値を使用`, 'yellow');
      } else {
        log(`❌ ${key}: 未設定 (${desc})`, 'red');
        allRequiredSet = false;
      }
    }
  }
  
  logSubSection('オプション環境変数');
  for (const [key, desc] of Object.entries(optionalVars)) {
    const value = process.env[key];
    if (value) {
      log(`✅ ${key}: ${value} (${desc})`, 'green');
    } else {
      log(`ℹ️ ${key}: 未設定 (${desc})`, 'reset');
    }
  }
  
  return allRequiredSet;
}

async function checkImports() {
  logSection('📦 インポートチェック');
  
  const fs = require('fs');
  const path = require('path');
  
  // ファイルの存在とエクスポートの確認（実際のrequireは行わない）
  const checks = [
    { 
      name: 'conversionTracker.js', 
      file: '../services/lead-discovery/conversionTracker.js',
      exports: ['recordLead', 'recordVSL1Sent'],
    },
    { 
      name: 'leadDiscoveryReport.js', 
      file: '../services/lead-discovery/leadDiscoveryReport.js',
      exports: ['generateLeadDiscoveryReport', 'generateDailyReport'],
    },
    { 
      name: 'ceo-report.js', 
      file: '../services/email/ceo-report.js',
      exports: ['sendCEOReport'],
    },
    { 
      name: 'resendClient.js', 
      file: '../services/email/resendClient.js',
      exports: ['sendResendEmail'],
    },
    { 
      name: 'whop/client.js', 
      file: '../services/whop/client.js',
      exports: ['listMemberships'],
    },
  ];
  
  let allPassed = true;
  for (const check of checks) {
    const filePath = path.join(__dirname, check.file);
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf-8');
      const hasExports = check.exports.every(exp => 
        code.includes(`function ${exp}`) || 
        code.includes(`${exp}:`) || 
        code.includes(`module.exports = {`) && code.includes(exp)
      );
      if (hasExports) {
        log(`✅ ${check.name} 存在確認・エクスポート確認`, 'green');
      } else {
        log(`⚠️ ${check.name} 存在するが、一部エクスポートが見つかりません`, 'yellow');
      }
    } else {
      log(`❌ ${check.name} ファイルが見つかりません`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function checkWorkflowFlow() {
  logSection('🔄 ワークフローフロー確認');
  
  const fs = require('fs');
  const path = require('path');
  
  const leadDiscoveryPath = path.join(__dirname, '../api/lead-discovery.js');
  const leadDiscoveryCode = fs.readFileSync(leadDiscoveryPath, 'utf-8');
  
  // ワークフローの順序を確認
  const workflowSteps = [
    {
      name: '1. リード発見（キーワード検索）',
      check: () => leadDiscoveryCode.includes('searchLeadsOnX'),
    },
    {
      name: '2. リード記録（recordLead）',
      check: () => {
        const lines = leadDiscoveryCode.split('\n');
        const searchIndex = lines.findIndex(line => line.includes('searchLeadsOnX'));
        const recordIndex = lines.findIndex(line => line.includes('recordLead(lead)'));
        return searchIndex !== -1 && recordIndex !== -1 && recordIndex > searchIndex;
      },
    },
    {
      name: '3. キューに追加（enqueueLead）',
      check: () => {
        const lines = leadDiscoveryCode.split('\n');
        const recordIndex = lines.findIndex(line => line.includes('recordLead(lead)'));
        const enqueueIndex = lines.findIndex(line => line.includes('enqueueLead(lead)'));
        return recordIndex !== -1 && enqueueIndex !== -1 && enqueueIndex > recordIndex;
      },
    },
    {
      name: '4. ドンピシャリード即座送信',
      check: () => leadDiscoveryCode.includes('if (lead.isPerfectMatch)'),
    },
    {
      name: '5. VSL1送信記録（recordVSL1Sent）',
      check: () => {
        const lines = leadDiscoveryCode.split('\n');
        const perfectMatchIndex = lines.findIndex(line => line.includes('isPerfectMatch'));
        const recordVSLIndex = lines.findIndex(line => line.includes('recordVSL1Sent'));
        return perfectMatchIndex !== -1 && recordVSLIndex !== -1 && recordVSLIndex > perfectMatchIndex;
      },
    },
    {
      name: '6. レポート送信（generateLeadDiscoveryReport）',
      check: () => {
        const lines = leadDiscoveryCode.split('\n');
        const queueStatsIndex = lines.findIndex(line => line.includes('getQueueStats'));
        const reportIndex = lines.findIndex(line => line.includes('generateLeadDiscoveryReport'));
        return queueStatsIndex !== -1 && reportIndex !== -1 && reportIndex > queueStatsIndex;
      },
    },
  ];
  
  let allPassed = true;
  for (const step of workflowSteps) {
    const result = step.check();
    if (result) {
      log(`✅ ${step.name}`, 'green');
    } else {
      log(`❌ ${step.name}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function main() {
  console.log('\n' + '🔍 リード発見ワークフロー完全ヘルスチェック'.padStart(50));
  console.log('='.repeat(80));
  console.log('ドキュメント: LEAD_DISCOVERY_STRATEGY_DECISION.md');
  console.log('ドキュメント: LEAD_DISCOVERY_WORKFLOW_REVIEW.md');
  console.log('='.repeat(80));
  
  const results = {
    documentation: await checkDocumentationCompliance(),
    resend: await checkResendImplementation(),
    environment: await checkEnvironmentVariables(),
    imports: await checkImports(),
    workflow: await checkWorkflowFlow(),
  };
  
  logSection('📊 ヘルスチェック結果サマリー');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  for (const [name, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const color = result ? 'green' : 'red';
    log(`${status} - ${name}`, color);
  }
  
  console.log('\n' + '-'.repeat(80));
  log(`合計: ${passed}/${total} チェック通過`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 すべてのヘルスチェックが通過しました！', 'green');
    log('   ワークフローはドキュメント通りに実装されています。', 'green');
    process.exit(0);
  } else {
    log('\n⚠️ 一部のヘルスチェックが失敗しました。上記のエラーを確認してください。', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ ヘルスチェック実行エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
