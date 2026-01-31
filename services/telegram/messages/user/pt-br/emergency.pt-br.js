// Tier1 BTC trap alert (PT-BR) - 緊急配信: 面白く・刺さるコンテンツ（Grok + Gemini 1ライナー）
// services/telegram/messages/user/pt-br/emergency.pt-br.js

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
  const flowDir = inflow >= 0 ? 'Entrada' : 'Saída';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || trapDetection?.trapType || 'Armadilha de baleias';
  const trapScoreDisplay =
    trapDetection?.trapScore != null ? `Trap Score *${Math.round(trapDetection.trapScore)}/100*` : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = 'Zona de alto risco. Priorize defesa e evite entradas emocionais.';
  } else if (isOffline) {
    grokText = 'Grok está offline; trate esta faixa como zona de armadilha de alto risco.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *ALERTA DE ARMADILHA — Este é o momento.*');
  lines.push(`*${trapLabel}* ${trapScoreDisplay ? `| ${trapScoreDisplay}` : ''} (${trap?.confidence || 'HIGH'} confiança)`);
  lines.push('');
  lines.push(`💰 BTC: *${formatUsd(priceUsd)}* | 📊 Netflow *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');

  if (grokReasoningShort && typeof grokReasoningShort === 'string' && grokReasoningShort.trim()) {
    lines.push('⚡ *Por que agora:*');
    lines.push(grokReasoningShort.trim());
    lines.push('');
  }

  if (geminiInsightShort && typeof geminiInsightShort === 'string' && geminiInsightShort.trim()) {
    lines.push('🎯 *Sua jogada:*');
    lines.push(geminiInsightShort.trim());
    lines.push('');
  }

  lines.push('⚠️ *Armadilha detectada* — Não persiga. Fique à margem até o score confirmar.');
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);

  lines.push('');
  lines.push('🧬 *Visão do Dr. Grok*');
  lines.push(grokText);
  lines.push('');
  lines.push('_Apenas para fins educacionais. Não constitui aconselhamento financeiro._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
