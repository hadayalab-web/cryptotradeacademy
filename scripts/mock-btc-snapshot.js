/**
 * Phase 3 Task 13: 共通モック btcSnapshot
 * formatMinimalBriefing, formatRegularBriefing, formatTrapAlertFromSnapshot 用
 */

function createMockBtcSnapshot(overrides = {}) {
  const now = new Date();
  return {
    snapshot_id: "snapshot_mock_" + Date.now(),
    as_of_utc: now.toISOString(),
    raw: {
      inflow: 9170,
      mpi: 0.99,
      priceUsd: 61869,
      change24h: -15.19,
      sentimentLabel: "Extreme Fear",
      fng: { value: 25, label: "Extreme Fear" }
    },
    cqDeep: {
      trapScore: 25,
      whaleFlows: { whaleRatio: 0.525, isHighPressure: false },
      liquidations: null,
      exchangeNetflow: 9170,
      minerMPI: 0.99
    },
    xSentiment: { whaleBias: 30, retailFomo: 25, newsImpact: 0 },
    highResX: null,
    gptStructureReasoning: "Whales appear to be absorbing distressed supply rather than distributing.",
    gptScenarioMap: null,
    gptTrapInterpretation: null,
    sosovalueArticle: null,
    drGrok: { base: "HOLD - Market structure suggests accumulation phase. Avoid chasing." },
    trapDetection: {
      trapDetected: true,
      trapScore: 25,
      trapSeverity: "LOW",
      trapType: "WHALE_RETAIL_DIVERGENCE",
      label: "Mild divergence",
      note: "Whale-retail gap elevated",
      hint: "Monitor for trap confirmation",
      details: {
        multipleDivergences: 1,
        onchainSocialDivergence: 45,
        anomalyDetected: false,
        accelerationDetected: false
      }
    },
    trapAlert: null,
    divergenceSignal: { divergenceLevel: "mild", reasons: ["whale_retail_mild"], confidence: 15 },
    marketRegime: "high-volatility",
    market_score: -23,
    tradeSignal: { signal: "STANDBY", tp: null, sl: null, rr: null },
    meta: null,
    ...overrides
  };
}

function createMockPsychologicalSupport() {
  return {
    psychologicalState: "NEUTRAL",
    psychologicalRisk: "LOW",
    psychologicalAdvice: "Market conditions are relatively stable. Maintain discipline."
  };
}

module.exports = {
  createMockBtcSnapshot,
  createMockPsychologicalSupport
};
