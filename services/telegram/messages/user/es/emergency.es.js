// Tier1 BTC trap alert (ES) - 緊急配信: 面白く・刺さるコンテンツ（Grok + Gemini 1ライナー）
// services/telegram/messages/user/es/emergency.es.js

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
  const flowDir = inflow >= 0 ? 'Entrada' : 'Salida';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || trapDetection?.trapType || 'Trampa de ballenas';
  const trapScoreDisplay =
    trapDetection?.trapScore != null ? `Trap Score *${Math.round(trapDetection.trapScore)}/100*` : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = 'Zona de alto riesgo. Prioriza defensa y evita entradas emocionales.';
  } else if (isOffline) {
    grokText = 'Grok está offline; trata esta zona como trampa de alto riesgo.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *ALERTA DE TRAMPA — Este es el momento.*');
  lines.push(`*${trapLabel}* ${trapScoreDisplay ? `| ${trapScoreDisplay}` : ''} (${trap?.confidence || 'HIGH'} confianza)`);
  lines.push('');
  lines.push(`💰 BTC: *${formatUsd(priceUsd)}* | 📊 Netflow *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');

  if (grokReasoningShort && typeof grokReasoningShort === 'string' && grokReasoningShort.trim()) {
    lines.push('⚡ *Por qué ahora:*');
    lines.push(grokReasoningShort.trim());
    lines.push('');
  }

  if (geminiInsightShort && typeof geminiInsightShort === 'string' && geminiInsightShort.trim()) {
    lines.push('🎯 *Tu jugada:*');
    lines.push(geminiInsightShort.trim());
    lines.push('');
  }

  lines.push('⚠️ *Trampa detectada* — No persigas. Quédate al margen hasta que el score confirme.');
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);

  lines.push('');
  lines.push('🧬 *Visión de Dr. Grok*');
  lines.push(grokText);
  lines.push('');
  lines.push('_Solo para fines educativos. No constituye asesoramiento financiero._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
