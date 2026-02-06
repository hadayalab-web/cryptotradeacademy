// 簡易版ログ分析スクリプト
// 使用方法: node scripts/analyze_logs_simple.js

const fs = require('fs');
const path = require('path');

const logFile = path.join(require('os').homedir(), 'Downloads', 'logs_result (12).json');
const outputFile = path.join(__dirname, '..', 'data', 'vercel-logs', 'logs_result_12_analysis.md');

console.log('読み込み中...');
const data = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
console.log(`総ログ数: ${data.length}`);

// 運用で管理する配信2系統のみ（docs/MANAGED_DELIVERIES.md）。Minimal と Regular は別時刻。
const cronPaths = [
    '/api/cron',
    '/api/minimal-tg-delivery',
    '/api/x-quote-repost-en', '/api/x-quote-repost-es', '/api/x-quote-repost-pt-br',
    '/api/x-quote-repost-ar', '/api/x-quote-repost-ja', '/api/x-quote-repost-ko'
];

const cronJobs = {};
const webhook = [];
const errors = [];
const stats = { byFunction: {}, byStatus: {} };

data.forEach(log => {
    const p = log.requestPath || '';
    const f = log.function || '';
    const s = log.responseStatusCode || 0;
    
    stats.byFunction[f] = (stats.byFunction[f] || 0) + 1;
    stats.byStatus[s] = (stats.byStatus[s] || 0) + 1;
    
    cronPaths.forEach(cp => {
        if (p.includes(cp) || f.includes(cp)) {
            if (!cronJobs[cp]) cronJobs[cp] = [];
            cronJobs[cp].push(log);
        }
    });
    
    if (p.includes('/api/x-webhook') || f.includes('/api/x-webhook')) {
        webhook.push(log);
    }
    
    if (log.level === 'error' || s >= 400 || 
        (log.message || '').toLowerCase().includes('error') ||
        (log.message || '').includes('Failed')) {
        errors.push({ path: p, function: f, status: s, message: log.message, time: log.TimeUTC });
    }
});

let out = ['# Vercel Logs分析結果\n', `総リクエスト数: ${data.length}\n`];

out.push('## Cron Jobs分析\n');
Object.keys(cronJobs).sort().forEach(cp => {
    const logs = cronJobs[cp];
    const statuses = {};
    const errs = logs.filter(l => l.level === 'error' || (l.responseStatusCode || 0) >= 400);
    logs.forEach(l => {
        const s = l.responseStatusCode || 0;
        statuses[s] = (statuses[s] || 0) + 1;
    });
    out.push(`### ${cp}`);
    out.push(`- 実行回数: ${logs.length}`);
    out.push(`- ステータス: ${JSON.stringify(statuses)}`);
    if (errs.length > 0) {
        out.push(`- エラー数: ${errs.length}`);
        errs.slice(0, 3).forEach(e => {
            out.push(`  - [${e.TimeUTC}] ${(e.message || '').substring(0, 80)}`);
        });
    }
    out.push('');
});

out.push('## X Webhook分析\n');
out.push(`総リクエスト数: ${webhook.length}\n`);
if (webhook.length > 0) {
    const ws = {};
    const wm = {};
    webhook.forEach(w => {
        ws[w.responseStatusCode || 0] = (ws[w.responseStatusCode || 0] || 0) + 1;
        wm[w.requestMethod || ''] = (wm[w.requestMethod || ''] || 0) + 1;
    });
    out.push(`- ステータス: ${JSON.stringify(ws)}`);
    out.push(`- メソッド: ${JSON.stringify(wm)}`);
    out.push(`\n### 詳細（最初の10件）\n`);
    webhook.slice(0, 10).forEach((w, i) => {
        out.push(`${i + 1}. [${w.TimeUTC}] ${w.requestMethod} ${w.requestPath}`);
        out.push(`   ステータス: ${w.responseStatusCode}`);
        if (w.message) out.push(`   メッセージ: ${w.message.substring(0, 100)}`);
        out.push('');
    });
}

out.push('## エラー分析\n');
out.push(`総エラー数: ${errors.length}\n`);
if (errors.length > 0) {
    const ep = {};
    errors.forEach(e => ep[e.path] = (ep[e.path] || 0) + 1);
    out.push('### パス別エラー（上位10件）\n');
    Object.entries(ep).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([p, c]) => {
        out.push(`- ${p}: ${c}`);
    });
    out.push('\n### 主要エラー（最初の20件）\n');
    errors.slice(0, 20).forEach((e, i) => {
        out.push(`${i + 1}. [${e.time}] ${e.path}`);
        out.push(`   ステータス: ${e.status}`);
        out.push(`   メッセージ: ${e.message || 'N/A'}`);
        out.push('');
    });
}

const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, out.join('\n'), 'utf-8');
console.log(`\n完了！結果を ${outputFile} に保存しました。`);
