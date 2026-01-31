// test-x-posting-cronjobs.js
// X投稿関連のCronJobsをドライランで一括テスト実行

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// 環境変数の読み込み（複数のパスを試行）
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

// X投稿関連のエンドポイントのみ
// 🚀 ゴール逆算最適化: force=trueパラメータを追加して時間帯チェックをスキップ（テスト用）
const endpoints = [
    { path: '/api/vsl1-post', name: 'VSL1自動投稿' },
    { path: '/api/x-post-minimal-version-cron', name: '無料版X投稿' },
    { path: '/api/x-post-free-report', name: '無料版レポートX投稿' },
    { path: '/api/x-quote-repost-en?force=true', name: '引用リポスト EN' },
    { path: '/api/x-quote-repost-es?force=true', name: '引用リポスト ES' },
    { path: '/api/x-quote-repost-pt-br?force=true', name: '引用リポスト PT-BR' },
    { path: '/api/x-quote-repost-ar?force=true', name: '引用リポスト AR' },
    { path: '/api/x-quote-repost-ja?force=true', name: '引用リポスト JA' },
    { path: '/api/x-quote-repost-ko?force=true', name: '引用リポスト KO' }
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
            const hasDryRunFalse = bodyStr.includes('"dryRun":false') || bodyStr.includes('"dryRun": false');
            
            if (hasDryRun) {
                console.log(`   🧪 ドライランモード: 有効`);
                return { success: true, dryRun: true, statusCode: response.statusCode, duration };
            } else if (hasDryRunFalse) {
                console.log(`   ⚠️  警告: ドライランモードが無効です！`);
                return { success: true, dryRun: false, statusCode: response.statusCode, duration };
            } else {
                console.log(`   ⚠️  ドライランモードの確認ができませんでした`);
                return { success: true, dryRun: null, statusCode: response.statusCode, duration };
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
    console.log('🚀 X投稿関連CronJobs ドライランテスト開始');
    console.log('='.repeat(80));
    console.log(`📍 Vercel URL: ${VERCEL_URL}`);
    console.log(`🔑 CRON_SECRET: ${CRON_SECRET.substring(0, 20)}...`);
    console.log('='.repeat(80));
    
    const results = [];
    
    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);
        results.push({ ...endpoint, ...result });
        
        // レート制限対策（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 結果サマリー
    console.log('\n' + '='.repeat(80));
    console.log('📊 テスト結果サマリー');
    console.log('='.repeat(80));
    
    results.forEach(result => {
        const durationStr = result.duration ? ` (${result.duration}秒)` : '';
        const dryRunStr = result.dryRun === true ? ' [🧪 ドライラン有効]' : result.dryRun === false ? ' [⚠️ ドライラン無効]' : '';
        const statusStr = result.success ? '✅ 成功' : '❌ 失敗';
        console.log(`  ${statusStr} ${result.name} - HTTP ${result.statusCode || 'N/A'}${durationStr}${dryRunStr}`);
    });
    
    console.log('\n' + '='.repeat(80));
    const successCount = results.filter(r => r.success).length;
    const dryRunCount = results.filter(r => r.dryRun === true).length;
    const totalCount = results.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);
    
    console.log(`合計: ${successCount}/${totalCount} 成功 (${successRate}%)`);
    console.log(`ドライランモード: ${dryRunCount}/${totalCount} 有効`);
    
    if (successCount === totalCount && dryRunCount === totalCount) {
        console.log('\n🎉 すべてのX投稿CronJobsが正常に動作し、ドライランモードが有効です！');
    } else if (successCount === totalCount) {
        console.log('\n⚠️  すべてのテストは成功しましたが、一部でドライランモードが無効です');
        console.log('   Vercel Dashboardで X_POSTING_DRY_RUN=true が設定されているか確認してください');
    } else {
        console.log('\n⚠️  一部のテストが失敗しました');
        console.log('   ログを確認してバグを修正してください');
    }
    
    console.log('\n💡 ヒント:');
    console.log('   - Vercel Dashboardでログを確認: https://vercel.com/dashboard');
    console.log('   - ドライランモード確認: X_POSTING_DRY_RUN=true が設定されているか確認');
    console.log('   - 詳細なログは各エンドポイントの Functions タブで確認できます');
    
    // 終了コードを設定
    process.exit(successCount === totalCount && dryRunCount === totalCount ? 0 : 1);
}

main().catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
});
