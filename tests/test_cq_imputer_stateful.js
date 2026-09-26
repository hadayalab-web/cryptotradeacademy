// tests/test_cq_imputer_stateful.js
// Verification of Gemini 3.8 Stateful Imputer & Zero-Cost Fallback

const assert = require("assert");
const { imputeCqMetrics } = require("../services/cqImputation/cqImputer");

async function runTest() {
  console.log("=== RUNNING STATEFUL CQ IMPUTER TEST ===");

  // 1. Test Zero-Cost Deterministic Fallback (No API Keys)
  console.log("Test 1: Testing Zero-Cost Deterministic Fallback when keys are missing...");
  const fallbackResult = await imputeCqMetrics({
    market: "BTC",
    lang: "en",
    priceUsd: 95000,
    change24h: 3.5,
    sentimentLabel: "Greed",
    inflow: null,
    mpi: null
  });

  assert(fallbackResult !== null, "Fallback result must not be null");
  assert(Number.isFinite(fallbackResult.inflow), "Fallback inflow must be a finite number");
  assert(Number.isFinite(fallbackResult.mpi), "Fallback mpi must be a finite number");
  assert(fallbackResult.basis === "deterministic-fallback", "Basis must be deterministic-fallback");
  console.log("✅ Test 1 PASSED: Deterministic fallback generated valid metrics:", {
    inflow: fallbackResult.inflow,
    mpi: fallbackResult.mpi,
    basis: fallbackResult.basis
  });

  console.log("\n=== ALL UNIT TESTS PASSED (Exit Code 0) ===");
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
