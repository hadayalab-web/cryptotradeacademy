// Tier1 BTC trap alert (PT-BR)
// services/telegram/messages/user/pt-br/emergency.pt-br.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Phase 3: Snapshot-native Trap Alert (PT-BR)
 */
function formatTrapAlertFromSnapshot(snapshotOrPayload, lang = 'pt-br') {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🚨 *Alerta de armadilha do Dr. Grok* — Sem dados disponíveis.';
  }
  const isSnapshot = snapshotOrPayload.raw != null;
  let inflow, mpi, priceUsd, trap, aiAnalysis;
  if (isSnapshot) {
    const raw = snapshotOrPayload.raw || {};
    const cqDeep = snapshotOrPayload.cqDeep || {};
    const td = snapshotOrPayload.trapDetection || {};
    inflow = raw.inflow ?? cqDeep.exchangeNetflow ?? 0;
    mpi = raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0;
    priceUsd = raw.priceUsd ?? null;
    trap = {
      label: td.label ?? (td.trapDetected ? 'Whale Trap' : 'Whale Trap'),
      confidence: td.trapSeverity ?? (td.trapDetected ? 'HIGH' : 'MEDIUM'),
      note: td.note ?? (td.reasons && td.reasons[0]) ?? null,
      hint: td.hint ?? null
    };
    aiAnalysis = snapshotOrPayload.drGrok?.base ?? snapshotOrPayload.aiAnalysis ?? '';
  } else {
    ({ inflow, mpi, priceUsd, trap, aiAnalysis } = snapshotOrPayload);
  }
  return formatTrapAlert({ inflow, mpi, priceUsd, trap, aiAnalysis });
}

function formatTrapAlert({ inflow, mpi, priceUsd, trap, aiAnalysis }) {
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || 'Whale Trap';
  // BUY/SELL/LONG/SHORT completamente removido - apenas detecção de armadilha exibida
  const trapSide = '⚠️ Armadilha detectada no mercado';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = 'Zona de alto risco. Reduza exposição e evite decisões impulsivas.';
  } else if (isOffline) {
    grokText = 'Grok está offline; trate esta faixa de preço como uma zona de armadilha de alto risco.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *Alerta de armadilha do Dr. Grok*');
  lines.push(`*${trapLabel}* (${trap?.confidence || 'UNKNOWN'} confiança)`);
  lines.push('');
  lines.push(`💰 Preço do BTC: *${formatUsd(priceUsd)}*`);
  lines.push(`📊 Fluxo líquido nas exchanges: *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI: *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');
  lines.push(trapSide);

  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);

  lines.push('');
  lines.push('🧬 *Visão do Dr. Grok*');
  lines.push(grokText);
  lines.push('');
  lines.push('_Apenas para fins educacionais. Não constitui recomendação ou aconselhamento financeiro._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert, formatTrapAlertFromSnapshot };
