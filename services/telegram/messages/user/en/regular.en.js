// Tier1 BTC regular briefing (EN)
// services/telegram/messages/user/en/regular.en.js

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
  stats, // reserved
  trapScore, // Phase 2: EN市場専用
  whaleFlows, // Phase 2: EN市場専用
  liquidations, // Phase 2: EN市場専用
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 BTC Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Exchange Netflow: ${flowDir} ${flowAbs.toFixed(0)} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 Sentiment: ${sentimentLabel || 'Unknown'}`;

  const scoreLine = `📈 Market Score: ${Math.round(score ?? 0)}/100`;
  const trapLine = trap?.isTrap
    ? `🧨 Trap Detector: ${trap.label || 'Potential trap'} (*${trap.confidence}* confidence)`
    : '✅ Trap Detector: No critical trap detected.';

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

  const entryLine = `• Entry (spot ref.): ${formatUsd(priceUsd)}`;
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• Risk/Reward (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';
  const modeLine = isNoTrade
    ? '• Mode: Bug Standby — no clean edge. Sit out and protect capital.'
    : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 150; // Strategic OS requirement: 60-second reads (150 words max)
  if (!grokText || isOffline) {
    grokText = 'Grok offline. Using on-chain signals only.';
  } else {
    // Count words and limit to 150 words
    const words = grokText.split(/\s+/);
    if (words.length > GROK_LIMIT) {
      grokText = words.slice(0, GROK_LIMIT).join(' ') + '...';
    }
  }

  const lines = [];
  lines.push("📚 Dr. Grok's Market Leak");
  lines.push(`Session Briefing @ ${ts}`);
  lines.push('');

  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);

  // Phase 2: trapScore表示（EN市場専用）
  if (trapScore != null) {
    const trapScoreLine = `🎯 Trap Score: ${Math.round(trapScore)}/100 ${trapScore >= 60 ? '🚨 HIGH RISK' : trapScore >= 40 ? '⚠️ MODERATE' : '✅ LOW'}`;
    lines.push(trapScoreLine);

    // Whale Ratio情報（EN市場専用）
    // PR #14: whaleFlows の構造が { whaleRatio, isHighPressure, interpretation } に変更
    if (whaleFlows && whaleFlows.whaleRatio != null) {
      const whaleLine = `🐋 Whale Ratio: ${(whaleFlows.whaleRatio * 100).toFixed(1)}% ${whaleFlows.isHighPressure ? '(High Pressure)' : '(Normal)'}`;
      lines.push(whaleLine);
    }

    // Liquidations情報（EN市場専用）
    // PR #14: liquidations の構造が { longLiquidations, shortLiquidations, totalLiquidations } に変更
    const totalLiquidations = typeof liquidations === 'number'
      ? liquidations
      : (liquidations?.totalLiquidations ?? 0);
    if (totalLiquidations > 0) {
      if (typeof liquidations === 'object' && liquidations.longLiquidations != null && liquidations.shortLiquidations != null) {
        const liqLine = `💥 24h Liquidations: ${formatUsd(totalLiquidations)} (Long: ${formatUsd(liquidations.longLiquidations)}, Short: ${formatUsd(liquidations.shortLiquidations)})`;
        lines.push(liqLine);
      } else {
        const liqLine = `💥 24h Liquidations: ${formatUsd(totalLiquidations)}`;
        lines.push(liqLine);
      }
    }
  }

  lines.push(trapLine);
  lines.push('');

  lines.push('🎯 Trade Verdict');
  lines.push(`${dirEmoji} Signal: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  lines.push("🧬 Dr. Grok's Take (60-sec read)");
  lines.push(grokText); // Already limited to 150 words by GROK_LIMIT
  lines.push('');
  lines.push('⚠️ Educational only. Not financial advice.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
