// scripts/generate_report_from_logs.js
// ログファイルから24時間実績レポートと予測レポートを生成

const fs = require("fs");
const path = require("path");

const LOG_FILE = process.argv[2] || "c:\\Users\\chiba\\Downloads\\logs_result (2).json";

console.log("=".repeat(80));
console.log("ログファイルから24時間実績レポート生成中...");
console.log("=".repeat(80));
console.log(`\n📁 ログファイル: ${LOG_FILE}\n`);

// ログファイルを読み込む
let logs = [];
try {
  const logContent = fs.readFileSync(LOG_FILE, "utf-8");
  logs = JSON.parse(logContent);
  console.log(`✅ ログファイル読み込み完了: ${logs.length}件のエントリ\n`);
} catch (error) {
  console.error(`❌ エラー: ${error.message}`);
  process.exit(1);
}

// 時間範囲を確認
const times = [];
for (const log of logs) {
  const timeUtc = log.TimeUTC || log.timestamp || "";
  if (timeUtc) {
    try {
      times.push(new Date(timeUtc));
    } catch (e) {}
  }
}

const minTime =
  times.length > 0 ? new Date(Math.min(...times.map((t) => t.getTime()))) : new Date();
const maxTime =
  times.length > 0 ? new Date(Math.max(...times.map((t) => t.getTime()))) : new Date();
const oneDayAgo = new Date(maxTime.getTime() - 24 * 60 * 60 * 1000);

console.log(`📅 ログの時間範囲:`);
console.log(`   開始: ${minTime.toISOString()}`);
console.log(`   終了: ${maxTime.toISOString()}`);
console.log(`   過去24時間の開始: ${oneDayAgo.toISOString()}\n`);

// 投稿データを抽出
const posts = [];
const postPatterns = {
  quote_repost: /Quote.*repost.*posted|quote.*tweet.*posted/i,
  free_report: /Main tweet posted|Free Report.*posted/i,
  minimal_version: /Minimal Version.*posted/i
};

// ツイートIDと投稿情報を抽出
const tweetIdPattern = /tweet.*id[:\s]+(\d+)|posted.*(\d{19})|tweet\s+(\d{19})/i;
const influencerPattern = /@(\w+)|influencer[:\s]+(\w+)/i;
const langPattern = /lang[:\s]+(\w+)|for\s+(\w{2}(?:-\w{2})?)/i;

