// monitor-14-cronjobs-production.js
// 14個すべてのCronJobsの本番環境稼働状況を監視

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

// 14個すべてのCronJobs定義（vercel.jsonから）
const CRONJOBS = [
    // X投稿関連（10個）- 収益への影響が最も高い
    { 
        path: '/api/x-quote-repost-en', 
        schedule: '*/6 * * * *',
        name: '引用リポスト EN', 
        category: 'X投稿',
        priority: '🔥🔥🔥',
        expectedRunsPerDay: 240,
        revenueImpact: '最高'
    },
    { 
        path: '/api/x-quote-repost-es', 
        schedule: '1,7,13,19,25,31,37,43,49,55 * * * *',
        name: '引用リポスト ES', 
        category: 'X投稿',
        priority: '🔥🔥🔥',
        expectedRunsPerDay: 240,
        revenueImpact: '最高'
    },
    { 
        path: '/api/x-quote-repost-pt-br', 
        schedule: '2,8,14,20,26,32,38,44,50,56 * * * *',
        name: '引用リポスト PT-BR', 
        category: 'X投稿',
        priority: '🔥🔥🔥',
        expectedRunsPerDay: 240,
        revenueImpact: '最高'
    },
    { 
        path: '/api/x-quote-repost-ar', 
        schedule: '3,9,15,21,27,33,39,45,51,57 * * * *',
        name: '引用リポスト AR', 
        category: 'X投稿',
        priority: '🔥🔥🔥',
        expectedRunsPerDay: 240,
        revenueImpact: '最高'
    },
    { 
        path: '/api/x-quote-repost-ja', 
        schedule: '4,10,16,22,28,34,40,46,52,58 * * * *',
        name: '引用リポスト JA', 
        category: 'X投稿',
        priority: '🔥🔥🔥',
        expectedRunsPerDay: 240,
        revenueImpact: '最高'
    },
    { 
        path: '/api/x-quote-repost-ko', 
        schedule: '5,11,17,23,29,35,41,47,53,59 * * * *',
        name: '引用リポスト KO', 
        category: 'X投稿',
        priority: '🔥🔥🔥',
        expectedRunsPerDay: 240,
        revenueImpact: '最高'
    },
    { 
        path: '/api/x-post-free-report', 
        schedule: '30 4,10,17,19 * * *',
        name: '無料レポートX投稿', 
        category: 'X投稿',
        priority: '🔥🔥',
        expectedRunsPerDay: 4,
        revenueImpact: '高'
    },
    { 
        path: '/api/x-post-minimal-version-cron', 
        schedule: '0 0,7,12,15,23 * * *',
        name: 'Minimal Version X投稿', 
        category: 'X投稿',
        priority: '🔥🔥',
        expectedRunsPerDay: 5,
        revenueImpact: '高'
    },
    { 
        path: '/api/vsl1-post', 
        schedule: '0 1,13,21 * * *',
        name: 'VSL1 X投稿', 
        category: 'X投稿',
        priority: '🔥🔥',
        expectedRunsPerDay: 3,
        revenueImpact: '高'
    },
    
    // その他（5個）
    { 
        path: '/api/cron', 
        schedule: '*/15 * * * *',
        name: '定期市場分析配信', 
        category: 'その他',
        priority: '🔥',
        expectedRunsPerDay: 96,
        revenueImpact: '中'
    },
    { 
        path: '/api/vsl2-free-users', 
        schedule: '0 * * * *',
        name: 'VSL2配信', 
        category: 'その他',
        priority: '🔥🔥',
        expectedRunsPerDay: 24,
        revenueImpact: '高'
    },
    { 
        path: '/api/vsl1-reminder', 
        schedule: '0 */12 * * *',
        name: 'VSL1リマインダー', 
        category: 'その他',
        priority: '🔥',
        expectedRunsPerDay: 2,
        revenueImpact: '中'
    },
    { 
        path: '/api/vsl2-last-call', 
        schedule: '0 * * * *',
        name: 'VSL2ラストコール', 
        category: 'その他',
        priority: '🔥',
        expectedRunsPerDay: 24,
        revenueImpact: '中'
    },
    { 
        path: '/api/promo-stock-monitor', 
        schedule: '*/15 * * * *',
        name: 'プロモコード監視', 
        category: 'その他',
        priority: '🔥',
        expectedRunsPerDay: 96,
        revenueImpact: '中'
    }
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
            headers: options.headers || {},
            timeout: 30000 // 30秒タイムアウト
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
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

async function checkCronJob(cronjob) {
    const url = `${VERCEL_URL}${cronjob.path}`;
    const headers = {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'CronJob-Monitor/1.0'
    };
    
    try {
        console.log(`\n🔍 ${cronjob.name} (${cronjob.path}) を確認中...`);
        console.log(`   カテゴリ: ${cronjob.category} | 優先度: ${cronjob.priority} | 収益影響: ${cronjob.revenueImpact}`);
        console.log(`   スケジュール: ${cronjob.schedule} | 期待実行回数: ${cronjob.expectedRunsPerDay}回/日`);
        
        const response = await makeRequest(url, { method: 'GET', headers });
        
        const status = response.statusCode;
        let result = {
            cronjob: cronjob.name,
            path: cronjob.path,
            status: status,
            success: false,
            dryRun: false,
            error: null,
            details: null
        };
        
        if (status === 200 || status === 401) {
            try {
                const data = JSON.parse(response.body);
                result.success = true;
                result.details = data;
                
                // dryRunチェック（X投稿関連のみ）
                if (cronjob.category === 'X投稿') {
                    result.dryRun = data.dryRun === true || data.dry_run === true || 
                                   (data.result && data.result.dryRun === true);
                    
                    if (result.dryRun) {
                        console.log(`   ⚠️  DRY RUN MODE: 実際の投稿は実行されていません`);
                    } else {
                        console.log(`   ✅ 本番モード: 実際の投稿が実行されます`);
                    }
                }
                
                // 成功メッセージ
                if (data.success !== false) {
                    console.log(`   ✅ ステータス: ${status} - 正常に実行されました`);
                } else {
                    console.log(`   ⚠️  ステータス: ${status} - 実行されましたが、success=false`);
                    result.success = false;
                }
                
                // 投稿数などの詳細情報
                if (data.posted_count !== undefined) {
                    console.log(`   📊 投稿数: ${data.posted_count}`);
                }
                if (data.processed_langs !== undefined) {
                    console.log(`   📊 処理言語数: ${data.processed_langs}`);
                }
                
            } catch (parseError) {
                console.log(`   ⚠️  JSON解析エラー: ${parseError.message}`);
                result.error = `JSON parse error: ${parseError.message}`;
                result.success = false;
            }
        } else if (status === 401) {
            console.log(`   ⚠️  認証エラー (401): CRON_SECRETが設定されていない可能性があります`);
            result.error = 'Unauthorized - CRON_SECRET may not be set';
            result.success = false;
        } else {
            console.log(`   ❌ ステータス: ${status} - エラーが発生しました`);
            result.error = `HTTP ${status}`;
            result.success = false;
        }
        
        return result;
    } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
        return {
            cronjob: cronjob.name,
            path: cronjob.path,
            status: null,
            success: false,
            dryRun: false,
            error: error.message,
            details: null
        };
    }
}

