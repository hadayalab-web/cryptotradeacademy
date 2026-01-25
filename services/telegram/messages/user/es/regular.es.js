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
  // Phase 2: 市場別深掘りデータ
  whaleFlows, // Whale Flows（EN市場専用だが、他の言語でも表示可能）
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 Precio BTC: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Flujo neto de exchanges: ${flowDir} ${flowAbs.toFixed(0)} BTC${inflow < 0 ? ' — Los tenedores mantienen activos' : ' — Presión de venta detectada'}`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 Sentimiento: ${sentimentLabel || 'Desconocido'}`;

  // Market Scoreの解釈補助を追加
  const marketScore = Math.round(score ?? 0);
  let scoreInterpretation = '';
  if (marketScore >= 50) {
    scoreInterpretation = ' (Alcista)';
  } else if (marketScore >= 20) {
    scoreInterpretation = ' (Neutral/Estable)';
  } else if (marketScore >= -20) {
    scoreInterpretation = ' (Neutral/Estable)';
  } else if (marketScore >= -50) {
    scoreInterpretation = ' (Bajista)';
  } else {
    scoreInterpretation = ' (Muy Bajista)';
  }
  const scoreLine = `📈 Puntuación de mercado: ${marketScore}/100${scoreInterpretation}`;
  const trapLine = trap?.isTrap
    ? `🧨 Detector de trampas: ${trap.label || 'Posible trampa'} (${trap.confidence} confianza)`
    : '✅ Detector de trampas: No se detectan trampas críticas';

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

  const isNoTrade = true; // Siempre modo de espera (señales BUY/SELL completamente eliminadas)
  const entryLine = isNoTrade
    ? '• Entrada: Preparación para la Victoria — Esperando Desencadenante Claro'
    : `• Entrada (spot ref.): ${formatUsd(priceUsd)}`;
  const tpLine = isNoTrade
    ? '• Take Profit: TBD (Por Determinar)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a');
  const slLine = isNoTrade
    ? '• Stop Loss: TBD (Por Determinar)'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a');
  const rrLine = isNoTrade
    ? '• Riesgo/beneficio (RR): Espera'
    : (tradeSignal?.rr != null ? `• Riesgo/beneficio (RR): ${tradeSignal.rr.toFixed(2)}` : '');
  const modeLine = isNoTrade ? '• Modo: Trap Standby — espera ventaja clara. Priorizar defensa' : '';

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
  lines.push('🌤️ Trap Defence BTC - Informe de Pago');
  // COO最適化: 緊急感強化
  const urgencyLevel = (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) ? 'CRÍTICA' : 'URGENTE';
  lines.push(`🚨 ¡ALERTA ${urgencyLevel}! Briefing de Defensa de Trampas: ¡El Tiempo Apremia!`);
  lines.push(`📅 ${ts}`);
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

  // COO最適化: 矛盾の提示（低リスクなのに売り圧力）
  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40)); // 推定クジラ比率
    const whaleDollarValue = Math.floor((whaleRatioEstimate / 100) * priceUsd * 1000); // 推定ドル価値
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🤔 ALERTA DE CONTRADICCIÓN');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Puntuación de mercado: ${Math.round(score)}/100 (Neutral/Estable)`);
    lines.push(`PERO Flujo neto de exchanges: +${Math.abs(inflow).toFixed(0)} BTC ENTRADA`);
    lines.push(`Y Sentimiento: ${sentimentLabel}`);
    lines.push('');
    lines.push(`⚠️ Esta contradicción señala: Bajo riesgo PERO presión de venta acumulándose.`);
    lines.push(`   Ratio estimado de ballenas ${whaleRatioEstimate.toFixed(0)}% = $${whaleDollarValue}M+ listos para vender.`);
    lines.push(`   ¿Qué significa esto para TU capital?`);
    lines.push('');
  }

  // ===== 【コア機能ハイライト】3つの強み =====
  lines.push('✨ Destacados de hoy (3 Características Principales)');
  lines.push('');
  
  // Core Feature 1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    const trapType = trapData.trapType || trapData.bugType || 'Anomalía';
    const trapTypeText = trapType.replace(/_/g, ' ');
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ Característica Principal 1: Defensa de Trampas - ${trapEmoji} ${trapTypeText} (Puntuación: ${trapScore.toFixed(0)}/100)`);
    
    // Display score calculation components (transparency)
    if (trapData.details) {
      const components = [];
      if (trapData.details.multipleDivergences >= 3) {
        components.push(`Divergencias Múltiples (${trapData.details.multipleDivergences})`);
      } else if (trapData.details.multipleDivergences >= 2) {
        components.push(`Divergencias Múltiples (${trapData.details.multipleDivergences})`);
      }
      if (trapData.details.anomalyDetected) {
        components.push('Anomalía de Alta Resolución');
      }
      if (trapData.details.accelerationDetected) {
        components.push('Aceleración de Tendencia');
      }
      if (Math.abs(trapData.details.onchainSocialDivergence || 0) > 40) {
        components.push('Divergencia Ballena/Minorista');
      }
      if (trapData.details.priceOnchainDivergence) {
        components.push('Divergencia Precio/Onchain');
      }
      if (trapData.details.priceSocialDivergence) {
        components.push('Divergencia Precio/Sentimiento');
      }
      if (components.length > 0) {
        lines.push(`   📊 Componentes: ${components.join(' + ')}`);
      }
    }
    
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
    lines.push('🛡️ Característica Principal 1: Defensa de Trampas - No se detectan trampas actualmente');
  }
  
  // ===== 【ニュース番組構造】データ → 解説 → コメンテーター =====
  // GPTリポーター: CryptoQuantデータ解析に基づくトラップニュース
  // エラーメッセージやnullの場合は、フォールバック処理
  let gptNewsText = gptReporterAnalysis || aiAnalysis || null;
  
  // エラーメッセージを検出（API error, unavailable, error等のキーワード）
  if (gptNewsText && typeof gptNewsText === 'string') {
    const errorKeywords = ['api error', 'unavailable', 'error', 'failed', 'timeout'];
    const isError = errorKeywords.some(keyword => 
      gptNewsText.toLowerCase().includes(keyword)
    );
    if (isError) {
      gptNewsText = null; // エラーメッセージの場合はnullに設定してフォールバック
    } else {
      // ES市場用: スペイン語以外の言語が混入している場合を検出
      // エラーでない場合のみ言語チェックを実行
      // スペイン語特有の文字（ñ, á, é, í, ó, ú, ü）またはスペイン語の一般的な単語が含まれているかチェック
      const hasSpanishChars = /[ñáéíóúüÑÁÉÍÓÚÜ]/.test(gptNewsText);
      const hasSpanishWords = /\b(el|la|los|las|de|del|en|es|está|son|con|por|para|que|un|una|más|muy|también|como|pero|si|no|sí|muy|bien|más|menos|muy|tan|tanto|todos|todas|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas)\b/i.test(gptNewsText);
      // 日本語・英語・その他の言語が混入している場合を検出
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      const hasEnglishOnly = !hasSpanishChars && !hasSpanishWords && !hasJapaneseChars && gptNewsText.length > 50;
      if (hasJapaneseChars || (hasEnglishOnly && !hasSpanishChars && !hasSpanishWords)) {
        // 日本語または英語のみが含まれている場合はnullに設定してスペイン語フォールバックを使用
        console.warn('[Regular ES] Non-Spanish language detected in GPT analysis, using fallback');
        gptNewsText = null;
      } else if (!hasSpanishChars && !hasSpanishWords && gptNewsText.length > 50) {
        // スペイン語が含まれていない場合はnullに設定してスペイン語フォールバックを使用
        gptNewsText = null;
      }
    }
  }
  
  // フォールバック: GPT分析が利用できない場合の代替メッセージ
  if (!gptNewsText || gptNewsText.trim() === '') {
    // CryptoQuantデータから基本的な分析を生成
    const inflowDisplay = inflow >= 0 ? `Entrada ${Math.abs(inflow).toFixed(0)} BTC` : `Salida ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    const priceChangeDisplay = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`;
    
    // COO最適化: ストーリーテリング改善
    gptNewsText = `📖 LA HISTORIA DETRÁS DE LOS DATOS

