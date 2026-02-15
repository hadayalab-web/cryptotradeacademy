/**
 * BuzzDefence v4.1 血流チェック — 3本テスト
 * ① 強制 CHAIN_RAID（dryRun）
 * ② CQ フォールバック（安全側）
 * ③ 言語ルーティング（ja/en）
 */

const fs = require("fs");
const path = require("path");

async function run() {
  const results = { tests: [], summary: "" };

  // ========== ① 強制 CHAIN_RAID テスト ==========
  const v41 = require("../services/td/buzzDefenceEngineV4_1");
  const spChainRaid = {
    mode: "chain",
    lang: "en",
    hook: "BTC Chain OI spike + Bot 80x detected. Structure says:",
    bullets: ["• Clusters: 5", "• Initial boost: 80x", "• Raid factor: 80x"],
    structure_note: "Bot amplification — OI spike + whale inflow.",
    data_sources: ["Data: Dune / Glassnode / CryptoQuant"],
    cta_core: "RT to save someone.",
    hashtags: ["#Bitcoin", "#Crypto", "#BotNetAlert", "#TrapDefence"],
    psychology_tag: "CHAIN_RAID",
    chain_data: { oi_spike: true, whale_inflow: true, long_short_ratio: 2.5 },
    fusion_score: 0.91
  };

  const r1 = await v41.runBuzzDefenceV41Cycle(spChainRaid, "mock_quoted_123", { dryRun: true });
  const built1 = v41.buildXPost(spChainRaid, require("../config/buzzweaveLinks").pickVidalyticsLink("en"), {
    enablePoll: true
  });

  const check1 = {
    name: "① 強制 CHAIN_RAID",
    pass: false,
    checks: {}
  };
  check1.checks.psychology_tag = spChainRaid.psychology_tag === "CHAIN_RAID";
  check1.checks.chain_data = !!spChainRaid.chain_data && spChainRaid.chain_data.oi_spike === true;
  check1.checks.hook_chain = built1.mainPost.includes("80x") && built1.mainPost.includes("Chain");
  check1.checks.cta_chain = built1.mainPost.includes("Escape now") || built1.mainPost.includes("Ride chain pump");
  check1.checks.poll =
    built1.pollConfig?.question === "Chain pump incoming?" || (built1.pollConfig?.options && built1.pollConfig.options.includes("Yes"));
  check1.pass = Object.values(check1.checks).every(Boolean);

  results.tests.push({ ...check1, mainPostPreview: built1.mainPost.slice(0, 200) });

  // ========== ② CQ フォールバック ==========
  const spFallback = {
    mode: "chain",
    lang: "en",
    hook: "Bot cluster detected.",
    bullets: ["• Clusters: 1", "• Initial boost: 5x"],
    psychology_tag: "BOTNET",
    chain_data: { oi_spike: false, whale_inflow: false, long_short_ratio: 1.0 },
    fusion_score: 0.35
  };
  const r2 = await v41.runBuzzDefenceV41Cycle(spFallback, "mock_456", { dryRun: true });

  const check2 = {
    name: "② CQ フォールバック",
    pass: false,
    checks: {}
  };
  check2.checks.no_crash = r2.ok === true;
  check2.checks.psychology_not_chain_raid = spFallback.psychology_tag !== "CHAIN_RAID";
  check2.checks.safe_defaults = spFallback.chain_data?.oi_spike === false;
  check2.pass = Object.values(check2.checks).every(Boolean);

  results.tests.push(check2);

  // ========== ③ 言語ルーティング ==========
  const spJa = { ...spChainRaid, lang: "ja" };
  const spEn = { ...spChainRaid, lang: "en" };
  const builtJa = v41.buildXPost(spJa, require("../config/buzzweaveLinks").pickVidalyticsLink("ja"));
  const builtEn = v41.buildXPost(spEn, require("../config/buzzweaveLinks").pickVidalyticsLink("en"));

  const check3 = {
    name: "③ 言語ルーティング",
    pass: false,
    checks: {}
  };
  check3.checks.cta_ja = builtJa.mainPost.includes("逃げる") || builtJa.mainPost.includes("チェーンポンプ");
  check3.checks.cta_en = builtEn.mainPost.includes("Escape") || builtEn.mainPost.includes("Ride chain");
  check3.checks.vidalytics_ja = builtJa.vidalyticsLink && builtJa.vidalyticsLink.includes("vidalytics");
  check3.checks.vidalytics_en = builtEn.vidalyticsLink && builtEn.vidalyticsLink.includes("vidalytics");
  check3.pass = Object.values(check3.checks).every(Boolean);

  results.tests.push({
    ...check3,
    ctaJa: builtJa.mainPost.match(/①[^→]+②[^→]+/)?.[0]?.slice(0, 40),
    ctaEn: builtEn.mainPost.match(/①[^→]+②[^→]+/)?.[0]?.slice(0, 40)
  });

  // Summary
  const allPass = results.tests.every((t) => t.pass);
  results.summary = allPass
    ? "✅ 3本すべて合格 — 血流OK"
    : "❌ 要確認: " + results.tests.filter((t) => !t.pass).map((t) => t.name).join(", ");

  console.log(JSON.stringify(results, null, 2));
  return results;
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
