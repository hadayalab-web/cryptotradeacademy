#!/usr/bin/env tsx
/**
 * エンドツーエンドDMテストサイクルスクリプト
 * 
 * 完全なテストフローを実行:
 * 1. リスト抽出→データベース化
 * 2. DM準備
 * 3. CEO宛てテスト送信
 * 4. 検証・改善
 * 
 * 使用方法:
 *   npx tsx scripts/end-to-end-dm-test-cycle.ts
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runScript(scriptPath: string, description: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 ${description}`);
  console.log('='.repeat(80) + '\n');

  try {
    execSync(`npx tsx ${scriptPath}`, {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });
    console.log(`\n✅ ${description} 完了\n`);
    return true;
  } catch (error: any) {
    console.error(`\n❌ ${description} 失敗: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('🎯 エンドツーエンドDMテストサイクル開始\n');
  console.log('='.repeat(80));
  console.log('📋 実行フロー:');
  console.log('  1. リスト抽出→データベース化');
  console.log('  2. DM準備（配信はしない）');
  console.log('  3. CEO宛てテスト送信');
  console.log('  4. 検証・改善');
  console.log('='.repeat(80));

  const steps = [
    {
      script: 'scripts/complete-6markets-whop-and-send-dm.ts',
      description: 'リスト抽出→データベース化 + DM準備',
      required: true,
    },
    {
      script: 'scripts/send-ceo-test-dm.ts',
      description: 'CEO宛てテスト送信',
      required: true,
    },
    {
      script: 'scripts/validate-and-improve-dm.ts',
      description: '検証・改善',
      required: false,
    },
  ];

  const results: Array<{ step: string; success: boolean }> = [];

  for (const step of steps) {
    const success = await runScript(step.script, step.description);
    results.push({ step: step.description, success });

    if (!success && step.required) {
      console.error(`\n❌ 必須ステップが失敗しました: ${step.description}`);
      console.error('   テストサイクルを中断します。\n');
      process.exit(1);
    }

    // ステップ間で少し待機
    if (step !== steps[steps.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 最終レポート
  console.log('\n' + '='.repeat(80));
  console.log('📊 テストサイクル結果');
  console.log('='.repeat(80));
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.step}: ${result.success ? '✅ 成功' : '❌ 失敗'}`);
  });
  console.log('='.repeat(80) + '\n');

  const allSuccess = results.every(r => r.success);
  if (allSuccess) {
    console.log('✅ すべてのステップが成功しました！');
    console.log('\n📝 次のステップ:');
    console.log('  1. CEOがテストDMを確認');
    console.log('  2. 検証レポートを確認');
    console.log('  3. 必要に応じて改善を実施');
    console.log('  4. 再度テストサイクルを実行（改善→検証の繰り返し）\n');
  } else {
    console.log('⚠️ 一部のステップが失敗しました。');
    console.log('   エラーを確認して修正してください。\n');
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
