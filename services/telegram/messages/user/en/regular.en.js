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
  // USP1: トラップ防御結果
  trapDetection, // トラップ防御結果（優先）
  marketBug, // トラップ防御結果（後方互換性）
  trapAlert, // トラップアラート
  divergenceSignal, // ダイバージェンスシグナル
  // USP3: Dr. Grokの心理的サポート
  psychologicalSupport, // 心理的サポート診断結果
  // USP2: Geminiコンテンツ生成
  hasGeminiContent = false, // Gemini画像・動画が生成されたかどうか
  // ニュース番組構造用パラメータ
  gptReporterAnalysis, // GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
  grokXAnalysis, // Grok X解析結果（Xセンチメント分析）
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
  // Trap alerts only (BUY/SELL/LONG/SHORT completely removed)
  if (trapAlert && trapAlert.alert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ Trap Alert: Avoid Long';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ Trap Alert: Avoid Short';
    } else {
      dirLabel = '🛡️ Trap Alert: Standby';
    }
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const entryLine = `• Entry (spot ref.): ${formatUsd(priceUsd)}`;
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• Risk/Reward (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = true; // Always standby mode (BUY/SELL signals completely removed)
  const modeLine = isNoTrade
    ? '• Mode: Trap Standby — wait for clear edge. Prioritize defense.'
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
  lines.push('🌤️ CryptoWeather Alert - Trap Defense Report');
  lines.push(`📺 News Program @ ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（最上部に配置） =====
  lines.push('🎯 Trade Verdict');
  lines.push(`${dirEmoji} Signal: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // ===== 【USPハイライト】3つの独自機能 =====
  lines.push('✨ Today\'s Highlights (3 USPs)');
  lines.push('');
  
  // USP1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    const trapType = trapData.trapType || trapData.bugType || 'Anomaly';
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ USP1: Trap Defense - ${trapEmoji} ${trapType} (Score: ${trapScore.toFixed(0)}/100)`);
    
    // Display score calculation components (transparency)
    if (trapData.details) {
      const components = [];
      if (trapData.details.multipleDivergences >= 3) {
        components.push(`Multiple Divergences (${trapData.details.multipleDivergences})`);
      } else if (trapData.details.multipleDivergences >= 2) {
        components.push(`Multiple Divergences (${trapData.details.multipleDivergences})`);
      }
      if (trapData.details.anomalyDetected) {
        components.push('High-Res Anomaly');
      }
      if (trapData.details.accelerationDetected) {
        components.push('Trend Acceleration');
      }
      if (Math.abs(trapData.details.onchainSocialDivergence || 0) > 40) {
        components.push('Whale/Retail Divergence');
      }
      if (trapData.details.priceOnchainDivergence) {
        components.push('Price/Onchain Divergence');
      }
      if (trapData.details.priceSocialDivergence) {
        components.push('Price/Sentiment Divergence');
      }
      if (components.length > 0) {
        lines.push(`   📊 Components: ${components.join(' + ')}`);
      }
    }
    
    // Display trap alert details if available
    if (trapAlert && trapAlert.alert) {
      lines.push(`   🚨 Alert Type: ${trapAlert.type} (Severity: ${trapAlert.severity})`);
      lines.push(`   💡 Recommendation: ${trapAlert.recommendation}`);
      if (trapAlert.confidence) {
        lines.push(`   📊 Confidence: ${(trapAlert.confidence * 100).toFixed(0)}%`);
      }
    }
  } else {
    lines.push('🛡️ USP1: Trap Defense - No trap detected currently');
  }
  
  // ===== 【ニュース番組構造】オープニング → データ → 解説 → コメンテーター → クロージング =====
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【Opening】Breaking Trap News from GPT Reporter');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // GPTリポーター: CryptoQuantデータ解析に基づくトラップニュース
  const gptNewsText = gptReporterAnalysis || aiAnalysis || 'Analyzing data...';
  const gptNewsLimit = 800;
  const gptNewsDisplay = gptNewsText.length > gptNewsLimit 
    ? `${gptNewsText.slice(0, gptNewsLimit)}…` 
    : gptNewsText;
  lines.push(`📰 ${gptNewsDisplay}`);
  lines.push('');
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】NanoBanana Infographic');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 Check attached image/video!');
    lines.push('');
  }
  
  // 【解説】GPTリポーターの詳細解説（既にオープニングで表示済みの場合は省略）
  // 必要に応じて追加の解説セクションをここに追加可能
  
  // 【コメンテーター】Dr. Grok癒し系コメンテーター（固定コーナー）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 【Commentator】Dr. Grok\'s Take');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    const grokXLimit = 600;
    const grokXDisplay = grokXAnalysis.length > grokXLimit 
      ? `${grokXAnalysis.slice(0, grokXLimit)}…` 
      : grokXAnalysis;
    lines.push(`📱 X Sentiment Analysis: ${grokXDisplay}`);
    lines.push('');
  }
  
  // Dr. Grokの心理的サポート（癒し系コメンテーターとして）
  if (psychologicalSupport && psychologicalSupport.psychologicalState !== 'UNKNOWN') {
    const stateEmoji = psychologicalSupport.psychologicalState === 'FOMO' ? '😰' :
                       psychologicalSupport.psychologicalState === 'FEAR' ? '😨' :
                       psychologicalSupport.psychologicalState === 'GREED' ? '😍' :
                       psychologicalSupport.psychologicalState === 'PANIC' ? '😱' :
                       psychologicalSupport.psychologicalState === 'EUPHORIA' ? '😄' :
                       psychologicalSupport.psychologicalState === 'CONFUSION' ? '🤔' : '😐';
    const riskEmoji = psychologicalSupport.psychologicalRisk === 'CRITICAL' ? '🚨' :
                      psychologicalSupport.psychologicalRisk === 'HIGH' ? '⚠️' :
                      psychologicalSupport.psychologicalRisk === 'MEDIUM' ? '⚡' : '💡';
    lines.push(`💚 Psychological State: ${stateEmoji} ${psychologicalSupport.psychologicalState} (Risk: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    if (psychologicalSupport.psychologicalAdvice) {
      lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
    }
  } else {
    lines.push('💚 Psychological Analysis: Fetching data...');
  }
  
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【Closing】Stay tuned for the next episode');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // ===== 基本市場データ（補足情報として後半に配置） =====
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
  
  // Phase1-Product: Exit Map表示（簡略化：最大8行）
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ Exit Map');
    lines.push(`   Position Status: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} Unrealized P&L: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 Profit Taking Zones:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} Zone ${zone.zone}: $${zone.price.toLocaleString()} (Take ${zone.takeProfitPct}%)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 Zone ${zone.zone}: $${zone.price.toLocaleString()} (Take ${zone.takeProfitPct}%)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ Exit Conditions:');
      const criticalConditions = exitMap.exitMap.exitConditions
        .filter(condition => condition.priority === 'CRITICAL' || condition.priority === 'HIGH')
        .slice(0, 2);
      if (criticalConditions.length === 0) {
        exitMap.exitMap.exitConditions.slice(0, 2).forEach(condition => {
          const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : 
                                condition.priority === 'HIGH' ? '⚠️' : '⚡';
          lines.push(`   ${priorityEmoji} ${condition.condition}`);
        });
      } else {
        criticalConditions.forEach(condition => {
          const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : '⚠️';
          lines.push(`   ${priorityEmoji} ${condition.condition}`);
        });
      }
    }
    
    if (exitMap.exitMap.recommendation) {
      lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
    }
  }
  
  lines.push('');

  lines.push('For educational purposes only. Not financial advice.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
