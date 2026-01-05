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
  // Phase1-Product: 新機能データ
  noTradeAlert, // NO TRADEアラート結果
  trapRisk, // Trap Riskスコア結果
  exitMap, // Exit Map結果
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
  lines.push('📚 Market Leak do Dr. Grok');
  lines.push(`Briefing da sessão @ ${ts}`);
  lines.push('');

  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);
  
  // Phase1-Product: Trap Riskスコア表示
  if (trapRisk && trapRisk.trapRiskScore != null) {
    const riskEmoji = trapRisk.riskLevel === 'CRITICAL' ? '🚨' : 
                      trapRisk.riskLevel === 'HIGH' ? '⚠️' : 
                      trapRisk.riskLevel === 'MEDIUM' ? '⚡' : '✅';
    const trapRiskLine = `${riskEmoji} Pontuação de Risco de Armadilha: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
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
    const noTradeLine = `${noTradeEmoji} Alerta NO TRADE (${noTradeAlert.confidence} confiança, Pontuação de Risco: ${noTradeAlert.riskScore}/100)`;
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
  
  lines.push(trapLine);
  lines.push('');

  lines.push('🎯 Veredito de trade');
  lines.push(`${dirEmoji} Sinal: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  
  // Phase1-Product: Exit Map表示
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ Mapa de Saída (Exit Map)');
    lines.push(`   Status da Posição: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} P&L Não Realizado: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 Zonas de Realização de Lucros:');
      exitMap.exitMap.zones.forEach(zone => {
        const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                              zone.priority === 'MEDIUM' ? '🟡' : '🟢';
        lines.push(`   ${priorityEmoji} Zona ${zone.zone}: $${zone.price.toLocaleString()} (Realizar ${zone.takeProfitPct}%) - ${zone.description}`);
      });
    }
    
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ Condições de Saída:');
      exitMap.exitMap.exitConditions.forEach(condition => {
        const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : 
                              condition.priority === 'HIGH' ? '⚠️' : '⚡';
        lines.push(`   ${priorityEmoji} ${condition.condition}: ${condition.description}`);
      });
    }
    
    lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
  }
  
  lines.push('');

  lines.push('🧬 Visão do Dr. Grok');
  lines.push('O conteúdo abaixo é uma ideia estratégica, não um sinal oficial de entrada True Bug. Siga apenas se estiver alinhado com o seu plano e gestão de risco.');
  lines.push(grokText);
  lines.push('');
  lines.push('Apenas para fins educacionais. Não constitui recomendação ou aconselhamento financeiro.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
