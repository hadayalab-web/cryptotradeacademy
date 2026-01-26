// scripts/execute-grok-gemini-optimization.js
// GrokとGeminiの最上位モデルで最適化を実行

require("dotenv").config({ path: ".env" });
const { optimizeContentAndFunnel } = require("../services/x/contentOptimizer");

const XAI_API_KEY =
  process.env.XAI_API_KEY ||
  "xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig";

// 環境変数を設定
process.env.XAI_API_KEY = XAI_API_KEY;
process.env.GEMINI_API_KEY = GEMINI_API_KEY;

/**
 * 最適化を実行
 */
async function executeOptimization() {
  console.log("🚀 GrokとGeminiの最上位モデルで最適化を実行中...\n");

  // 現在のメトリクス（例）
  const currentMetrics = {
    impressions: 2830000, // 6.5時間分
    engagements: 86, // 6.5時間分
    engagementRate: 0.00003 // 0.003%
  };

  // 市場データ
  const marketData = {
    trapScore: 25,
    priceUsd: 89000,
    change24h: 2.5,
    exchangeNetflow: 1500,
    whaleRatio: 65
  };

  // Xセンチメント
  const xSentiment = {
    retailFomo: 50,
    whaleBias: 0,
    newsImpact: 0
  };

  const languages = ["en", "ja", "es", "pt-br", "ar", "ko"];

  const results = {};

  for (const lang of languages) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📝 言語: ${lang.toUpperCase()}`);
    console.log("=".repeat(80));

    try {
      const optimizationStrategy = await optimizeContentAndFunnel({
        currentMetrics,
        marketData,
        xSentiment,
        lang
      });

      results[lang] = optimizationStrategy;

      console.log(`\n✅ ${lang.toUpperCase()}の最適化完了`);
      console.log("\n📊 最適化戦略:");
      console.log(JSON.stringify(optimizationStrategy.optimization, null, 2));
    } catch (error) {
      console.error(`❌ ${lang.toUpperCase()}の最適化エラー:`, error.message);
      results[lang] = { error: error.message };
    }
  }

  // 結果をファイルに保存
  const fs = require("fs");
  const path = require("path");
  const outputDir = path.join(__dirname, "../docs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const outputFile = path.join(outputDir, `GROK_GEMINI_OPTIMIZATION_RESULTS_${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n📄 結果を保存: ${outputFile}`);

  // Markdownレポートを生成
  const markdownFile = path.join(outputDir, `GROK_GEMINI_OPTIMIZATION_RESULTS_${timestamp}.md`);
  let markdown = `# Grok×Gemini最適化結果レポート
**作成日**: ${new Date().toISOString()}  
**使用モデル**: 
- Grok: \`grok-4-1-fast-reasoning\`（Xアルゴリズム分析用最上位モデル）
- Gemini: \`gemini-3-pro\`（心理分析用最上位モデル、2026年最新）

---

`;

  for (const [lang, result] of Object.entries(results)) {
    if (result.error) {
      markdown += `## ${lang.toUpperCase()} - エラー\n\n\`\`\`\n${result.error}\n\`\`\`\n\n---\n\n`;
      continue;
    }

    markdown += `## ${lang.toUpperCase()} - 最適化戦略\n\n`;

    if (result.optimization) {
      const opt = result.optimization;

      markdown += `### コンテンツ最適化\n\n`;
      markdown += `- **質問CTA**: ${opt.content?.questionCTA || "N/A"}\n`;
      markdown += `- **リンク**: ${opt.content?.links || "N/A"}\n`;
      markdown += `- **ハッシュタグ**: ${opt.content?.hashtags || "N/A"}\n`;
      markdown += `- **絵文字**: ${opt.content?.emoji || "N/A"}\n`;
      markdown += `- **心理的トリガー**: ${opt.content?.psychologicalTriggers?.join(", ") || "N/A"}\n`;
      markdown += `- **認知バイアス**: ${opt.content?.cognitiveBiases?.join(", ") || "N/A"}\n\n`;

      markdown += `### タイミング最適化\n\n${opt.timing || "N/A"}\n\n`;

      markdown += `### フォーマット最適化\n\n${opt.format || "N/A"}\n\n`;

      markdown += `### ファネル最適化\n\n`;
      markdown += `- **Telegramオプトイン**: ${opt.funnel?.telegramOptIn || "N/A"}\n`;
      markdown += `- **Whopコンバージョン**: ${opt.funnel?.whopConversion || "N/A"}\n`;
      markdown += `- **心理的トリガー**: ${opt.funnel?.psychologicalTriggers?.join(", ") || "N/A"}\n\n`;

      markdown += `### 優先順位\n\n`;
      if (opt.priorityOrder && opt.priorityOrder.length > 0) {
        opt.priorityOrder.forEach((item, index) => {
          markdown += `${index + 1}. ${item}\n`;
        });
      } else {
        markdown += `N/A\n`;
      }

      markdown += `\n---\n\n`;
    }
  }

  fs.writeFileSync(markdownFile, markdown, "utf-8");
  console.log(`📄 Markdownレポートを保存: ${markdownFile}`);

  console.log("\n✅ 最適化実行完了！");

  return results;
}

// スクリプト実行
if (require.main === module) {
  executeOptimization()
    .then(() => {
      console.log("\n✅ スクリプト実行完了");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ スクリプト実行エラー:", error);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { executeOptimization };
