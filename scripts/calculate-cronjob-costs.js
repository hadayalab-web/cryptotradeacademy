// calculate-cronjob-costs.js
// 予想投稿数からVercelのコストを計算

const fs = require('fs');
const path = require('path');

// vercel.jsonからCronJobsのスケジュールを読み込み
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));

// CronJobsの定義
const cronJobs = [
    { path: '/api/cron', name: 'Trap Defence BTC配信', schedule: '*/15 * * * *' },
    { path: '/api/vsl1-post', name: 'VSL1自動投稿', schedule: '0 1,13,21 * * *' },
    { path: '/api/x-post-minimal-version-cron', name: '無料版X投稿', schedule: '0 0,7,12,15,23 * * *' },
    { path: '/api/x-post-free-report', name: '無料版レポートX投稿', schedule: '30 4,10,17,19 * * *' },
    { path: '/api/x-quote-repost-en', name: '引用リポスト EN', schedule: '*/6 * * * *' },
    { path: '/api/x-quote-repost-es', name: '引用リポスト ES', schedule: '1,7,13,19,25,31,37,43,49,55 * * * *' },
    { path: '/api/x-quote-repost-pt-br', name: '引用リポスト PT-BR', schedule: '2,8,14,20,26,32,38,44,50,56 * * * *' },
    { path: '/api/x-quote-repost-ar', name: '引用リポスト AR', schedule: '3,9,15,21,27,33,39,45,51,57 * * * *' },
    { path: '/api/x-quote-repost-ja', name: '引用リポスト JA', schedule: '4,10,16,22,28,34,40,46,52,58 * * * *' },
    { path: '/api/x-quote-repost-ko', name: '引用リポスト KO', schedule: '5,11,17,23,29,35,41,47,53,59 * * * *' },
    { path: '/api/vsl2-free-users', name: 'VSL2自動配信', schedule: '0 * * * *' },
    { path: '/api/vsl1-reminder', name: 'VSL1リマインド', schedule: '0 */12 * * *' },
    { path: '/api/vsl2-last-call', name: 'VSL2終了直前リマインド', schedule: '0 * * * *' },
    { path: '/api/promo-stock-monitor', name: 'プロモコード在庫監視', schedule: '*/15 * * * *' }
];

// Cronスケジュールを解析して1日あたりの実行回数を計算
function parseCronSchedule(schedule) {
    const parts = schedule.split(' ');
    
    // 分 時 日 月 曜日
    const minute = parts[0];
    const hour = parts[1];
    const day = parts[2];
    const month = parts[3];
    const weekday = parts[4];
    
    let executionsPerDay = 0;
    
    // 分のパターンを解析
    if (minute.startsWith('*/')) {
        // */N パターン（N分ごと）
        const interval = parseInt(minute.substring(2));
        executionsPerDay = (24 * 60) / interval;
    } else if (minute.includes(',')) {
        // カンマ区切りの特定分（例: 1,7,13,19,25,31,37,43,49,55）
        const minutes = minute.split(',').map(m => parseInt(m));
        executionsPerDay = minutes.length * (hour === '*' ? 24 : hour.split(',').length);
    } else if (minute === '*') {
        // 毎分
        executionsPerDay = hour === '*' ? 24 * 60 : parseInt(hour.split(',').length) * 60;
    } else {
        // 特定分（例: 0, 30）
        executionsPerDay = hour === '*' ? 24 : hour.split(',').length;
    }
    
    // 時間のパターンを解析
    if (hour !== '*') {
        if (hour.includes(',')) {
            // カンマ区切りの特定時間（例: 1,13,21）
            const hours = hour.split(',').map(h => parseInt(h));
            if (minute.startsWith('*/')) {
                const interval = parseInt(minute.substring(2));
                executionsPerDay = hours.length * (60 / interval);
            } else if (minute.includes(',')) {
                executionsPerDay = hours.length * minute.split(',').length;
            } else {
                executionsPerDay = hours.length;
            }
        } else if (hour.startsWith('*/')) {
            // */N パターン（N時間ごと）
            const interval = parseInt(hour.substring(2));
            if (minute.startsWith('*/')) {
                const minuteInterval = parseInt(minute.substring(2));
                executionsPerDay = (24 / interval) * (60 / minuteInterval);
            } else {
                executionsPerDay = 24 / interval;
            }
        } else {
            // 特定時間
            if (minute.startsWith('*/')) {
                const interval = parseInt(minute.substring(2));
                executionsPerDay = (60 / interval);
            } else {
                executionsPerDay = 1;
            }
        }
    }
    
    return Math.floor(executionsPerDay);
}

