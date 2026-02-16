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

function extractPayloadFromSnapshot(snapshot, lang = 'es', opts = {}) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const raw = snapshot.raw || {};
  const cqDeep = snapshot.cqDeep || {};
  const td = snapshot.trapDetection || {};
  const asOf = snapshot.as_of_utc || new Date().toISOString();
  const now = typeof asOf === 'string' ? new Date(asOf) : asOf;
  return {
    now, inflow: raw.inflow ?? cqDeep.exchangeNetflow ?? 0, mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0,
    sentimentLabel: raw.sentimentLabel ?? 'Desconocido', priceUsd: raw.priceUsd ?? null, change24h: raw.change24h ?? null,
    score: snapshot.market_score ?? 0, tradeSignal: snapshot.tradeSignal || { signal: 'STANDBY', tp: null, sl: null, rr: null },
    trap: td.trapDetected ? { isTrap: true, label: td.label ?? 'Trap', confidence: td.trapSeverity ?? 'MEDIUM' } : { isTrap: false, label: 'No trap', confidence: 'LOW' },
    aiAnalysis: snapshot.drGrok?.base ?? (typeof snapshot.gptStructureReasoning === 'string' ? snapshot.gptStructureReasoning : null),
    stats: null, trapScore: cqDeep.trapScore ?? td.trapScore ?? null, whaleFlows: cqDeep.whaleFlows ?? null, liquidations: cqDeep.liquidations ?? null,
    noTradeAlert: null, trapRisk: null, exitMap: null, trapDetection: td, marketBug: opts.marketBug ?? null, trapAlert: snapshot.trapAlert ?? null,
    divergenceSignal: snapshot.divergenceSignal ?? null, psychologicalSupport: opts.psychologicalSupport ?? null,
    hasGeminiContent: !!(snapshot.sosovalueArticle && snapshot.sosovalueArticle.trim()), sosovalueArticle: snapshot.sosovalueArticle ?? null,
    gptReporterAnalysis: snapshot.gptStructureReasoning ?? null, grokXAnalysis: opts.grokXAnalysis ?? snapshot.highResX ?? null,
    riskReward: cqDeep.riskReward ?? null, nupl: cqDeep.longTerm?.nupl ?? cqDeep.nupl ?? null, sopr30d: cqDeep.longTerm?.sopr30d ?? cqDeep.sopr30d ?? null,
    kimchiPremium: cqDeep.kimchiPremium ?? null, upbitPrice: cqDeep.upbitPrice ?? null
  };
}

function formatRegularBriefing(snapshotOrPayload, lang = 'es', opts = {}) {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') return '🌤️ Trap Defence BTC - Regular Briefing — Sin datos de snapshot.';
  const isSnapshot = snapshotOrPayload.raw != null;
  if (isSnapshot) {
    const payload = extractPayloadFromSnapshot(snapshotOrPayload, lang, opts);
    if (!payload) return '🌤️ Trap Defence BTC - Regular Briefing — Snapshot inválido.';
    return formatRegularBriefingCore(payload);
  }
  return formatRegularBriefingCore(snapshotOrPayload);
}

