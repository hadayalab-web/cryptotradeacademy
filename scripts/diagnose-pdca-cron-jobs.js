// scripts/diagnose-pdca-cron-jobs.js
// PDCA用Cron Jobsの診断スクリプト

const fs = require('fs');
const path = require('path');

/**
 * PDCA用Cron Jobsの診断
 */
async function diagnosePDCACronJobs() {
  console.log('🔍 PDCA用Cron Jobsの診断を開始...\n');

  // vercel.jsonからCron設定を読み込む
  const vercelJsonPath = path.join(__dirname, '../vercel.json');
  let cronConfig = null;
  try {
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
    cronConfig = vercelJson.crons || [];
  } catch (error) {
    console.error('❌ vercel.jsonの読み込みに失敗:', error.message);
    return;
  }

  // PDCA関連のCron Jobsを特定
  const pdcaCronJobs = [
    { path: '/api/x-engagement-metrics', name: 'エンゲージメントメトリクス', schedule: '0 0 * * *', file: 'api/x-engagement-metrics.js' },
    { path: '/api/x-quote-repost-metrics', name: '引用リポストメトリクス', schedule: '0 1 * * *', file: 'api/x-quote-repost-metrics.js' },
    { path: '/api/x-post-performance-analysis', name: '投稿パフォーマンス分析', schedule: '0 1 * * *', file: 'api/x-post-performance-analysis.js' },
    { path: '/api/x-influencer-report', name: 'インフルエンサーレポート', schedule: '0 9 * * 1', file: 'api/x-influencer-report.js' },
    { path: '/api/x-algorithm-analysis', name: 'アルゴリズム分析', schedule: '0 10 * * 1', file: 'api/x-algorithm-analysis.js' },
  ];

  console.log('📋 PDCA用Cron Jobs一覧:\n');
  console.log('='.repeat(80));

  const issues = [];

  for (const job of pdcaCronJobs) {
    console.log(`\n📊 ${job.name}`);
    console.log(`   Path: ${job.path}`);
    console.log(`   Schedule: ${job.schedule}`);
    console.log(`   File: ${job.file}`);

    // vercel.jsonに設定があるか確認
    const cronEntry = cronConfig.find(c => c.path === job.path);
    if (!cronEntry) {
      console.log(`   ❌ vercel.jsonに設定が見つかりません`);
      issues.push({
        job: job.name,
        issue: 'vercel.jsonに設定がない',
        severity: 'high',
      });
    } else {
      console.log(`   ✅ vercel.jsonに設定あり: ${cronEntry.schedule}`);
      if (cronEntry.schedule !== job.schedule) {
        console.log(`   ⚠️ スケジュールが異なります: 期待値=${job.schedule}, 実際=${cronEntry.schedule}`);
        issues.push({
          job: job.name,
          issue: `スケジュールが異なる: 期待値=${job.schedule}, 実際=${cronEntry.schedule}`,
          severity: 'medium',
        });
      }
    }

    // ファイルの存在確認
    const filePath = path.join(__dirname, '..', job.file);
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ ファイルが存在しません: ${filePath}`);
      issues.push({
        job: job.name,
        issue: `ファイルが存在しない: ${job.file}`,
        severity: 'high',
      });
    } else {
      console.log(`   ✅ ファイル存在確認`);
      
      // ファイル内容を確認
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // 認証チェックの有無
      const hasAuthCheck = fileContent.includes('CRON_SECRET') || fileContent.includes('authorization');
      if (!hasAuthCheck && job.file !== 'api/x-post-performance-analysis.js') {
        console.log(`   ⚠️ 認証チェックが見つかりません（x-post-performance-analysisは除く）`);
        issues.push({
          job: job.name,
          issue: '認証チェックがない',
          severity: 'medium',
        });
      } else {
        console.log(`   ✅ 認証チェックあり`);
      }

      // エラーハンドリングの確認
      const hasErrorHandling = fileContent.includes('try') && fileContent.includes('catch');
      if (!hasErrorHandling) {
        console.log(`   ⚠️ エラーハンドリングが不十分`);
        issues.push({
          job: job.name,
          issue: 'エラーハンドリングが不十分',
          severity: 'medium',
        });
      } else {
        console.log(`   ✅ エラーハンドリングあり`);
      }

      // KVストレージの使用確認
      const usesKV = fileContent.includes('@vercel/kv') || fileContent.includes('kv');
      if (usesKV) {
        console.log(`   ✅ KVストレージを使用`);
      } else {
        console.log(`   ⚠️ KVストレージを使用していない（データ保存不可）`);
        issues.push({
          job: job.name,
          issue: 'KVストレージを使用していない',
          severity: 'high',
        });
      }

      // ログ出力の確認
      const hasLogging = fileContent.includes('console.log') || fileContent.includes('console.error');
      if (!hasLogging) {
        console.log(`   ⚠️ ログ出力がない（デバッグ困難）`);
        issues.push({
          job: job.name,
          issue: 'ログ出力がない',
          severity: 'low',
        });
      } else {
        console.log(`   ✅ ログ出力あり`);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 診断結果サマリー');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('\n✅ 問題は見つかりませんでした');
  } else {
    console.log(`\n⚠️ ${issues.length}件の問題が見つかりました:\n`);

    const highSeverity = issues.filter(i => i.severity === 'high');
    const mediumSeverity = issues.filter(i => i.severity === 'medium');
    const lowSeverity = issues.filter(i => i.severity === 'low');

    if (highSeverity.length > 0) {
      console.log('🔴 高優先度の問題:');
      highSeverity.forEach(issue => {
        console.log(`   - ${issue.job}: ${issue.issue}`);
      });
      console.log('');
    }

    if (mediumSeverity.length > 0) {
      console.log('🟡 中優先度の問題:');
      mediumSeverity.forEach(issue => {
        console.log(`   - ${issue.job}: ${issue.issue}`);
      });
      console.log('');
    }

    if (lowSeverity.length > 0) {
      console.log('🟢 低優先度の問題:');
      lowSeverity.forEach(issue => {
        console.log(`   - ${issue.job}: ${issue.issue}`);
      });
      console.log('');
    }
  }

  // 推奨事項
  console.log('='.repeat(80));
  console.log('💡 推奨事項');
  console.log('='.repeat(80));
  console.log(`
1. **VercelダッシュボードでCron Jobsの実行状況を確認**
   - Vercel Dashboard → Project → Cron Jobs
   - 各Cron Jobの実行履歴とエラーログを確認

2. **環境変数の確認**
   - CRON_SECRETが設定されているか確認
   - KV_REST_API_URLとKV_REST_API_TOKENが設定されているか確認

3. **ログの確認**
   - Vercel Dashboard → Project → Deployments → Functions Logs
   - 各Cron Jobの実行ログを確認

4. **手動実行テスト**
   - Vercel CLIまたはAPI経由で各Cron Jobを手動実行
   - エラーの有無を確認

5. **PDCAサイクルの確認**
   - Plan: 各Cron Jobが正しく計画されているか
   - Do: Cron Jobが実行されているか
   - Check: 結果が正しく保存・分析されているか
   - Act: 分析結果に基づいて改善策が実行されているか
`);

  // 結果をファイルに保存
  const outputDir = path.join(__dirname, '../docs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `PDCA_CRON_JOBS_DIAGNOSIS_${timestamp}.md`);

  const output = `# PDCA用Cron Jobs診断レポート

**診断日時**: ${new Date().toISOString()}

## 📋 診断結果

### 問題の数: ${issues.length}件

${issues.length === 0 ? '✅ 問題は見つかりませんでした' : '⚠️ 以下の問題が見つかりました:'}

${issues.length > 0 ? issues.map((issue, idx) => `
### ${idx + 1}. ${issue.job} (${issue.severity})

**問題**: ${issue.issue}
`).join('') : ''}

## 💡 推奨事項

1. VercelダッシュボードでCron Jobsの実行状況を確認
2. 環境変数の確認（CRON_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN）
3. ログの確認（Functions Logs）
4. 手動実行テスト
5. PDCAサイクルの確認

---

**生成日時**: ${new Date().toISOString()}
`;

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, output, 'utf-8');

  console.log(`\n📄 診断結果を保存しました: ${outputFile}`);
}

// 実行
if (require.main === module) {
  diagnosePDCACronJobs()
    .then(() => {
      console.log('\n✅ 診断完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { diagnosePDCACronJobs };
