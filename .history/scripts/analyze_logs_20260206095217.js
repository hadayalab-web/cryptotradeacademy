const fs = require('fs');
const path = require('path');

// ログファイルのパス
const logFilePath = path.join(process.env.USERPROFILE || '', 'Downloads', 'logs_result (12).json');

console.log('ログファイルを読み込んでいます...');
console.log(`ファイルパス: ${logFilePath}`);

let logs;
try {
    if (!fs.existsSync(logFilePath)) {
        console.error(`エラー: ファイルが見つかりません: ${logFilePath}`);
        process.exit(1);
    }
    
    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    logs = JSON.parse(fileContent);
    console.log(`読み込み完了: ${logs.length}件のログ\n`);
    
    if (!Array.isArray(logs)) {
        console.error('エラー: ログデータが配列形式ではありません');
        process.exit(1);
    }
} catch (error) {
    console.error('エラー: ファイルの読み込みに失敗しました');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}

// 運用で管理する配信2系統のみ（docs/MANAGED_DELIVERIES.md）。Minimal と Regular は別時刻。
const cronPaths = [
    '/api/cron',
    '/api/minimal-tg-delivery',
    '/api/x-quote-repost-en', '/api/x-quote-repost-es', '/api/x-quote-repost-pt-br',
    '/api/x-quote-repost-ar', '/api/x-quote-repost-ja', '/api/x-quote-repost-ko'
];

// 分析結果
const results = {
    cronJobs: {},
    webhook: [],
    errors: [],
    stats: {
        total: logs.length,
        byFunction: {},
        byStatus: {},
        byPath: {},
        byRegion: {},
        byHour: {},
        durationStats: { min: Infinity, max: 0, total: 0, count: 0 },
        memoryStats: { min: Infinity, max: 0, total: 0, count: 0 }
    }
};

// 各ログを分析
logs.forEach(log => {
    const path = log.requestPath || '';
    const functionName = log.function || '';
    const status = log.responseStatusCode || 0;
    const method = log.requestMethod || '';
    const message = log.message || '';
    const level = log.level || '';
    const timeUTC = log.TimeUTC || '';

    // 統計情報
    if (functionName) {
        results.stats.byFunction[functionName] = (results.stats.byFunction[functionName] || 0) + 1;
    }
    if (status) {
        results.stats.byStatus[status] = (results.stats.byStatus[status] || 0) + 1;
    }
    if (path) {
        results.stats.byPath[path] = (results.stats.byPath[path] || 0) + 1;
    }
    
    // リージョン別統計
    const region = log.region || 'unknown';
    results.stats.byRegion[region] = (results.stats.byRegion[region] || 0) + 1;
    
    // 時間帯別統計（UTC時間の時間のみ）
    if (timeUTC) {
        const hour = timeUTC.split(' ')[1] ? timeUTC.split(' ')[1].split(':')[0] : 'unknown';
        results.stats.byHour[hour] = (results.stats.byHour[hour] || 0) + 1;
    }
    
    // 実行時間統計
    const duration = parseInt(log.durationMs) || 0;
    if (duration > 0) {
        results.stats.durationStats.min = Math.min(results.stats.durationStats.min, duration);
        results.stats.durationStats.max = Math.max(results.stats.durationStats.max, duration);
        results.stats.durationStats.total += duration;
        results.stats.durationStats.count++;
    }
    
    // メモリ使用量統計
    const memoryUsed = parseInt(log.maxMemoryUsed) || 0;
    if (memoryUsed > 0) {
        results.stats.memoryStats.min = Math.min(results.stats.memoryStats.min, memoryUsed);
        results.stats.memoryStats.max = Math.max(results.stats.memoryStats.max, memoryUsed);
        results.stats.memoryStats.total += memoryUsed;
        results.stats.memoryStats.count++;
    }

    // Cron Jobsの分類
    let isCron = false;
    for (const cronPath of cronPaths) {
        if (path.includes(cronPath) || functionName.includes(cronPath)) {
            if (!results.cronJobs[cronPath]) {
                results.cronJobs[cronPath] = [];
            }
            results.cronJobs[cronPath].push(log);
            isCron = true;
            break;
        }
    }

    // X Webhookの分類
    if (path.includes('/api/x-webhook') || functionName.includes('/api/x-webhook')) {
        results.webhook.push(log);
    }

    // エラーの検出
    if (level === 'error' || status >= 400 || 
        message.toLowerCase().includes('error') || 
        message.includes('Failed') || 
        message.toLowerCase().includes('failed')) {
        results.errors.push({
            path,
            function: functionName,
            status,
            message: message.substring(0, 200),
            timestamp: timeUTC,
            requestId: log.requestId || ''
        });
    }
});

