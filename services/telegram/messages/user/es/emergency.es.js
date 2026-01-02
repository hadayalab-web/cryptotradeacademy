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
  const trapSide =
    trap?.side === 'SHORT'
      ? '🔻 Trampa en el lado SHORT'
      : trap?.side === 'LONG'
        ? '🔺 Trampa en el lado LONG'
        : '⚠️ Trampa detectada';

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
  // Header - 緊急性の視覚的強調
  lines.push('🚨🚨🚨 *ALERTA DE TRAMPA* 🚨🚨🚨');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRAP INFORMATION (最優先情報を最上部に配置)
  lines.push('⚠️ *TRAMPA DETECTADA*');
  lines.push(`${trapSide} | *${trap?.confidence || 'UNKNOWN'}* confianza`);
  lines.push(`*${trapLabel}*`);
  lines.push('');

  // ACTION REQUIRED (アクショナブルな情報を明確化)
  lines.push('💡 *ACCIÓN REQUERIDA*');
  if (trap?.side === 'SHORT') {
    lines.push('• Reducir apalancamiento inmediatamente');
    lines.push('• Evitar nuevas posiciones long');
    lines.push('• Considerar tomar ganancias si estás en long');
  } else if (trap?.side === 'LONG') {
    lines.push('• Reducir apalancamiento inmediatamente');
    lines.push('• Evitar nuevas posiciones short');
    lines.push('• Monitorear acción del precio de cerca');
  } else {
    lines.push('• Reducir apalancamiento inmediatamente');
    lines.push('• Evitar nuevas posiciones');
    lines.push('• Monitorear acción del precio de cerca');
  }
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);
  lines.push('');

  // MARKET DATA
  lines.push('📊 *Datos del Mercado*');
  lines.push(`💰 BTC: ${formatUsd(priceUsd)}`);
  lines.push(`📊 Flujo: ${flowDir} ${flowAbs.toFixed(0)} BTC | MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *Análisis AI*');
  lines.push(grokText);
  lines.push('');

  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('_Solo para fines educativos. No constituye asesoramiento financiero._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