async function main() {
    console.log('='.repeat(80));
    console.log('📊 14個のCronJobs 本番環境稼働状況監視');
    console.log('='.repeat(80));
    console.log(`\n監視対象URL: ${VERCEL_URL}`);
    console.log(`監視時刻: ${new Date().toISOString()}`);
    console.log(`\n合計CronJobs数: ${CRONJOBS.length}個`);
    console.log(`  - X投稿関連: ${CRONJOBS.filter(c => c.category === 'X投稿').length}個`);
    console.log(`  - その他: ${CRONJOBS.filter(c => c.category === 'その他').length}個`);
    
    const results = [];
    
    // 優先度順に実行（収益への影響が高いものから）
    const sortedCronJobs = [...CRONJOBS].sort((a, b) => {
        const priorityOrder = { '🔥🔥🔥': 1, '🔥🔥': 2, '🔥': 3 };
        return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    });
    
    for (const cronjob of sortedCronJobs) {
        const result = await checkCronJob(cronjob);
        results.push(result);
        
        // リクエスト間隔を空ける（APIレート制限対策）
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 結果サマリー
    console.log('\n' + '='.repeat(80));
    console.log('📊 監視結果サマリー');
    console.log('='.repeat(80));
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const dryRunCount = results.filter(r => r.dryRun).length;
    
    console.log(`\n✅ 成功: ${successCount}/${CRONJOBS.length}個`);
    console.log(`❌ 失敗: ${failureCount}/${CRONJOBS.length}個`);
    
    if (dryRunCount > 0) {
        console.log(`\n⚠️  DRY RUN MODE検出: ${dryRunCount}個のCronJobがドライランモードです`);
        console.log(`   本番環境では X_POSTING_DRY_RUN=false に設定してください`);
        
        const dryRunCronJobs = results.filter(r => r.dryRun).map(r => r.cronjob);
        console.log(`   影響を受けるCronJobs: ${dryRunCronJobs.join(', ')}`);
    }
    
    // カテゴリ別サマリー
    console.log('\n📊 カテゴリ別サマリー:');
    const categories = ['X投稿', 'その他'];
    for (const category of categories) {
        const categoryResults = results.filter(r => {
            const cronjob = CRONJOBS.find(c => c.path === r.path);
            return cronjob && cronjob.category === category;
        });
        const categorySuccess = categoryResults.filter(r => r.success).length;
        console.log(`  ${category}: ${categorySuccess}/${categoryResults.length}個成功`);
    }
    
    // 失敗したCronJobsの詳細
    if (failureCount > 0) {
        console.log('\n❌ 失敗したCronJobs:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.cronjob} (${r.path})`);
            if (r.error) {
                console.log(`    エラー: ${r.error}`);
            }
        });
    }
    
    // 収益への影響が高いCronJobsの状況
    console.log('\n🔥 収益への影響が高いCronJobs（X投稿関連）:');
    const highImpactResults = results.filter(r => {
        const cronjob = CRONJOBS.find(c => c.path === r.path);
        return cronjob && cronjob.category === 'X投稿';
    });
    
    const highImpactSuccess = highImpactResults.filter(r => r.success && !r.dryRun).length;
    const highImpactDryRun = highImpactResults.filter(r => r.dryRun).length;
    const highImpactFailure = highImpactResults.filter(r => !r.success).length;
    
    console.log(`  ✅ 本番モードで成功: ${highImpactSuccess}/${highImpactResults.length}個`);
    if (highImpactDryRun > 0) {
        console.log(`  ⚠️  ドライランモード: ${highImpactDryRun}個（本番環境では修正が必要）`);
    }
    if (highImpactFailure > 0) {
        console.log(`  ❌ 失敗: ${highImpactFailure}個`);
    }
    
    // 推奨アクション
    console.log('\n' + '='.repeat(80));
    console.log('🎯 推奨アクション');
    console.log('='.repeat(80));
    
    if (dryRunCount > 0) {
        console.log('\n1. ⚠️  DRY RUN MODE検出:');
        console.log('   Vercel Dashboard → Settings → Environment Variables');
        console.log('   X_POSTING_DRY_RUN=false に設定してください');
    }
    
    if (failureCount > 0) {
        console.log('\n2. ❌ 失敗したCronJobsの確認:');
        console.log('   Vercel Dashboard → Logs でエラーログを確認してください');
    }
    
    if (successCount === CRONJOBS.length && dryRunCount === 0) {
        console.log('\n✅ すべてのCronJobsが正常に稼働しています！');
        console.log('   継続的に監視を続けて、収益指標を追跡してください');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('監視完了');
    console.log('='.repeat(80));
    
    // 結果をJSONファイルに保存
    const reportPath = path.join(__dirname, '../docs/cronjobs-monitoring-report.json');
    const report = {
        timestamp: new Date().toISOString(),
        vercelUrl: VERCEL_URL,
        totalCronJobs: CRONJOBS.length,
        successCount,
        failureCount,
        dryRunCount,
        results
    };
    
    try {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\n📄 監視レポートを保存しました: ${reportPath}`);
    } catch (error) {
        console.warn(`\n⚠️  レポート保存に失敗しました: ${error.message}`);
    }
}

main().catch(error => {
    console.error('\n❌ 監視スクリプトでエラーが発生しました:', error);
    process.exit(1);
});
