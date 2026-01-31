// Tier1 BTC trap alert (EN) - 緊急配信: 面白く・刺さるコンテンツ（Grok + Gemini 1ライナー）
// services/telegram/messages/user/en/emergency.en.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTrapAlert({
  inflow,
  mpi,
  priceUsd,
  trap,
  aiAnalysis,
  grokReasoningShort = null,
  geminiInsightShort = null,
  trapDetection = null,
} = {}) {
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || trapDetection?.trapType || 'Whale Trap';
  const trapScoreDisplay =
    trapDetection?.trapScore != null ? `Trap Score *${Math.round(trapDetection.trapScore)}/100*` : '';

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
  lines.push('🚨 *TRAP ALERT — This is the moment.*');
  lines.push(`*${trapLabel}* ${trapScoreDisplay ? `| ${trapScoreDisplay}` : ''} (${trap?.confidence || 'HIGH'} confidence)`);
  lines.push('');
  lines.push(`💰 BTC: *${formatUsd(priceUsd)}* | 📊 Netflow *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');

  if (grokReasoningShort && typeof grokReasoningShort === 'string' && grokReasoningShort.trim()) {
    lines.push('⚡ *Why now:*');
    lines.push(grokReasoningShort.trim());
    lines.push('');
  }

  if (geminiInsightShort && typeof geminiInsightShort === 'string' && geminiInsightShort.trim()) {
    lines.push('🎯 *Your move:*');
    lines.push(geminiInsightShort.trim());
    lines.push('');
  }

  lines.push('⚠️ *Trap detected* — Do not chase. Stay on sidelines until the score confirms.');
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
