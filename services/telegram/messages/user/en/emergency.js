// Tier1 BTC trap alert (EN)

function formatTrapAlert(payload) {
  const { inflow, mpi, priceUsd, trap, aiAnalysis } = payload;
  const emoji = trap.type === 'BULL_TRAP' ? '🐻' : '🐂';

  return [
    `🚨 WHALE TRAP ALERT (${trap.type}) ${emoji}`,
    '',
    `BTC Price: $${priceUsd.toLocaleString()}`,
    `Exchange Netflow: ${inflow.toFixed(2)} BTC`,
    `MPI: ${mpi.toFixed(2)}`,
    '',
    `Dr. Grok's quick take:`,
    aiAnalysis || 'Trap detected, but AI commentary unavailable.',
    '',
    `This is an unscheduled alert from the Whale Trap Detector.`,
    `Educational only – manage your own risk.`,
  ].join('\n');
}

module.exports = { formatTrapAlert };
