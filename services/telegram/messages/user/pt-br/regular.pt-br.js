// Tier1 BTC regular briefing (PT-BR)

// services/telegram/messages/user/pt-br/regular.js

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;
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
  stats, // Futuro: estatísticas de performance etc. (ainda não usado)
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  // --- Visão rápida do mercado -----------------------------------------

  const priceLine = `💰 Preço do BTC: ${formatUsd(priceUsd)} (${formatPercent(
    change24h,
  )} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Fluxo líquido nas exchanges: ${flowDir} ${flowAbs.toFixed(
    0,
  )} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;

  const sentimentLine = `🧠 Sentimento de mercado: *${
    sentimentLabel || 'Desconhecido'
  }*`;

  // --- Pontuação e armadilhas ------------------------------------------

  const scoreLine = `📈 Score de mercado: ${Math.round(score ?? 0)}/100`;

  const trapLine = trap?.isTrap
    ? `🧨 Detector de armadilhas: ${
        trap.label || 'Armadilha potencial'
      } (${trap.confidence} confiança)`
    : '✅ Detector de armadilhas: Nenhuma armadilha crítica detectada.';

  // --- Card de trade ----------------------------------------------------

  // Qualquer valor diferente de BUY / SELL é exibido como BUG STANDBY (Defense Active)
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

  const tpLine =
    tradeSignal?.tp != null
      ? `• Take Profit: ${formatUsd(tradeSignal.tp)}`
      : '• Take Profit: n/a';

  const slLine =
    tradeSignal?.sl != null
      ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}`
      : '• Stop Loss: n/a';

  const rrLine =
    tradeSignal?.rr != null
      ? `• Risco/Retorno (RR): ${tradeSignal.rr.toFixed(2)}`
      : '';

  // Linha específica de “modo espera” quando for NO TRADE (= BUG STANDBY)
  const isNoTrade =
    tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';

  const modeLine = isNoTrade
    ? '• Modo: Bug Standby — mercado estressado, sem edge limpo. Fique de fora e proteja o capital.'
    : '';

  // --- Comentário do Grok ----------------------------------------------

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline =
    !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);

  let grokText = raw;
  const GROK_LIMIT = 1500; // mesmo limite do EN: permite análises mais longas

  if (!grokText || isOffline) {
    grokText = 'HOLD - Grok offline.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  // --- Montagem das linhas ---------------------------------------------

  const lines = [];

  // Header
  lines.push('📚 Market Leak do Dr. Grok');
  lines.push(`Briefing da sessão @ ${ts}`);
  lines.push('');

  // Visão rápida do mercado
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // Pontuação e armadilhas
  lines.push(scoreLine);
  lines.push(trapLine);
  lines.push('');

  // Card de trade
  lines.push('🎯 Veredito de trade');
  lines.push(`${dirEmoji} Sinal: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine); // só aparece em BUG STANDBY
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // Comentário do Grok
  lines.push('🧬 Visão do Dr. Grok');
  lines.push(
    'O conteúdo abaixo é uma ideia estratégica, não um sinal oficial de entrada True Bug. Siga apenas se estiver alinhado com o seu plano e gestão de risco.',
  );
  lines.push(grokText);
  lines.push('');
  lines.push(
    'Apenas para fins educacionais. Não constitui recomendação ou aconselhamento financeiro.',
  );

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };


