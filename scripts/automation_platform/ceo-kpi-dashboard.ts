#!/usr/bin/env tsx
/**
 * CEO KPIダッシュボード
 * 
 * CEO（人間）が確認するだけのシンプルなKPIダッシュボード
 * 実行コマンド: npx tsx scripts/ceo-kpi-dashboard.ts
 */

import { getCurrentKPIs } from './automated-weekend-100k-workflow.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function displayKPIDashboard() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CEO KPIダッシュボード - 週末$100K達成');
  console.log('='.repeat(60) + '\n');

  const kpis = await getCurrentKPIs();

  // 進捗バー
  const progressBarLength = 40;
  const filled = Math.floor((kpis.progress.progressPercent / 100) * progressBarLength);
  const progressBar = '█'.repeat(filled) + '░'.repeat(progressBarLength - filled);

  console.log('💰 売上進捗');
  console.log(`   目標: $${kpis.progress.target.toLocaleString()}`);
  console.log(`   現在: $${kpis.progress.current.toLocaleString()}`);
  console.log(`   残り: $${kpis.progress.remaining.toLocaleString()}`);
  console.log(`   進捗: ${kpis.progress.progressPercent}%`);
  console.log(`   [${progressBar}]`);
  console.log(`   残り日数: ${kpis.progress.daysRemaining}日`);
  console.log(`   1日あたり必要: $${kpis.progress.dailyTarget.toLocaleString()}\n`);

  console.log('📧 DM送信状況');
  console.log(`   送信: ${kpis.kpis.dmSent.toLocaleString()}件`);
  console.log(`   開封: ${kpis.kpis.dmOpened.toLocaleString()}件 (開封率: ${kpis.kpis.openRate}%)`);
  console.log(`   クリック: ${kpis.kpis.dmClicked.toLocaleString()}件 (クリック率: ${kpis.kpis.clickRate}%)\n`);

  console.log('🛒 コンバージョン');
  console.log(`   購入: ${kpis.kpis.purchases.toLocaleString()}件`);
  console.log(`   CVR: ${kpis.kpis.cvr}%\n`);

  // 目標達成予測
  const currentDailyRate = kpis.progress.daysRemaining > 0 
    ? kpis.progress.current / (Math.max(1, 4 - kpis.progress.daysRemaining))
    : 0;
  const projectedRevenue = currentDailyRate * kpis.progress.daysRemaining + kpis.progress.current;

  console.log('📈 予測');
  console.log(`   現在のペース: $${currentDailyRate.toLocaleString()}/日`);
  console.log(`   予測売上: $${Math.round(projectedRevenue).toLocaleString()}`);
  
  if (projectedRevenue >= kpis.progress.target) {
    console.log(`   ✅ 目標達成予測: 達成可能\n`);
  } else {
    const shortfall = kpis.progress.target - projectedRevenue;
    console.log(`   ⚠️ 目標達成予測: 不足 $${Math.round(shortfall).toLocaleString()}\n`);
  }

  // 最新のAI相談結果を表示
  const reportDir = join(__dirname, '..', 'data', 'kpi-reports');
  if (fs.existsSync(reportDir)) {
    const reports = fs.readdirSync(reportDir)
      .filter(f => f.startsWith('kpi-report-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (reports.length > 0) {
      const latestReport = JSON.parse(
        fs.readFileSync(join(reportDir, reports[0]), 'utf-8')
      );

      if (latestReport.nextActions) {
        console.log('🤖 AI推奨アクション');
        console.log(`   ${latestReport.nextActions}\n`);
      }
    }
  }

  console.log('='.repeat(60));
  console.log(`📄 詳細レポート: data/kpi-reports/kpi-report-${kpis.date}.json`);
  console.log('='.repeat(60) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  displayKPIDashboard()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

export { displayKPIDashboard };
