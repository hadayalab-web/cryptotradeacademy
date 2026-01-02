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
  const trapSide =
    trap?.side === 'SHORT'
      ? '🔻 SHORT-side trap'
      : trap?.side === 'LONG'
        ? '🔺 LONG-side trap'
        : '⚠️ Trap detected';

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
  // Header - 緊急性の視覚的強調
  lines.push('🚨🚨🚨 *TRAP ALERT* 🚨🚨🚨');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRAP INFORMATION (最優先情報を最上部に配置)
  lines.push('⚠️ *WHALE TRAP DETECTED*');
  lines.push(`${trapSide} | *${trap?.confidence || 'UNKNOWN'}* confidence`);
  lines.push(`*${trapLabel}*`);
  lines.push('');

  // ACTION REQUIRED (アクショナブルな情報を明確化)
  lines.push('💡 *ACTION REQUIRED*');
  if (trap?.side === 'SHORT') {
    lines.push('• Reduce leverage immediately');
    lines.push('• Avoid new long positions');
    lines.push('• Consider taking profits if long');
  } else if (trap?.side === 'LONG') {
    lines.push('• Reduce leverage immediately');
    lines.push('• Avoid new short positions');
    lines.push('• Monitor price action closely');
  } else {
    lines.push('• Reduce leverage immediately');
    lines.push('• Avoid new positions');
    lines.push('• Monitor price action closely');
  }
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);
  lines.push('');

  // MARKET DATA
  lines.push('📊 *Market Data*');
  lines.push(`💰 BTC: ${formatUsd(priceUsd)}`);
  lines.push(`📊 Flow: ${flowDir} ${flowAbs.toFixed(0)} BTC | MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *AI Analysis*');
  lines.push(grokText);
  lines.push('');
  
  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('_For educational purposes only. Not financial advice._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
