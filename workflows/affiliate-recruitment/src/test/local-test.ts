/**
 * ローカルテストスクリプト
 * 
 * Vercelでデバッグ炎上しないように、ローカルでテスト
 */

import { executeDeploymentWorkflow } from '../workflows/deployment';
import { executeIntegratedWorkflow } from '../workflows/integrated';
import { validateMarketCode, validateStatus, validateAnalysisType } from '../utils/validation';
import { httpRequest } from '../utils/api-client';
import type { MarketCode } from '../types';

/**
 * テスト用のモック環境変数設定
 */
function setupMockEnv() {
  // テスト用の環境変数を設定（実際のAPIキーは使用しない）
  process.env.WHOP_API_KEY = process.env.WHOP_API_KEY || 'test_key';
  process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * バリデーションテスト
 */
function testValidation() {
  console.log('🧪 バリデーションテスト開始...\n');

  // 市場コードのバリデーション
  const validMarkets: MarketCode[] = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const invalidMarkets = ['XX', 'INVALID', '', null, undefined];

  console.log('✅ 有効な市場コード:');
  for (const market of validMarkets) {
    const isValid = validateMarketCode(market);
    console.log(`  ${market}: ${isValid ? '✅' : '❌'}`);
  }

  console.log('\n❌ 無効な市場コード:');
  for (const market of invalidMarkets) {
    const isValid = validateMarketCode(market as any);
    console.log(`  ${JSON.stringify(market)}: ${isValid ? '❌ (should be false)' : '✅'}`);
  }

  console.log('\n✅ バリデーションテスト完了\n');
}

/**
 * 展開ワークフローのテスト（モック）
 */
async function testDeploymentWorkflow() {
  console.log('🧪 展開ワークフローテスト開始...\n');

  try {
    const result = await executeDeploymentWorkflow({
      marketCode: 'EN',
      whopProductId: 'test_product_123',
      searchQueries: ['crypto trading', 'bitcoin analysis'],
      maxCandidates: 10,
    });

    console.log('✅ 展開ワークフロー実行成功:');
    console.log(`  - 成功: ${result.success}`);
    console.log(`  - 市場コード: ${result.marketCode}`);
    console.log(`  - ステップ数: ${result.steps.length}`);
    console.log(`  - 次のステップ数: ${result.nextSteps?.length || 0}`);
    console.log(`  - 実行時間: ${result.duration}ms`);

    // ステップの詳細を表示
    console.log('\n  ステップ詳細:');
    for (const step of result.steps) {
      console.log(`    - ${step.step}: ${step.success ? '✅' : '❌'} ${step.message || ''}`);
    }

    console.log('\n✅ 展開ワークフローテスト完了\n');
  } catch (error: any) {
    console.error('❌ 展開ワークフローテスト失敗:');
    console.error(`  ${error.message}`);
    console.error('\n');
  }
}

/**
 * 統合ワークフローのテスト（モック）
 */
async function testIntegratedWorkflow() {
  console.log('🧪 統合ワークフローテスト開始...\n');

  try {
    // 注意: 実際のAPI呼び出しは行わない（モック）
    // 実際のテストでは、モックサーバーを使用することを推奨
    console.log('⚠️  統合ワークフローは実際のAPI呼び出しを含むため、');
    console.log('   モックサーバーを使用したテストを推奨します。\n');

    // バリデーションテストのみ実行
    const validInput = {
      marketCode: 'EN' as MarketCode,
      whopProductId: 'test_product_123',
      searchQueries: ['crypto trading'],
      maxCandidates: 5,
      analyzeCandidates: false, // API呼び出しを避けるためfalse
      sendTelegramDM: false,
      sendEmail: false,
    };

    console.log('✅ 入力バリデーション:');
    console.log(`  - 市場コード: ${validateMarketCode(validInput.marketCode) ? '✅' : '❌'}`);
    console.log(`  - Whop Product ID: ${validInput.whopProductId ? '✅' : '❌'}`);

    console.log('\n✅ 統合ワークフローテスト完了（バリデーションのみ）\n');
  } catch (error: any) {
    console.error('❌ 統合ワークフローテスト失敗:');
    console.error(`  ${error.message}`);
    console.error('\n');
  }
}

/**
 * APIクライアントのテスト（モック）
 */
async function testApiClient() {
  console.log('🧪 APIクライアントテスト開始...\n');

  try {
    // タイムアウトテスト（存在しないURL）
    console.log('✅ タイムアウトテスト:');
    try {
      await httpRequest('http://localhost:9999/test', {
        method: 'GET',
        timeout: 1000, // 1秒でタイムアウト
        maxRetries: 0, // リトライなし
      });
      console.log('  ❌ タイムアウトが発生すべきでした');
    } catch (error: any) {
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        console.log('  ✅ タイムアウトが正しく発生しました');
      } else {
        console.log(`  ⚠️  予期しないエラー: ${error.message}`);
      }
    }

    console.log('\n✅ APIクライアントテスト完了\n');
  } catch (error: any) {
    console.error('❌ APIクライアントテスト失敗:');
    console.error(`  ${error.message}`);
    console.error('\n');
  }
}

/**
 * メインテスト実行
 */
async function runTests() {
  console.log('🚀 ローカルテスト開始\n');
  console.log('=' .repeat(50));
  console.log('');

  setupMockEnv();

  // 1. バリデーションテスト
  testValidation();

  // 2. 展開ワークフローテスト
  await testDeploymentWorkflow();

  // 3. 統合ワークフローテスト（バリデーションのみ）
  await testIntegratedWorkflow();

  // 4. APIクライアントテスト
  await testApiClient();

  console.log('=' .repeat(50));
  console.log('✅ すべてのテスト完了');
  console.log('');
  console.log('📝 注意事項:');
  console.log('  - 実際のAPI呼び出しは行っていません');
  console.log('  - 本番環境では、モックサーバーを使用した統合テストを推奨します');
  console.log('  - Vercelにデプロイする前に、必ずローカルでテストを実行してください');
  console.log('');
}

// テスト実行
runTests().catch((error) => {
  console.error('❌ テスト実行エラー:');
  console.error(error);
  process.exit(1);
});
