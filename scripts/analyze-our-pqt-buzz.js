/**
 * 自社 PQT の「成約に効く条件」を buzzweave_post_log の実メトリクスから検証する。
 * 北極星: 100成約/日。成約（our_subs）が取れていれば条件別の成約数を最優先で集計し、
 * なければインプレ・クリックで「どの条件がファネルに効くか」を proxy として出す。
 *
 * 実行: node scripts/analyze-our-pqt-buzz.js [--days=7] [--csv]
 */
const { getBuzzweavePostLogsRecent } = require("../utils/supabase");

const DEFAULT_DAYS = 7;
const MAX_ROWS = 2000;

function parseArgs() {
  const args = process.argv.slice(2);
  let days = DEFAULT_DAYS;
  let csv = false;
  for (const a of args) {
    if (a.startsWith("--days=")) days = Math.max(1, parseInt(a.replace("--days=", ""), 10) || DEFAULT_DAYS);
    if (a === "--csv") csv = true;
  }
  return { days, csv };
}

function utcHourBucket(postedAt) {
  const d = new Date(postedAt);
  const h = d.getUTCHours();
  if (h < 3) return "00-03";
  if (h < 6) return "03-06";
  if (h < 9) return "06-09";
  if (h < 12) return "09-12";
  if (h < 15) return "12-15";
  if (h < 18) return "15-18";
  if (h < 21) return "18-21";
  return "21-24";
}

function engagementBucket(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return "unknown";
  if (s < 0.3) return "low";
  if (s < 0.7) return "mid";
  return "high";
}

function totalEngagement(row) {
  const l = Number(row.our_likes) || 0;
  const r = Number(row.our_retweets) || 0;
  const q = Number(row.our_quotes) || 0;
  const rp = Number(row.our_replies) || 0;
  return l + r + q + rp;
}

function aggregateBy(rows, keyFn, label) {
  const buckets = {};
  for (const row of rows) {
    const k = keyFn(row);
    if (!buckets[k]) buckets[k] = { n: 0, sumImp: 0, sumEng: 0, sumSubs: 0, sumClicks: 0, impValues: [] };
    buckets[k].n += 1;
    const imp = Number(row.our_impressions);
    if (Number.isFinite(imp)) {
      buckets[k].sumImp += imp;
      buckets[k].impValues.push(imp);
    }
    buckets[k].sumEng += totalEngagement(row);
    const sub = Number(row.our_subs);
    if (Number.isFinite(sub) && sub > 0) buckets[k].sumSubs += sub;
    const clk = Number(row.our_clicks);
    if (Number.isFinite(clk) && clk > 0) buckets[k].sumClicks += clk;
  }
  const entries = Object.entries(buckets).map(([k, v]) => ({
    key: k,
    n: v.n,
    avgImp: v.impValues.length ? v.impValues.reduce((a, b) => a + b, 0) / v.impValues.length : null,
    sumImp: v.sumImp,
    avgEng: v.n ? v.sumEng / v.n : 0,
    sumSubs: v.sumSubs,
    avgSubs: v.n ? v.sumSubs / v.n : 0,
    sumClicks: v.sumClicks,
    avgClicks: v.n ? v.sumClicks / v.n : 0
  }));
  const hasAnySubs = entries.some((e) => (e.sumSubs ?? 0) > 0);
  entries.sort((a, b) => hasAnySubs ? (b.sumSubs ?? 0) - (a.sumSubs ?? 0) : (b.avgImp ?? 0) - (a.avgImp ?? 0));
  return { label, entries };
}

function printSection(title, agg, hasSubs) {
  console.log("\n--- " + title + (hasSubs ? " (成約優先・avg imp, top)" : " (avg impressions, top)") + " ---");
  agg.entries.slice(0, 20).forEach((e) => {
    const avgStr = e.avgImp != null ? Math.round(e.avgImp).toLocaleString() : "n/a";
    const subStr = hasSubs && e.sumSubs != null ? ` sum_subs=${e.sumSubs} avg_subs=${e.avgSubs.toFixed(2)}` : "";
    console.log(`  ${e.key}: n=${e.n} avg_imp=${avgStr} avg_eng=${e.avgEng.toFixed(1)}${subStr}`);
  });
}

