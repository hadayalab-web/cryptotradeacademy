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
  gptReporterAnalysis: `What is likely to happen next: The combination of high exchange inflow (9170 BTC), Extreme Fear sentiment, and a -15% 24h drop suggests continued selling pressure in the short term. Trap risk is low (25/100), but the whale/retail divergence means smart money may be accumulating while retail panics.

Trap patterns: WHALE RETAIL DIVERGENCE detected at low severity—whales and retail are positioned differently. This can precede a reversal once fear subsides.

Psychological interpretation: Extreme Fear drives panic selling. The data says "wait": let the flush complete before looking for entries. Trap Defence discipline: 70% of the time, do nothing. Right now, defending capital beats chasing.`,
  grokXAnalysis: null,
  sosovalueArticle: `Stay flat and watch key levels. With 9170 BTC inflow and Extreme Fear, avoid adding long exposure until netflow turns negative or price holds above $62,000. No need to hedge if you are in cash—patience is the edge.`,
};

const text = formatRegularBriefing(sample);
console.log(text);
console.log("\n--- END (length: " + text.length + " chars) ---");
