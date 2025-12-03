// Tier1 BTC regular briefing (EN)
// services/telegram/messages/user/en/regular.js

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
  stats, // まだ未使用。将来: 勝率などをここに入れる想定。
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  // --- Market snapshot -------------------------------------------------
  const priceLine = `💰 BTC Price: *${formatUsd(priceUsd)}* (${formatPercent(
    change24h,
  )} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Exchange Netflow: *${flowDir}* ${flowAbs.toFixed(
    0,
  )} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): *${(mpi ?? 0).toFixed(2)}*`;
  const sentimentLine = `🧠 Sentiment: *${sentimentLabel || 'Unknown'}*`;

  // --- Score & Trap ----------------------------------------------------
  const scoreLine = `📈 *Market Score:* ${Math.round(score ?? 0)}/100`;
  const trapLine = trap?.isTrap
    ? `🧨 *Trap Detector:* ${trap.label || 'Potential trap'} (*${
        trap.confidence
      }* confidence)`
    : '✅ *Trap Detector:* No critical trap detected.';

  // --- Trade card ------------------------------------------------------
  const dirEmoji =
    tradeSignal?.signal === 'BUY'
      ? '🟢'
      : tradeSignal?.signal === 'SELL'
      ? '🔴'
      : '⚪️';

  const dirLabel =
    tradeSignal?.signal === 'BUY'
      ? 'BUY'
      : tradeSignal?.signal === 'SELL'
      ? 'SELL'
      : 'NO TRADE';

  const entryLine = `• Entry (spot ref.): *${formatUsd(priceUsd)}*`;

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
      ? `• Risk/Reward (RR): *${tradeSignal.rr.toFixed(2)}*`
      : '';

  // --- Grok commentary -------------------------------------------------
  let grokText = (aiAnalysis || '').trim();
  const GROK_LIMIT = 360;
  if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];

  // Header
  lines.push("📚 *Dr. Grok's Market Leak*");
  lines.push(`_Session Briefing @ ${ts}_`);
  lines.push('');

  // Market snapshot
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // Score & trap
  lines.push(scoreLine);
  lines.push(trapLine);
  lines.push('');

  // Trade card
  lines.push('🎯 *Trade Verdict*');
  lines.push(`${dirEmoji} *Signal:* ${dirLabel}`);
  lines.push(entryLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // Grok take
  lines.push("🧬 *Dr. Grok's Take*");
  if (grokText) {
    lines.push(grokText);
  } else {
    lines.push('Grok is offline or returned no additional commentary.');
  }

  lines.push('');
  lines.push('_For educational purposes only. Not financial advice._');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
