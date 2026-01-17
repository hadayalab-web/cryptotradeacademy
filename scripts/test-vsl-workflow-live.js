#!/usr/bin/env node
/**
 * VSLワークフローの動作確認（実際のエンドポイントをテスト）
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const CRON_SECRET = process.env.CRON_SECRET;
// VercelのプロダクションURLを取得（カスタムドメインまたはプロジェクト名.vercel.app）
const VERCEL_URL = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'https://cryptotradeacademy.vercel.app';

async function testEndpoint(endpoint, name) {
  const url = `${VERCEL_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${CRON_SECRET}`,
  };

  try {
    console.log(`\n🔍 ${name} をテスト中...`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.log(`   ⚠️  JSON以外のレスポンス (${contentType})`);
      console.log(`   📄 レスポンス（最初の200文字）: ${text.substring(0, 200)}`);
      return { success: false, status, error: 'Non-JSON response', text: text.substring(0, 200) };
    }

    const data = await response.json();

    if (status === 200) {
      console.log(`   ✅ 成功 (${status})`);
      console.log(`   📊 レスポンス:`, JSON.stringify(data, null, 2).substring(0, 300));
      return { success: true, data };
    } else {
      console.log(`   ⚠️  ステータス: ${status}`);
      console.log(`   📊 レスポンス:`, JSON.stringify(data, null, 2).substring(0, 300));
      return { success: false, status, data };
    }
  } catch (error) {
    console.log(`   ❌ エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 VSLワークフロー動作確認テスト\n');
  console.log('='.repeat(80));
  console.log(`📍 Vercel URL: ${VERCEL_URL}`);
  console.log(`🔑 CRON_SECRET: ${CRON_SECRET ? '設定済み' : '未設定'}`);
  console.log('='.repeat(80));

  if (!CRON_SECRET) {
    console.log('\n⚠️  CRON_SECRETが設定されていません');
    console.log('   .envファイルにCRON_SECRETを設定してください');
    process.exit(1);
  }

  const endpoints = [
    { path: '/api/vsl1-post', name: 'VSL1投稿' },
    { path: '/api/vsl2-free-users', name: 'VSL2配信' },
    { path: '/api/vsl1-reminder', name: 'VSL1リマインダー' },
    { path: '/api/vsl2-last-call', name: 'VSL2ラストコール' },
    { path: '/api/promo-stock-monitor', name: 'プロモコード監視' },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.path, endpoint.name);
    results.push({ endpoint: endpoint.name, ...result });
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(80));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.endpoint}`);
    if (result.data && result.data.results) {
      if (result.data.results.telegram) {
        console.log(`   Telegram: ${result.data.results.telegram.success ? '✅' : '❌'}`);
      }
      if (result.data.results.x) {
        console.log(`   X (Twitter): ${result.data.results.x.success ? '✅' : '❌'}`);
      }
      if (result.data.sent !== undefined) {
        console.log(`   送信数: ${result.data.sent}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  if (successCount === totalCount) {
    console.log(`✅ すべてのエンドポイントが正常に動作しています (${successCount}/${totalCount})`);
    console.log('🚀 VSLワークフローは起動しています！');
  } else {
    console.log(`⚠️  一部のエンドポイントで問題が発生しています (${successCount}/${totalCount})`);
  }
  console.log('='.repeat(80));
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { testEndpoint };