function formatRegularBriefingCore({
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

  // Grok X Engine: v2.1 (for Market State Radar and Psychological Insight)
  let grokDisplaySource = grokXAnalysis;
  if (grokXAnalysis && typeof grokXAnalysis === 'object') {
    grokDisplaySource = grokXAnalysis.xEngineReport || grokXAnalysis.summary || null;
  }
  const hasGrokData = grokDisplaySource && typeof grokDisplaySource === 'string' && grokDisplaySource.trim();
  const isGrokOffline = !hasGrokData || /grok offline|live search unavailable|data unavailable/i.test(grokDisplaySource || '');

  const lines = [];
  // ----- 0. Header (Trap Defence OS v2.8 — 行動示唆ゼロ) -----
  lines.push('🌤️ Trap Defence BTC - Informe Regular');
  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';
  if (isHighTrapForHeader) {
    lines.push(`🚨 Alerta Trap Defence — Riesgo de trampa ${trapSeverityForHeader}`);
  } else {
    lines.push('📋 Briefing Trap Defence');
  }
  lines.push(`📅 ${ts}`);
  lines.push('CQ × X × 3AI — Informe de Estructura Entre Bastidores');
  lines.push('');

  // ----- 1. Market State Radar (v2.8) -----
  const trapScoreRadar = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : null;
  const trapRiskLabelRadar = trapScoreRadar != null
    ? (trapScoreRadar < 30 ? 'bajo riesgo' : trapScoreRadar >= 50 ? 'alto riesgo' : 'moderado')
    : 'N/A';
  const cqRiskText = inflow >= 0
    ? 'Alta entrada a exchanges → oferta volviendo al mercado, presión de venta a corto plazo'
    : `Salida ${Math.abs(inflow || 0).toFixed(0)} BTC → tenedores asegurando activos`;
  const sentimentLabelLower = (sentimentLabel || '').toLowerCase();
  const volatilityMode = sentimentLabelLower.includes('fear') || sentimentLabelLower.includes('panic') || sentimentLabelLower.includes('miedo')
    ? 'fase de expansión (volatilidad impulsada por pánico)'
    : sentimentLabelLower.includes('greed') || sentimentLabelLower.includes('codicia') ? 'fase de expansión (volatilidad impulsada por euforia)' : 'consolidación';
  const liquidityRegimeText = inflow >= 0
    ? 'Liquidez de venta densa debajo del precio; delgada arriba'
    : 'Acumulación de compra; rebalanceo de liquidez';
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📡 Radar de Estado del Mercado');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`• Trap Score: ${trapScoreRadar != null ? trapScoreRadar + '/100 (' + trapRiskLabelRadar + ')' : 'N/A'}`);
  lines.push(`• CQ Risk: ${cqRiskText}`);
  lines.push(`• X Sentiment: ${hasGrokData && !isGrokOffline ? 'Disponible' : 'Datos faltantes → interpretar como "silencio de sentimiento" (incertidumbre elevada)'}`);
  lines.push('• Macro Pressure: Risk-off dominante');
  lines.push(`• Liquidity Regime: ${liquidityRegimeText}`);
  lines.push(`• Volatility Mode: ${volatilityMode}`);
  lines.push('');
  lines.push('### Key Metrics');
  lines.push(`• BTC Price: ${formatUsd(priceUsd)}`);
  lines.push(`• Netflow: ${inflow >= 0 ? '+' : ''}${(inflow || 0).toFixed(0)} BTC`);
  lines.push(`• MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push(`• Sentiment: ${sentimentLabel || 'Desconocido'}`);
  lines.push('');

  // ----- 2. Behind-the-Scenes Structure (v2.8) -----
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🔬 Estructura Entre Bastidores');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // GPT CQ Engine
  // エラーメッセージやnullの場合は、フォールバック処理
  let gptNewsText = gptReporterAnalysis || aiAnalysis || null;
  if (gptNewsText != null && typeof gptNewsText !== "string") {
    console.warn("[REGULAR] gptNewsText is not a string (type: " + typeof gptNewsText + "), using empty");
    gptNewsText = "";
  }
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
  
  if (!gptNewsText || String(gptNewsText || "").trim() === '') {
    const inflowDisplay = inflow >= 0 ? `Entrada ${Math.abs(inflow).toFixed(0)} BTC` : `Salida ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    gptNewsText = `## 2-1. Whale Intent (inferencia estructural)
${inflow >= 0 ? 'Las ballenas parecen absorber oferta en zonas de pánico, dejando que el precio caiga hacia bolsillos de liquidez antes de acumular de forma silenciosa.' : 'Los flujos de ballenas sugieren tenedores asegurando activos. La salida indica acumulación o rebalanceo.'}

## 2-2. Algo Behavior Patterns
Los algoritmos explotan zonas de liquidez delgada creadas por ventas emocionales. Patrones muestran cacerías de liquidez sincronizadas seguidas de reversión a la media—sistemas automatizados cosechando liquidez antes de resetear el precio.

## 2-3. Retail Psychological Distortion
Sentimiento minorista dominado por ${sentimentLabel || 'neutral'}. Si faltan datos de X, "silencio de sentimiento" es significativo: desenganche minorista suele preceder expansión de volatilidad.

## 2-4. Liquidity Map
${inflow >= 0 ? 'Liquidez de venta densa debajo del precio por ventas forzadas y distribución de mineros (MPI ' + mpiDisplay + '). Arriba del precio, liquidez delgada—movimiento alcista podría acelerarse si entradas revierten.' : 'Acumulación de compra visible. Rebalanceo de liquidez en progreso.'}`;
  }
  gptNewsText = gptNewsText.replace(/(\*\*Scenario Map\*\*|## Scenario Map|Scenario Map\s*\().*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Trap Defence Value\*\*.*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent \(structural inference( only)?\)\*\*/g, '## 2-1. Whale Intent (inferencia estructural)');
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent\*\*(?!\s*\()/g, '## 2-1. Whale Intent');
  gptNewsText = gptNewsText.replace(/\*\*Algo Behavior Patterns\*\*/g, '## 2-2. Algo Behavior Patterns');
  gptNewsText = gptNewsText.replace(/\*\*Retail Psychological Distortion\*\*/g, '## 2-3. Retail Psychological Distortion');
  gptNewsText = gptNewsText.replace(/\*\*Liquidity Map\*\*/g, '## 2-4. Liquidity Map');
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+(?!2-[1-4]\.)/gm, '')
    .replace(/^#\s+(?!2-[1-4]\.)/gm, '');
  gptNewsDisplay = gptNewsDisplay.replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 Interpretación Psicológica de Métricas On-Chain');
  const gptNewsLimit = 1400;
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
  lines.push(gptNewsDisplay);
  lines.push('');

  // ----- 3. Current BTC Structure -----
  const currentStructureNote = inflow >= 0 && sentimentLabelLower.includes('fear')
    ? 'BTC está en una "fase de liberación de oferta impulsada por pánico". No es un cambio de tendencia—es reconfiguración de liquidez.'
    : inflow >= 0
      ? 'Oferta volviendo a exchanges. La estructura sugiere fase de distribución o absorción.'
      : 'Tenedores asegurando activos. La estructura sugiere acumulación o consolidación.';
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📐 Estructura Actual de BTC');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`• Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`);
  lines.push(`• Structural meaning: ${currentStructureNote}`);
  const keyLevelsNote = inflow >= 0
    ? `• Netflow: +${Math.abs(inflow).toFixed(0)} BTC → oferta moviéndose a exchanges`
    : `• Netflow: −${Math.abs(inflow).toFixed(0)} BTC → tenedores asegurando activos`;
  lines.push(keyLevelsNote);
  lines.push('');

  // ----- 4. Scenario Map -----
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🗺️ Mapa de Escenarios');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const scenarioBullets = [];
  if (inflow > 0) {
    scenarioBullets.push(`• Continuación de shock de oferta — entrada de ${Math.abs(inflow).toFixed(0)} BTC a exchanges puede mantener presión de venta`);
  }
  if (mpi != null && mpi > 0.5) {
    scenarioBullets.push(`• Aumento de presión minera — MPI ${mpi.toFixed(2)} sugiere distribución minera, riesgo de volatilidad cercano`);
  }
  const sentimentLower = (sentimentLabel || '').toLowerCase();
  if (sentimentLower.includes('fear') || sentimentLower.includes('panic') || sentimentLower.includes('miedo') || sentimentLower.includes('pánico')) {
    scenarioBullets.push(`• Pánico minorista — sentimiento ${sentimentLabel} puede impulsar capitulación o ventas forzadas`);
  }
  if (sentimentLower.includes('greed') || sentimentLower.includes('euphoria') || sentimentLower.includes('codicia') || sentimentLower.includes('euforia')) {
    scenarioBullets.push(`• Euforia minorista — sentimiento ${sentimentLabel} puede preceder trampas de distribución`);
  }
  if (trapDetection?.trapDetected || hasActiveTrapAlert) {
    scenarioBullets.push(`• Volatilidad impulsada por algos — condiciones de trampa (${trapDetection?.trapType || 'anomalía'}) pueden desencadenar cacerías de liquidez`);
  }
  scenarioBullets.push('• Régimen macro — flujos ETF, política de tasas o shocks externos pueden cambiar la estructura');
  const scenariosToShow = scenarioBullets.slice(0, 5);
  scenariosToShow.forEach(b => lines.push(b));
  lines.push('');

  // ----- 5. Data-Backed Evidence / Gemini -----
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】Infografía NanoBanana');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 ¡Revisa la imagen/vídeo adjunto!');
    lines.push('');
  }
  // Data-Backed Evidence (v2.8 — structural only, no action suggestions)
  // Use one canonical Trap Score across all sections.
  const trapScoreForEvidence = effectiveTrapScore;
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Evidencia Basada en Datos');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : null;
    const isLowTrap = trapScoreRounded != null && trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded != null && trapScoreRounded >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 Trap Score ${trapScoreRounded}/100 → riesgo significativo de trampa`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} detectado`);
        lines.push(`• Pico de netflow → oferta moviéndose a exchanges`);
        lines.push(`• MPI de mineros elevado → presión de distribución`);
        lines.push(`• Miedo extremo + divergencia de precio → setup estructural de trampa`);
      } else if (isLowTrap) {
        lines.push(`✅ Trap Score ${trapScoreRounded}/100 → bajo riesgo de trampa`);
        lines.push(`• La estructura sugiere presión reducida de cacería de liquidez`);
      } else {
        lines.push(`⚡ Trap Score ${trapScoreRounded}/100 → riesgo moderado de trampa`);
        lines.push(`• Estructura mixta — condiciones de liquidez poco claras`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'Anomalía').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (Score: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`• Anomalías on-chain detectadas — la estructura sugiere condiciones elevadas de trampa`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (Severidad: ${trapAlert.severity})`);
      lines.push(`• La estructura sugiere riesgo elevado de trampa`);
    }
    lines.push('');
  }
  
  // ----- 6. Psychological Insight (Dr. Grok) -----
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Insight Psicológico (Dr. Grok)');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  if (hasGrokData && !isGrokOffline) {
    if (!hasJapanese(grokDisplaySource)) {
      const grokXLimit = 600;
      let grokXDisplay = grokDisplaySource;
      if (grokDisplaySource.length > grokXLimit) {
        const truncated = grokDisplaySource.slice(0, grokXLimit);
        const lastSentenceEnd = Math.max(
          truncated.lastIndexOf('.'),
          truncated.lastIndexOf('!'),
          truncated.lastIndexOf('?'),
          truncated.lastIndexOf('\n')
        );
        if (lastSentenceEnd > grokXLimit * 0.7) {
          grokXDisplay = truncated.slice(0, lastSentenceEnd + 1) + '…';
        } else {
          grokXDisplay = truncated + '…';
        }
      }
      lines.push(`📱 X Sentiment (Dr. Grok): ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular ES] Japanese characters detected in grokXAnalysis, skipping');
    }
  }
  if (!hasGrokData || isGrokOffline) {
    lines.push('📱 X Sentiment: "Silencio de sentimiento" — Los datos faltantes son significativos. Cuando el retail se congela por miedo, las publicaciones caen. El mercado entra en vacío psicológico—condiciones donde los algos se mueven más libremente.');
    lines.push('');
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
    const isNeutralLow = psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'LOW';
    lines.push(isNeutralLow
      ? '💚 Estado Psicológico: NEUTRAL (Riesgo: BAJO)'
      : `💚 Estado Psicológico: ${stateEmoji} ${psychologicalSupport.psychologicalState} (Riesgo: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
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
    lines.push('💚 Estado Psicológico: NEUTRAL (Riesgo: BAJO)');
    lines.push('   💡 Condiciones del mercado relativamente estables. Mantén disciplina.');
    lines.push('💊 Nota Mental de Dr. Grok: "Paciencia = fuerza estratégica. Los mejores traders saben cuándo NO operar."');
  }
  
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 Valor de Trap Defence');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('• Claridad estructural — visibilidad entre bastidores (Whale / Algo / Retail / Liquidity)');
  lines.push('• Insight psicológico — diagnóstico de psicología minorista');
  lines.push('• Integración CQ × X × 3AI — análisis unificado de mecánicas del mercado');
  lines.push('');

  lines.push('📋 Snapshot');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  const displayTrapScore = effectiveTrapScore;
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
    
    if (exitMap.exitMap.recommendation) {
      lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
    }
  }
  
  lines.push('');

  lines.push('Solo para fines educativos. No constituye asesoramiento financiero.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
