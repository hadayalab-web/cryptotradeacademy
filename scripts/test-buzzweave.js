// scripts/test-buzzweave.js
// BuzzWeave Engine の dry-run テスト（X には投稿しない）

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");

async function testBuzzWeave() {
  console.log("🧪 BuzzWeave Engine dry-run テストを開始します...\n");

  const langFilter = process.argv.find((a) => /^(en|es|pt|ja|ko|ar)$/.test(a)) || "en";
  console.log(`   langFilter: ${langFilter}`);
  console.log("   dryRun: true（投稿しません）\n");

  try {
    const result = await runBuzzWeaveCycle({ dryRun: true, langFilter });
    console.log("✅ BuzzWeave dry-run 完了:");
    console.log("   ", JSON.stringify(result, null, 2).split("\n").join("\n    "));
    console.log("\n✅ テストが完了しました。");
  } catch (error) {
    console.error("❌ BuzzWeave dry-run エラー:", error.message);
    process.exit(1);
  }
}

testBuzzWeave().catch((error) => {
  console.error("❌ テスト実行エラー:", error);
  process.exit(1);
});