// 分析結果をフォーマット
let output = [];
output.push('='.repeat(80));
output.push('Vercel Logs分析結果');
output.push('='.repeat(80));
output.push('');

// 基本統計
output.push('## 基本統計');
output.push(`総リクエスト数: ${results.stats.total}`);
output.push('');

// リージョン別統計
output.push('### リージョン別リクエスト数');
const sortedRegions = Object.entries(results.stats.byRegion)
    .sort((a, b) => b[1] - a[1]);
sortedRegions.forEach(([region, count]) => {
    output.push(`  - ${region || 'unknown'}: ${count}`);
});
output.push('');

// 時間帯別統計
output.push('### 時間帯別リクエスト数（UTC）');
const sortedHours = Object.entries(results.stats.byHour)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
sortedHours.forEach(([hour, count]) => {
    output.push(`  - ${hour}:00 UTC: ${count}`);
});
output.push('');

// 実行時間統計
if (results.stats.durationStats.count > 0) {
    const avgDuration = results.stats.durationStats.total / results.stats.durationStats.count;
    output.push('### 実行時間統計（ms）');
    output.push(`  - 最小: ${results.stats.durationStats.min}`);
    output.push(`  - 最大: ${results.stats.durationStats.max}`);
    output.push(`  - 平均: ${avgDuration.toFixed(2)}`);
    output.push(`  - サンプル数: ${results.stats.durationStats.count}`);
    output.push('');
}

// メモリ使用量統計
if (results.stats.memoryStats.count > 0) {
    const avgMemory = results.stats.memoryStats.total / results.stats.memoryStats.count;
    output.push('### メモリ使用量統計（MB）');
    output.push(`  - 最小: ${(results.stats.memoryStats.min / 1024 / 1024).toFixed(2)}`);
    output.push(`  - 最大: ${(results.stats.memoryStats.max / 1024 / 1024).toFixed(2)}`);
    output.push(`  - 平均: ${(avgMemory / 1024 / 1024).toFixed(2)}`);
    output.push(`  - サンプル数: ${results.stats.memoryStats.count}`);
    output.push('');
}

