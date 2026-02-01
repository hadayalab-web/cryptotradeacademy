// Tier1 BTC trap alert (EN)
// services/telegram/messages/user/en/emergency.en.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTrapAlert({ inflow, mpi, priceUsd, trap, aiAnalysis }) {
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || 'Whale Trap';
  // BUY/SELL/LONG/SHORT completely removed - only trap defense displayed
  const trapSide = '⚠️ Trap detected';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = 'High-risk zone. Prioritize defense and avoid emotional entries.';
  } else if (isOffline) {
    grokText = 'Grok is offline; treat this as a high-risk trap zone.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *Dr. Grok Trap Alert*');
  lines.push(`*${trapLabel}* (${trap?.confidence || 'UNKNOWN'} confidence)`);
  lines.push('');
  lines.push(`💰 BTC Price: *${formatUsd(priceUsd)}*`);
  lines.push(`📊 Exchange Netflow: *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI: *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');
  lines.push(trapSide);

  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);

  lines.push('');
  lines.push("🧬 *Dr. Grok's Take*");
  lines.push(grokText);
  lines.push('');
  lines.push('_For educational purposes only. Not financial advice._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