// ログ分析結果から平均実行時間を取得（秒単位）
const avgDurations = {
    '/api/cron': 11.8, // 11831.50ms / 1000
    '/api/vsl1-post': 16.0, // 15960.50ms / 1000
    '/api/x-post-minimal-version-cron': 18.3, // 18346.00ms / 1000
    '/api/x-post-free-report': 14.4, // 14353.50ms / 1000
    '/api/x-quote-repost-en': 0.025, // 25ms / 1000
    '/api/x-quote-repost-es': 0.021, // 20.5ms / 1000
    '/api/x-quote-repost-pt-br': 9.6, // 9614.25ms / 1000
    '/api/x-quote-repost-ar': 0.025, // 24.5ms / 1000
    '/api/x-quote-repost-ja': 3.7, // 3686.50ms / 1000
    '/api/x-quote-repost-ko': 3.2, // 3198.00ms / 1000
    '/api/vsl2-free-users': 0.39, // 389.75ms / 1000
    '/api/vsl1-reminder': 0.356, // 356.00ms / 1000
    '/api/vsl2-last-call': 0.383, // 383.00ms / 1000
    '/api/promo-stock-monitor': 0.477 // 477.00ms / 1000
};

// メモリ使用量の推定（GB）
// Vercelのデフォルトは1024MB (1GB)だが、実際の使用量は少ない
// 平均的な使用量を推定: 128MB = 0.128GB
const avgMemoryGB = 0.128;

// Vercelの料金体系（2024年時点）
// 無料枠:
// - Function Invocations: 100万回/月
// - Serverless Execution: 1,000GB-時/月
// 有料プラン（Pro）:
// - Function Invocations: $0.0000002/回（100万回あたり$0.20）
// - Serverless Execution: $0.00000036/GB-秒（1GB-時あたり$1.296）

const pricing = {
    free: {
        invocations: 1000000, // 100万回/月
        execution: 1000 // 1,000GB-時/月
    },
    pro: {
        invocations: 0.0000002, // $0.0000002/回
        execution: 0.00000036 // $0.00000036/GB-秒 = $1.296/GB-時
    }
};

// コスト計算
function calculateCosts() {
    console.log('📊 CronJobs コスト計算');
    console.log('='.repeat(80));
    console.log('');
    
    let totalInvocationsPerDay = 0;
    let totalGBHoursPerDay = 0;
    
    const results = [];
    
    cronJobs.forEach(cronJob => {
        const executionsPerDay = parseCronSchedule(cronJob.schedule);
        const avgDuration = avgDurations[cronJob.path] || 1.0; // デフォルト1秒
        const gbHoursPerExecution = (avgDuration / 3600) * avgMemoryGB; // GB-時
        const gbHoursPerDay = gbHoursPerExecution * executionsPerDay;
        
        totalInvocationsPerDay += executionsPerDay;
        totalGBHoursPerDay += gbHoursPerDay;
        
        results.push({
            name: cronJob.name,
            path: cronJob.path,
            schedule: cronJob.schedule,
            executionsPerDay,
            avgDuration,
            gbHoursPerDay
        });
    });
    
    // 1ヶ月あたりの計算（30日）
    const invocationsPerMonth = totalInvocationsPerDay * 30;
    const gbHoursPerMonth = totalGBHoursPerDay * 30;
    
    // 無料枠内かどうか
    const invocationsWithinFree = invocationsPerMonth <= pricing.free.invocations;
    const executionWithinFree = gbHoursPerMonth <= pricing.free.execution;
    
    // 無料枠を超えた場合のコスト計算
    const invocationsOverFree = Math.max(0, invocationsPerMonth - pricing.free.invocations);
    const gbHoursOverFree = Math.max(0, gbHoursPerMonth - pricing.free.execution);
    
    const invocationsCost = invocationsOverFree * pricing.pro.invocations;
    const executionCost = gbHoursOverFree * pricing.pro.execution;
    const totalCost = invocationsCost + executionCost;
    
    // 結果表示
    console.log('📋 CronJob別の実行回数とコスト');
    console.log('-'.repeat(80));
    results.forEach(result => {
        const monthlyExecutions = result.executionsPerDay * 30;
        const monthlyGBHours = result.gbHoursPerDay * 30;
        console.log(`\n${result.name}`);
        console.log(`  エンドポイント: ${result.path}`);
        console.log(`  スケジュール: ${result.schedule}`);
        console.log(`  1日あたり: ${result.executionsPerDay}回`);
        console.log(`  1ヶ月あたり: ${monthlyExecutions}回`);
        console.log(`  平均実行時間: ${result.avgDuration.toFixed(3)}秒`);
        console.log(`  1ヶ月あたりのGB-時: ${monthlyGBHours.toFixed(6)}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 合計コスト計算');
    console.log('='.repeat(80));
    
    console.log(`\n📈 1日あたり:`);
    console.log(`  Function呼び出し: ${totalInvocationsPerDay.toLocaleString()}回`);
    console.log(`  Serverless実行: ${totalGBHoursPerDay.toFixed(6)}GB-時`);
    
    console.log(`\n📈 1ヶ月あたり（30日）:`);
    console.log(`  Function呼び出し: ${invocationsPerMonth.toLocaleString()}回`);
    console.log(`  Serverless実行: ${gbHoursPerMonth.toFixed(6)}GB-時`);
    
    console.log(`\n💰 無料枠:`);
    console.log(`  Function呼び出し: ${pricing.free.invocations.toLocaleString()}回/月`);
    console.log(`  Serverless実行: ${pricing.free.execution.toLocaleString()}GB-時/月`);
    
    console.log(`\n✅ 無料枠内かどうか:`);
    console.log(`  Function呼び出し: ${invocationsWithinFree ? '✅ 無料枠内' : '❌ 無料枠超過'} (${((invocationsPerMonth / pricing.free.invocations) * 100).toFixed(2)}%)`);
    console.log(`  Serverless実行: ${executionWithinFree ? '✅ 無料枠内' : '❌ 無料枠超過'} (${((gbHoursPerMonth / pricing.free.execution) * 100).toFixed(2)}%)`);
    
    if (invocationsOverFree > 0 || gbHoursOverFree > 0) {
        console.log(`\n💵 無料枠超過分のコスト:`);
        if (invocationsOverFree > 0) {
            console.log(`  Function呼び出し: ${invocationsOverFree.toLocaleString()}回 × $${pricing.pro.invocations.toFixed(7)}/回 = $${invocationsCost.toFixed(2)}`);
        }
        if (gbHoursOverFree > 0) {
            console.log(`  Serverless実行: ${gbHoursOverFree.toFixed(6)}GB-時 × $${pricing.pro.execution.toFixed(6)}/GB-秒 = $${executionCost.toFixed(2)}`);
        }
        console.log(`  合計: $${totalCost.toFixed(2)}/月`);
    } else {
        console.log(`\n🎉 すべて無料枠内です！追加コスト: $0.00/月`);
    }
    
    // X投稿関連のコストを別途計算
    const xPostingJobs = results.filter(r => 
        r.path.includes('x-post') || r.path.includes('x-quote-repost') || r.path.includes('vsl1-post')
    );
    
    const xPostingInvocationsPerMonth = xPostingJobs.reduce((sum, job) => sum + (job.executionsPerDay * 30), 0);
    const xPostingGBHoursPerMonth = xPostingJobs.reduce((sum, job) => sum + (job.gbHoursPerDay * 30), 0);
    
    console.log('\n' + '='.repeat(80));
    console.log('📱 X投稿関連のコスト（参考）');
    console.log('='.repeat(80));
    console.log(`  1ヶ月あたりのFunction呼び出し: ${xPostingInvocationsPerMonth.toLocaleString()}回`);
    console.log(`  1ヶ月あたりのServerless実行: ${xPostingGBHoursPerMonth.toFixed(6)}GB-時`);
    console.log(`  無料枠内: ${xPostingInvocationsPerMonth <= pricing.free.invocations && xPostingGBHoursPerMonth <= pricing.free.execution ? '✅' : '❌'}`);
    
    // 予想投稿数の計算（X投稿関連のみ）
    // 1回の実行で複数の投稿が行われる可能性があるが、ここでは1回の実行=1投稿と仮定
    const estimatedPostsPerMonth = xPostingInvocationsPerMonth;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 予想投稿数');
    console.log('='.repeat(80));
    console.log(`  1日あたり: ${Math.floor(xPostingInvocationsPerMonth / 30)}回`);
    console.log(`  1週間あたり: ${Math.floor(xPostingInvocationsPerMonth / 4.3)}回`);
    console.log(`  1ヶ月あたり: ${estimatedPostsPerMonth.toLocaleString()}回`);
    console.log(`  1年あたり: ${(estimatedPostsPerMonth * 12).toLocaleString()}回`);
    
    console.log('\n💡 注意事項:');
    console.log('  - 実際の投稿数は、時間帯チェックやスキップにより変動する可能性があります');
    console.log('  - メモリ使用量は推定値（128MB）です。実際の使用量は異なる場合があります');
    console.log('  - Vercelの料金体系は変更される可能性があります');
    console.log('  - 無料枠を超えた場合の料金は、Vercelの最新の料金表を確認してください');
}

calculateCosts();
