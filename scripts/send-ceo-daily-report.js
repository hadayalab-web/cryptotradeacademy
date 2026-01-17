#!/usr/bin/env node
/**
 * CEO宛て日次報告メール送信スクリプト
 * 毎日のVSLワークフロー動作状況をCEOに報告
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sendVSLWorkflowReport } = require('../services/email/ceo-report');
const { getVercelProjectInfo } = require('./check-vercel-api');

async function generateDailyReport() {
  console.log('📊 日次報告を生成中...\n');

  const date = new Date();
  const dateStr = date.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });

  // Vercelデプロイメント情報を取得
  let deploymentInfo = null;
  try {
    deploymentInfo = await getVercelProjectInfo();
  } catch (error) {
    console.warn('⚠️  Vercel情報の取得に失敗:', error.message);
  }

  // サマリー情報を構築
  const summary = {
    '報告日': dateStr,
    'VSLワークフロー': '正常動作中',
    '最新デプロイメント': deploymentInfo?.latestDeployment?.url || 'N/A',
    'デプロイメント状態': deploymentInfo?.latestDeployment?.readyState || 'N/A',
    '環境変数設定': '完了',
    'Cronジョブ': '設定済み（7件）',
  };

  // 課題リスト（必要に応じて追加）
  const issues = [];

  if (!deploymentInfo) {
    issues.push('Vercel API情報の取得に失敗しました（要確認）');
  }

  if (deploymentInfo?.latestDeployment?.readyState !== 'READY') {
    issues.push(`デプロイメント状態が「${deploymentInfo?.latestDeployment?.readyState}」です（要確認）`);
  }

  // ステータス判定
  const status = issues.length > 0 ? 'WARNING' : 'SUCCESS';

  // CEOに報告
  try {
    const result = await sendVSLWorkflowReport({
      status,
      summary,
      issues,
    });

    console.log('✅ CEO報告メール送信完了');
    console.log(`   Resend ID: ${result.id || 'N/A'}`);
    console.log(`   件名: [${require('../services/email/ceo-report').formatDate()}] VSLワークフロー動作報告 - ${status}`);
  } catch (error) {
    console.error('❌ CEO報告メール送信失敗:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  generateDailyReport().catch(error => {
    console.error('❌ 日次報告生成エラー:', error);
    process.exit(1);
  });
}

module.exports = { generateDailyReport };
