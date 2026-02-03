// scripts/inspect-kv-data.js
// KVデータを確認するスクリプト（Webhook統計・インフルエンサーストック等）

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { kv, getKV, isKVAvailable } = require("../utils/kv");

/** 生のKVインスタンスを取得（keys/scanはutils/kvラッパーにないため） */
function getRawKV() {
  return kv?.getInstance ? kv.getInstance() : (getKV?.() ?? kv);
}

/** プレフィックスでキー一覧を取得 */
async function listKeys(prefix) {
  const raw = getRawKV();
  if (!raw) return [];
  const pattern = `${prefix}*`;
  try {
    if (typeof raw.keys === "function") {
      const k = await raw.keys(pattern);
      return Array.isArray(k) ? k : [];
    }
  } catch (e1) {
    if (e1.message?.includes("100000") || e1.message?.includes("limit")) {
      console.warn(`  ⚠️ keys() が件数制限で失敗、scanIteratorにフォールバック`);
    } else {
      console.warn(`  ⚠️ keys("${pattern}"):`, e1.message);
    }
  }
  const keys = [];
  try {
    if (typeof raw.scanIterator === "function") {
      for await (const key of raw.scanIterator({ match: pattern, count: 500 })) {
        keys.push(key);
      }
    } else if (typeof raw.scan === "function") {
      let cursor = 0;
      do {
        const res = await raw.scan(cursor, { match: pattern, count: 500 });
        cursor = res?.[0] ?? 0;
        const batch = res?.[1] ?? [];
        keys.push(...(Array.isArray(batch) ? batch : []));
        if (cursor === 0 || cursor === "0") break;
      } while (cursor && cursor !== "0");
    }
  } catch (e2) {
    console.warn(`  ⚠️ scanIterator("${pattern}"):`, e2.message);
  }
  return keys;
}

async function inspectKV() {
  console.log("========================================");
  console.log("KVデータ確認");
  console.log("========================================\n");

  if (!isKVAvailable()) {
    console.error("❌ KVが利用できません");
    console.log("💡 .env に KV_REST_API_URL / KV_REST_API_TOKEN または KV_URL を設定してください");
    console.log("   vercel env pull でローカルに環境変数を取得することもできます");
    process.exit(1);
  }

  console.log("✅ KV接続成功\n");

  // 1. インフルエンサーストック
  console.log("📦 1. インフルエンサーストック");
  console.log("----------------------------------------");
  const langs = ["en", "es", "pt-br", "ar", "ja", "ko"];
  for (const lang of langs) {
    const stock = await kv.get(`x:influencer_stock:${lang}`);
    const updateTime = await kv.get(`x:influencer_stock_update:${lang}`);
    const count = Array.isArray(stock) ? stock.length : 0;
    console.log(
      `  ${lang}: ${count}人` + (updateTime ? ` (更新: ${new Date(updateTime).toISOString()})` : "")
    );
    if (count > 0 && stock[0]) {
      const sample = stock[0];
      console.log(`     サンプル: @${sample.username || sample.userId || "?"}`);
    }
  }

  // 2. Webhook統計（ツイート別）
  console.log("\n📊 2. Webhook統計（ツイート別）");
  console.log("----------------------------------------");
  const webhookStatsKeys = await listKeys("x:webhook:stats:");
  const tweetStatsKeys = webhookStatsKeys.filter((k) => !k.includes("influencer:"));
  console.log(`  キー数: ${tweetStatsKeys.length}件`);
  if (tweetStatsKeys.length > 0) {
    const sampleKeys = tweetStatsKeys.slice(0, 5);
    for (const key of sampleKeys) {
      const val = await kv.get(key);
      const tweetId = key.replace("x:webhook:stats:", "");
      console.log(
        `  ${tweetId}: likes=${val?.likes || 0} RT=${val?.retweets || 0} reply=${val?.replies || 0}`
      );
    }
  }

  // 3. Webhook統計（インフルエンサー別）
  console.log("\n👥 3. Webhook統計（インフルエンサー別）");
  console.log("----------------------------------------");
  const influencerStatsKeys = webhookStatsKeys.filter((k) => k.includes("influencer:"));
  console.log(`  キー数: ${influencerStatsKeys.length}件`);
  if (influencerStatsKeys.length > 0) {
    for (const key of influencerStatsKeys.slice(0, 5)) {
      const val = await kv.get(key);
      const username = key.replace("x:webhook:stats:influencer:", "");
      console.log(
        `  @${username}: likes=${val?.totalLikes || 0} RT=${val?.totalRetweets || 0} reply=${val?.totalReplies || 0}`
      );
    }
  }

  // 4. Webhookアクセスログ
  console.log("\n📝 4. Webhookアクセスログ（直近）");
  console.log("----------------------------------------");
  const accessKeys = await listKeys("x:webhook:access:");
  console.log(`  キー数: ${accessKeys.length}件`);
  if (accessKeys.length > 0) {
    const sorted = accessKeys.sort().reverse();
    const recent = sorted.slice(0, 3);
    for (const key of recent) {
      const val = await kv.get(key);
      const ts = key.replace("x:webhook:access:", "");
      console.log(
        `  ${new Date(parseInt(ts, 10)).toISOString()}: ${val?.method || "?"} ${val?.path || ""}`
      );
    }
  }

  // 5. 投稿データ（x:post:）
  console.log("\n📮 5. 投稿データ (x:post:)");
  console.log("----------------------------------------");
  const postKeys = await listKeys("x:post:");
  console.log(`  キー数: ${postKeys.length}件`);
  if (postKeys.length > 0) {
    const sample = await kv.get(postKeys[0]);
    console.log(`  サンプル: ${postKeys[0]}`, sample ? "→ データあり" : "→ データなし");
  }

  // 6. エンゲージメントメトリクス (x:metrics:)
  console.log("\n📈 6. エンゲージメントメトリクス (x:metrics:)");
  console.log("----------------------------------------");
  const metricsKeys = await listKeys("x:metrics:");
  console.log(`  キー数: ${metricsKeys.length}件`);
  // 直接キー指定で今日・昨日のメトリクスを確認（Cron/x-engagement-metricsで保存）
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const metricsToday = await kv.get(`x:metrics:${today}`);
  const metricsYester = await kv.get(`x:metrics:${yesterday}`);
  const fmtMetrics = (m) =>
    m
      ? `あり (tweets: ${m.tweets?.length ?? 0}件, impressions: ${m.totalImpressions ?? 0})`
      : "なし";
  console.log(`  直接参照: x:metrics:${today} → ${fmtMetrics(metricsToday)}`);
  console.log(`  直接参照: x:metrics:${yesterday} → ${fmtMetrics(metricsYester)}`);

  // 注意書き（0件の場合）
  const allZero =
    tweetStatsKeys.length === 0 &&
    influencerStatsKeys.length === 0 &&
    accessKeys.length === 0 &&
    postKeys.length === 0 &&
    metricsKeys.length === 0;
  if (allZero) {
    console.log("\n💡 補足: Webhook・投稿・メトリクスが0件の場合");
    console.log("  - Webhook: POSTイベント（いいね/RT/リプライ）がまだ届いていない");
    console.log("  - 投稿: x-quote-repost等で投稿時に保存（キー: x:post:{tweetId}:{date}）");
    console.log("  - メトリクス: Cron (x-engagement-metrics) で日次更新");
    console.log("  - 本番とローカルの.envで参照するKVが異なる場合もあります");
  }

  console.log("\n========================================");
  console.log("✅ 確認完了");
  console.log("========================================");
}

inspectKV().catch((e) => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
