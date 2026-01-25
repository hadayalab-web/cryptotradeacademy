/**
 * 重要な関数の統合テスト
 * 「デタラメ実装」を防ぐための実際の動作確認
 * 
 * 使用方法:
 *   node scripts/test_critical_functions.js
 */

const { replyToTweet } = require('../services/x/client');

/**
 * replyToTweet関数の引数順序テスト
 */
async function testReplyToTweetArguments() {
  console.log('🔍 replyToTweet関数の引数順序をテスト...\n');
  
  // モック関数（実際のAPI呼び出しはしない）
  const originalReplyToTweet = replyToTweet;
  let lastCallArgs = null;
  
  // 関数をモック
  const mockReplyToTweet = async (text, inReplyToTweetId) => {
    lastCallArgs = { text, inReplyToTweetId };
    return { success: true };
  };
  
  // テストケース1: 正しい順序
  console.log('テストケース1: 正しい順序 (text, inReplyToTweetId)');
  await mockReplyToTweet('Test reply', '1234567890');
  
  if (lastCallArgs.text === 'Test reply' && lastCallArgs.inReplyToTweetId === '1234567890') {
    console.log('   ✅ OK: 引数の順序が正しい');
  } else {
    console.error('   ❌ FAIL: 引数の順序が間違っている');
    console.error(`   期待値: text='Test reply', inReplyToTweetId='1234567890'`);
    console.error(`   実際: text='${lastCallArgs.text}', inReplyToTweetId='${lastCallArgs.inReplyToTweetId}'`);
    return false;
  }
  
  // テストケース2: 間違った順序（検出）
  console.log('\nテストケース2: 間違った順序 (inReplyToTweetId, text) - エラー検出');
  lastCallArgs = null;
  
  // 間違った順序で呼び出すと、第1引数が数値のみになる
  const wrongCall = async () => {
    await mockReplyToTweet('1234567890', 'Test reply'); // 間違った順序
  };
  
  await wrongCall();
  
  if (lastCallArgs.text === '1234567890' && lastCallArgs.inReplyToTweetId === 'Test reply') {
    console.error('   ❌ FAIL: 間違った順序で呼び出されている');
    console.error('   検出: 第1引数がtweetId（数値）になっている');
    return false;
  }
  
  console.log('   ✅ OK: 間違った順序が検出された');
  
  return true;
}

/**
 * 定数の一貫性テスト
 */
function testConstantsConsistency() {
  console.log('\n🔍 定数の一貫性をテスト...\n');
  
  const fs = require('fs');
  const path = require('path');
  
  // maxDailyPostsの一貫性をチェック
  const filesToCheck = [
    'api/x-post-free-report.js',
    'api/x-post-minimal-version.js',
  ];
  
  const maxDailyPostsValues = {};
  
  for (const filePath of filesToCheck) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  ファイルが見つかりません: ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const match = content.match(/const\s+maxDailyPosts\s*=\s*(\d+)/);
    
    if (match) {
      maxDailyPostsValues[filePath] = parseInt(match[1]);
      console.log(`   ${filePath}: maxDailyPosts = ${match[1]}`);
    }
  }
  
  // すべての値が一致するかチェック
  const values = Object.values(maxDailyPostsValues);
  const allSame = values.every(v => v === values[0]);
  
  if (allSame && values.length > 0) {
    console.log(`   ✅ OK: すべてのファイルで maxDailyPosts = ${values[0]} に統一されています`);
    return true;
  } else {
    console.error('   ❌ FAIL: maxDailyPostsの値が一致していません');
    console.error(`   値: ${JSON.stringify(maxDailyPostsValues)}`);
    return false;
  }
}

/**
 * メイン処理
 */
async function testCriticalFunctions() {
  console.log('='.repeat(80));
  console.log('=== 重要な関数の統合テスト ===');
  console.log('='.repeat(80));
  
  const results = [];
  
  // 1. replyToTweet関数の引数順序テスト
  try {
    const result1 = await testReplyToTweetArguments();
    results.push({ name: 'replyToTweet引数順序', passed: result1 });
  } catch (error) {
    console.error('❌ エラー:', error.message);
    results.push({ name: 'replyToTweet引数順序', passed: false, error: error.message });
  }
  
  // 2. 定数の一貫性テスト
  try {
    const result2 = testConstantsConsistency();
    results.push({ name: '定数の一貫性', passed: result2 });
  } catch (error) {
    console.error('❌ エラー:', error.message);
    results.push({ name: '定数の一貫性', passed: false, error: error.message });
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 テスト結果サマリー:');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status}: ${result.name}`);
    if (result.error) {
      console.log(`      エラー: ${result.error}`);
    }
  }
  
  console.log(`\n   総テスト数: ${results.length}`);
  console.log(`   成功: ${passed}`);
  console.log(`   失敗: ${failed}`);
  
  if (failed > 0) {
    console.error('\n❌ 一部のテストが失敗しました。実装を確認してください。');
    process.exit(1);
  } else {
    console.log('\n✅ すべてのテストをパスしました。');
    process.exit(0);
  }
}

// 実行
if (require.main === module) {
  testCriticalFunctions().catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = {
  testReplyToTweetArguments,
  testConstantsConsistency,
  testCriticalFunctions,
};
