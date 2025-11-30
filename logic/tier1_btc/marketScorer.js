/**
 * Calculate Market Health Score based on multiple metrics
 * Derived from market_analysis.js
 */
function calculateMarketScore(metrics) {
    let score = 50; // Default Neutral
    const { inflow, mpi, sentiment } = metrics;

    // Logic: Exchange Inflow (Higher = Bearish)
    if (inflow > 1000) score -= 20;
    if (inflow < 0) score += 10; // Outflow is bullish

    // Logic: MPI (Higher = Bearish)
    if (mpi > 2.0) score -= 15;
    if (mpi < -0.5) score += 10;

    // Logic: Sentiment
    if (sentiment === 'Extreme Fear') score += 15; // Contrarian Buy
    if (sentiment === 'Extreme Greed') score -= 15; // Contrarian Sell

    return Math.max(0, Math.min(100, score));
}

module.exports = { calculateMarketScore };
