#!/usr/bin/env node
/**
 * Regular Briefing（有料版）をサンプルデータで1回だけ出力する
 * 実行: node scripts/run-regular-briefing-sample.js
 */

const { formatRegularBriefing } = require("../services/telegram/messages/user/en/regular.en");

const now = new Date();

const sample = {
  now,
  inflow: 9170,
  mpi: 0.99,
  sentimentLabel: "Extreme Fear",
  priceUsd: 61869,
  change24h: -15.19,
  score: -23,
  tradeSignal: { signal: "STANDBY", tp: null, sl: null, rr: null },
  trap: { isTrap: false, confidence: "LOW", label: "No trap detected" },
  trapScore: 25,
  whaleFlows: { whaleRatio: 0.525, isHighPressure: false },
  liquidations: null,
  trapDetection: {
    trapDetected: true,
    trapScore: 25,
    trapSeverity: "LOW",
    trapType: "WHALE_RETAIL_DIVERGENCE",
    details: {
      multipleDivergences: 1,
      onchainSocialDivergence: 45,
      anomalyDetected: false,
      accelerationDetected: false,
    },
  },
  marketBug: null,
  trapAlert: null,
  divergenceSignal: null,
  psychologicalSupport: {
    psychologicalState: "NEUTRAL",
    psychologicalRisk: "LOW",
    psychologicalAdvice: "Market conditions are relatively stable. Maintain discipline.",
  },
  gptReporterAnalysis: `**Whale Intent (structural inference)**
Whales appear to be absorbing distressed supply rather than distributing. The 9170 BTC inflow suggests they are intentionally letting price fall into a liquidity pocket created by retail panic, then accumulating quietly. This resembles engineered liquidity harvesting, not a structural breakdown.

**Algo Behavior Patterns**
Algos are exploiting thin liquidity zones created by emotional selling. Stop clusters are repeatedly swept, followed by rapid mean reversion. This pattern indicates automated liquidity harvesting rather than directional conviction, reflecting opportunistic volatility extraction.

**Retail Psychological Distortion**
Retail sentiment is dominated by fear-driven disengagement. The absence of X sentiment data is meaningful: "sentiment silence" often appears when retail freezes, creating a psychological vacuum that algos exploit for volatility expansion. This silence is structurally consistent with capitulation phases.

**Liquidity Map**
Sell-side liquidity is dense below the current price due to forced selling and miner distribution. Above price, liquidity is thin, meaning any upward move could accelerate quickly if inflows reverse or absorption continues. ETF flows remain neutral, but macro pressure keeps liquidity asymmetric.

**Scenario Map** (3-5 structural scenarios)
1. Supply shock continuation — panic supply absorbed, liquidity depleted, rebound-prone
2. Miner pressure increase — MPI rise sustains short-term supply pressure
3. Retail capitulation — fear peak may trigger final flush
4. Algo-driven volatility expansion — thin-book stop sweeps continue
5. Macro regime shift — ETF flows or rate events could shift liquidity`,
  grokXAnalysis: null,
  sosovalueArticle: null, // v2.2: omitted (行動示唆ゼロ)
};

const text = formatRegularBriefing(sample);
console.log(text);
console.log("\n--- END (length: " + text.length + " chars) ---");
