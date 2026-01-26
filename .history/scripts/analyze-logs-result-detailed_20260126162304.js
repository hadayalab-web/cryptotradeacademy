// scripts/analyze-logs-result-detailed.js
// ログファイルから詳細な分析（Quote Repost、メトリクス記録など）

const fs = require("fs");

const logFile = "c:/Users/chiba/Downloads/logs_result (2).json";

async function analyzeLogsDetailed() {
  console.log("=".repeat(80));
  console.log("📊 ログファイル詳細分析");
  console.log("=".repeat(80));
  console.log();

  try {
    const fileContent = fs.readFileSync(logFile, "utf8");
    const logs = JSON.parse(fileContent);
    console.log(`✅ ログエントリ数: ${logs.length}件`);
    console.log();

    // Quote Repostの投稿成功ログを抽出
    const quoteRepostSuccessLogs = [];
    const quoteRepostMetricsLogs = [];
    const engagementMetricsLogs = [];

    for (const log of logs) {
      const message = (log.message || "").toLowerCase();
      const text = (log.text || "").toLowerCase();
      const combined = `${message} ${text}`;

      // Quote Repost投稿成功
      if (combined.includes("quote repost") && combined.includes("actually posted")) {
        quoteRepostSuccessLogs.push(log);
      }

      // Quote Repostメトリクス
      if (
        combined.includes("quote repost") &&
        (combined.includes("metrics") ||
          combined.includes("impressions") ||
          combined.includes("engagement"))
      ) {
        quoteRepostMetricsLogs.push(log);
      }

      // エンゲージメントメトリクス記録
      if (
        combined.includes("record") &&
        (combined.includes("engagement") || combined.includes("metrics"))
      ) {
        engagementMetricsLogs.push(log);
      }
    }

    console.log(`📊 Quote Repost投稿成功: ${quoteRepostSuccessLogs.length}件`);
    console.log(`📊 Quote Repostメトリクス: ${quoteRepostMetricsLogs.length}件`);
    console.log(`📊 エンゲージメントメトリクス記録: ${engagementMetricsLogs.length}件`);
    console.log();

    // Quote Repost投稿成功の詳細を表示
    console.log("=".repeat(80));
    console.log("📊 Quote Repost投稿成功ログ");
    console.log("=".repeat(80));

    for (let i = 0; i < Math.min(quoteRepostSuccessLogs.length, 20); i++) {
      const log = quoteRepostSuccessLogs[i];
      const message = log.message || log.text || "";
      console.log(`${i + 1}. ${log.TimeUTC || log.timestamp}`);
      console.log(`   ${message.substring(0, 300)}`);
      console.log();
    }

    // Quote Repostメトリクスの詳細を表示
    console.log("=".repeat(80));
    console.log("📊 Quote Repostメトリクスログ");
    console.log("=".repeat(80));

    for (let i = 0; i < Math.min(quoteRepostMetricsLogs.length, 20); i++) {
      const log = quoteRepostMetricsLogs[i];
      const message = log.message || log.text || "";
      console.log(`${i + 1}. ${log.TimeUTC || log.timestamp}`);
      console.log(`   ${message.substring(0, 300)}`);
      console.log();
    }

    // エンゲージメントメトリクス記録の詳細を表示
    console.log("=".repeat(80));
    console.log("📊 エンゲージメントメトリクス記録ログ");
    console.log("=".repeat(80));

    for (let i = 0; i < Math.min(engagementMetricsLogs.length, 20); i++) {
      const log = engagementMetricsLogs[i];
      const message = log.message || log.text || "";
      console.log(`${i + 1}. ${log.TimeUTC || log.timestamp}`);
      console.log(`   ${message.substring(0, 300)}`);
      console.log();
    }

    // 実際のX APIから取得したメトリクスを探す（より詳細な検索）
    console.log("=".repeat(80));
    console.log("📊 実際のX APIメトリクス検索（詳細）");
    console.log("=".repeat(80));

    const apiMetricsLogs = [];
    for (const log of logs) {
      const message = log.message || log.text || "";

      // nonPublicMetrics、organicMetrics、impression_countを含むログ
      if (
        message.includes("nonPublicMetrics") ||
        message.includes("organicMetrics") ||
        (message.includes("impression_count") && message.includes(":"))
      ) {
        apiMetricsLogs.push(log);
      }
    }

    console.log(`実際のX APIメトリクスログ: ${apiMetricsLogs.length}件`);
    console.log();

    for (let i = 0; i < Math.min(apiMetricsLogs.length, 10); i++) {
      const log = apiMetricsLogs[i];
      const message = log.message || log.text || "";
      console.log(`${i + 1}. ${log.TimeUTC || log.timestamp}`);
      console.log(`   ${message.substring(0, 500)}`);
      console.log();
    }

    // ツイートIDを抽出して、実際のメトリクスを確認
    console.log("=".repeat(80));
    console.log("📊 ツイートID抽出");
    console.log("=".repeat(80));

    const tweetIds = new Set();
    for (const log of logs) {
      const message = log.message || log.text || "";
      // ツイートIDのパターンを検索（18-19桁の数字）
      const tweetIdMatches = message.match(/\b\d{18,19}\b/g);
      if (tweetIdMatches) {
        tweetIdMatches.forEach((id) => tweetIds.add(id));
      }
    }

    console.log(`抽出されたツイートID数: ${tweetIds.size}件`);
    console.log("ツイートID（最初の10件）:");
    Array.from(tweetIds)
      .slice(0, 10)
      .forEach((id, idx) => {
        console.log(`  ${idx + 1}. ${id}`);
      });

    console.log();
    console.log("=".repeat(80));
    console.log("✅ 詳細分析完了");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ エラー:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

analyzeLogsDetailed().catch((error) => {
  console.error("❌ 実行エラー:", error);
  process.exit(1);
});
