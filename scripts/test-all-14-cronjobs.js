// test-all-14-cronjobs.js
// 14個すべてのCronJobsをドライランで一括テスト実行

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// 環境変数の読み込み
const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    'C:/Users/chiba/Downloads/.env',
    'C:/Users/chiba/hadayalab-automation-platform/.env',
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        try {
            require('dotenv').config({ path: envPath });
            console.log(`✅ Loaded .env from: ${envPath}`);
            envLoaded = true;
            break;
        } catch (error) {
            console.warn(`⚠️ Failed to load .env from ${envPath}:`, error.message);
        }
    }
}

if (!envLoaded) {
    console.warn('⚠️ .env file not found, using environment variables');
}

const VERCEL_URL = process.env.VERCEL_URL || 'https://cryptotradeacademy.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || '9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359';

// vercel.jsonから14個すべてのCronJobsを定義
const endpoints = [
    // Phase 1: Trap Defence BTC配信
    { path: '/api/cron?force=true', name: 'Trap Defence BTC配信', phase: 'Phase 1' },
    
    // Phase 2: X投稿関連（9件）
    { path: '/api/vsl1-post', name: 'VSL1自動投稿', phase: 'Phase 2' },
    { path: '/api/x-post-minimal-version-cron', name: '無料版X投稿', phase: 'Phase 2' },
    { path: '/api/x-post-free-report', name: '無料版レポートX投稿', phase: 'Phase 2' },
    { path: '/api/x-quote-repost-en?force=true', name: '引用リポスト EN', phase: 'Phase 2' },
    { path: '/api/x-quote-repost-es?force=true', name: '引用リポスト ES', phase: 'Phase 2' },
    { path: '/api/x-quote-repost-pt-br?force=true', name: '引用リポスト PT-BR', phase: 'Phase 2' },
    { path: '/api/x-quote-repost-ar?force=true', name: '引用リポスト AR', phase: 'Phase 2' },
    { path: '/api/x-quote-repost-ja?force=true', name: '引用リポスト JA', phase: 'Phase 2' },
    { path: '/api/x-quote-repost-ko?force=true', name: '引用リポスト KO', phase: 'Phase 2' },
    
    // Phase 3: TG DM関連（3件）
    { path: '/api/vsl2-free-users', name: 'VSL2自動配信', phase: 'Phase 3' },
    { path: '/api/vsl1-reminder', name: 'VSL1リマインド', phase: 'Phase 3' },
    { path: '/api/vsl2-last-call', name: 'VSL2終了直前リマインド', phase: 'Phase 3' },
    
    // Phase 4: その他（1件）
    { path: '/api/promo-stock-monitor', name: 'プロモコード在庫監視', phase: 'Phase 4' }
];

function makeRequest(url, options) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = client.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.end();
    });
}

