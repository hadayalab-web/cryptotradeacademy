// scripts/test-x-api-metrics.js
// X APIの最新仕様をテストして、インプレッション情報の取得方法を確認

const { xApiRequest } = require('../services/x/client');

async function testXApiMetrics() {
  console.log('='.repeat(100));
  console.log('📊 X APIメトリクス取得テスト');
  console.log('='.repeat(100));
  console.log();

  // テスト用のツイートID（過去1日間の投稿から）
  const testTweetId = process.argv[2] || '2015575666993811921';
  
  console.log(`📌 テスト対象ツイートID: ${testTweetId}`);
  console.log();

  try {
    // 1. 基本的なツイート情報を取得
    console.log('1️⃣ 基本的なツイート情報を取得...');
    const basicResponse = await xApiRequest(`/tweets/${testTweetId}`, {
      method: 'GET',
      params: {
        'tweet.fields': 'id,text,created_at,public_metrics'
      }
    });
    console.log('✅ 基本情報取得成功');
    console.log('レスポンス:', JSON.stringify(basicResponse, null, 2));
    console.log();

    // 2. non_public_metricsを含めて取得
    console.log('2️⃣ non_public_metricsを含めて取得...');
    const metricsResponse = await xApiRequest(`/tweets/${testTweetId}`, {
      method: 'GET',
      params: {
        'tweet.fields': 'id,text,created_at,public_metrics,non_public_metrics,organic_metrics'
      }
    });
    console.log('✅ メトリクス情報取得成功');
    console.log('レスポンス:', JSON.stringify(metricsResponse, null, 2));
    console.log();

    // 3. レスポンスの構造を詳細に確認
    if (metricsResponse && metricsResponse.data) {
      const tweet = metricsResponse.data;
      console.log('3️⃣ レスポンス構造の詳細分析:');
      console.log(`   ツイートID: ${tweet.id}`);
      console.log(`   作成日時: ${tweet.created_at}`);
      console.log(`   Public Metrics:`, JSON.stringify(tweet.public_metrics, null, 2));
      console.log(`   Non-Public Metrics:`, JSON.stringify(tweet.non_public_metrics, null, 2));
      console.log(`   Organic Metrics:`, JSON.stringify(tweet.organic_metrics, null, 2));
      
      if (tweet.non_public_metrics) {
        console.log(`   ✅ non_public_metricsが存在します`);
        console.log(`   impression_count: ${tweet.non_public_metrics.impression_count || 'N/A'}`);
      } else {
        console.log(`   ⚠️  non_public_metricsが存在しません`);
      }
      
      if (tweet.organic_metrics) {
        console.log(`   ✅ organic_metricsが存在します`);
        console.log(`   impression_count: ${tweet.organic_metrics.impression_count || 'N/A'}`);
      } else {
        console.log(`   ⚠️  organic_metricsが存在しません`);
      }
    }

    // 4. エラーレスポンスの確認
    console.log();
    console.log('4️⃣ エラー情報の確認:');
    if (metricsResponse.errors) {
      console.log('エラー:', JSON.stringify(metricsResponse.errors, null, 2));
    } else {
      console.log('✅ エラーなし');
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    
    // エラーレスポンスの詳細を確認
    if (error.response) {
      console.error('エラーレスポンス:', JSON.stringify(error.response, null, 2));
    }
  }

  console.log();
  console.log('='.repeat(100));
  console.log('✅ テスト完了');
  console.log('='.repeat(100));
}

// 実行
testXApiMetrics().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});
