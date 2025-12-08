// Tier1 BTC regular briefing (ES)

// services/telegram/messages/user/es/regular.js

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
  stats, // Futuro: estadísticas de rendimiento, etc. (no usado por ahora)
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  // --- Instantánea de mercado ------------------------------------------

  const priceLine = `💰 Precio BTC: *${formatUsd(priceUsd)}* (${formatPercent(
    change24h,
  )} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Flujo neto de exchanges: *${flowDir}* ${flowAbs.toFixed(
    0,
  )} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): *${(mpi ?? 0).toFixed(2)}*`;

  const sentimentLine = `🧠 Sentimiento: *${sentimentLabel || 'Desconocido'}*`;

  // --- Puntuación y trampa ---------------------------------------------

  const scoreLine = `📈 *Puntuación de mercado:* ${Math.round(score ?? 0)}/100`;

  const trapLine = trap?.isTrap
    ? `🧨 *Detector de trampas:* ${
        trap.label || 'Posible trampa'
      } (*${trap.confidence}* confianza)`
    : '✅ *Detector de trampas:* No se detectan trampas críticas.';

  // --- Tarjeta de trading ----------------------------------------------

  // Para señales distintas de BUY / SELL, mostrar BUG STANDBY (Defense Active)
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

  const entryLine = `• Entrada (spot ref.): *${formatUsd(priceUsd)}*`;

  const tpLine =
    tradeSignal?.tp != null
      ? `• Take Profit: *${formatUsd(tradeSignal.tp)}*`
      : '• Take Profit: n/a';

  const slLine =
    tradeSignal?.sl != null
      ? `• Stop Loss: *${formatUsd(tradeSignal.sl)}*`
      : '• Stop Loss: n/a';

  const rrLine =
    tradeSignal?.rr != null
      ? `• Riesgo/beneficio (RR): *${tradeSignal.rr.toFixed(2)}*`
      : '';

  // Línea especial de “modo espera” para NO TRADE (= BUG STANDBY)
  const isNoTrade =
    tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';

  const modeLine = isNoTrade
    ? '• Modo: *Bug Standby* — mercado tenso, sin ventaja clara. Mantente fuera y protege tu capital.'
    : '';

  // --- Comentario de Grok ----------------------------------------------

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline =
    !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);

  let grokText = raw;
  const GROK_LIMIT = 1500; // igual que EN: permitir análisis largos

  if (!grokText || isOffline) {
    grokText = 'HOLD - Grok offline.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  // --- Construcción de líneas ------------------------------------------

  const lines = [];

  // Header
  lines.push('📚 *Dr. Grok Market Leak*');
  lines.push(`_Informe de sesión @ ${ts}_`);
  lines.push('');

  // Instantánea de mercado
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // Puntuación y trampa
  lines.push(scoreLine);
  lines.push(trapLine);
  lines.push('');

  // Tarjeta de trading
  lines.push('🎯 *Veredicto de trading*');
  lines.push(`${dirEmoji} *Señal:* ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine); // Solo en BUG STANDBY
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // Comentario de Grok
  lines.push("🧬 *Visión de Dr. Grok*");
  lines.push(
    '_Lo siguiente es una idea estratégica, no una señal oficial de entrada True Bug. Úsala solo si encaja con tu propio plan y gestión de riesgo._',
  );
  lines.push(grokText);
  lines.push('');
  lines.push(
    '_Solo para fines educativos. No constituye asesoramiento financiero._',
  );

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