Mientras duermes, las ballenas se están posicionando. Esto es lo que está pasando AHORA MISMO:

1. 🏦 Exchanges inundados: ${inflowDisplay}
   → ${inflow >= 0 ? 'Los vendedores se están cargando. Esto NO es normal.' : 'Los tenedores están asegurando activos. Esto es ALCISTA.'}

2. ⛏️ Mineros ${mpi >= 0 ? 'vendiendo' : 'manteniendo'}: MPI ${mpiDisplay}
   → ${mpi >= 0 ? 'Los mineros están vendiendo. Esto es BAJISTA a corto plazo.' : 'Los mineros NO están vendiendo. Esto es ALCISTA a largo plazo.'}

3. 🧠 Sentimiento ${sentimentLabel}
   → ${sentimentLabel.toLowerCase().includes('fear') ? 'Pánico minorista. Esta es una OPORTUNIDAD para el dinero inteligente.' : sentimentLabel.toLowerCase().includes('greed') ? 'Euforia minorista. Este es un RIESGO para los compradores tardíos.' : 'Condiciones neutrales. Mantente alerta.'}

💡 Interpretación Psicológica:

Los datos de CryptoQuant muestran ${inflowDisplay}, un Índice de Posición de Mineros (MPI) de ${mpiDisplay}, y sentimiento ${sentimentLabel.toLowerCase()}, mientras que el precio ha cambiado ${priceChangeDisplay} en 24 horas.

