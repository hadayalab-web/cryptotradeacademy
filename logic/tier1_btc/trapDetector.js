/**
 * Detect Bull/Bear Traps using Price vs On-chain Divergence
 */
function detectTrap(priceAction, onChainMetrics) {
    const { priceChange, volume } = priceAction;
    const { inflow, mpi } = onChainMetrics;

    // Bull Trap: Price UP but Whale Inflow HIGH (Selling into strength)
    if (priceChange > 5 && inflow > 1500) {
        return { isTrap: true, type: 'BULL_TRAP', confidence: 'HIGH' };
    }

    // Bear Trap: Price DOWN but Whale Outflow HIGH (Accumulation)
    if (priceChange < -5 && inflow < -1000) {
        return { isTrap: true, type: 'BEAR_TRAP', confidence: 'HIGH' };
    }

    return { isTrap: false };
}

module.exports = { detectTrap };
