// scripts/analyze-logs-result-5.js
// logs_result (5).json を解析し、X投稿が実行されない原因を特定する

const fs = require('fs');
const path = require('path');

// 引数でパス指定、またはプロジェクト内 data/vercel-logs/logs_result_5.json を参照
const LOG_FILE =
  process.argv[2] ||
  path.join(__dirname, '..', 'data', 'vercel-logs', 'logs_result_5.json');

if (!fs.existsSync(LOG_FILE)) {
  console.error('File not found:', LOG_FILE);
  console.error('Usage: node analyze-logs-result-5.js [path-to-logs_result_(5).json]');
  process.exit(1);
}

const raw = fs.readFileSync(LOG_FILE, 'utf8');
let logs = [];
try {
  logs = JSON.parse(raw);
} catch (e) {
  console.error('JSON parse error:', e.message);
  process.exit(1);
}

if (!Array.isArray(logs)) logs = [logs];

console.log('=== Vercel ログ分析 (logs_result 5) ===\n');
console.log('総ログ件数:', logs.length);
console.log('');

// エンドポイント別呼び出し回数（requestPath または function から /api/xxx を抽出）
const endpointCount = {};
const endpointFirstLast = {};
const messagesByEndpoint = {};

logs.forEach((log) => {
  const pathRaw = log.requestPath || log.function || '';
  const match = pathRaw.match(/\/api\/([^/?]+)/);
  const endpoint = match ? `/api/${match[1]}` : (pathRaw || 'unknown');
  endpointCount[endpoint] = (endpointCount[endpoint] || 0) + 1;
  if (!endpointFirstLast[endpoint]) {
    endpointFirstLast[endpoint] = { first: log.TimeUTC, last: log.TimeUTC };
  } else {
    if (log.TimeUTC < endpointFirstLast[endpoint].first) endpointFirstLast[endpoint].first = log.TimeUTC;
    if (log.TimeUTC > endpointFirstLast[endpoint].last) endpointFirstLast[endpoint].last = log.TimeUTC;
  }
  const msg = (log.message || '').toString();
  if (msg && (log.function || log.requestPath)) {
    const key = log.function || log.requestPath?.match(/\/api\/[^/?]+/)?.[0] || endpoint;
    if (!messagesByEndpoint[key]) messagesByEndpoint[key] = [];
    if (messagesByEndpoint[key].length < 50) messagesByEndpoint[key].push({ t: log.TimeUTC, m: msg.substring(0, 200) });
  }
});

console.log('--- エンドポイント別 呼び出し回数 ---');
Object.entries(endpointCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([ep, count]) => {
    const fl = endpointFirstLast[ep];
    console.log(`${count.toString().padStart(5)} 回  ${ep}  (${fl?.first || ''} ～ ${fl?.last || ''})`);
  });

// X投稿関連のメッセージを抽出
const xRelated = logs.filter((l) => {
  const m = (l.message || '').toString();
  const p = (l.requestPath || l.function || '').toString();
  return (
    /x-post|x-quote-repost|X Post|Quote Repost|DRY RUN|dry run|skipped|Skipping|free.report|minimal.version|X posting|peak|getLanguagesForCurrentHour/i.test(m) ||
    /x-quote-repost|x-post-free-report|x-post-minimal/i.test(p)
  );
});

console.log('\n--- X投稿関連ログ件数 ---');
console.log(xRelated.length);

// スキップ・DRY RUN・無効化のメッセージ
const skipMessages = logs.filter((l) => {
  const m = (l.message || '').toString();
  return /skipped|Skipping|DRY RUN|dry run|disabled|not.*peak|will be handled by independent|X posting disabled/i.test(m);
});

console.log('\n--- スキップ/DRY RUN/無効 メッセージ (最大30件) ---');
skipMessages.slice(0, 30).forEach((l) => {
  console.log(`[${l.TimeUTC}] ${(l.message || '').toString().substring(0, 180)}`);
});

// 時刻範囲
const times = logs.map((l) => l.TimeUTC).filter(Boolean);
if (times.length) {
  times.sort();
  console.log('\n--- ログの時刻範囲 ---');
  console.log('先頭:', times[0]);
  console.log('末尾:', times[times.length - 1]);
}

// vercel.json の crons と照合
console.log('\n--- 結論: vercel.json の crons に登録されているか ---');
const expectedXEndpoints = [
  '/api/x-quote-repost-en',
  '/api/x-quote-repost-es',
  '/api/x-quote-repost-ja',
  '/api/x-quote-repost-ko',
  '/api/x-quote-repost-pt-br',
  '/api/x-quote-repost-ar',
  '/api/x-quote-repost-en-30',
  '/api/x-quote-repost-es-30',
  '/api/x-quote-repost-ja-30',
  '/api/x-quote-repost-ko-30',
  '/api/x-quote-repost-pt-br-30',
  '/api/x-quote-repost-ar-30',
  '/api/x-post-free-report',
  '/api/x-post-minimal-version',
];
expectedXEndpoints.forEach((ep) => {
  const count = endpointCount[ep] || 0;
  const status = count > 0 ? '✅ 呼ばれた' : '❌ 呼ばれていない';
  console.log(`${ep}: ${count} 回 ${status}`);
});

console.log('\n--- 分析完了 ---');
