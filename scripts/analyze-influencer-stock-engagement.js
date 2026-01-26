// scripts/analyze-influencer-stock-engagement.js
// ストックされた言語別インフルエンサーのエンゲージメント率期待値を分析

const { getInfluencersFromStock } = require("../services/x/influencerStock");
const { getStockCountForLang } = require("../config/influencerStrategy");

const LANGUAGES = ["en", "es", "pt-br", "ar", "ja", "ko"];

/**
 * 言語別インフルエンサーのエンゲージメント率期待値を分析
 */
async function analyzeInfluencerStockEngagement() {
  console.log("🔍 ストックされた言語別インフルエンサーのエンゲージメント率期待値を分析中...\n");

  const results = {};

  for (const lang of LANGUAGES) {
    console.log(`\n📊 ${lang.toUpperCase()} 言語のインフルエンサーストックを分析中...`);

    try {
      const influencers = await getInfluencersFromStock(lang);

      if (!influencers || influencers.length === 0) {
        console.log(`  ⚠️ ストックにデータがありません`);
        results[lang] = {
          count: 0,
          avgEngagementRate: 0,
          minEngagementRate: 0,
          maxEngagementRate: 0,
          totalImpressions: 0,
          expectedEngagements: 0
        };
        continue;
      }

      // エンゲージメント率の統計を計算
      const engagementRates = influencers
        .map((inf) => (inf.engagementRate || 0) * 100) // パーセントに変換
        .filter((rate) => rate > 0);

      const impressions = influencers
        .map((inf) => inf.recentImpressions || 0)
        .filter((imp) => imp > 0);

      const avgEngagementRate =
        engagementRates.length > 0
          ? engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length
          : 0;

      const minEngagementRate = engagementRates.length > 0 ? Math.min(...engagementRates) : 0;

      const maxEngagementRate = engagementRates.length > 0 ? Math.max(...engagementRates) : 0;

      const totalImpressions = impressions.reduce((sum, imp) => sum + imp, 0);
      const avgImpressions = impressions.length > 0 ? totalImpressions / impressions.length : 0;

      // 期待エンゲージメント数を計算
      const expectedEngagements = totalImpressions * (avgEngagementRate / 100);

      results[lang] = {
        count: influencers.length,
        avgEngagementRate,
        minEngagementRate,
        maxEngagementRate,
        totalImpressions,
        avgImpressions,
        expectedEngagements,
        influencers: influencers.map((inf) => ({
          username: inf.username,
          engagementRate: (inf.engagementRate || 0) * 100,
          impressions: inf.recentImpressions || 0,
          followerCount: inf.followerCount || "N/A"
        }))
      };

      console.log(`  ✅ ストック数: ${influencers.length}人`);
      console.log(`  📊 平均エンゲージメント率: ${avgEngagementRate.toFixed(2)}%`);
      console.log(`  📊 最小エンゲージメント率: ${minEngagementRate.toFixed(2)}%`);
      console.log(`  📊 最大エンゲージメント率: ${maxEngagementRate.toFixed(2)}%`);
      console.log(`  📊 総インプレッション: ${totalImpressions.toLocaleString()}`);
      console.log(`  📊 平均インプレッション: ${avgImpressions.toLocaleString()}`);
      console.log(`  📊 期待エンゲージメント数: ${expectedEngagements.toFixed(0)}`);

      // インフルエンサー詳細を表示
      console.log(`  \n  📋 インフルエンサー詳細:`);
      influencers.forEach((inf, idx) => {
        const er = (inf.engagementRate || 0) * 100;
        const imp = inf.recentImpressions || 0;
        console.log(
          `    [${idx + 1}] @${inf.username}: ER=${er.toFixed(2)}%, Impressions=${imp.toLocaleString()}`
        );
      });
    } catch (error) {
      console.error(`  ❌ エラー: ${error.message}`);
      results[lang] = {
        error: error.message
      };
    }
  }

  // サマリーを表示
  console.log("\n\n" + "=".repeat(80));
  console.log("📊 言語別エンゲージメント率期待値サマリー");
  console.log("=".repeat(80));

  const summaryTable = [];
  for (const lang of LANGUAGES) {
    const data = results[lang];
    if (data.error) {
      summaryTable.push({
        lang,
        count: "N/A",
        avgER: "N/A",
        minER: "N/A",
        maxER: "N/A",
        totalImp: "N/A",
        expectedEng: "N/A"
      });
      continue;
    }

    summaryTable.push({
      lang,
      count: data.count,
      avgER: `${data.avgEngagementRate.toFixed(2)}%`,
      minER: `${data.minEngagementRate.toFixed(2)}%`,
      maxER: `${data.maxEngagementRate.toFixed(2)}%`,
      totalImp: data.totalImpressions.toLocaleString(),
      expectedEng: data.expectedEngagements.toFixed(0)
    });
  }

  console.log(
    "\n言語 | ストック数 | 平均ER | 最小ER | 最大ER | 総インプレッション | 期待エンゲージメント"
  );
  console.log("-".repeat(80));
  summaryTable.forEach((row) => {
    console.log(
      `${row.lang.padEnd(6)} | ${String(row.count).padEnd(8)} | ${row.avgER.padEnd(6)} | ${row.minER.padEnd(6)} | ${row.maxER.padEnd(6)} | ${String(row.totalImp).padEnd(18)} | ${row.expectedEng}`
    );
  });

  // 全体の平均を計算
  const allAvgER = Object.values(results)
    .filter((r) => !r.error && r.avgEngagementRate > 0)
    .map((r) => r.avgEngagementRate);
  const overallAvgER =
    allAvgER.length > 0 ? allAvgER.reduce((sum, er) => sum + er, 0) / allAvgER.length : 0;

  const allTotalImp = Object.values(results)
    .filter((r) => !r.error && r.totalImpressions > 0)
    .map((r) => r.totalImpressions);
  const overallTotalImp = allTotalImp.reduce((sum, imp) => sum + imp, 0);

  const allExpectedEng = Object.values(results)
    .filter((r) => !r.error && r.expectedEngagements > 0)
    .map((r) => r.expectedEngagements);
  const overallExpectedEng = allExpectedEng.reduce((sum, eng) => sum + eng, 0);

  console.log("\n" + "=".repeat(80));
  console.log("📊 全体サマリー");
  console.log("=".repeat(80));
  console.log(`全体平均エンゲージメント率: ${overallAvgER.toFixed(2)}%`);
  console.log(`全体総インプレッション: ${overallTotalImp.toLocaleString()}`);
  console.log(`全体期待エンゲージメント数: ${overallExpectedEng.toFixed(0)}`);

  // 結果をJSONファイルに保存
  const fs = require("fs");
  const path = require("path");
  const outputDir = path.join(__dirname, "../docs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const outputFile = path.join(outputDir, `INFLUENCER_STOCK_ENGAGEMENT_ANALYSIS_${timestamp}.json`);
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          overallAvgEngagementRate: overallAvgER,
          overallTotalImpressions: overallTotalImp,
          overallExpectedEngagements: overallExpectedEng
        },
        byLanguage: results
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`\n📄 分析結果を保存: ${outputFile}`);

  return results;
}

// スクリプト実行
if (require.main === module) {
  analyzeInfluencerStockEngagement()
    .then(() => {
      console.log("\n✅ 分析完了");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 分析エラー:", error);
      process.exit(1);
    });
}

module.exports = { analyzeInfluencerStockEngagement };
