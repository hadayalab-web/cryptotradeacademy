// Tier1 BTC trap alert (PT-BR)
// services/telegram/messages/user/pt-br/emergency.pt-br.js

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
      ? '🔻 Armadilha no lado SHORT'
      : trap?.side === 'LONG'
        ? '🔺 Armadilha no lado LONG'
        : '⚠️ Armadilha detectada no mercado';

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
  // Header - 緊急性の視覚的強調
  lines.push('🚨🚨🚨 *ALERTA DE ARMADILHA* 🚨🚨🚨');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRAP INFORMATION (最優先情報を最上部に配置)
  lines.push('⚠️ *ARMADILHA DETECTADA*');
  lines.push(`${trapSide} | *${trap?.confidence || 'UNKNOWN'}* confiança`);
  lines.push(`*${trapLabel}*`);
  lines.push('');

  // ACTION REQUIRED (アクショナブルな情報を明確化)
  lines.push('💡 *AÇÃO NECESSÁRIA*');
  if (trap?.side === 'SHORT') {
    lines.push('• Reduzir alavancagem imediatamente');
    lines.push('• Evitar novas posições long');
    lines.push('• Considerar realizar lucros se estiver em long');
  } else if (trap?.side === 'LONG') {
    lines.push('• Reduzir alavancagem imediatamente');
    lines.push('• Evitar novas posições short');
    lines.push('• Monitorar ação do preço de perto');
  } else {
    lines.push('• Reduzir alavancagem imediatamente');
    lines.push('• Evitar novas posições');
    lines.push('• Monitorar ação do preço de perto');
  }
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);
  lines.push('');

  // MARKET DATA
  lines.push('📊 *Dados do Mercado*');
  lines.push(`💰 BTC: ${formatUsd(priceUsd)}`);
  lines.push(`📊 Fluxo: ${flowDir} ${flowAbs.toFixed(0)} BTC | MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *Análise AI*');
  lines.push(grokText);
  lines.push('');

  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('_Apenas para fins educacionais. Não constitui recomendação ou aconselhamento financeiro._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
