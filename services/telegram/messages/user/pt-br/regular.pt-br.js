// Tier1 BTC regular briefing (PT-BR)
// services/telegram/messages/user/pt-br/regular.pt-br.js

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatRegularBriefing({
  now,
  inflow,
  mpi,
  sentimentLabel,
  priceUsd,
  change24h,
  score,
  tradeSignal,
  trap,
  aiAnalysis,
  stats,
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 Preço do BTC: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Fluxo líquido nas exchanges: ${flowDir} ${flowAbs.toFixed(0)} BTC`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 Sentimento de mercado: *${sentimentLabel || 'Desconhecido'}*`;

  const scoreLine = `📈 Score de mercado: ${Math.round(score ?? 0)}/100`;
  const trapLine = trap?.isTrap
    ? `🧨 Detector de armadilhas: ${trap.label || 'Armadilha potencial'} (${trap.confidence} confiança)`
    : '✅ Detector de armadilhas: Nenhuma armadilha crítica detectada.';

  let dirEmoji;
  let dirLabel;
  if (tradeSignal?.signal === 'BUY') {
    dirEmoji = '🟢';
    dirLabel = 'BUY';
  } else if (tradeSignal?.signal === 'SELL') {
    dirEmoji = '🔴';
    dirLabel = 'SELL';
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'BUG STANDBY (Defense Active)';
  }

  const entryLine = `• Entrada (ref. spot): ${formatUsd(priceUsd)}`;
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• Risco/Retorno (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';
  const modeLine = isNoTrade ? '• Modo: Bug Standby — sem edge limpo. Fique de fora e proteja o capital.' : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok está offline — usando apenas sinais do sistema (on-chain/preço).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  // Header
  lines.push('📚 *TrapShield Resumo do Mercado*');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRADE SIGNAL (最優先情報を上部に配置)
  lines.push('🎯 *SINAL DE TRADING*');
  lines.push(`${dirEmoji} *${dirLabel}* | Entrada: ${formatUsd(priceUsd)}`);
  if (tpLine && slLine) {
    const tp = tradeSignal?.tp ? formatUsd(tradeSignal.tp) : 'n/a';
    const sl = tradeSignal?.sl ? formatUsd(tradeSignal.sl) : 'n/a';
    lines.push(`TP: ${tp} | SL: ${sl}${rrLine ? ` | RR: ${tradeSignal.rr.toFixed(2)}` : ''}`);
  }
  if (modeLine) lines.push(modeLine);
  lines.push('');

  // MARKET STATUS
  lines.push('📊 *ESTADO DO MERCADO*');
  lines.push(scoreLine);
  
  const trapStatusLine = trap?.isTrap
    ? `🧨 Armadilha: ${trap.label || 'Potencial'} (*${trap.confidence}* confiança)`
    : '✅ Armadilha: Nenhuma detectada';
  lines.push(trapStatusLine);
  lines.push('');

  // KEY METRICS
  lines.push('📈 *Métricas Principais*');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *Análise AI* (leitura 60 seg)');
  lines.push(grokText);
  lines.push('');
  
  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('⚠️ Apenas para fins educacionais. Não constitui recomendação ou aconselhamento financeiro.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