// 関数別統計
output.push('### 関数別リクエスト数（上位20件）');
const sortedFunctions = Object.entries(results.stats.byFunction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
sortedFunctions.forEach(([func, count]) => {
    output.push(`  - ${func}: ${count}`);
});
output.push('');

// ステータス別統計
output.push('### ステータスコード別');
const sortedStatuses = Object.entries(results.stats.byStatus)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
sortedStatuses.forEach(([status, count]) => {
    output.push(`  - ${status}: ${count}`);
});
output.push('');

// Cron Jobs分析
output.push('## Cron Jobs分析');
output.push(`検出されたCron Jobs数: ${Object.keys(results.cronJobs).length}`);
output.push('');

Object.keys(results.cronJobs).sort().forEach(cronPath => {
    const cronLogs = results.cronJobs[cronPath];
    const statuses = {};
    const errors = [];
    const durations = [];
    const memoryUsages = [];
    
    cronLogs.forEach(log => {
        const status = log.responseStatusCode || 0;
        statuses[status] = (statuses[status] || 0) + 1;
        
        const duration = parseInt(log.durationMs) || 0;
        if (duration > 0) durations.push(duration);
        
        const memory = parseInt(log.maxMemoryUsed) || 0;
        if (memory > 0) memoryUsages.push(memory);
        
        if (log.level === 'error' || status >= 400) {
            errors.push(log);
        }
    });
    
    output.push(`### ${cronPath}`);
    output.push(`  実行回数: ${cronLogs.length}`);
    output.push(`  ステータスコード: ${JSON.stringify(statuses)}`);
    
    if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        output.push(`  実行時間: 平均 ${avgDuration.toFixed(2)}ms (最小: ${Math.min(...durations)}, 最大: ${Math.max(...durations)})`);
    }
    
    if (memoryUsages.length > 0) {
        const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
        output.push(`  メモリ使用量: 平均 ${(avgMemory / 1024 / 1024).toFixed(2)}MB (最小: ${(Math.min(...memoryUsages) / 1024 / 1024).toFixed(2)}MB, 最大: ${(Math.max(...memoryUsages) / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    if (errors.length > 0) {
        output.push(`  エラー数: ${errors.length}`);
        errors.slice(0, 5).forEach(err => {
            const msg = (err.message || '').substring(0, 150);
            output.push(`    - [${err.TimeUTC || ''}] ステータス: ${err.responseStatusCode || 'N/A'}`);
            output.push(`      ${msg}`);
        });
    }
    output.push('');
});

// X Webhook分析
output.push('## X Webhook分析');
output.push(`総リクエスト数: ${results.webhook.length}`);
if (results.webhook.length > 0) {
    const webhookStatuses = {};
    const webhookMethods = {};
    const webhookErrors = [];
    
    results.webhook.forEach(log => {
        const status = log.responseStatusCode || 0;
        const method = log.requestMethod || '';
        webhookStatuses[status] = (webhookStatuses[status] || 0) + 1;
        webhookMethods[method] = (webhookMethods[method] || 0) + 1;
        
        if (log.level === 'error' || status >= 400) {
            webhookErrors.push(log);
        }
    });
    
    output.push(`  ステータスコード: ${JSON.stringify(webhookStatuses)}`);
    output.push(`  メソッド: ${JSON.stringify(webhookMethods)}`);
    
    if (webhookErrors.length > 0) {
        output.push(`  エラー数: ${webhookErrors.length}`);
        webhookErrors.slice(0, 5).forEach(err => {
            const msg = (err.message || '').substring(0, 100);
            output.push(`    - [${err.TimeUTC || ''}] ${msg}`);
        });
    }
    
    // Webhookの詳細情報（最初の20件）
    output.push(`\n  ### Webhook詳細（最初の20件）`);
    results.webhook.slice(0, 20).forEach((log, idx) => {
        output.push(`  ${idx + 1}. [${log.TimeUTC || ''}] ${log.requestMethod || 'N/A'} ${log.requestPath || 'N/A'}`);
        output.push(`     ステータス: ${log.responseStatusCode || 'N/A'}`);
        if (log.durationMs) {
            output.push(`     実行時間: ${log.durationMs}ms`);
        }
        if (log.maxMemoryUsed) {
            output.push(`     メモリ使用量: ${(parseInt(log.maxMemoryUsed) / 1024 / 1024).toFixed(2)}MB`);
        }
        if (log.requestQueryString) {
            output.push(`     クエリ: ${log.requestQueryString.substring(0, 100)}`);
        }
        if (log.message) {
            output.push(`     メッセージ: ${log.message.substring(0, 200)}`);
        }
        output.push('');
    });
    
    // Webhookの時間帯別分析
    const webhookByHour = {};
    results.webhook.forEach(log => {
        if (log.TimeUTC) {
            const hour = log.TimeUTC.split(' ')[1] ? log.TimeUTC.split(' ')[1].split(':')[0] : 'unknown';
            webhookByHour[hour] = (webhookByHour[hour] || 0) + 1;
        }
    });
    if (Object.keys(webhookByHour).length > 0) {
        output.push(`  ### Webhook時間帯別分布（UTC）`);
        Object.entries(webhookByHour)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([hour, count]) => {
                output.push(`    - ${hour}:00 UTC: ${count}件`);
            });
        output.push('');
    }
}
output.push('');

// エラー分析
output.push('## エラー分析');
output.push(`総エラー数: ${results.errors.length}`);
if (results.errors.length > 0) {
    const errorByPath = {};
    const errorByStatus = {};
    
    results.errors.forEach(err => {
        errorByPath[err.path] = (errorByPath[err.path] || 0) + 1;
        errorByStatus[err.status] = (errorByStatus[err.status] || 0) + 1;
    });
    
    output.push('### パス別エラー（上位10件）');
    Object.entries(errorByPath)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([path, count]) => {
            output.push(`  - ${path}: ${count}`);
        });
    output.push('');
    
    output.push('### ステータスコード別エラー');
    Object.entries(errorByStatus)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([status, count]) => {
            output.push(`  - ${status}: ${count}`);
        });
    output.push('');
    
    output.push('### 主要エラーメッセージ（最初の30件）');
    results.errors.slice(0, 30).forEach((err, idx) => {
        output.push(`${idx + 1}. [${err.timestamp}] ${err.path}`);
        output.push(`   関数: ${err.function || 'N/A'}`);
        output.push(`   ステータス: ${err.status}`);
        output.push(`   リクエストID: ${err.requestId || 'N/A'}`);
        output.push(`   メッセージ: ${err.message}`);
        output.push('');
    });
    
    // エラーの時間帯別分析
    const errorByHour = {};
    results.errors.forEach(err => {
        if (err.timestamp) {
            const hour = err.timestamp.split(' ')[1] ? err.timestamp.split(' ')[1].split(':')[0] : 'unknown';
            errorByHour[hour] = (errorByHour[hour] || 0) + 1;
        }
    });
    if (Object.keys(errorByHour).length > 0) {
        output.push('### エラー時間帯別分布（UTC）');
        Object.entries(errorByHour)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([hour, count]) => {
                output.push(`  - ${hour}:00 UTC: ${count}件`);
            });
        output.push('');
    }
}

// 結果をファイルに保存
const outputPath = path.join(__dirname, '..', 'data', 'vercel-logs', 'logs_result_12_analysis.md');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, output.join('\n'), 'utf-8');
console.log(`\n分析完了！結果を ${outputPath} に保存しました。\n`);
console.log(output.join('\n'));