function printFindings(aggs, totalSubs) {
  console.log("\n========== 100成約/日に向けた「成約に効く条件」（要約） ==========");
  const byLang = aggs.find((a) => a.label === "slot_lang");
  const byCluster = aggs.find((a) => a.label === "cluster_label");
  const byHour = aggs.find((a) => a.label === "utc_hour");
  const byEng = aggs.find((a) => a.label === "engagement_score");
  const hasSubs = totalSubs > 0;
  if (hasSubs) console.log("期間内 成約合計: " + totalSubs + " （この条件配分を増やすと成約に寄る）");
  if (byLang?.entries?.[0]) console.log("言語: " + byLang.entries[0].key + (hasSubs ? " sum_subs=" + byLang.entries[0].sumSubs : " avg_imp=" + Math.round(byLang.entries[0].avgImp ?? 0).toLocaleString()));
  if (byCluster?.entries?.[0]) console.log("クラスタ: " + byCluster.entries[0].key + (hasSubs ? " sum_subs=" + byCluster.entries[0].sumSubs : " avg_imp=" + Math.round(byCluster.entries[0].avgImp ?? 0).toLocaleString()));
  if (byHour?.entries?.[0]) console.log("UTC時間帯: " + byHour.entries[0].key + (hasSubs ? " sum_subs=" + byHour.entries[0].sumSubs : " avg_imp=" + Math.round(byHour.entries[0].avgImp ?? 0).toLocaleString()));
  if (byEng?.entries?.[0]) console.log("引用元engagement: " + byEng.entries[0].key + (hasSubs ? " sum_subs=" + byEng.entries[0].sumSubs : " avg_imp=" + Math.round(byEng.entries[0].avgImp ?? 0).toLocaleString()));
  console.log("============================================================\n");
}

function writeCsv(aggs, path) {
  const fs = require("fs");
  const lines = ["dimension,key,n,avg_imp,sum_imp,avg_eng,sum_subs,avg_subs,sum_clicks,avg_clicks"];
  for (const agg of aggs) {
    for (const e of agg.entries) {
      lines.push([agg.label, e.key, e.n, e.avgImp != null ? Math.round(e.avgImp) : "", e.sumImp, e.avgEng.toFixed(2), e.sumSubs ?? "", (e.avgSubs ?? 0).toFixed(2), e.sumClicks ?? "", (e.avgClicks ?? 0).toFixed(2)].join(","));
    }
  }
  fs.writeFileSync(path, lines.join("\n"), "utf8");
  console.log("Wrote " + path);
}

async function main() {
  const { days, csv } = parseArgs();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  console.log("[analyze-our-pqt-buzz] Fetching buzzweave_post_log since " + since + " (days=" + days + ")");

  const { ok, rows } = await getBuzzweavePostLogsRecent(since, MAX_ROWS);
  if (!ok) {
    console.error("Failed to fetch buzzweave_post_log.");
    process.exit(1);
  }

  const withTweetId = rows.filter((r) => r.our_tweet_id);
  const withMetrics = withTweetId.filter((r) => r.our_impressions != null && Number.isFinite(Number(r.our_impressions)));
  const totalSubs = withMetrics.reduce((s, r) => s + (Number(r.our_subs) || 0), 0);
  console.log("Total rows: " + rows.length + ", with our_tweet_id: " + withTweetId.length + ", with impressions: " + withMetrics.length + ", 成約合計(subs): " + totalSubs);

  if (withMetrics.length === 0) {
    console.log("No rows with our_impressions. Run GET /api/buzzweave-metrics-poll to fill metrics, or wait for cron.");
    process.exit(0);
  }

  const aggs = [
    aggregateBy(withMetrics, (r) => r.slot_lang || "unknown", "slot_lang"),
    aggregateBy(withMetrics, (r) => r.cluster_label || "unknown", "cluster_label"),
    aggregateBy(withMetrics, (r) => utcHourBucket(r.posted_at), "utc_hour"),
    aggregateBy(withMetrics, (r) => engagementBucket(r.engagement_score), "engagement_score")
  ];

  const hasSubs = totalSubs > 0;
  printSection("By slot_lang", aggs[0], hasSubs);
  printSection("By cluster_label", aggs[1], hasSubs);
  printSection("By UTC hour", aggs[2], hasSubs);
  printSection("By engagement_score (quoted tweet)", aggs[3], hasSubs);
  printFindings(aggs, totalSubs);

  if (csv) writeCsv(aggs, "buzzweave-buzz-analysis.csv");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