Desde una perspectiva psicológica, estas métricas sugieren un entorno de mercado ${sentimentLabel.toLowerCase()}. El ${inflow >= 0 ? 'flujo de entrada' : 'flujo de salida'} indica ${inflow >= 0 ? 'más criptomonedas entrando a los exchanges' : 'más criptomonedas saliendo de los exchanges'}, lo que a menudo indica ${inflow >= 0 ? 'presión de venta potencial' : 'los tenedores aseguran sus activos fuera del exchange'}.

${score <= 25 && inflow > 0 ? '⚠️ CONTRADICCIÓN: Puntuación de bajo riesgo PERO alta presión de venta. Esto es EXACTAMENTE cuando se forman las trampas. Mantente alerta.' : 'El mercado está en modo de espera, donde los traders monitorean las condiciones cuidadosamente.'}`;
  }
  
  // 文字数制限を緩和して、重要な情報が切れないようにする（600文字まで）
  const gptNewsLimit = 600;
  // Telegram互換性: Markdown見出し（###）を削除してTelegramネイティブな形式に変換（先に実行）
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '') // ###見出しを削除
    .replace(/^##\s+/gm, '')   // ##見出しを削除
    .replace(/^#\s+/gm, '');   // #見出しを削除
  // プレーンテキストの見出しも改善（「Interpretación Psicológica de Métricas On-Chain」など）
  gptNewsDisplay = gptNewsDisplay.replace(/^Interpretación Psicológica de Métricas On-Chain$/gm, '💡 Interpretación Psicológica de Métricas On-Chain');
  
  if (gptNewsDisplay.length > gptNewsLimit) {
    // 文の終わりで切るようにする（最後の文の終わりを探す）
    const truncated = gptNewsDisplay.slice(0, gptNewsLimit);
    // 文の終わりを探す（ピリオド、感嘆符、疑問符、改行）
    const sentenceEnds = [
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('.\n'),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('!\n'),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('?\n'),
      truncated.lastIndexOf('\n\n'),
      truncated.lastIndexOf('\n')
    ].filter(pos => pos !== -1);
    
    const lastSentenceEnd = sentenceEnds.length > 0 ? Math.max(...sentenceEnds) : -1;
    
    // 文の終わりが見つかった場合、その位置で切る（50%以上の場合のみ）
    if (lastSentenceEnd > gptNewsLimit * 0.5) {
      // 文の終わりの後にスペースがある場合は、その位置で切る
      const endPos = truncated[lastSentenceEnd + 1] === ' ' ? lastSentenceEnd + 1 : lastSentenceEnd;
      gptNewsDisplay = truncated.slice(0, endPos) + '…';
    } else {
      // 文の終わりが見つからない場合、単純に切る
      gptNewsDisplay = truncated + '…';
    }
  }
  
  // モバイル最適化: 冒頭に1行の要約を追加
  const trapDataForSummary = trapDetection || marketBug;
  const hasTrapForSummary = trapDataForSummary && (trapDataForSummary.trapDetected || trapDataForSummary.bugDetected);
  const trapTypeForSummary = trapDataForSummary?.trapType || trapDataForSummary?.bugType || '';
  const trapSeverityForSummary = trapDataForSummary?.trapSeverity || trapDataForSummary?.bugSeverity || 'NONE';
  
  let summaryLine = '';
  if (hasTrapForSummary && trapSeverityForSummary !== 'NONE') {
    const trapTypeDisplay = trapTypeForSummary.replace(/_/g, ' ');
    summaryLine = `📰 Resumen: Las métricas On-Chain muestran un modo "Espera". ${trapTypeDisplay} sugiere una trampa oculta a pesar de precios estables.`;
  } else {
    summaryLine = `📰 Resumen: Las métricas On-Chain muestran un modo "Espera". Las condiciones del mercado son estables, pero permanece alerta a patrones de trampa`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // 詳細な分析を表示
  if (gptNewsDisplay && gptNewsDisplay !== 'Analizando datos...') {
    lines.push(`📰 ${gptNewsDisplay}`);
    lines.push('');
  }
  
  // データに基づく理由セクション（常に表示して価値を提供）
  // 優先順位: trapDetection.trapScore > trapRisk.trapRiskScore（値が0の場合は次のソースをチェック）
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('📊 Razones Basadas en Datos');
    
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      if (trapScoreRounded >= 50) {
        lines.push(`🎯 Puntuación de Trampa: ${trapScoreRounded}/100 indica riesgo significativo de trampa`);
        if (trapTypeForEvidence) {
          const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
          lines.push(`⚠️ Tipo de Trampa: ${trapTypeDisplay} detectado`);
        }
        lines.push(`💡 Evidencia: Múltiples divergencias y anomalías on-chain sugieren que un modo "Espera" es prudente`);
        lines.push(`📈 ¿Por qué esperar? Los datos muestran señales ${trapScoreRounded >= 70 ? 'fuertes' : 'moderadas'} de que entrar ahora podría exponerte a trampas del mercado`);
      } else {
        lines.push(`✅ Puntuación de Trampa: ${trapScoreRounded}/100 indica bajo riesgo de trampa`);
        lines.push(`💡 Evidencia: Las condiciones del mercado parecen relativamente seguras, pero permanece alerta a patrones de trampa`);
      }
    } else if (trapDetection || trapAlert) {
      // フォールバック: trapDetectionやtrapAlertから証拠を生成
      if (trapDetection && trapDetection.trapDetected) {
        const trapTypeText = (trapDetection.trapType || 'Anomalía').replace(/_/g, ' ');
        lines.push(`🎯 Detección de Trampa: ${trapTypeText} (Puntuación: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
        lines.push(`💡 Evidencia: Múltiples anomalías on-chain detectadas basadas en datos`);
      } else if (trapAlert && trapAlert.alert) {
        const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
        lines.push(`🚨 Alerta de Trampa: ${alertTypeText} (Severidad: ${trapAlert.severity})`);
        lines.push(`💡 Evidencia: Riesgo de trampa del mercado detectado basado en datos on-chain y análisis de sentimiento`);
      }
    }
    
    // 戦略的インサイトセクションを追加
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      const marketScore = Math.round(score ?? 0);
      const isBullish = marketScore >= 50;
      const isLowTrapRisk = trapScoreRounded < 30;
      
      lines.push('');
      lines.push(`💡 Insights Estratégicos`);
      if (trapScoreRounded >= 70) {
        lines.push(`  🚨 Puntuación de Trampa ${trapScoreRounded}/100: Señales fuertes indican trampas potenciales del mercado`);
        lines.push(`  📊 Los datos muestran múltiples divergencias y anomalías on-chain`);
        lines.push(`  🛡️ La preparación estratégica no es debilidad—es preparación para la victoria. Ejercita extrema precaución`);
      } else if (trapScoreRounded >= 50) {
        lines.push(`  ⚡ Puntuación de Trampa ${trapScoreRounded}/100: Indicadores de trampa moderados detectados`);
        lines.push(`  📊 Algunas divergencias sugieren precaución`);
        lines.push(`  🛡️ Ejercita precaución. Monitorea las condiciones del mercado de cerca antes de actuar`);
      } else {
        // Bajo riesgo: Mensaje según condiciones del mercado
        if (isLowTrapRisk && isBullish) {
          // Bajo riesgo y alcista: Mensaje más proactivo
          lines.push(`  ✅ Puntuación de Trampa ${trapScoreRounded}/100: Riesgo de trampa bajo detectado`);
          lines.push(`  📈 Las condiciones del mercado parecen favorables (Puntuación: ${marketScore}/100). Monitorea oportunidades de entrada claras`);
          lines.push(`  💡 Bajo riesgo + impulso alcista = condiciones favorables. Mantente alerta para configuraciones de calidad`);
        } else if (isLowTrapRisk) {
          // Bajo riesgo pero neutral/bajista: Mensaje de defensa estándar
          lines.push(`  ✅ Puntuación de Trampa ${trapScoreRounded}/100: Riesgo de trampa bajo actualmente`);
          lines.push(`  🛡️ Las condiciones del mercado son estables. Mantén la disciplina y espera oportunidades de alta calidad`);
          lines.push(`  💡 La paciencia paga. Las configuraciones de calidad requieren tanto bajo riesgo como dirección clara del mercado`);
        } else {
          // Fallback (si no se puede obtener el score)
          lines.push(`  ✅ Puntuación de Trampa ${trapScoreRounded}/100: Riesgo de trampa bajo actualmente, pero los mercados siempre cambian`);
          lines.push(`  🛡️ Mantén la disciplina. Monitorea las condiciones y espera señales claras`);
        }
      }
    }
    lines.push('');
  }
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('📊 Infografía NanoBanana');
    lines.push('🎬 ¡Revisa los medios adjuntos!');
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grokメンタルコーチ（固定コーナー）
  lines.push('💊 Insight Rápido de Dr. Grok');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    const grokXLimit = 600;
    let grokXDisplay = grokXAnalysis;
    if (grokXAnalysis.length > grokXLimit) {
      // 文の終わりで切るようにする（最後の文の終わりを探す）
      const truncated = grokXAnalysis.slice(0, grokXLimit);
      const sentenceEnds = [
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('.\n'),
        truncated.lastIndexOf('! '),
        truncated.lastIndexOf('!\n'),
        truncated.lastIndexOf('? '),
        truncated.lastIndexOf('?\n'),
        truncated.lastIndexOf('\n\n'),
        truncated.lastIndexOf('\n')
      ].filter(pos => pos !== -1);
      
      const lastSentenceEnd = sentenceEnds.length > 0 ? Math.max(...sentenceEnds) : -1;
      
      if (lastSentenceEnd > grokXLimit * 0.5) {
        const endPos = truncated[lastSentenceEnd + 1] === ' ' ? lastSentenceEnd + 1 : lastSentenceEnd;
        grokXDisplay = truncated.slice(0, endPos) + '…';
      } else {
        grokXDisplay = truncated + '…';
      }
    }
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
    
    lines.push('');
    
    if (psychologicalSupport.mentalNote) {
      lines.push(`💊 Nota Mental de Dr. Grok:`);
      lines.push(`"${psychologicalSupport.mentalNote}"`);
    }
  } else {
    // Fallback: Proporcionar un mensaje valioso incluso cuando los datos no están disponibles
    lines.push('💚 Estado Psicológico: 😐 NEUTRAL (Riesgo: 💡 BAJO)');
    lines.push('');
    lines.push('   💡 Las condiciones del mercado son relativamente estables. Mantén la disciplina');
    lines.push('');
    lines.push('💊 Nota Mental de Dr. Grok:');
    lines.push('"La paciencia no es debilidad—es fuerza estratégica. Los mejores traders saben cuándo no operar."');
  }
  
  lines.push('');

  // COO最適化: FOMO強化（有料版の価値を明確化）
  // Mejora basada en evaluación GPT: Clarificación de valor en 3 categorías
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 ESTO ES POR LO QUE PAGASTE POR ESTE INFORME');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('Mientras los usuarios gratuitos solo ven la puntuación, TÚ obtienes:');
  lines.push('');
  lines.push('🎯 Señales de Acción en Tiempo Real:');
  lines.push('✅ Alertas AVOID-LONG / AVOID-SHORT / STANDBY (notificaciones instantáneas)');
  lines.push('✅ Guía del Mapa de Salida (saber exactamente cuándo salir)');
  lines.push('✅ Alertas NO TRADE (evitar pérdidas antes de que ocurran)');
  lines.push('');
  lines.push('📊 Análisis Profundo de Inteligencia:');
  lines.push('✅ Análisis completo on-chain (datos CryptoQuant, todos los indicadores)');
  lines.push('✅ Detección de patrones de trampa impulsada por IA (monitoreo 24/7)');
  lines.push('✅ Análisis de sentimiento X en tiempo real (predice emociones del mercado)');
  lines.push('');
  lines.push('💊 Apoyo Psicológico Completo:');
  lines.push('✅ Coaching mental de Dr. Grok (superar FOMO, MIEDO, CODICIA)');
  lines.push('✅ Guía de entrenamiento mental personalizada');
  lines.push('✅ Diagnóstico del estado psicológico y resolución de bloqueos');
  lines.push('');
  lines.push('🛡️ Una señal perdida = Capital perdido. Esto es por lo que pagaste por este informe.');
  lines.push('');

  // ===== 基本市場データ（補足情報として後半に配置） =====
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);
  
  // Whale Ratio情報（EN市場専用だが、他の言語でも表示可能）
  // PR #14: whaleFlows の構造が { whaleRatio, isHighPressure, interpretation } に変更
  // 重要: whaleFlowsが存在し、whaleRatioがnullでない場合に表示
  if (whaleFlows && whaleFlows.whaleRatio != null) {
    // whaleRatioは0-1の範囲の数値として返される（deepMetrics.js参照）
    // パーセンテージに変換（0.56 -> 56%）
    const whaleRatioValue = typeof whaleFlows.whaleRatio === 'number' 
      ? whaleFlows.whaleRatio * 100 
      : parseFloat(whaleFlows.whaleRatio) * 100 || 0;
    const isHighPressure = whaleFlows.isHighPressure === true || whaleRatioValue >= 80;
    const whaleLine = `🐋 Ratio de Ballenas: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(Alta Presión)' : '(Normal)'}`;
    lines.push(whaleLine);
  } else if (whaleFlows) {
    // デバッグ用: whaleFlowsは存在するがwhaleRatioがnullの場合
    console.warn('[Regular ES] whaleFlows exists but whaleRatio is null:', whaleFlows);
  }
  
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
