// scripts/analyze-logs-result.js
// ログファイルから実際のインプレッション数とエンゲージメント数を分析

const fs = require("fs");
const path = require("path");

const logFile = "c:/Users/chiba/Downloads/logs_result (2).json";

async function analyzeLogs() {
  console.log("=".repeat(80));
  console.log("📊 ログファイルから実際のインプレッション数とエンゲージメント数を分析");
  console.log("=".repeat(80));
  console.log();

  try {
    // ログファイルを読み込む
    console.log(`📂 ログファイルを読み込み中: ${logFile}`);
    const fileContent = fs.readFileSync(logFile, "utf8");
    const logs = JSON.parse(fileContent);
    console.log(`✅ ログエントリ数: ${logs.length}件`);
    console.log();

    // インプレッション数とエンゲージメント数に関連するログを抽出
    const impressionLogs = [];
    const engagementLogs = [];
    const quoteRepostLogs = [];
    const metricsLogs = [];

    for (const log of logs) {
      const message = (log.message || "").toLowerCase();
      const text = (log.text || "").toLowerCase();
      const combined = `${message} ${text}`;

      // インプレッション数に関連するログ
      if (
        combined.includes("impressions") ||
        combined.includes("impression_count") ||
        combined.includes("nonpublicmetrics") ||
        combined.includes("organicmetrics")
      ) {
        impressionLogs.push(log);
      }

      // エンゲージメント数に関連するログ
      if (
        combined.includes("engagement") ||
        combined.includes("like_count") ||
        combined.includes("retweet_count") ||
        combined.includes("reply_count")
      ) {
        engagementLogs.push(log);
      }

      // Quote Repostに関連するログ
      if (
        combined.includes("quote repost") ||
        combined.includes("quote repost") ||
        combined.includes("quote_repost")
      ) {
        quoteRepostLogs.push(log);
      }

      // メトリクスに関連するログ
      if (
        combined.includes("metrics") ||
        combined.includes("tracked") ||
        combined.includes("recorded")
      ) {
        metricsLogs.push(log);
      }
    }

    console.log(`📊 抽出結果:`);
    console.log(`   インプレッション関連: ${impressionLogs.length}件`);
    console.log(`   エンゲージメント関連: ${engagementLogs.length}件`);
    console.log(`   Quote Repost関連: ${quoteRepostLogs.length}件`);
    console.log(`   メトリクス関連: ${metricsLogs.length}件`);
    console.log();

    // 実際のインプレッション数を抽出
    const actualImpressions = [];
    const estimatedImpressions = [];

    for (const log of impressionLogs) {
      const message = log.message || log.text || "";

      // 実際のX APIから取得したインプレッション数（nonPublicMetricsまたはorganicMetrics）
      const nonPublicMatch = message.match(/nonPublicMetrics[^}]*impression_count[:\s]+(\d+)/i);
      const organicMatch = message.match(/organicMetrics[^}]*impression_count[:\s]+(\d+)/i);
      const impressionCountMatch = message.match(/impression_count[:\s]+(\d+)/i);

      if (nonPublicMatch || organicMatch) {
        const count = parseInt(nonPublicMatch?.[1] || organicMatch?.[1] || "0");
        if (count > 0) {
          actualImpressions.push({
            count,
            timestamp: log.TimeUTC || log.timestamp,
            message: message.substring(0, 200)
          });
        }
      } else if (impressionCountMatch) {
        const count = parseInt(impressionCountMatch[1]);
        if (count > 0) {
          actualImpressions.push({
            count,
            timestamp: log.TimeUTC || log.timestamp,
            message: message.substring(0, 200)
          });
        }
      }

      // Grokの推定インプレッション数（recentImpressions）
      const recentImpressionsMatch = message.match(/recentImpressions[:\s]+(\d+)/i);
      const estimatedMatch = message.match(/estimated[^0-9]*impressions?[:\s]+(\d+)/i);

      if (recentImpressionsMatch || estimatedMatch) {
        const count = parseInt(recentImpressionsMatch?.[1] || estimatedMatch?.[1] || "0");
        if (count > 0) {
          estimatedImpressions.push({
            count,
            timestamp: log.TimeUTC || log.timestamp,
            message: message.substring(0, 200)
          });
        }
      }
    }

    // エンゲージメント数を抽出
    const actualEngagements = [];

    for (const log of engagementLogs) {
      const message = log.message || log.text || "";

      // エンゲージメント数の合計を抽出
      const engagementMatch = message.match(/engagements?[:\s]+(\d+)/i);
      const likeMatch = message.match(/like_count[:\s]+(\d+)/i);
      const retweetMatch = message.match(/retweet_count[:\s]+(\d+)/i);
      const replyMatch = message.match(/reply_count[:\s]+(\d+)/i);

      if (engagementMatch) {
        const count = parseInt(engagementMatch[1]);
        if (count > 0) {
          actualEngagements.push({
            count,
            timestamp: log.TimeUTC || log.timestamp,
            message: message.substring(0, 200)
          });
        }
      }
    }

    // 結果を表示
    console.log("=".repeat(80));
    console.log("📊 実際のX APIから取得したインプレッション数");
    console.log("=".repeat(80));

    if (actualImpressions.length > 0) {
      const totalActualImpressions = actualImpressions.reduce((sum, item) => sum + item.count, 0);
      console.log(`総数: ${totalActualImpressions.toLocaleString()}`);
      console.log(`件数: ${actualImpressions.length}件`);
      console.log();
      console.log("詳細（最初の10件）:");
      actualImpressions.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.count.toLocaleString()} - ${item.timestamp}`);
        console.log(`     ${item.message.substring(0, 100)}...`);
      });
    } else {
      console.log("⚠️  実際のX APIから取得したインプレッション数が見つかりませんでした");
    }

    console.log();
    console.log("=".repeat(80));
    console.log("📊 Grokの推定インプレッション数");
    console.log("=".repeat(80));

    if (estimatedImpressions.length > 0) {
      const totalEstimatedImpressions = estimatedImpressions.reduce(
        (sum, item) => sum + item.count,
        0
      );
      console.log(`総数: ${totalEstimatedImpressions.toLocaleString()}`);
      console.log(`件数: ${estimatedImpressions.length}件`);
      console.log();
      console.log("詳細（最初の10件）:");
      estimatedImpressions.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.count.toLocaleString()} - ${item.timestamp}`);
        console.log(`     ${item.message.substring(0, 100)}...`);
      });
    } else {
      console.log("⚠️  Grokの推定インプレッション数が見つかりませんでした");
    }

    console.log();
    console.log("=".repeat(80));
    console.log("📊 実際のエンゲージメント数");
    console.log("=".repeat(80));

    if (actualEngagements.length > 0) {
      const totalEngagements = actualEngagements.reduce((sum, item) => sum + item.count, 0);
      console.log(`総数: ${totalEngagements.toLocaleString()}`);
      console.log(`件数: ${actualEngagements.length}件`);
      console.log();
      console.log("詳細（最初の10件）:");
      actualEngagements.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.count.toLocaleString()} - ${item.timestamp}`);
        console.log(`     ${item.message.substring(0, 100)}...`);
      });
    } else {
      console.log("⚠️  実際のエンゲージメント数が見つかりませんでした");
    }

    // サマリー
    console.log();
    console.log("=".repeat(80));
    console.log("📊 サマリー");
    console.log("=".repeat(80));

    const totalActualImpressions = actualImpressions.reduce((sum, item) => sum + item.count, 0);
    const totalEstimatedImpressions = estimatedImpressions.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const totalEngagements = actualEngagements.reduce((sum, item) => sum + item.count, 0);

    console.log(
      `実際のX APIから取得したインプレッション数: ${totalActualImpressions.toLocaleString()}`
    );
    console.log(`Grokの推定インプレッション数: ${totalEstimatedImpressions.toLocaleString()}`);
    console.log(`実際のエンゲージメント数: ${totalEngagements.toLocaleString()}`);

    if (totalActualImpressions > 0) {
      const actualEngagementRate = (totalEngagements / totalActualImpressions) * 100;
      console.log(`実際のエンゲージメント率: ${actualEngagementRate.toFixed(3)}%`);
    }

    if (totalEstimatedImpressions > 0 && totalActualImpressions > 0) {
      const difference = totalEstimatedImpressions - totalActualImpressions;
      const differencePercent = (difference / totalEstimatedImpressions) * 100;
      console.log();
      console.log(`📊 推定値と実際の値の差:`);
      console.log(`   差: ${difference.toLocaleString()} (${differencePercent.toFixed(1)}%)`);
    }

    console.log();
    console.log("=".repeat(80));
    console.log("✅ 分析完了");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ エラー:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// 実行
analyzeLogs().catch((error) => {
  console.error("❌ 実行エラー:", error);
  process.exit(1);
});
