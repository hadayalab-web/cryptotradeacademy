// Tier1 BTC regular briefing (EN)

function formatRegularBriefing(payload) {
  const {
    now,
    inflow,
    mpi,
    sentimentLabel,
    priceUsd,
    change24h,
    score,
    tradeSignal,
    trap,
    aiAnalysis,
  } = payload;

  const ts = now.toISOString().replace('T', ' ').slice(0, 16);
  const directionEmoji =
    tradeSignal.signal === 'BUY' ? '🟢' :
    tradeSignal.signal === 'SELL' ? '🔴' :
    '⚪️';

  const trapLine = trap.isTrap
    ? `⚠️ Trap Detector: ${trap.type} (${trap.confidence})`
    : '✅ Trap Detector: No critical trap detected.';

  return [
    `🧠 Dr. Grok's Market Leak`,
    `【Session Briefing @ ${ts} UTC】`,
    '',
    `💰 BTC Price: $${priceUsd.toLocaleString()} (${change24h.toFixed(2)}% / 24h)`,
    `🏦 Exchange Netflow: ${inflow.toFixed(2)} BTC`,
    `⛏️ Miner Position Index (MPI): ${mpi.toFixed(2)}`,
    `🧭 Sentiment: ${sentimentLabel}`,
    '',
    `📊 Market Score: ${score}/100`,
    trapLine,
    '',
    `🎯 Trade Verdict`,
    `${directionEmoji} Signal: ${tradeSignal.signal}`,
    `   • Entry (spot ref.): $${Math.round(tradeSignal.entry).toLocaleString()}`,
    `   • Take Profit: $${tradeSignal.tp.toLocaleString()}`,
    `   • Stop Loss: $${tradeSignal.sl.toLocaleString()}`,
    '',
    `🤖 Dr. Grok's Take`,
    aiAnalysis || 'No AI commentary available this round.',
    '',
    `For educational purposes only. Not financial advice.`,
  ].join('\n');
}

module.exports = { formatRegularBriefing };
