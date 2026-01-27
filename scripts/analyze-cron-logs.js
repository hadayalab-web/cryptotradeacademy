#!/usr/bin/env node
/**
 * CronJobsテストログの徹底分析
 */

const fs = require('fs');
const path = require('path');

// ログファイルを読み込む
const logFilePath = 'c:\\Users\\chiba\\Downloads\\logs_result.json';

console.log('='.repeat(80));
console.log('📊 CronJobsテストログ徹底分析');
console.log('='.repeat(80));
console.log('');

try {
  const logData = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
  
  if (!Array.isArray(logData)) {
    console.error('❌ ログデータが配列形式ではありません');
    process.exit(1);
  }
  
  console.log(`📈 総ログエントリ数: ${logData.length}`);
  console.log('');
  
  // 1. CronJob別の集計
  const cronJobStats = {};
  const cronJobErrors = {};
  const cronJobSuccess = {};
  
  logData.forEach(entry => {
    // Vercelログ形式に対応
    const functionPath = entry.function || entry.requestPath || entry.path || entry.url || 'unknown';
    const cronJobName = functionPath.split('/').pop().split('?')[0] || 'unknown';
    
    if (!cronJobStats[cronJobName]) {
      cronJobStats[cronJobName] = {
        total: 0,
        success: 0,
        error: 0,
        skipped: 0,
        status200: 0,
        status202: 0,
        status500: 0,
        messages: [],
        errors: [],
        timestamps: [],
        responseCodes: [],
      };
    }
    
    cronJobStats[cronJobName].total++;
    const timestamp = entry.TimeUTC || entry.timestamp || entry.time || entry.created_at || entry.timestampInMs;
    cronJobStats[cronJobName].timestamps.push(timestamp);
    
    // レスポンスステータスコードを記録
    const statusCode = entry.responseStatusCode || entry.statusCode || null;
    if (statusCode) {
      cronJobStats[cronJobName].responseCodes.push(statusCode);
      if (statusCode === 200) cronJobStats[cronJobName].status200++;
      else if (statusCode === 202) cronJobStats[cronJobName].status202++;
      else if (statusCode >= 500) cronJobStats[cronJobName].status500++;
    }
    
    // メッセージを分析
    const message = entry.message || entry.msg || entry.text || '';
    if (message) {
      cronJobStats[cronJobName].messages.push(message);
    }
    
    // 成功/エラー/スキップを判定
    const lowerMessage = message.toLowerCase();
    const level = entry.level || '';
    
    // ステータスコードベースの判定
    if (statusCode === 200 || statusCode === 202) {
      cronJobStats[cronJobName].success++;
    } else if (statusCode >= 400) {
      cronJobStats[cronJobName].error++;
    }
    
    // メッセージベースの判定
    if (lowerMessage.includes('success') || lowerMessage.includes('✅') || lowerMessage.includes('completed') || lowerMessage.includes('posted successfully')) {
      cronJobStats[cronJobName].success++;
      cronJobSuccess[cronJobName] = (cronJobSuccess[cronJobName] || 0) + 1;
    } else if (level === 'error' || lowerMessage.includes('error') || lowerMessage.includes('❌') || lowerMessage.includes('failed') || lowerMessage.includes('exception') || lowerMessage.includes('deprecationwarning')) {
      cronJobStats[cronJobName].error++;
      if (!cronJobErrors[cronJobName]) {
        cronJobErrors[cronJobName] = [];
      }
      cronJobErrors[cronJobName].push({
        message: message.substring(0, 200),
        timestamp: timestamp,
        statusCode: statusCode,
        level: level,
      });
    } else if (lowerMessage.includes('skip') || lowerMessage.includes('⏰') || lowerMessage.includes('already') || lowerMessage.includes('skipping')) {
      cronJobStats[cronJobName].skipped++;
    }
  });
  
  // 2. 結果を表示
  console.log('='.repeat(80));
  console.log('📋 CronJob別の統計');
  console.log('='.repeat(80));
  console.log('');
  
  const sortedCronJobs = Object.entries(cronJobStats).sort((a, b) => b[1].total - a[1].total);
  
  sortedCronJobs.forEach(([cronJobName, stats]) => {
    const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
    const errorRate = stats.total > 0 ? ((stats.error / stats.total) * 100).toFixed(1) : 0;
    const skipRate = stats.total > 0 ? ((stats.skipped / stats.total) * 100).toFixed(1) : 0;
    
    console.log(`📌 ${cronJobName}`);
    console.log(`   総実行数: ${stats.total}`);
    console.log(`   ✅ 成功: ${stats.success} (${successRate}%)`);
    console.log(`   ❌ エラー: ${stats.error} (${errorRate}%)`);
    console.log(`   ⏰ スキップ: ${stats.skipped} (${skipRate}%)`);
    
    // ステータスコード別の集計
    if (stats.status200 > 0 || stats.status202 > 0 || stats.status500 > 0) {
      console.log(`   📊 ステータスコード: 200=${stats.status200}, 202=${stats.status202}, 500+=${stats.status500}`);
    }
    
    if (stats.error > 0 && cronJobErrors[cronJobName]) {
      console.log(`   🔴 エラー詳細（上位3件）:`);
      cronJobErrors[cronJobName].slice(0, 3).forEach((err, idx) => {
        const errMsg = err.message || 'No message';
        const statusInfo = err.statusCode ? ` [Status: ${err.statusCode}]` : '';
        console.log(`      ${idx + 1}. ${errMsg.substring(0, 100)}${statusInfo}...`);
      });
    }
    
    // 最近の成功メッセージを表示（参考用）
    const successMessages = stats.messages.filter(m => {
      const lower = m.toLowerCase();
      return lower.includes('success') || lower.includes('✅') || lower.includes('completed') || lower.includes('posted');
    });
    if (successMessages.length > 0 && successMessages.length <= 3) {
      console.log(`   💡 成功メッセージ例:`);
      successMessages.slice(0, 2).forEach((msg, idx) => {
        console.log(`      ${idx + 1}. ${msg.substring(0, 80)}...`);
      });
    }
    
    console.log('');
  });
  
  // 3. エラー分析
  console.log('='.repeat(80));
  console.log('🔴 エラー分析');
  console.log('='.repeat(80));
  console.log('');
  
  const totalErrors = Object.values(cronJobStats).reduce((sum, stats) => sum + stats.error, 0);
  const totalSuccess = Object.values(cronJobStats).reduce((sum, stats) => sum + stats.success, 0);
  const totalSkipped = Object.values(cronJobStats).reduce((sum, stats) => sum + stats.skipped, 0);
  const totalExecutions = logData.length;
  
  console.log(`総実行数: ${totalExecutions}`);
  console.log(`✅ 成功: ${totalSuccess} (${((totalSuccess / totalExecutions) * 100).toFixed(1)}%)`);
  console.log(`❌ エラー: ${totalErrors} (${((totalErrors / totalExecutions) * 100).toFixed(1)}%)`);
  console.log(`⏰ スキップ: ${totalSkipped} (${((totalSkipped / totalExecutions) * 100).toFixed(1)}%)`);
  console.log('');
  
  // 4. エラーが多いCronJob
  const errorProneCronJobs = Object.entries(cronJobStats)
    .filter(([name, stats]) => stats.error > 0)
    .sort((a, b) => b[1].error - a[1].error);
  
  if (errorProneCronJobs.length > 0) {
    console.log('⚠️ エラーが多いCronJob（上位5件）:');
    errorProneCronJobs.slice(0, 5).forEach(([name, stats], idx) => {
      console.log(`   ${idx + 1}. ${name}: ${stats.error}件のエラー`);
    });
    console.log('');
  }
  
  // 5. Minimal Version関連のログを特別に分析
  console.log('='.repeat(80));
  console.log('🎯 Minimal Version関連の詳細分析');
  console.log('='.repeat(80));
  console.log('');
  
  const minimalLogs = logData.filter(entry => {
    const message = (entry.message || entry.msg || entry.text || '').toLowerCase();
    const functionPath = (entry.function || entry.requestPath || '').toLowerCase();
    return message.includes('minimal') || functionPath.includes('minimal');
  });
  
  console.log(`Minimal Version関連のログ: ${minimalLogs.length}件`);
  
  if (minimalLogs.length > 0) {
    const minimalSuccess = minimalLogs.filter(e => {
      const msg = (e.message || e.msg || e.text || '').toLowerCase();
      const status = e.responseStatusCode || e.statusCode;
      return (status === 200 || status === 202) || msg.includes('success') || msg.includes('✅') || msg.includes('posted successfully');
    }).length;
    
    const minimalErrors = minimalLogs.filter(e => {
      const msg = (e.message || e.msg || e.text || '').toLowerCase();
      const level = (e.level || '').toLowerCase();
      const status = e.responseStatusCode || e.statusCode;
      return (status >= 400) || level === 'error' || msg.includes('error') || msg.includes('❌') || msg.includes('failed');
    }).length;
    
    const minimalSkipped = minimalLogs.filter(e => {
      const msg = (e.message || e.msg || e.text || '').toLowerCase();
      return msg.includes('skip') || msg.includes('⏰') || msg.includes('already') || msg.includes('skipping');
    }).length;
    
    console.log(`   ✅ 成功: ${minimalSuccess}件`);
    console.log(`   ❌ エラー: ${minimalErrors}件`);
    console.log(`   ⏰ スキップ: ${minimalSkipped}件`);
    console.log('');
    
    // A/Bテスト関連のログを確認
    const abTestLogs = minimalLogs.filter(e => {
      const msg = (e.message || e.msg || e.text || '').toLowerCase();
      return msg.includes('a/b test') || msg.includes('ab test') || msg.includes('variant') || msg.includes('whop_first') || msg.includes('telegram_first');
    });
    
    if (abTestLogs.length > 0) {
      console.log(`   📊 A/Bテスト関連のログ: ${abTestLogs.length}件`);
      abTestLogs.slice(0, 5).forEach((log, idx) => {
        const msg = (log.message || log.msg || log.text || '');
        console.log(`      ${idx + 1}. ${msg.substring(0, 150)}...`);
      });
      console.log('');
    }
    
    // 言語別の分析
    const langStats = {};
    minimalLogs.forEach(log => {
      const msg = (log.message || log.msg || log.text || '').toLowerCase();
      const langs = ['en', 'ja', 'es', 'pt-br', 'ar', 'ko'];
      langs.forEach(lang => {
        if (msg.includes(`for ${lang}`) || msg.includes(`lang: ${lang}`) || msg.includes(`${lang} `)) {
          if (!langStats[lang]) {
            langStats[lang] = { total: 0, success: 0, error: 0 };
          }
          langStats[lang].total++;
          if (msg.includes('success') || msg.includes('✅') || msg.includes('posted')) {
            langStats[lang].success++;
          } else if (msg.includes('error') || msg.includes('❌') || msg.includes('failed')) {
            langStats[lang].error++;
          }
        }
      });
    });
    
    if (Object.keys(langStats).length > 0) {
      console.log(`   🌍 言語別の統計:`);
      Object.entries(langStats).forEach(([lang, stats]) => {
        const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
        console.log(`      ${lang}: 総数=${stats.total}, 成功=${stats.success} (${successRate}%), エラー=${stats.error}`);
      });
      console.log('');
    }
    
    // 投稿成功の詳細
    const postedLogs = minimalLogs.filter(e => {
      const msg = (e.message || e.msg || e.text || '').toLowerCase();
      return msg.includes('posted successfully') || msg.includes('minimal version posted');
    });
    
    if (postedLogs.length > 0) {
      console.log(`   📤 投稿成功ログ: ${postedLogs.length}件`);
      postedLogs.slice(0, 3).forEach((log, idx) => {
        const msg = (log.message || log.msg || log.text || '');
        console.log(`      ${idx + 1}. ${msg.substring(0, 120)}...`);
      });
      console.log('');
    }
  }
  
  // 6. 時間帯別の分析
  console.log('='.repeat(80));
  console.log('⏰ 時間帯別の分析');
  console.log('='.repeat(80));
  console.log('');
  
  const hourlyStats = {};
  const cronJobHourlyStats = {};
  
  logData.forEach(entry => {
    const timestamp = entry.TimeUTC || entry.timestamp || entry.time || entry.created_at || entry.timestampInMs;
    if (timestamp) {
      let date;
      if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (timestamp.includes('T')) {
        date = new Date(timestamp);
      } else if (timestamp.includes(' ')) {
        // "2026-01-26 12:51:50"形式
        date = new Date(timestamp.replace(' ', 'T') + 'Z');
      } else {
        date = new Date(timestamp);
      }
      
      if (!isNaN(date.getTime())) {
        const hour = date.getUTCHours();
        if (!hourlyStats[hour]) {
          hourlyStats[hour] = { total: 0, success: 0, error: 0, cronJobs: new Set() };
        }
        hourlyStats[hour].total++;
        
        const functionPath = entry.function || entry.requestPath || '';
        const cronJobName = functionPath.split('/').pop().split('?')[0] || 'unknown';
        hourlyStats[hour].cronJobs.add(cronJobName);
        
        const statusCode = entry.responseStatusCode || entry.statusCode;
        const message = (entry.message || entry.msg || entry.text || '').toLowerCase();
        const level = (entry.level || '').toLowerCase();
        
        if (statusCode === 200 || statusCode === 202 || message.includes('success') || message.includes('✅')) {
          hourlyStats[hour].success++;
        } else if (statusCode >= 400 || level === 'error' || message.includes('error') || message.includes('❌') || message.includes('failed')) {
          hourlyStats[hour].error++;
        }
        
        // CronJob別の時間帯統計
        if (!cronJobHourlyStats[cronJobName]) {
          cronJobHourlyStats[cronJobName] = {};
        }
        if (!cronJobHourlyStats[cronJobName][hour]) {
          cronJobHourlyStats[cronJobName][hour] = { total: 0, success: 0, error: 0 };
        }
        cronJobHourlyStats[cronJobName][hour].total++;
        if (statusCode === 200 || statusCode === 202 || message.includes('success') || message.includes('✅')) {
          cronJobHourlyStats[cronJobName][hour].success++;
        } else if (statusCode >= 400 || level === 'error' || message.includes('error') || message.includes('❌') || message.includes('failed')) {
          cronJobHourlyStats[cronJobName][hour].error++;
        }
      }
    }
  });
  
  const sortedHours = Object.entries(hourlyStats).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  if (sortedHours.length > 0) {
    sortedHours.forEach(([hour, stats]) => {
      const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
      const cronJobList = Array.from(stats.cronJobs).join(', ');
      console.log(`UTC ${hour}:00 - 総実行: ${stats.total}, 成功: ${stats.success} (${successRate}%), エラー: ${stats.error}`);
      if (cronJobList) {
        console.log(`   実行されたCronJob: ${cronJobList}`);
      }
    });
  } else {
    console.log('時間帯別のデータが見つかりませんでした');
  }
  
  // Minimal Versionの時間帯別分析
  console.log('');
  console.log('🎯 Minimal Versionの時間帯別分析:');
  if (cronJobHourlyStats['x-post-minimal-version-cron']) {
    const minimalHourly = cronJobHourlyStats['x-post-minimal-version-cron'];
    const sortedMinimalHours = Object.entries(minimalHourly).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    sortedMinimalHours.forEach(([hour, stats]) => {
      const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
      console.log(`   UTC ${hour}:00 - 総実行: ${stats.total}, 成功: ${stats.success} (${successRate}%), エラー: ${stats.error}`);
    });
  } else {
    console.log('   Minimal Versionの時間帯別データが見つかりませんでした');
  }
  
  // 7. パフォーマンス分析
  console.log('='.repeat(80));
  console.log('⚡ パフォーマンス分析');
  console.log('='.repeat(80));
  console.log('');
  
  const performanceStats = {};
  logData.forEach(entry => {
    const functionPath = entry.function || entry.requestPath || '';
    const cronJobName = functionPath.split('/').pop().split('?')[0] || 'unknown';
    const duration = parseInt(entry.durationMs) || 0;
    
    if (duration > 0) {
      if (!performanceStats[cronJobName]) {
        performanceStats[cronJobName] = { durations: [], count: 0 };
      }
      performanceStats[cronJobName].durations.push(duration);
      performanceStats[cronJobName].count++;
    }
  });
  
  const sortedPerformance = Object.entries(performanceStats)
    .map(([name, stats]) => {
      const durations = stats.durations;
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      return { name, avg, min, max, count: stats.count };
    })
    .sort((a, b) => b.avg - a.avg);
  
  if (sortedPerformance.length > 0) {
    console.log('実行時間が長いCronJob（上位10件）:');
    sortedPerformance.slice(0, 10).forEach((stat, idx) => {
      console.log(`   ${idx + 1}. ${stat.name}: 平均=${stat.avg.toFixed(0)}ms, 最小=${stat.min}ms, 最大=${stat.max}ms (${stat.count}件)`);
    });
  } else {
    console.log('実行時間データが見つかりませんでした');
  }
  
  // 8. 重要な発見と推奨事項
  console.log('');
  console.log('='.repeat(80));
  console.log('💡 重要な発見と推奨事項');
  console.log('='.repeat(80));
  console.log('');
  
  const recommendations = [];
  
  // DeprecationWarningの分析
  const deprecationWarnings = logData.filter(e => {
    const msg = (e.message || e.msg || e.text || '').toLowerCase();
    return msg.includes('deprecationwarning') || msg.includes('url.parse()');
  });
  
  if (deprecationWarnings.length > 0) {
    recommendations.push({
      priority: '中',
      issue: `DeprecationWarning: url.parse() が ${deprecationWarnings.length}件検出`,
      description: 'Node.jsの非推奨APIが使用されています。WHATWG URL APIへの移行を推奨します。',
      affected: Array.from(new Set(deprecationWarnings.map(e => {
        const func = e.function || e.requestPath || '';
        return func.split('/').pop().split('?')[0];
      }))).join(', '),
    });
  }
  
  // Minimal Versionのスキップ率が高い
  const minimalStats = cronJobStats['x-post-minimal-version-cron'];
  if (minimalStats && minimalStats.skipped > 0) {
    const skipRate = (minimalStats.skipped / minimalStats.total * 100).toFixed(1);
    if (parseFloat(skipRate) > 20) {
      recommendations.push({
        priority: '低',
        issue: `Minimal Versionのスキップ率が高い: ${skipRate}%`,
        description: 'スキップ条件の見直しを検討してください。',
      });
    }
  }
  
  // エラー率が高いCronJob
  const highErrorRateJobs = Object.entries(cronJobStats)
    .filter(([name, stats]) => {
      const errorRate = stats.total > 0 ? (stats.error / stats.total) * 100 : 0;
      return errorRate > 5 && stats.error > 0;
    })
    .map(([name, stats]) => {
      const errorRate = (stats.error / stats.total * 100).toFixed(1);
      return { name, errorRate, errors: stats.error };
    });
  
  if (highErrorRateJobs.length > 0) {
    recommendations.push({
      priority: '高',
      issue: `エラー率が高いCronJob: ${highErrorRateJobs.map(j => `${j.name} (${j.errorRate}%)`).join(', ')}`,
      description: 'これらのCronJobのエラー原因を調査し、修正を推奨します。',
    });
  }
  
  // Minimal VersionのA/Bテストが動作しているか確認
  const abTestLogs = logData.filter(e => {
    const msg = (e.message || e.msg || e.text || '').toLowerCase();
    const func = (e.function || e.requestPath || '').toLowerCase();
    return func.includes('minimal') && (msg.includes('a/b test') || msg.includes('variant') || msg.includes('whop_first') || msg.includes('telegram_first'));
  });
  
  if (abTestLogs.length === 0) {
    recommendations.push({
      priority: '中',
      issue: 'Minimal VersionのA/Bテストログが見つかりません',
      description: 'A/Bテスト機能が正しく動作しているか確認してください。',
    });
  } else {
    recommendations.push({
      priority: '低',
      issue: `Minimal VersionのA/Bテストが動作中: ${abTestLogs.length}件のログ`,
      description: 'A/Bテストは正常に動作しています。',
    });
  }
  
  // 推奨事項を表示
  recommendations.forEach((rec, idx) => {
    const priorityEmoji = rec.priority === '高' ? '🔴' : rec.priority === '中' ? '🟡' : '🟢';
    console.log(`${priorityEmoji} [${rec.priority}優先度] ${rec.issue}`);
    console.log(`   ${rec.description}`);
    if (rec.affected) {
      console.log(`   影響範囲: ${rec.affected}`);
    }
    console.log('');
  });
  
  // 9. サマリー
  console.log('='.repeat(80));
  console.log('📊 分析サマリー');
  console.log('='.repeat(80));
  console.log('');
  console.log(`✅ 総CronJob数: ${Object.keys(cronJobStats).length}個`);
  console.log(`✅ 総実行数: ${totalExecutions}回`);
  console.log(`✅ 成功率: ${((totalSuccess / totalExecutions) * 100).toFixed(1)}%`);
  console.log(`❌ エラー率: ${((totalErrors / totalExecutions) * 100).toFixed(1)}%`);
  console.log(`⏰ スキップ率: ${((totalSkipped / totalExecutions) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`🎯 Minimal Version:`);
  const minimalTotal = cronJobStats['x-post-minimal-version-cron']?.total || 0;
  const minimalSuccess = cronJobStats['x-post-minimal-version-cron']?.success || 0;
  const minimalError = cronJobStats['x-post-minimal-version-cron']?.error || 0;
  const minimalSkip = cronJobStats['x-post-minimal-version-cron']?.skipped || 0;
  if (minimalTotal > 0) {
    console.log(`   実行数: ${minimalTotal}回`);
    console.log(`   成功率: ${((minimalSuccess / minimalTotal) * 100).toFixed(1)}%`);
    console.log(`   エラー率: ${((minimalError / minimalTotal) * 100).toFixed(1)}%`);
    console.log(`   スキップ率: ${((minimalSkip / minimalTotal) * 100).toFixed(1)}%`);
  }
  console.log('');
  console.log(`💡 推奨事項数: ${recommendations.length}件`);
  console.log(`   - 高優先度: ${recommendations.filter(r => r.priority === '高').length}件`);
  console.log(`   - 中優先度: ${recommendations.filter(r => r.priority === '中').length}件`);
  console.log(`   - 低優先度: ${recommendations.filter(r => r.priority === '低').length}件`);
  
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ 分析完了');
  console.log('='.repeat(80));
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
}
