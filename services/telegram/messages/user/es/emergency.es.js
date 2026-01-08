// Tier1 BTC trap alert (ES)
// services/telegram/messages/user/es/emergency.es.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTrapAlert({ inflow, mpi, priceUsd, trap, aiAnalysis }) {
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || 'Whale Trap';
  // BUY/SELL/LONG/SHORT completamente eliminado - solo se muestra la detección de trampa
  const trapSide = '⚠️ Trampa detectada';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = 'Zona de alto riesgo. Reduce exposición y evita entradas impulsivas.';
  } else if (isOffline) {
    grokText = 'Grok está offline; trata esta zona como una trampa de alto riesgo.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *Alerta de trampa de Dr. Grok*');
  lines.push(`*${trapLabel}* (${trap?.confidence || 'UNKNOWN'} confianza)`);
  lines.push('');
  lines.push(`💰 Precio BTC: *${formatUsd(priceUsd)}*`);
  lines.push(`📊 Flujo neto de exchanges: *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI: *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');
  lines.push(trapSide);

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
