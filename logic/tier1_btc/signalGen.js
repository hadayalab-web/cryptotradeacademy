/**
 * Generate Final Signal and TP/SL targets
 * Derived from signalGenerator.js
 */
function generateSignal(score, currentPrice) {
    let signal = 'NEUTRAL';
    let reason = 'Market is ranging.';

    if (score >= 75) {
        signal = 'BUY';
        reason = 'Strong accumulation and low selling pressure.';
    } else if (score <= 25) {
        signal = 'SELL';
        reason = 'High whale inflow and miner selling pressure.';
    }

    // Calculate TP/SL (Conservative strategy)
    const slPercent = 0.03; // 3% SL
    const tpPercent = 0.06; // 6% TP (1:2 Risk/Reward)

    const takeProfit = signal === 'BUY' 
        ? currentPrice * (1 + tpPercent) 
        : currentPrice * (1 - tpPercent);
        
    const stopLoss = signal === 'BUY' 
        ? currentPrice * (1 - slPercent) 
        : currentPrice * (1 + slPercent);

    return {
        signal,
        score,
        reason,
        entry: currentPrice,
        tp: Math.round(takeProfit),
        sl: Math.round(stopLoss)
    };
}

module.exports = { generateSignal };
