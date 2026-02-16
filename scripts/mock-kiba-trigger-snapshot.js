/**
 * KIBA が発火する（kibaScore >= 65, triggered: true）テスト用 btcSnapshot。
 * 抑制条件を満たす: hasCq, avgVolume/postVolume >= 10, |change24h| >= 0.5, whaleImbalanceNorm > 0.5
 */

function createTriggeringBtcSnapshot(overrides = {}) {
  const now = new Date();
  return {
    as_of_utc: now.toISOString(),
    raw: {
      priceUsd: 62_000,
      change24h: -2.5,
      fng: { value: 22, label: "Extreme Fear" }
    },
    cqDeep: {
      exchangeInflow: 5000,
      exchangeOutflow: 500,
      netflow: 4500,
      exchangeFlowsDetailed: { inflow: 5000, outflow: 500, netflow: 4500 }
    },
    xSentiment: {
      postVolume: 15,
      avgVolume: 100,
      whaleBias: 30,
      retailFomo: 25,
      newsImpact: 10
    },
    marketRegime: "high-volatility",
    ...overrides
  };
}

module.exports = { createTriggeringBtcSnapshot };