for (const log of logs) {
  const message = String(log.message || log.text || "").toLowerCase();
  const timeUtc = log.TimeUTC || log.timestamp || "";
  const logTime = timeUtc ? new Date(timeUtc) : null;

  if (!logTime || logTime < oneDayAgo) continue;

  // 投稿成功を検出
  let postType = null;
  for (const [type, pattern] of Object.entries(postPatterns)) {
    if (pattern.test(message)) {
      postType = type;
      break;
    }
  }

  if (postType) {
    // ツイートIDを抽出
    const tweetIdMatch = String(log.message || log.text || "").match(/(\d{19})/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

    // インフルエンサーを抽出
    const influencerMatch = String(log.message || log.text || "").match(/@(\w+)/);
    const influencer = influencerMatch ? influencerMatch[1] : null;

    // 言語を抽出
    let lang = null;
    const langMatch = String(log.message || log.text || "").match(
      /for\s+(\w{2}(?:-\w{2})?)|lang[:\s]+(\w+)/i
    );
    if (langMatch) {
      lang = (langMatch[1] || langMatch[2] || "").toLowerCase();
      if (lang === "ptbr" || lang === "pt_br") lang = "pt-br";
    }

    // パスから言語を推測
    if (!lang) {
      const path = log.requestPath || "";
      if (path.includes("lang=en") || path.includes("lang=en&")) lang = "en";
      else if (path.includes("lang=es")) lang = "es";
      else if (path.includes("lang=pt-br") || path.includes("lang=ptbr")) lang = "pt-br";
      else if (path.includes("lang=ar")) lang = "ar";
      else if (path.includes("lang=ja")) lang = "ja";
      else if (path.includes("lang=ko")) lang = "ko";
    }

    if (tweetId || postType) {
      posts.push({
        tweetId: tweetId || `unknown_${Date.now()}_${Math.random()}`,
        postType,
        lang: lang || "unknown",
        influencer: influencer || "N/A",
        postedAt: logTime.toISOString(),
        path: log.requestPath || "",
        message: String(log.message || log.text || "").substring(0, 200)
      });
    }
  }
}

console.log(`📊 過去24時間の投稿数: ${posts.length}件\n`);

// インプレッションとエンゲージメントを抽出
const metricsPattern =
  /impressions?[:\s]+(\d+(?:[,\-]\d+)?)|engagement[:\s]+(\d+)|likes?[:\s]+(\d+)|retweets?[:\s]+(\d+)/i;

for (const post of posts) {
  // 同じツイートIDのログを検索
  const relatedLogs = logs.filter((log) => {
    const msg = String(log.message || log.text || "");
    return msg.includes(post.tweetId) || msg.includes(`tweet ${post.tweetId}`);
  });

  let impressions = 0;
  let engagements = 0;

  for (const log of relatedLogs) {
    const msg = String(log.message || log.text || "");

    // インプレッションを抽出
    const impMatch = msg.match(/impressions?[:\s]+(\d+(?:[,\-]\d+)?)/i);
    if (impMatch) {
      const impStr = impMatch[1].replace(/,/g, "");
      if (impStr.includes("-")) {
        const [min, max] = impStr.split("-").map((n) => parseInt(n) || 0);
        impressions = Math.round((min + max) / 2);
      } else {
        impressions = parseInt(impStr) || 0;
      }
    }

    // エンゲージメントを抽出
    const engMatch = msg.match(/engagement[:\s]+(\d+)|likes?[:\s]+(\d+)|retweets?[:\s]+(\d+)/i);
    if (engMatch) {
      engagements += parseInt(engMatch[1] || engMatch[2] || engMatch[3] || 0);
    }
  }

  post.impressions = impressions;
  post.engagements = engagements;
  post.engagementRate =
    impressions > 0 ? ((engagements / impressions) * 100).toFixed(2) + "%" : "0%";
}

// Telegramオプトインを抽出
const telegramOptIns = { total: 0, byLang: {} };
const optInPattern = /user.*joined|opt.*in|start.*command|free.*user/i;

for (const log of logs) {
  const message = String(log.message || log.text || "").toLowerCase();
  const timeUtc = log.TimeUTC || log.timestamp || "";
  const logTime = timeUtc ? new Date(timeUtc) : null;

  if (!logTime || logTime < oneDayAgo) continue;

  if (optInPattern.test(message)) {
    telegramOptIns.total++;

    // 言語を抽出
    const langMatch = message.match(/lang[:\s]+(\w+)|for\s+(\w{2})/i);
    const lang = langMatch ? (langMatch[1] || langMatch[2] || "unknown").toLowerCase() : "unknown";
    telegramOptIns.byLang[lang] = (telegramOptIns.byLang[lang] || 0) + 1;
  }
}

// Whopトラフィックとコンバージョンを計算
const whopPosts = posts.filter(
  (p) => p.postType === "free_report" || p.postType === "minimal_version"
);
let totalWhopImpressions = 0;
let totalWhopClicks = 0;

for (const post of whopPosts) {
  totalWhopImpressions += post.impressions || 0;
  // クリック率を適用（保守的: 1%, 中程度: 2%, 楽観的: 3%）
  totalWhopClicks += Math.round((post.impressions || 0) * 0.02); // 中程度を使用
}

const whopConversions = {
  conservative: Math.round(totalWhopClicks * 0.01),
  moderate: Math.round(totalWhopClicks * 0.02),
  optimistic: Math.round(totalWhopClicks * 0.03)
};

// 市場別に集計
const byMarket = {};
for (const post of posts) {
  const lang = post.lang || "unknown";
  if (!byMarket[lang]) {
    byMarket[lang] = {
      market: langToMarket(lang),
      posts: 0,
      impressions: 0,
      engagements: 0,
      telegramOptIns: telegramOptIns.byLang[lang] || 0,
      influencers: new Set()
    };
  }
  byMarket[lang].posts++;
  byMarket[lang].impressions += post.impressions || 0;
  byMarket[lang].engagements += post.engagements || 0;
  if (post.influencer && post.influencer !== "N/A") {
    byMarket[lang].influencers.add(post.influencer);
  }
}

// Setを配列に変換
for (const market of Object.values(byMarket)) {
  market.influencers = Array.from(market.influencers);
}

function langToMarket(lang) {
  const map = {
    en: "English (EN)",
    es: "Spanish (ES)",
    "pt-br": "Portuguese (PT-BR)",
    ar: "Arabic (AR)",
    ja: "Japanese (JA)",
    ko: "Korean (KO)"
  };
  return map[lang] || lang.toUpperCase();
}

function postTypeToJapanese(postType) {
  const map = {
    quote_repost: "Quote Repost",
    free_report: "Free Report",
    minimal_version: "Minimal Version"
  };
  return map[postType] || postType;
}

// サマリーを計算
const summary = {
  totalPosts: posts.length,
  totalImpressions: posts.reduce((sum, p) => sum + (p.impressions || 0), 0),
  totalEngagements: posts.reduce((sum, p) => sum + (p.engagements || 0), 0),
  telegramOptIns: telegramOptIns.total,
  whopTraffic: totalWhopClicks,
  whopConversions
};

// レポートを出力
console.log("=".repeat(80));
console.log("📊 24時間実績レポート");
console.log("=".repeat(80));
console.log(`\n期間: ${oneDayAgo.toISOString()} ～ ${maxTime.toISOString()}`);
console.log(`\n【サマリー】`);
console.log(`- 総投稿数: ${summary.totalPosts}件`);
console.log(`- 総インプレッション: ${summary.totalImpressions.toLocaleString()}`);
console.log(`- 総エンゲージメント: ${summary.totalEngagements.toLocaleString()}`);
console.log(`- Telegramオプトイン: ${summary.telegramOptIns}人`);
console.log(`- Whopトラフィック（クリック）: ${summary.whopTraffic}回`);
console.log(`- Whopコンバージョン:`);
console.log(`  - 保守的: ${summary.whopConversions.conservative}件`);
console.log(`  - 中程度: ${summary.whopConversions.moderate}件`);
console.log(`  - 楽観的: ${summary.whopConversions.optimistic}件`);

console.log(`\n【市場別実績】`);
for (const market of Object.values(byMarket)) {
  console.log(`\n${market.market}:`);
  console.log(`  - 投稿数: ${market.posts}件`);
  console.log(
    `  - インフルエンサー: ${market.influencers.length > 0 ? market.influencers.join(", ") : "N/A"}`
  );
  console.log(`  - インプレッション: ${market.impressions.toLocaleString()}`);
  console.log(`  - エンゲージメント: ${market.engagements.toLocaleString()}`);
  console.log(`  - Telegramオプトイン: ${market.telegramOptIns}人`);
}

console.log(`\n【投稿詳細】`);
posts.forEach((post, index) => {
  console.log(`\n${index + 1}. ${langToMarket(post.lang)} - ${post.influencer}`);
  console.log(`   投稿タイプ: ${postTypeToJapanese(post.postType)}`);
  console.log(`   ツイートID: ${post.tweetId}`);
  console.log(`   投稿時刻: ${post.postedAt}`);
  console.log(`   インプレッション: ${(post.impressions || 0).toLocaleString()}`);
  console.log(`   エンゲージメント: ${(post.engagements || 0).toLocaleString()}`);
  console.log(`   エンゲージメント率: ${post.engagementRate}`);
});

// 予測レポートを生成
console.log("\n" + "=".repeat(80));
console.log("🔮 今後の予測レポート");
console.log("=".repeat(80));

(async () => {
  try {
    const { calculateDailyExpectations } = require("../services/x/postPerformanceAnalyzer");
    const forecast = await calculateDailyExpectations();

    if (forecast) {
      console.log(`\n【日次予測】`);
      if (forecast.dailyImpressions) {
        console.log(`- インプレッション:`);
        console.log(`  - Quote Repost: ${forecast.dailyImpressions.quoteRepost.toLocaleString()}`);
        console.log(`  - Free Report: ${forecast.dailyImpressions.freeReport.toLocaleString()}`);
        console.log(
          `  - Minimal Version: ${forecast.dailyImpressions.minimalVersion.toLocaleString()}`
        );
        console.log(`  - 合計: ${forecast.dailyImpressions.total.toLocaleString()}`);
      }
      if (forecast.telegramOptIns) {
        console.log(`- Telegramオプトイン:`);
        console.log(`  - 保守的: ${forecast.telegramOptIns.daily.conservative}人/日`);
        console.log(`  - 中程度: ${forecast.telegramOptIns.daily.moderate}人/日`);
        console.log(`  - 楽観的: ${forecast.telegramOptIns.daily.optimistic}人/日`);
      }
      if (forecast.whopClicks) {
        console.log(`- Whopトラフィック（クリック）:`);
        console.log(`  - 保守的: ${forecast.whopClicks.daily.conservative}回/日`);
        console.log(`  - 中程度: ${forecast.whopClicks.daily.moderate}回/日`);
        console.log(`  - 楽観的: ${forecast.whopClicks.daily.optimistic}回/日`);
      }
      if (forecast.whopConversions) {
        console.log(`- Whopコンバージョン:`);
        console.log(`  - 保守的: ${forecast.whopConversions.daily.conservative}件/日`);
        console.log(`  - 中程度: ${forecast.whopConversions.daily.moderate}件/日`);
        console.log(`  - 楽観的: ${forecast.whopConversions.daily.optimistic}件/日`);
      }

      console.log(`\n【月次予測】`);
      if (forecast.telegramOptIns) {
        console.log(`- Telegramオプトイン:`);
        console.log(`  - 保守的: ${forecast.telegramOptIns.monthly.conservative}人/月`);
        console.log(`  - 中程度: ${forecast.telegramOptIns.monthly.moderate}人/月`);
        console.log(`  - 楽観的: ${forecast.telegramOptIns.monthly.optimistic}人/月`);
      }
      if (forecast.whopConversions) {
        console.log(`- Whopコンバージョン:`);
        console.log(`  - 保守的: ${forecast.whopConversions.monthly.conservative}件/月`);
        console.log(`  - 中程度: ${forecast.whopConversions.monthly.moderate}件/月`);
        console.log(`  - 楽観的: ${forecast.whopConversions.monthly.optimistic}件/月`);
      }
    }
  } catch (error) {
    console.warn(`\n⚠️ 予測レポートの生成に失敗: ${error.message}`);
  }
})();

// JSONファイルとして保存
const reportData = {
  performance: {
    period: {
      start: oneDayAgo.toISOString(),
      end: maxTime.toISOString(),
      duration: "24 hours"
    },
    summary,
    byMarket: Object.fromEntries(
      Object.entries(byMarket).map(([lang, data]) => [
        lang,
        {
          ...data,
          influencers: data.influencers
        }
      ])
    ),
    posts: posts.map((p) => ({
      ...p,
      market: langToMarket(p.lang),
      postType: postTypeToJapanese(p.postType)
    }))
  },
  generatedAt: new Date().toISOString()
};

const reportPath = `docs/24H_PERFORMANCE_REPORT_${new Date().toISOString().split("T")[0]}.json`;
fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
console.log(`\n✅ レポートを保存しました: ${reportPath}`);

console.log("\n" + "=".repeat(80));
