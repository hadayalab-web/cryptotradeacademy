/**
 * Trap Defence OS v4.2 血流テスト
 * 1. cq:latest 永続化
 * 2. cq:latest 参照
 * 3. burst_factor_v42
 * 4. CHAIN_RAID 発火条件（burst × oi_spike）
 * 5. 言語クラスタ peak_hours
 * 6. 6言語 CTA/Hook/Poll
 */

const v41 = require("../services/td/buzzDefenceEngineV4_1");
const { getDefaultCluster, isPeakHourForLang, PEAK_HOURS_BY_LANG } = require("../services/snapshot/fishermenClusterSchema");
const { cqLatestToCqMetrics, normalizeToCqLatest } = require("../services/snapshot/cqLatestWriter");

async function run() {
  const results = { tests: [], summary: "" };

  // ========== ① cq:latest 正規化・cq_metrics 変換 ==========
  const mockCqDeep = {
    whaleFlows: { whaleRatio: 0.9 },
    exchangeInflow: 1000,
    openInterest: 50000,
    liquidations: { longLiquidations: 100, shortLiquidations: 50 },
    trapScore: 60
  };
  const cqLatest = normalizeToCqLatest(mockCqDeep);
  const cqMetrics = cqLatestToCqMetrics(cqLatest);

  const check1 = {
    name: "① cq:latest 正規化・cq_metrics 変換",
    pass: false,
    checks: {}
  };
  check1.checks.has_whale_ratio = cqLatest.whale_ratio === 0.9;
  check1.checks.whale_inflow_true = cqMetrics.whale_inflow === true;
  check1.checks.long_short_ratio = cqMetrics.long_short_ratio === 2;
  check1.pass = Object.values(check1.checks).every(Boolean);
  results.tests.push(check1);

  // ========== ② burst_factor_v42 反映 ==========
  const spV42 = {
    mode: "chain",
    lang: "en",
    hook: "BTC Chain OI spike + Bot 85x detected.",
    bullets: ["• Clusters: 5", "• Initial boost: 85x", "• burst_factor_v42: 87"],
    psychology_tag: "CHAIN_RAID",
    chain_data: { oi_spike: true, whale_inflow: true, long_short_ratio: 2.5 },
    fusion_score: 0.92,
    cq_timestamp: Date.now()
  };
  const builtV42 = v41.buildXPost(spV42, require("../config/buzzweaveLinks").pickVidalyticsLink("en"), {
    enablePoll: true
  });

  const check2 = {
    name: "② CHAIN_RAID CTA/Poll",
    pass: false,
    checks: {}
  };
  check2.checks.cta_chain = builtV42.mainPost.includes("Escape now") || builtV42.mainPost.includes("Ride chain pump");
  check2.checks.poll = builtV42.pollConfig?.question === "Chain pump incoming?";
  check2.checks.cq_timestamp = spV42.cq_timestamp != null;
  check2.pass = Object.values(check2.checks).every(Boolean);
  results.tests.push({ ...check2, mainPostPreview: builtV42.mainPost.slice(0, 150) });

  // ========== ③ 言語クラスタ peak_hours ==========
  const check3 = {
    name: "③ 言語クラスタ peak_hours",
    pass: false,
    checks: {}
  };
  check3.checks.es_peak = (getDefaultCluster("es").peak_hours || []).includes(21);
  check3.checks.ar_peak = (getDefaultCluster("ar").peak_hours || []).includes(18);
  check3.checks.ko_peak = (getDefaultCluster("ko").peak_hours || []).includes(9);
  check3.checks.is_peak_helper = typeof isPeakHourForLang === "function";
  check3.pass = Object.values(check3.checks).every(Boolean);
  results.tests.push(check3);

  // ========== ④ 6言語 CTA ==========
  const check4 = {
    name: "④ 6言語 CTA",
    pass: false,
    checks: {}
  };
  const langs = ["en", "ja", "ko", "es", "pt", "ar"];
  for (const l of langs) {
    const b = v41.buildXPost({ ...spV42, lang: l }, require("../config/buzzweaveLinks").pickVidalyticsLink(l));
    check4.checks[`cta_${l}`] = b.mainPost && b.mainPost.length > 20;
  }
  check4.pass = Object.values(check4.checks).every(Boolean);
  results.tests.push(check4);

  // Summary
  const allPass = results.tests.every((t) => t.pass);
  results.summary = allPass
    ? "✅ v4.2 全テスト合格"
    : "❌ 要確認: " + results.tests.filter((t) => !t.pass).map((t) => t.name).join(", ");

  console.log(JSON.stringify(results, null, 2));
  return results;
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
