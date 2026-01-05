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
  // Phase1-Product: 新機能データ
  noTradeAlert, // NO TRADEアラート結果
  trapRisk, // Trap Riskスコア結果
  exitMap, // Exit Map結果
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

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok is offline — using system-only signals (on-chain/price).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
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
  
  // Phase1-Product: Trap Riskスコア表示
  if (trapRisk && trapRisk.trapRiskScore != null) {
    const riskEmoji = trapRisk.riskLevel === 'CRITICAL' ? '🚨' : 
                      trapRisk.riskLevel === 'HIGH' ? '⚠️' : 
                      trapRisk.riskLevel === 'MEDIUM' ? '⚡' : '✅';
    const trapRiskLine = `${riskEmoji} Trap Risk Score: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
    lines.push(trapRiskLine);
    
    // 主要なリスク要因を表示（最大3つ）
    if (trapRisk.riskFactors && trapRisk.riskFactors.length > 0) {
      const topRisks = trapRisk.riskFactors.slice(0, 3);
      topRisks.forEach(risk => {
        if (risk.score >= 20) {
          lines.push(`   • ${risk.factor}: ${risk.description.substring(0, 60)}...`);
        }
      });
    }
  }
  
  // Phase1-Product: NO TRADEアラート表示
  if (noTradeAlert && noTradeAlert.shouldNoTrade) {
    const noTradeEmoji = noTradeAlert.confidence === 'HIGH' ? '🚫' : 
                         noTradeAlert.confidence === 'MEDIUM' ? '⚠️' : '⏸️';
    const noTradeLine = `${noTradeEmoji} NO TRADE Alert (${noTradeAlert.confidence} confidence, Risk Score: ${noTradeAlert.riskScore}/100)`;
    lines.push(noTradeLine);
    
    // 主要な理由を表示（最大3つ）
    if (noTradeAlert.reasons && noTradeAlert.reasons.length > 0) {
      const topReasons = noTradeAlert.reasons.slice(0, 3);
      topReasons.forEach(reason => {
        lines.push(`   • ${reason}`);
      });
    }
    
    lines.push(`   💡 ${noTradeAlert.recommendation}`);
  }
  
  lines.push('');

  lines.push('🎯 Trade Verdict');
  lines.push(`${dirEmoji} Signal: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  
  // Phase1-Product: Exit Map表示
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ Exit Map (撤退マップ)');
    lines.push(`   Position Status: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} Unrealized P&L: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 Profit Taking Zones:');
      exitMap.exitMap.zones.forEach(zone => {
        const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                              zone.priority === 'MEDIUM' ? '🟡' : '🟢';
        lines.push(`   ${priorityEmoji} Zone ${zone.zone}: $${zone.price.toLocaleString()} (Take ${zone.takeProfitPct}%) - ${zone.description}`);
      });
    }
    
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ Exit Conditions:');
      exitMap.exitMap.exitConditions.forEach(condition => {
        const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : 
                              condition.priority === 'HIGH' ? '⚠️' : '⚡';
        lines.push(`   ${priorityEmoji} ${condition.condition}: ${condition.description}`);
      });
    }
    
    lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
  }
  
  lines.push('');

  lines.push("🧬 Dr. Grok's Take");
  lines.push('Below is a strategic idea, not an official True Bug Entry signal. Follow only when your own plan and risk management align.');
  lines.push(grokText);
  lines.push('');
  lines.push('For educational purposes only. Not financial advice.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
