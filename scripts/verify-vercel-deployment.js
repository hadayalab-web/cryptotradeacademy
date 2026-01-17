#!/usr/bin/env node
/**
 * Vercelデプロイメント確認スクリプト
 * デプロイされたAPIエンドポイントの動作確認
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const VERCEL_URL = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
const CRON_SECRET = process.env.CRON_SECRET || 'test';

// 確認するエンドポイント
const ENDPOINTS = [
  { path: '/api/vsl1-post', name: 'VSL1投稿', method: 'GET' },
  { path: '/api/vsl2-free-users', name: 'VSL2配信', method: 'GET' },
  { path: '/api/vsl1-reminder', name: 'VSL1リマインダー', method: 'GET' },
  { path: '/api/vsl2-last-call', name: 'VSL2ラストコール', method: 'GET' },
  { path: '/api/promo-stock-monitor', name: 'プロモコード監視', method: 'GET' },
];

async function checkEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const headers = {
    'Authorization': `Bearer ${CRON_SECRET}`,
  };

  try {
    console.log(`\n🔍 ${endpoint.name} (${endpoint.path}) を確認中...`);
    
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
    });

    const status = response.status;
    const statusText = response.statusText;
    
    if (status === 200 || status === 401) {
      // 401は認証エラー（CRON_SECRETが設定されていない可能性）
      if (status === 401) {
        console.log(`  ⚠️  認証エラー (401): CRON_SECRETが設定されていない可能性があります`);
        return { success: false, error: 'Unauthorized - CRON_SECRET may not be set' };
      }
      
      const data = await response.json();
      console.log(`  ✅ ステータス: ${status} ${statusText}`);
      console.log(`  📊 レスポンス:`, JSON.stringify(data, null, 2).substring(0, 200));
      return { success: true, status, data };
    } else {
      const text = await response.text();
      console.log(`  ❌ ステータス: ${status} ${statusText}`);
      console.log(`  📄 レスポンス:`, text.substring(0, 200));
      return { success: false, status, error: text };
    }
  } catch (error) {
    console.log(`  ❌ エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkVercelDeployment() {
  console.log('🚀 Vercelデプロイメント確認\n');
  console.log('='.repeat(80));

  // Vercel URLの確認
  if (!VERCEL_URL) {
    console.log('⚠️  VERCEL_URLが設定されていません');
    console.log('📝 以下のいずれかの方法で確認してください:');
    console.log('   1. Vercel Dashboard → プロジェクト → Settings → Environment Variables');
    console.log('   2. Vercel Dashboard → プロジェクト → Deployments → 最新のデプロイメントのURL');
    console.log('   3. コマンドライン: vercel ls または vercel inspect');
    console.log('\n💡 または、Vercel Dashboardで直接確認してください:');
    console.log('   - Vercel Dashboard → プロジェクト → Functions');
    console.log('   - 各APIエンドポイントをクリックして動作を確認');
    return;
  }

  const baseUrl = VERCEL_URL.startsWith('http') ? VERCEL_URL : `https://${VERCEL_URL}`;
  console.log(`📍 Vercel URL: ${baseUrl}\n`);

  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await checkEndpoint(baseUrl, endpoint);
    results.push({ endpoint: endpoint.name, ...result });
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 確認結果サマリー');
  console.log('='.repeat(80));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.endpoint}`);
    if (!result.success && result.error) {
      console.log(`   エラー: ${result.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  if (successCount === totalCount) {
    console.log(`✅ すべてのエンドポイントが正常に動作しています (${successCount}/${totalCount})`);
  } else {
    console.log(`⚠️  一部のエンドポイントで問題が発生しています (${successCount}/${totalCount})`);
  }
  console.log('='.repeat(80));
}

// Vercel Dashboardでの確認手順を表示
function printVercelDashboardInstructions() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 Vercel Dashboardでの確認手順');
  console.log('='.repeat(80));
  console.log('\n1. デプロイメントの確認:');
  console.log('   - Vercel Dashboard → プロジェクト → Deployments');
  console.log('   - 最新のデプロイメントが「Ready」状態か確認');
  console.log('   - デプロイメントをクリックしてログを確認');
  
  console.log('\n2. 環境変数の確認:');
  console.log('   - Vercel Dashboard → プロジェクト → Settings → Environment Variables');
  console.log('   - 以下の環境変数が設定されているか確認:');
  console.log('     • X_POSTING_ENABLED=true');
  console.log('     • CRON_SECRET（設定されているか）');
  console.log('     • KV_REST_API_URL（推奨）');
  console.log('     • KV_REST_API_TOKEN（推奨）');
  
  console.log('\n3. Cronジョブの確認:');
  console.log('   - Vercel Dashboard → プロジェクト → Settings → Cron Jobs');
  console.log('   - 以下のCronジョブが設定されているか確認:');
  console.log('     • /api/vsl1-post (0 9,21 * * *) - 1日2回（9時、21時 UTC）');
  console.log('     • /api/vsl2-free-users (0 * * * *) - 1時間ごと');
  console.log('     • /api/vsl1-reminder (0 */12 * * *) - 12時間ごと');
  console.log('     • /api/vsl2-last-call (0 * * * *) - 1時間ごと');
  console.log('     • /api/promo-stock-monitor (*/15 * * * *) - 15分ごと');
  
  console.log('\n4. Functions（APIエンドポイント）の確認:');
  console.log('   - Vercel Dashboard → プロジェクト → Functions');
  console.log('   - 各APIエンドポイントが表示されているか確認');
  console.log('   - エンドポイントをクリックして「Invoke」ボタンで手動実行可能');
  
  console.log('\n5. ログの確認:');
  console.log('   - Vercel Dashboard → プロジェクト → Logs');
  console.log('   - リアルタイムログでエラーがないか確認');
  console.log('   - Cronジョブ実行時のログを確認');
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  await checkVercelDeployment();
  printVercelDashboardInstructions();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 確認実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { checkVercelDeployment };
