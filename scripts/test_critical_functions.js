/**
 * 重要な関数の統合テスト
 * 「デタラメ実装」を防ぐための実際の動作確認
 *
 * 使用方法:
 *   node scripts/test_critical_functions.js
 */

/**
 * 定数の一貫性テスト
 * BuzzWeave 単体OS: x-post-free-report.js は廃止のためスキップ。ファイルが存在する場合のみ検証。
 */
function testConstantsConsistency() {
  console.log("\n🔍 定数の一貫性をテスト...\n");

  const fs = require("fs");
  const path = require("path");

  const filePath = "api/x-post-free-report.js";
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`   ⏭️ ${filePath} は存在しません（BuzzWeave 単体OS のためスキップ）`);
    return true;
  }

  const expectedMaxPostsPerHour = 5;

  const content = fs.readFileSync(fullPath, "utf-8");
  // parseInt(process.env.X_MAX_HOURLY_POSTS || "5", 10) 形式を検出
  const envMatch = content.match(
    /maxPostsPerHour\s*=\s*parseInt\s*\(\s*process\.env\.\w+\s*\|\|\s*["'](\d+)["']/
  );

  if (envMatch) {
    const actualDefault = parseInt(envMatch[1], 10);
    if (actualDefault === expectedMaxPostsPerHour) {
      console.log(
        `   ✅ ${filePath}: maxPostsPerHour デフォルト = ${actualDefault} (期待値と一致)`
      );
      return true;
    }
    console.error(`   ❌ FAIL: ${filePath} の maxPostsPerHour デフォルトが期待値と異なります`);
    console.error(`   期待値: ${expectedMaxPostsPerHour}, 実際: ${actualDefault}`);
    return false;
  }

  console.warn(`   ⚠️ ${filePath}: maxPostsPerHour の定義が見つかりません`);
  return false;
}

/**
 * メイン処理
 */
async function testCriticalFunctions() {
  console.log("=".repeat(80));
  console.log("=== 重要な関数の統合テスト ===");
  console.log("=".repeat(80));

  const results = [];

  try {
    const result1 = testConstantsConsistency();
    results.push({ name: "定数の一貫性", passed: result1 });
  } catch (error) {
    console.error("❌ エラー:", error.message);
    results.push({ name: "定数の一貫性", passed: false, error: error.message });
  }

  // 結果サマリー
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 テスト結果サマリー:");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`   ${status}: ${result.name}`);
    if (result.error) {
      console.log(`      エラー: ${result.error}`);
    }
  }

  console.log(`\n   総テスト数: ${results.length}`);
  console.log(`   成功: ${passed}`);
  console.log(`   失敗: ${failed}`);

  if (failed > 0) {
    console.error("\n❌ 一部のテストが失敗しました。実装を確認してください。");
    process.exit(1);
  } else {
    console.log("\n✅ すべてのテストをパスしました。");
    process.exit(0);
  }
}

// 実行
if (require.main === module) {
  testCriticalFunctions().catch((error) => {
    console.error("❌ 予期しないエラー:", error);
    process.exit(1);
  });
}

module.exports = {
  testReplyToTweetArguments,
  testConstantsConsistency,
  testCriticalFunctions
};
