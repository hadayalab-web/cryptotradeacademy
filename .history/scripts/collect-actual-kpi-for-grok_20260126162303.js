// scripts/collect-actual-kpi-for-grok.js
// 実際のKPIデータを収集してGrokに報告するための正確なデータを準備

const fs = require("fs");
const path = require("path");

/**
 * ログファイルとレポートから実際のKPIデータを収集
 */
async function collectActualKpiForGrok() {
  console.log("📊 実際のKPIデータを収集中...\n");

  const actualKpi = {
    // ログ期間
    logPeriod: {
      start: "2026-01-25 17:45 UTC",
      end: "2026-01-26 00:15 UTC",
      duration: "約6.5時間"
    },

    // X投稿実績
    xPosts: {
      total: 13, // ログから抽出
      quoteRepost: 9, // ログから抽出
      freeReport: 1, // UTC 18:00:17に実行（検証レポートで確認）
      minimalVersion: 1, // UTC 20:00:16に実行（検証レポートで確認）
      unknown: 2 // その他
    },

    // インプレッション実績
    impressions: {
      total: 2830000, // ログから抽出（6.5時間分）
      quoteRepost: 1219000, // ログから抽出
      freeReport: 755500, // 推定値（検証レポートで確認）
      minimalVersion: 855500, // 推定値（検証レポートで確認）
      note: "ログ期間は6.5時間のみのため、24時間全体のデータではない"
    },

    // エンゲージメント実績
    engagements: {
      total: 86, // ログから抽出（6.5時間分）
      note: "ログ期間は6.5時間のみのため、24時間全体のデータではない"
    },

    // Telegramオプトイン実績
    telegramOptIns: {
      total: 17, // ログから抽出（6.5時間分）
      yesterday24h: null, // 不明（ログ期間が6.5時間のみ）
      note: "ログ期間は6.5時間のみのため、24時間全体のデータではない。実績17人は6.5時間分"
    },

    // Whopコンバージョン実績
    whopConversions: {
      actual: null, // 実際のデータが不明（ログから抽出できなかった）
      estimated: {
        conservative: 322, // 予測値
        moderate: 1128, // 予測値
        optimistic: 2417 // 予測値
      },
      note: "実際のWhopコンバージョン数はログから抽出できなかった。予測値のみ"
    },

    // Whopトラフィック（クリック）実績
    whopTraffic: {
      actual: null, // 実際のデータが不明
      estimated: 32220, // 予測値
      note: "実際のWhopトラフィック数はログから抽出できなかった。予測値のみ"
    },

    // 収益実績
    revenue: {
      actual: null, // 実際のデータが不明
      estimated: null, // 予測値も不明（Whopコンバージョン数が不明のため）
      note: "実際の収益データは取得できなかった"
    },

    // Cron Jobs実行状況
    cronJobs: {
      "x-post-free-report": {
        scheduled: "0 12,13,14,15,18 * * *",
        expectedPerDay: 5,
        actualInLogPeriod: 1, // UTC 18:00:17に実行
        status: "正常"
      },
      "x-post-minimal-version-cron": {
        scheduled: "0 8,20 * * *",
        expectedPerDay: 2,
        actualInLogPeriod: 1, // UTC 20:00:16に実行
        status: "正常"
      },
      "x-quote-repost": {
        scheduled: "0 0,1,13,14,20,21,22 * * *",
        expectedPerDay: 7,
        actualInLogPeriod: 4, // 6.5時間中
        success: 1, // UTC 00:00:48
        failed: 3, // UTC 20:00, 21:00, 22:00（タイムアウト）
        status: "タイムアウト問題あり"
      }
    },

    // 問題点
    issues: [
      "ログ期間が6.5時間のみで、24時間全体のデータではない",
      "Telegramオプトインの実績が17人（6.5時間分）のみで、24時間全体のデータが不明",
      "Whopコンバージョンの実際のデータがログから抽出できなかった",
      "Whopトラフィック（クリック）の実際のデータがログから抽出できなかった",
      "収益の実際のデータが取得できなかった",
      "/api/x-quote-repostが3回タイムアウトしている"
    ]
  };

  // 24時間換算（単純計算、実際の投稿パターンとは異なる可能性あり）
  const hoursInLog = 6.5;
  const hoursInDay = 24;
  const multiplier = hoursInDay / hoursInLog;

  console.log("📊 実際のKPIデータ（ログ期間: 6.5時間分）:");
  console.log("=".repeat(60));
  console.log(`📅 ログ期間: ${actualKpi.logPeriod.start} ～ ${actualKpi.logPeriod.end}`);
  console.log(`⏱️  期間: ${actualKpi.logPeriod.duration}\n`);

  console.log("📝 X投稿実績:");
  console.log(`   総投稿数: ${actualKpi.xPosts.total}件`);
  console.log(`   - Quote Repost: ${actualKpi.xPosts.quoteRepost}件`);
  console.log(`   - Free Report: ${actualKpi.xPosts.freeReport}件`);
  console.log(`   - Minimal Version: ${actualKpi.xPosts.minimalVersion}件`);
  console.log(`   - その他: ${actualKpi.xPosts.unknown}件\n`);

  console.log("👁️  インプレッション実績:");
  console.log(`   総インプレッション: ${actualKpi.impressions.total.toLocaleString()}`);
  console.log(`   - Quote Repost: ${actualKpi.impressions.quoteRepost.toLocaleString()}`);
  console.log(`   - Free Report: ${actualKpi.impressions.freeReport.toLocaleString()}（推定値）`);
  console.log(
    `   - Minimal Version: ${actualKpi.impressions.minimalVersion.toLocaleString()}（推定値）`
  );
  console.log(`   ⚠️  ${actualKpi.impressions.note}\n`);

  console.log("💬 エンゲージメント実績:");
  console.log(`   総エンゲージメント: ${actualKpi.engagements.total}`);
  console.log(`   ⚠️  ${actualKpi.engagements.note}\n`);

  console.log("👥 Telegramオプトイン実績:");
  console.log(`   実績（6.5時間分）: ${actualKpi.telegramOptIns.total}人`);
  console.log(
    `   24時間換算（単純計算）: ${Math.round(actualKpi.telegramOptIns.total * multiplier)}人`
  );
  console.log(`   ⚠️  ${actualKpi.telegramOptIns.note}\n`);

  console.log("💰 Whopコンバージョン実績:");
  console.log(`   実際のデータ: ${actualKpi.whopConversions.actual || "不明"}`);
  console.log(`   予測値（保守的）: ${actualKpi.whopConversions.estimated.conservative}件`);
  console.log(`   予測値（中程度）: ${actualKpi.whopConversions.estimated.moderate}件`);
  console.log(`   予測値（楽観的）: ${actualKpi.whopConversions.estimated.optimistic}件`);
  console.log(`   ⚠️  ${actualKpi.whopConversions.note}\n`);

  console.log("🚦 Whopトラフィック（クリック）実績:");
  console.log(`   実際のデータ: ${actualKpi.whopTraffic.actual || "不明"}`);
  console.log(`   予測値: ${actualKpi.whopTraffic.estimated.toLocaleString()}回`);
  console.log(`   ⚠️  ${actualKpi.whopTraffic.note}\n`);

  console.log("💵 収益実績:");
  console.log(`   実際のデータ: ${actualKpi.revenue.actual || "不明"}`);
  console.log(`   ⚠️  ${actualKpi.revenue.note}\n`);

  console.log("⏰ Cron Jobs実行状況:");
  Object.entries(actualKpi.cronJobs).forEach(([key, value]) => {
    console.log(`   ${key}:`);
    console.log(`     スケジュール: ${value.scheduled}`);
    console.log(`     期待実行回数/日: ${value.expectedPerDay}回`);
    if (value.actualInLogPeriod !== undefined) {
      console.log(`     ログ期間中の実行: ${value.actualInLogPeriod}回`);
    }
    if (value.success !== undefined) {
      console.log(`     成功: ${value.success}回`);
    }
    if (value.failed !== undefined) {
      console.log(`     失敗: ${value.failed}回`);
    }
    console.log(`     状態: ${value.status}`);
  });

  console.log("\n⚠️  問題点:");
  actualKpi.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("\n📋 重要な注意事項:");
  console.log("1. ログ期間が6.5時間のみのため、24時間全体のデータではない");
  console.log("2. Telegramオプトインの実績が17人（6.5時間分）のみ");
  console.log("3. Whopコンバージョンの実際のデータが不明");
  console.log("4. 収益の実際のデータが不明");
  console.log("5. 24時間換算は単純計算であり、実際の投稿パターンとは異なる可能性がある\n");

  // JSONファイルに保存
  const outputDir = path.join(__dirname, "../docs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, "ACTUAL_KPI_DATA_2026-01-26.json");
  fs.writeFileSync(outputFile, JSON.stringify(actualKpi, null, 2), "utf-8");
  console.log(`✅ 実際のKPIデータを保存: ${outputFile}`);

  return actualKpi;
}

// スクリプト実行
if (require.main === module) {
  collectActualKpiForGrok()
    .then(() => {
      console.log("\n✅ スクリプト実行完了");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ スクリプト実行エラー:", error);
      process.exit(1);
    });
}

module.exports = { collectActualKpiForGrok };
