// Tier1 BTC regular briefing (ES)
// services/telegram/messages/user/es/regular.es.js

const { hasJapanese, filterJapaneseFromArray, cleanTimingInfo, hasJapaneseInPsychologicalInsights, formatViralScore } = require('../../shared/contentFilters');

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * スペイン語の心理的アドバイスを取得（日本語が含まれている場合のフォールバック）
 * @param {string} psychologicalState - 心理状態
 * @param {string} psychologicalRisk - リスクレベル
 * @returns {string} スペイン語のアドバイス
 */
function getSpanishPsychologicalAdvice(psychologicalState, psychologicalRisk) {
  if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'LOW') {
    return '✅ Estado neutral - No se detectaron bloqueos mentales: El sentimiento del mercado está equilibrado. No se detectaron emociones extremas. Las condiciones son estables.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'MEDIUM') {
    return '⚠️ Estado neutral - Monitorear de cerca: El sentimiento del mercado está equilibrado pero las condiciones pueden cambiar. Mantente alerta.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'HIGH') {
    return '🚨 Estado neutral - Alto riesgo: Este sentimiento "neutral" puede estar ocultando condiciones de trampa. Mantén la disciplina.';
  } else if (psychologicalState === 'FOMO') {
    return '🚨 FOMO detectado - Presión de compra extrema: Los minoristas están persiguiendo mientras las ballenas pueden estar distribuyendo. Este es un patrón clásico de trampa.';
  } else if (psychologicalState === 'FEAR') {
    return '😨 Miedo detectado - El mercado muestra bajo interés minorista: El miedo puede ser paralizante, pero también puede señalar oportunidades potenciales.';
  } else if (psychologicalState === 'GREED') {
    return '😍 Codicia detectada - Condiciones eufóricas: La codicia es la emoción más peligrosa en el trading. Considera tomar ganancias.';
  } else if (psychologicalState === 'PANIC') {
    return '😱 Pánico detectado - Miedo extremo: El pánico es tu amígdala secuestrando tu corteza prefrontal. Detente. Respira. Revisa los datos.';
  } else if (psychologicalState === 'EUPHORIA') {
    return '😄 Euforia detectada - Celebración del mercado: La euforia es la forma del mercado de hacerte olvidar el riesgo. Mantén la disciplina.';
  } else if (psychologicalState === 'CONFUSION') {
    return '🤔 Confusión detectada - Señales poco claras: La confusión es tu cerebro pidiendo claridad. No fuerces una operación. Cuando tengas dudas, espera.';
  }
  
  // デフォルト
  return 'Las condiciones del mercado son relativamente estables. Mantén la disciplina y espera configuraciones de calidad.';
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
  trapScore, // Phase 2: トラップスコア（ENと同様）
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
  // GrokとGeminiの統合最適化結果
  sosovalueArticle = null, // Gemini: CQ+過去比較SoSoValue風記事
  integratedOptimization = null, // 廃止
  // Phase 2: 市場別深掘りデータ
  whaleFlows, // Whale Flows（ENと同様）
  liquidations = null, // ENと同様（24h清算）
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

  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;

  let trapLine = '✅ Detector de trampas: No se detectan trampas críticas';
  if (trapDetection && trapDetection.trapDetected) {
    const trapSev = trapDetection.trapSeverity || 'NONE';
    const trapSc = trapDetection.trapScore || 0;
    if (trapSev !== 'NONE' && trapSc > 0) {
      const trapEmoji = trapSev === 'CRITICAL' ? '🚨' : trapSev === 'HIGH' ? '⚠️' : trapSev === 'MEDIUM' ? '⚡' : '💡';
      const trapTypeLabel = (trapDetection.trapType || 'Trampa').replace(/_/g, ' ');
      trapLine = `${trapEmoji} Detector de trampas: ${trapTypeLabel} (Severidad: ${trapSev}, Puntuación: ${trapSc}/100)`;
    }
  } else if (trap?.isTrap) {
    trapLine = `🧨 Detector de trampas: ${trap.label || 'Posible trampa'} (${trap.confidence} confianza)`;
  }

  let dirEmoji;
  let dirLabel;
  if (hasActiveTrapAlert) {
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
  } else if (isLowTrapRisk) {
    dirEmoji = '📐';
    dirLabel = 'Bajo riesgo de trampa — Ventana de posicionamiento';
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isPositioningWindow = isLowTrapRisk && !hasActiveTrapAlert;
  const entryPrice = priceUsd;
  const tpPrice = tradeSignal?.tp;
  const slPrice = tradeSignal?.sl;
  const isNoTradeZone = !isPositioningWindow && (
    (tpPrice == null && slPrice == null) ||
    (entryPrice === tpPrice && entryPrice === slPrice)
  );
  const entryLine = isPositioningWindow
    ? `• Entrada: Considera setups de calidad cuando la ventaja sea clara (ref. ${formatUsd(priceUsd)})`
    : (!isLowTrapRisk && !hasActiveTrapAlert
      ? '• Entrada: Preparación para la Victoria — Esperando Desencadenante Claro'
      : `• Entrada (spot ref.): ${formatUsd(priceUsd)}`);
  const tpLine = isPositioningWindow
    ? '• Take Profit: Define tu nivel (antes de entrar)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: TBD (Por Determinar)');
  const slLine = isPositioningWindow
    ? '• Stop Loss: Define antes de entrar'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: TBD (Por Determinar)');
  const rrLine = tradeSignal?.rr != null ? `• Riesgo/beneficio (RR): ${tradeSignal.rr.toFixed(2)}` : (isPositioningWindow ? '• Riesgo/beneficio (RR): Define por setup' : '• Riesgo/beneficio (RR): Espera');
  const modeLine = isPositioningWindow
    ? '• Modo: Bajo riesgo de trampa — considera long/short con riesgo definido. Apalancamiento solo cuando la ventaja sea clara.'
    : (!isLowTrapRisk ? '• Modo: Trap Standby — espera ventaja clara. Priorizar defensa' : '');

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
  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';
  if (isHighTrapForHeader) {
    lines.push(`🚨 Alerta de Defensa de Trampas — Riesgo de trampa ${trapSeverityForHeader}`);
  } else {
    lines.push('📋 Briefing de Defensa de Trampas');
  }
  lines.push(`📅 ${ts}`);
  lines.push('');

  lines.push('🎯 Veredicto de trading');
  lines.push(`${dirEmoji} Señal: ${dirLabel}`);
  if (isNoTradeZone) {
    lines.push(`• No Trade Zone — Entry/TP/SL indefinidos. Espera ventaja clara.`);
  } else {
    lines.push(entryLine);
    if (modeLine) lines.push(modeLine);
    if (tpLine) lines.push(tpLine);
    if (slLine) lines.push(slLine);
    if (rrLine) lines.push(rrLine);
  }
  lines.push('');

  let actionPreview = '';
  if (sosovalueArticle && typeof sosovalueArticle === 'string' && sosovalueArticle.trim()) {
    const firstSentence = sosovalueArticle.trim().split(/[.\n]/)[0].trim();
    actionPreview = firstSentence.length > 120 ? firstSentence.slice(0, 117) + '…' : firstSentence;
    if (actionPreview) {
      lines.push('📌 Tu jugada: ' + actionPreview);
      lines.push('');
    }
  }

  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40));
    const contextNote = whaleRatioEstimate >= 80
      ? 'Gran parte del flujo de entrada podría convertirse en presión de venta. Vale la pena monitorear para tu gestión de riesgo.'
      : 'Una parte significativa del flujo de entrada puede ser de ballenas. Vale la pena monitorear para tu gestión de riesgo.';
    const contextInterpretation = 'Netflow + MPI + Sentimiento juntos: Trap Defence interpreta esta combinación como mayor riesgo de trampa — miedo minorista + entrada a exchanges + comportamiento de mineros.';
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Contexto');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Puntuación de mercado: ${Math.round(score)}/100${scoreInterpretation}`);
    lines.push(`Flujo neto de exchanges: +${Math.abs(inflow).toFixed(0)} BTC ENTRADA`);
    lines.push(`Sentimiento: ${sentimentLabel}`);
    lines.push('');
    lines.push(contextNote);
    lines.push(`💡 ${contextInterpretation}`);
    lines.push('');
  }

  lines.push('✨ Destacados de hoy');
  lines.push('');
  const trapData = trapDetection || marketBug;
  const unifiedTrapScore = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : (trapData?.trapScore != null ? Math.round(trapData.trapScore) : null);
  const trapTypeRaw = (trapData?.trapType || trapData?.bugType || 'Anomalía').replace(/_/g, ' ');
  const multiLayerNote = /MULTI\s*LAYER|MULTI_LAYER/i.test(trapTypeRaw) ? ' (múltiples anomalías detectadas simultáneamente)' : '';
  const trapOneLine = trapData && (trapData.trapDetected || trapData.bugDetected)
    ? `🛡️ Trampa: ${trapTypeRaw} (${unifiedTrapScore ?? Math.round(trapData.trapScore || trapData.bugScore || 0)}/100)${multiLayerNote}`
    : '🛡️ Trampa: No detectada';
  const trapRiskLabel = isLowTrapRisk ? 'bajo' : (effectiveTrapScore != null && effectiveTrapScore >= 50 ? 'alto' : 'moderado');
  const cqOneLine = inflow >= 0
    ? `📊 CQ: Flujo neto +${Math.abs(inflow).toFixed(0)} BTC; riesgo de trampa ${trapRiskLabel}.`
    : `📊 CQ: Flujo neto −${Math.abs(inflow).toFixed(0)} BTC; riesgo de trampa ${trapRiskLabel}.`;
  lines.push(trapOneLine);
  lines.push(cqOneLine);
  lines.push(`📌 Acción: ${actionPreview || 'Espera ventaja clara.'}`);
  lines.push('');

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
  
  // 要約1行＋短めの本文で全体長を抑える（420文字まで）
  const gptNewsLimit = 420;
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
    summaryLine = `📰 Resumen: Las métricas On-Chain muestran un modo "Espera". Los datos están limpios, pero no te confíes`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // 詳細な分析を表示
  if (gptNewsDisplay && gptNewsDisplay !== 'Analizando datos...') {
    lines.push(`📰 ${gptNewsDisplay}`);
    lines.push('');
  }
  
  // ===== Data-Backed / Gemini（全言語共通構成） =====
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Infografía NanoBanana');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 ¡Revisa los medios adjuntos!');
    lines.push('');
  }
  if (sosovalueArticle) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📰 Insight on-chain (CQ + contexto pasado)');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(sosovalueArticle);
    lines.push('');
  }
  // Data-Backed Reasons（EN準拠: null なら 3 段階 if に入れない）
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapScore != null && trapScore > 0) {
    trapScoreForEvidence = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Razones Basadas en Datos');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const tr = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = tr < 30;
    const isHighTrap = tr >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 Puntuación de Trampa ${tr}/100 → riesgo significativo`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} detectado`);
        lines.push(`• Pico de netflow → oferta moviéndose a exchanges`);
        lines.push(`• MPI de mineros elevado → presión de distribución`);
        lines.push(`• Miedo extremo + divergencia de precio → setup clásico de trampa`);
        lines.push(`💡 Modo espera. Entrar ahora podría exponerte a trampas.`);
      } else if (isLowTrap) {
        lines.push(`✅ Puntuación de Trampa ${tr}/100 → bajo riesgo`);
        lines.push(`📐 Ventana de posicionamiento — considera long/short o apalancamiento con riesgo definido cuando la ventaja sea clara.`);
      } else {
        lines.push(`⚡ Puntuación de Trampa ${tr}/100 → precaución moderada`);
        lines.push(`💡 Espera confirmación antes de actuar.`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'Anomalía').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (Puntuación: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`💡 Anomalías on-chain sugieren modo espera.`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (Severidad: ${trapAlert.severity})`);
      lines.push(`💡 Prioriza defensa hasta ventaja clara.`);
    }
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok（固定コーナー、全言語共通）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Insight Rápido de Dr. Grok');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    // P0 FIX: 日本語が含まれている場合はスキップ
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(grokXAnalysis);
    if (!hasJapanese) {
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
    } else {
      console.warn('[Regular ES] Japanese characters detected in grokXAnalysis, skipping');
    }
  }
  
  // Dr. Grok（2ブロック: 心理1行＋行動の盲点1行＋Mental Note短く・断言）
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
    const rawAdvice = psychologicalSupport.psychologicalAdvice || '';
    const hasJapaneseInAdvice = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawAdvice);
    const spanishAdvice = getSpanishPsychologicalAdvice(psychologicalSupport.psychologicalState, psychologicalSupport.psychologicalRisk);
    const adviceLine = hasJapaneseInAdvice ? spanishAdvice : (rawAdvice ? rawAdvice.slice(0, 120) + (rawAdvice.length > 120 ? '…' : '') : spanishAdvice);
    lines.push(`   💡 ${adviceLine}`);
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Dopamina disparando = la trampa. 3 respiraciones. El impulso de perseguir = química, no insight. Espera el pullback.';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = 'El miedo protege pero paraliza. Revisa datos, no emociones.';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = 'Euforia = trampa. Protege el capital primero.';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = 'Alto. Respira. Los datos dicen temporal. Sin decisiones en pánico.';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Tolerancia al aburrimiento > apalancamiento. Cierra la pantalla hoy.';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = 'Celebración = trampas siendo tendidas. Mantén disciplina.';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = 'No fuerces una operación. En duda, espera.';
    } else {
      mentalNote = 'Paciencia = fuerza estratégica. Los mejores traders saben cuándo NO operar.';
    }
    lines.push(`💊 Nota Mental de Dr. Grok: "${mentalNote}"`);
  } else {
    lines.push('💚 Estado Psicológico: 😐 NEUTRAL (Riesgo: 💡 BAJO)');
    lines.push('   💡 Condiciones del mercado relativamente estables. Mantén disciplina.');
    lines.push('💊 Nota Mental de Dr. Grok: "Paciencia = fuerza estratégica. Los mejores traders saben cuándo NO operar."');
  }
  
  lines.push('');

  // 有料版の価値（簡潔に）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 ESTO ES POR LO QUE PAGASTE POR ESTE INFORME');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🎯 Señales de acción (AVOID-LONG/SHORT, STANDBY) + Mapa de Salida + Alertas NO TRADE');
  lines.push('📊 Análisis CQ completo + detección de trampas + sentimiento X (Dr. Grok)');
  lines.push('💊 Coaching mental y diagnóstico del estado psicológico');
  lines.push('');
  lines.push('🛡️ Una señal perdida = Capital perdido.');
  lines.push('');

  // ===== Snapshot（5項目に絞る: Price, Netflow, MPI, Sentiment, Trap Score） =====
  lines.push('📋 Snapshot');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  const displayTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore;
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 ALTO RIESGO' : displayTrapScore >= 40 ? '⚠️ MODERADO' : '✅ BAJO';
    lines.push(`🎯 Puntuación de Trampa: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
  }
  lines.push('');
  
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
