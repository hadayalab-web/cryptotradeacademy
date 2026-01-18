// Tier1 BTC regular briefing (ES)
// services/telegram/messages/user/es/regular.es.js

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

  const priceLine = `💰 Precio BTC: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Flujo neto de exchanges: ${flowDir} ${flowAbs.toFixed(0)} BTC`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 Sentimiento: ${sentimentLabel || 'Desconocido'}`;

  const scoreLine = `📈 Puntuación de mercado: ${Math.round(score ?? 0)}/100`;
  const trapLine = trap?.isTrap
    ? `🧨 Detector de trampas: ${trap.label || 'Posible trampa'} (${trap.confidence} confianza)`
    : '✅ Detector de trampas: No se detectan trampas críticas.';

  let dirEmoji;
  let dirLabel;
  // Solo alertas de trampa (BUY/SELL/LONG/SHORT completamente eliminados)
  if (trapAlert && trapAlert.alert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ Alerta de Trampa: Evitar Long';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ Alerta de Trampa: Evitar Short';
    } else {
      dirLabel = '🛡️ Alerta de Trampa: Esperar';
    }
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const entryLine = `• Entrada (spot ref.): ${formatUsd(priceUsd)}`;
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• Riesgo/beneficio (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = true; // Siempre modo de espera (señales BUY/SELL completamente eliminadas)
  const modeLine = isNoTrade ? '• Modo: Trap Standby — preparación para la victoria hasta ventaja clara. Priorizar defensa.' : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok está offline — usando solo señales del sistema (on-chain/precio).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🌤️ CryptoWeather Alert - Trap Defense Report');
  lines.push(`📺 Programa de Noticias @ ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（最上部に配置） =====
  lines.push('🎯 Veredicto de trading');
  lines.push(`${dirEmoji} Señal: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // ===== 【USPハイライト】3つの独自機能 =====
  lines.push('✨ Destacados de hoy (3 USPs)');
  lines.push('');
  
  // USP1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    const trapType = trapData.trapType || trapData.bugType || 'Anomalía';
    const trapTypeText = trapType.replace(/_/g, ' ');
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ USP1: Defensa de Trampas - ${trapEmoji} ${trapTypeText} (Puntuación: ${trapScore.toFixed(0)}/100)`);
    
    // Display trap alert details if available
    if (trapAlert && trapAlert.alert) {
      const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
      const recommendationText = trapAlert.recommendation ? trapAlert.recommendation.replace(/_/g, '-') : 'UNKNOWN';
      lines.push(`   🚨 Tipo de Alerta: ${alertTypeText} (Severidad: ${trapAlert.severity})`);
      lines.push(`   💡 Recomendación: ${recommendationText}`);
      if (trapAlert.confidence) {
        lines.push(`   📊 Confianza: ${(trapAlert.confidence * 100).toFixed(0)}%`);
      }
    }
  } else {
    lines.push('🛡️ USP1: Defensa de Trampas - No se detectan trampas actualmente');
  }
  
  // ===== 【ニュース番組構造】オープニング → データ → 解説 → コメンテーター → クロージング =====
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【Apertura】Noticias de Trampa Urgente del Reportero GPT');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // GPTリポーター: CryptoQuantデータ解析に基づくトラップニュース
  const gptNewsText = gptReporterAnalysis || aiAnalysis || 'Analizando datos...';
  const gptNewsLimit = 800;
  const gptNewsDisplay = gptNewsText.length > gptNewsLimit 
    ? `${gptNewsText.slice(0, gptNewsLimit)}…` 
    : gptNewsText;
  lines.push(`📰 ${gptNewsDisplay}`);
  lines.push('');
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Presentación de Datos】Infografía NanoBanana');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 ¡Revisa los medios adjuntos!');
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok癒し系コメンテーター（固定コーナー）
  // CMO提案: Dr. Grokのキャラクターをより強く（情熱的かつ冷静に）押し出す
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 【Comentarista】Dr. Grok: Análisis Apasionado y Racional');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    const grokXLimit = 600;
    const grokXDisplay = grokXAnalysis.length > grokXLimit 
      ? `${grokXAnalysis.slice(0, grokXLimit)}…` 
      : grokXAnalysis;
    lines.push(`📱 Análisis de Sentimiento X: ${grokXDisplay}`);
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
    lines.push(`💚 Estado Psicológico: ${stateEmoji} ${psychologicalSupport.psychologicalState} (Riesgo: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    if (psychologicalSupport.psychologicalAdvice) {
      lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
    }
    if (psychologicalSupport.mentalNote) {
      lines.push(`💊 Nota Mental de Dr. Grok:`);
      lines.push(`"${psychologicalSupport.mentalNote}"`);
    }
  } else {
    // Fallback: Proporcionar un mensaje valioso incluso cuando los datos no están disponibles
    lines.push('💚 Estado Psicológico: 😐 NEUTRAL (Riesgo: 💡 BAJO)');
    lines.push('');
    lines.push('💊 Nota Mental de Dr. Grok:');
    lines.push('"La paciencia no es debilidad—es fuerza estratégica. Los mejores traders saben cuándo no operar."');
  }
  
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【Cierre】No se pierda el próximo episodio');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // ===== 基本市場データ（補足情報として後半に配置） =====
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
    const trapRiskLine = `${riskEmoji} Puntuación de Riesgo de Trampa: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
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
    const noTradeLine = `${noTradeEmoji} Alerta NO TRADE (${noTradeAlert.confidence} confianza, Puntuación de Riesgo: ${noTradeAlert.riskScore}/100)`;
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
  
  // Phase1-Product: Exit Map表示（簡略化：最大8行）
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ Mapa de Salida');
    lines.push(`   Estado de Posición: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} P&L No Realizado: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 Zonas de Toma de Beneficios:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} Zona ${zone.zone}: $${zone.price.toLocaleString()} (Tomar ${zone.takeProfitPct}%)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 Zona ${zone.zone}: $${zone.price.toLocaleString()} (Tomar ${zone.takeProfitPct}%)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ Condiciones de Salida:');
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
    
    lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
  }
  
  lines.push('');

  lines.push('Solo para fines educativos. No constituye asesoramiento financiero.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
