// analyze-vercel-logs.js
// Vercel Dashboardのログ結果JSONを分析

const fs = require('fs');
const path = require('path');

const logFile = process.argv[2] || 'C:/Users/chiba/Downloads/logs_result (15).json';

console.log('📊 Vercel Dashboard ログ結果分析');
console.log('='.repeat(80));
console.log(`📁 ファイル: ${logFile}`);
console.log('='.repeat(80));

try {
    const fileContent = fs.readFileSync(logFile, 'utf-8');
    const logs = JSON.parse(fileContent);
    
    console.log(`\n✅ ログエントリ数: ${logs.length}件\n`);
    
    // エンドポイント別にグループ化
    const endpointGroups = {};
    
    logs.forEach(log => {
        const endpoint = log.requestPath || log.function || 'unknown';
        const cleanEndpoint = endpoint.replace(/^.*\/api\//, '/api/');
        
        if (!endpointGroups[cleanEndpoint]) {
            endpointGroups[cleanEndpoint] = {
                endpoint: cleanEndpoint,
                requests: [],
                successCount: 0,
                errorCount: 0,
                statusCodes: {},
                dryRunCount: 0,
                skippedCount: 0,
                durations: []
            };
        }
        
        const group = endpointGroups[cleanEndpoint];
        group.requests.push(log);
        
        // ステータスコード集計
        const statusCode = log.responseStatusCode || log.statusCode || 'unknown';
        group.statusCodes[statusCode] = (group.statusCodes[statusCode] || 0) + 1;
        
        if (statusCode === 200) {
            group.successCount++;
        } else {
            group.errorCount++;
        }
        
        // 実行時間
        if (log.durationMs) {
            group.durations.push(parseFloat(log.durationMs));
        }
        
        // メッセージからdryRunやskippedを検出
        const message = log.message || '';
        if (message.includes('dryRun') || message.includes('DRY_RUN') || message.includes('ドライラン')) {
            group.dryRunCount++;
        }
        if (message.includes('skipped') || message.includes('SKIP') || message.includes('スキップ')) {
            group.skippedCount++;
        }
    });
    
    // CronJobsのリスト（vercel.jsonから）
    const cronJobs = [
        { path: '/api/cron', name: 'Trap Defence BTC配信', phase: 'Phase 1' },
        { path: '/api/vsl1-post', name: 'VSL1自動投稿', phase: 'Phase 2' },
        { path: '/api/x-post-minimal-version-cron', name: '無料版X投稿', phase: 'Phase 2' },
        { path: '/api/x-post-free-report', name: '無料版レポートX投稿', phase: 'Phase 2' },
        { path: '/api/x-quote-repost-en', name: '引用リポスト EN', phase: 'Phase 2' },
        { path: '/api/x-quote-repost-es', name: '引用リポスト ES', phase: 'Phase 2' },
        { path: '/api/x-quote-repost-pt-br', name: '引用リポスト PT-BR', phase: 'Phase 2' },
        { path: '/api/x-quote-repost-ar', name: '引用リポスト AR', phase: 'Phase 2' },
        { path: '/api/x-quote-repost-ja', name: '引用リポスト JA', phase: 'Phase 2' },
        { path: '/api/x-quote-repost-ko', name: '引用リポスト KO', phase: 'Phase 2' },
        { path: '/api/vsl2-free-users', name: 'VSL2自動配信', phase: 'Phase 3' },
        { path: '/api/vsl1-reminder', name: 'VSL1リマインド', phase: 'Phase 3' },
        { path: '/api/vsl2-last-call', name: 'VSL2終了直前リマインド', phase: 'Phase 3' },
        { path: '/api/promo-stock-monitor', name: 'プロモコード在庫監視', phase: 'Phase 4' }
    ];
    
    // Phase別にグループ化
    const phaseResults = {};
    
    cronJobs.forEach(cronJob => {
        const group = endpointGroups[cronJob.path];
        if (!phaseResults[cronJob.phase]) {
            phaseResults[cronJob.phase] = [];
        }
        
        if (group) {
            const avgDuration = group.durations.length > 0
                ? (group.durations.reduce((a, b) => a + b, 0) / group.durations.length).toFixed(2)
                : 'N/A';
            const minDuration = group.durations.length > 0
                ? Math.min(...group.durations).toFixed(2)
                : 'N/A';
            const maxDuration = group.durations.length > 0
                ? Math.max(...group.durations).toFixed(2)
                : 'N/A';
            
            phaseResults[cronJob.phase].push({
                ...cronJob,
                ...group,
                avgDuration,
                minDuration,
                maxDuration,
                totalRequests: group.requests.length
            });
        } else {
            // ログに記録されていないCronJob
            phaseResults[cronJob.phase].push({
                ...cronJob,
                totalRequests: 0,
                successCount: 0,
                errorCount: 0,
                statusCodes: {},
                dryRunCount: 0,
                skippedCount: 0,
                avgDuration: 'N/A',
                minDuration: 'N/A',
                maxDuration: 'N/A'
            });
        }
    });
    
    // 結果を表示
    Object.keys(phaseResults).sort().forEach(phase => {
        console.log(`\n📋 ${phase}`);
        console.log('-'.repeat(80));
        
        phaseResults[phase].forEach(result => {
            const statusEmoji = result.totalRequests === 0
                ? '⚠️  未実行'
                : result.errorCount === 0
                    ? '✅ 成功'
                    : '❌ エラーあり';
            
            const statusCodeStr = Object.keys(result.statusCodes).length > 0
                ? `HTTP ${Object.keys(result.statusCodes).join(', ')}`
                : 'N/A';
            
            const durationStr = result.avgDuration !== 'N/A'
                ? ` (平均: ${result.avgDuration}ms, 最小: ${result.minDuration}ms, 最大: ${result.maxDuration}ms)`
                : '';
            
            const dryRunStr = result.dryRunCount > 0 ? ` [🧪 ドライラン: ${result.dryRunCount}件]` : '';
            const skippedStr = result.skippedCount > 0 ? ` [⏰ スキップ: ${result.skippedCount}件]` : '';
            
            console.log(`  ${statusEmoji} ${result.name}`);
            console.log(`     エンドポイント: ${result.path}`);
            console.log(`     リクエスト数: ${result.totalRequests}件`);
            if (result.totalRequests > 0) {
                console.log(`     成功: ${result.successCount}件, エラー: ${result.errorCount}件`);
                console.log(`     ステータスコード: ${statusCodeStr}${durationStr}`);
                if (dryRunStr || skippedStr) {
                    console.log(`     ${dryRunStr}${skippedStr}`);
                }
            }
            console.log('');
        });
    });
    
    // サマリー
    console.log('\n' + '='.repeat(80));
    console.log('📊 全体サマリー');
    console.log('='.repeat(80));
    
    let totalRequests = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalDryRun = 0;
    let totalSkipped = 0;
    let executedCronJobs = 0;
    
    Object.values(phaseResults).forEach(results => {
        results.forEach(result => {
            totalRequests += result.totalRequests;
            totalSuccess += result.successCount;
            totalErrors += result.errorCount;
            totalDryRun += result.dryRunCount;
            totalSkipped += result.skippedCount;
            if (result.totalRequests > 0) {
                executedCronJobs++;
            }
        });
    });
    
    const successRate = totalRequests > 0
        ? ((totalSuccess / totalRequests) * 100).toFixed(1)
        : 0;
    
    console.log(`\n合計リクエスト数: ${totalRequests}件`);
    console.log(`実行されたCronJobs: ${executedCronJobs}/14件`);
    console.log(`成功率: ${totalSuccess}/${totalRequests}件 (${successRate}%)`);
    console.log(`エラー数: ${totalErrors}件`);
    console.log(`ドライランモード: ${totalDryRun}件`);
    console.log(`スキップ: ${totalSkipped}件`);
    
    if (executedCronJobs === 14 && totalErrors === 0) {
        console.log('\n🎉 すべてのCronJobs（14個）が正常に実行されました！');
        console.log('   本番環境移行の準備が整っています。');
    } else if (executedCronJobs < 14) {
        console.log(`\n⚠️  ${14 - executedCronJobs}個のCronJobsがログに記録されていません。`);
        console.log('   すべてのCronJobsを手動実行したか確認してください。');
    } else if (totalErrors > 0) {
        console.log(`\n⚠️  ${totalErrors}件のエラーが発生しています。`);
        console.log('   エラーの詳細を確認してください。');
    }
    
    // エラーがある場合、詳細を表示
    if (totalErrors > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('❌ エラー詳細');
        console.log('='.repeat(80));
        
        Object.values(phaseResults).forEach(results => {
            results.forEach(result => {
                if (result.errorCount > 0) {
                    console.log(`\n${result.name} (${result.path})`);
                    console.log(`  エラー数: ${result.errorCount}件`);
                    console.log(`  ステータスコード: ${Object.keys(result.statusCodes).join(', ')}`);
                    
                    // エラーログを抽出
                    const errorLogs = result.requests.filter(req => {
                        const status = req.responseStatusCode || req.statusCode;
                        return status !== 200 && status !== undefined;
                    });
                    
                    if (errorLogs.length > 0) {
                        console.log(`  エラーログサンプル:`);
                        errorLogs.slice(0, 3).forEach(log => {
                            const status = log.responseStatusCode || log.statusCode || 'unknown';
                            const message = log.message || 'No message';
                            console.log(`    - HTTP ${status}: ${message.substring(0, 100)}`);
                        });
                    }
                }
            });
        });
    }
    
    console.log('\n💡 ヒント:');
    console.log('   - すべてのCronJobsが正常に実行されていることを確認してください');
    console.log('   - エラーがある場合は、Vercel Dashboardで詳細ログを確認してください');
    console.log('   - ドライランモードが有効な場合は、X_POSTING_DRY_RUN=true が設定されています');
    
} catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
}