async function testEndpoint(endpoint) {
    const url = `${VERCEL_URL}${endpoint.path}`;
    const startTime = Date.now();
    
    try {
        console.log(`\n🔍 テスト実行: ${endpoint.name}`);
        console.log(`   URL: ${url}`);
        
        const response = await makeRequest(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CRON_SECRET}`,
                'Content-Type': 'application/json'
            }
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (response.statusCode === 200) {
            console.log(`   ✅ 成功 (HTTP ${response.statusCode}, ${duration}秒)`);
            
            // レスポンスにdryRunが含まれているか確認
            const bodyStr = response.body.toString();
            const hasDryRun = bodyStr.includes('"dryRun":true') || bodyStr.includes('"dryRun": true');
            const hasSkipped = bodyStr.includes('"skipped":true') || bodyStr.includes('"skipped": true');
            
            if (hasDryRun) {
                console.log(`   🧪 ドライランモード: 有効`);
                return { success: true, dryRun: true, skipped: false, statusCode: response.statusCode, duration };
            } else if (hasSkipped) {
                console.log(`   ⏰ スキップ: 時間帯チェックにより実行されませんでした（正常）`);
                return { success: true, dryRun: false, skipped: true, statusCode: response.statusCode, duration };
            } else {
                console.log(`   ⚠️  ドライランモードの確認ができませんでした`);
                return { success: true, dryRun: null, skipped: false, statusCode: response.statusCode, duration };
            }
        } else if (response.statusCode === 401) {
            console.log(`   ❌ 認証エラー (HTTP ${response.statusCode})`);
            console.log(`      CRON_SECRETが正しく設定されていない可能性があります`);
            return { success: false, error: '認証エラー', statusCode: response.statusCode };
        } else {
            console.log(`   ⚠️  警告 (HTTP ${response.statusCode})`);
            const preview = response.body.toString().substring(0, 200);
            console.log(`      レスポンス: ${preview}`);
            return { success: false, error: 'HTTPエラー', statusCode: response.statusCode };
        }
    } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 14個すべてのCronJobs ドライランテスト開始');
    console.log('='.repeat(80));
    console.log(`📍 Vercel URL: ${VERCEL_URL}`);
    console.log(`🔑 CRON_SECRET: ${CRON_SECRET.substring(0, 20)}...`);
    console.log('='.repeat(80));
    
    const results = [];
    let currentPhase = '';
    
    for (const endpoint of endpoints) {
        // Phaseが変わったら区切りを表示
        if (currentPhase !== endpoint.phase) {
            if (currentPhase !== '') {
                console.log('');
            }
            console.log(`\n📋 ${endpoint.phase}`);
            console.log('-'.repeat(80));
            currentPhase = endpoint.phase;
        }
        
        const result = await testEndpoint(endpoint);
        results.push({ ...endpoint, ...result });
        
        // レート制限対策（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 結果サマリー
    console.log('\n' + '='.repeat(80));
    console.log('📊 テスト結果サマリー（14個すべて）');
    console.log('='.repeat(80));
    
    // Phase別にグループ化
    const phaseResults = {};
    results.forEach(result => {
        if (!phaseResults[result.phase]) {
            phaseResults[result.phase] = [];
        }
        phaseResults[result.phase].push(result);
    });
    
    Object.keys(phaseResults).sort().forEach(phase => {
        console.log(`\n${phase}`);
        phaseResults[phase].forEach(result => {
            const durationStr = result.duration ? ` (${result.duration}秒)` : '';
            const dryRunStr = result.dryRun === true ? ' [🧪 ドライラン有効]' : result.skipped === true ? ' [⏰ スキップ（正常）]' : '';
            const statusStr = result.success ? '✅ 成功' : '❌ 失敗';
            console.log(`  ${statusStr} ${result.name} - HTTP ${result.statusCode || 'N/A'}${durationStr}${dryRunStr}`);
        });
    });
    
    console.log('\n' + '='.repeat(80));
    const successCount = results.filter(r => r.success).length;
    const dryRunCount = results.filter(r => r.dryRun === true).length;
    const skippedCount = results.filter(r => r.skipped === true).length;
    const totalCount = results.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);
    
    console.log(`合計: ${successCount}/${totalCount} 成功 (${successRate}%)`);
    console.log(`ドライランモード: ${dryRunCount}/${totalCount} 有効`);
    console.log(`スキップ: ${skippedCount}/${totalCount}（時間帯チェックにより正常）`);
    
    if (successCount === totalCount) {
        console.log('\n🎉 すべてのCronJobs（14個）が正常に動作しています！');
        console.log('   次のステップ: X_POSTING_DRY_RUN=false に変更して本番環境で実行開始');
    } else {
        console.log('\n⚠️  一部のCronJobsが失敗しました');
        console.log('   ログを確認してバグを修正してください');
    }
    
    console.log('\n💡 ヒント:');
    console.log('   - Vercel Dashboardでログを確認: https://vercel.com/dashboard');
    console.log('   - ドライランモード確認: X_POSTING_DRY_RUN=true が設定されているか確認');
    console.log('   - スキップされたエンドポイントは時間帯チェックにより正常にスキップされています');
    console.log('   - 詳細なログは各エンドポイントの Functions タブで確認できます');
    
    // 終了コードを設定
    process.exit(successCount === totalCount ? 0 : 1);
}

main().catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
});
