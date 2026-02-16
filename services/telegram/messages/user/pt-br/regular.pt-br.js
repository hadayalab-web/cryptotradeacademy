// Tier1 BTC regular briefing (PT-BR)
// services/telegram/messages/user/pt-br/regular.pt-br.js

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
 * ポルトガル語の心理的アドバイスを取得（日本語が含まれている場合のフォールバック）
 * @param {string} psychologicalState - 心理状態
 * @param {string} psychologicalRisk - リスクレベル
 * @returns {string} ポルトガル語のアドバイス
 */
function getPortuguesePsychologicalAdvice(psychologicalState, psychologicalRisk) {
  if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'LOW') {
    return '✅ Estado neutro - Nenhum bloqueio mental detectado: O sentimento do mercado está equilibrado. Nenhuma emoção extrema detectada. As condições estão estáveis.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'MEDIUM') {
    return '⚠️ Estado neutro - Monitore de perto: O sentimento do mercado está equilibrado, mas as condições podem mudar. Mantenha-se alerta.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'HIGH') {
    return '🚨 Estado neutro - Alto risco: Este sentimento "neutro" pode estar mascarando condições de armadilha. Mantenha a disciplina.';
  } else if (psychologicalState === 'FOMO') {
    return '🚨 FOMO detectado - Pressão de compra extrema: Os varejistas estão perseguindo enquanto as baleias podem estar distribuindo. Este é um padrão clássico de armadilha.';
  } else if (psychologicalState === 'FEAR') {
    return '😨 Medo detectado - O mercado mostra baixo interesse varejista: O medo pode ser paralisante, mas também pode sinalizar oportunidades potenciais.';
  } else if (psychologicalState === 'GREED') {
    return '😍 Ganância detectada - Condições eufóricas: A ganância é a emoção mais perigosa no trading. Considere tomar lucros.';
  } else if (psychologicalState === 'PANIC') {
    return '😱 Pânico detectado - Medo extremo: O pânico é sua amígdala sequestrando seu córtex pré-frontal. Pare. Respire. Verifique os dados.';
  } else if (psychologicalState === 'EUPHORIA') {
    return '😄 Euforia detectada - Celebração do mercado: A euforia é a forma do mercado de fazer você esquecer o risco. Mantenha a disciplina.';
  } else if (psychologicalState === 'CONFUSION') {
    return '🤔 Confusão detectada - Sinais pouco claros: A confusão é seu cérebro pedindo clareza. Não force uma operação. Quando tiver dúvidas, espere.';
  }
  
  // デフォルト
  return 'As condições do mercado são relativamente estáveis. Mantenha a disciplina e espere configurações de qualidade.';
}

function formatRegularBriefing(snapshotOrPayload, lang = 'pt-br', opts = {}) {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') return '🌤️ Trap Defence BTC - Regular Briefing — Sem dados de snapshot.';
  const isSnapshot = snapshotOrPayload.raw != null;
  if (!isSnapshot) {
    return formatRegularBriefingCore(snapshotOrPayload);
  }
  const raw = snapshotOrPayload.raw || {};
  const cqDeep = snapshotOrPayload.cqDeep || {};
  const td = snapshotOrPayload.trapDetection || {};
  const asOf = snapshotOrPayload.as_of_utc || new Date().toISOString();
  const now = typeof asOf === 'string' ? new Date(asOf) : asOf;
  const payload = {
    now, inflow: raw.inflow ?? cqDeep.exchangeNetflow ?? 0, mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0,
    sentimentLabel: raw.sentimentLabel ?? 'Desconhecido', priceUsd: raw.priceUsd ?? null, change24h: raw.change24h ?? null,
    score: snapshotOrPayload.market_score ?? 0, tradeSignal: snapshotOrPayload.tradeSignal || { signal: 'STANDBY', tp: null, sl: null, rr: null },
    trap: td.trapDetected ? { isTrap: true, label: td.label ?? 'Trap', confidence: td.trapSeverity ?? 'MEDIUM' } : { isTrap: false, label: 'No trap', confidence: 'LOW' },
    aiAnalysis: snapshotOrPayload.drGrok?.base ?? (typeof snapshotOrPayload.gptStructureReasoning === 'string' ? snapshotOrPayload.gptStructureReasoning : null),
    stats: null, trapScore: cqDeep.trapScore ?? td.trapScore ?? null, whaleFlows: cqDeep.whaleFlows ?? null, liquidations: cqDeep.liquidations ?? null,
    noTradeAlert: null, trapRisk: null, exitMap: null, trapDetection: td, marketBug: opts.marketBug ?? null, trapAlert: snapshotOrPayload.trapAlert ?? null,
    divergenceSignal: snapshotOrPayload.divergenceSignal ?? null, psychologicalSupport: opts.psychologicalSupport ?? null,
    hasGeminiContent: !!(snapshotOrPayload.sosovalueArticle && snapshotOrPayload.sosovalueArticle.trim()), sosovalueArticle: snapshotOrPayload.sosovalueArticle ?? null,
    gptReporterAnalysis: snapshotOrPayload.gptStructureReasoning ?? null, grokXAnalysis: opts.grokXAnalysis ?? snapshotOrPayload.highResX ?? null,
    riskReward: cqDeep.riskReward ?? null, nupl: cqDeep.longTerm?.nupl ?? cqDeep.nupl ?? null, sopr30d: cqDeep.longTerm?.sopr30d ?? cqDeep.sopr30d ?? null,
    kimchiPremium: cqDeep.kimchiPremium ?? null, upbitPrice: cqDeep.upbitPrice ?? null,
    whaleFlows: cqDeep.whaleFlows ?? null
  };
  return formatRegularBriefingCore(payload);
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

  const priceLine = `💰 Preço do BTC: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Fluxo líquido nas exchanges: ${flowDir} ${flowAbs.toFixed(0)} BTC${inflow < 0 ? ' — Detentores mantendo ativos' : ' — Pressão de venda detectada'}`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 Sentimento: ${sentimentLabel || 'Desconhecido'}`;

  // Market Scoreの解釈補助を追加
  const marketScore = Math.round(score ?? 0);
  let scoreInterpretation = '';
  if (marketScore >= 50) {
    scoreInterpretation = ' (Altista)';
  } else if (marketScore >= 20) {
    scoreInterpretation = ' (Neutro/Estável)';
  } else if (marketScore >= -20) {
    scoreInterpretation = ' (Neutro/Estável)';
  } else if (marketScore >= -50) {
    scoreInterpretation = ' (Baixista)';
  } else {
    scoreInterpretation = ' (Muito Baixista)';
  }
  const scoreLine = `📈 Score de mercado: ${marketScore}/100${scoreInterpretation}`;

  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;

  let trapLine = '✅ Detector de armadilhas: Nenhuma armadilha crítica detectada';
  if (trapDetection && trapDetection.trapDetected) {
    const trapSev = trapDetection.trapSeverity || 'NONE';
    const trapSc = trapDetection.trapScore || 0;
    if (trapSev !== 'NONE' && trapSc > 0) {
      const trapEmoji = trapSev === 'CRITICAL' ? '🚨' : trapSev === 'HIGH' ? '⚠️' : trapSev === 'MEDIUM' ? '⚡' : '💡';
      const trapTypeLabel = (trapDetection.trapType || 'Armadilha').replace(/_/g, ' ');
      trapLine = `${trapEmoji} Detector de armadilhas: ${trapTypeLabel} (Severidade: ${trapSev}, Pontuação: ${trapSc}/100)`;
    }
  } else if (trap?.isTrap) {
    trapLine = `🧨 Detector de armadilhas: ${trap.label || 'Armadilha potencial'} (${trap.confidence} confiança)`;
  }

  let dirEmoji;
  let dirLabel;
  if (hasActiveTrapAlert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ Alerta de Armadilha: Evitar Long';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ Alerta de Armadilha: Evitar Short';
    } else {
      dirLabel = '🛡️ Alerta de Armadilha: Aguardar';
    }
  } else if (isLowTrapRisk) {
    dirEmoji = '📐';
    dirLabel = 'Baixo risco de armadilha — Janela de posicionamento';
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
    ? `• Entrada: Considere setups de qualidade quando a vantagem for clara (ref. ${formatUsd(priceUsd)})`
    : (!isLowTrapRisk && !hasActiveTrapAlert
      ? '• Entrada: Preparação para a Vitória — Aguardando Gatilho Claro'
      : `• Entrada (ref. spot): ${formatUsd(priceUsd)}`);
  const tpLine = isPositioningWindow
    ? '• Take Profit: Defina seu nível (antes de entrar)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: TBD (A Ser Determinado)');
  const slLine = isPositioningWindow
    ? '• Stop Loss: Defina antes de entrar'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: TBD (A Ser Determinado)');
  const rrLine = tradeSignal?.rr != null ? `• Risco/Retorno (RR): ${tradeSignal.rr.toFixed(2)}` : (isPositioningWindow ? '• Risco/Retorno (RR): Defina por setup' : '• Risco/Retorno (RR): Aguardar');
  const modeLine = isPositioningWindow
    ? '• Modo: Baixo risco de armadilha — considere long/short com risco definido. Alavancagem só quando a vantagem for clara.'
    : (!isLowTrapRisk ? '• Modo: Trap Standby — aguarde vantagem clara. Priorizar defesa' : '');

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok está offline — usando apenas sinais do sistema (on-chain/preço).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  let grokDisplaySource = grokXAnalysis;
  if (grokXAnalysis && typeof grokXAnalysis === 'object') {
    grokDisplaySource = grokXAnalysis.xEngineReport || grokXAnalysis.summary || null;
  }
  const hasGrokData = grokDisplaySource && typeof grokDisplaySource === 'string' && grokDisplaySource.trim();
  const isGrokOffline = !hasGrokData || /grok offline|live search unavailable|data unavailable/i.test(grokDisplaySource || '');

  const sentimentLabelLower = (sentimentLabel || '').toLowerCase();

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - Relatório Regular');
  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';
  if (isHighTrapForHeader) {
    lines.push(`🚨 Alerta Trap Defence — Risco de armadilha ${trapSeverityForHeader}`);
  } else {
    lines.push('📋 Briefing Trap Defence');
  }
  lines.push(`📅 ${ts}`);
  lines.push('CQ × X × 3AI — Relatório de Estrutura Nos Bastidores');
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📡 Radar de Estado do Mercado');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const trapScoreRadar = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : null;
  const trapRiskLabelRadar = trapScoreRadar != null
    ? (trapScoreRadar < 30 ? 'baixo risco' : trapScoreRadar >= 50 ? 'alto risco' : 'moderado')
    : 'N/A';
  const cqRiskText = inflow >= 0
    ? 'Alta entrada em exchanges → oferta voltando ao mercado, pressão de venda no curto prazo'
    : `Saída ${Math.abs(inflow || 0).toFixed(0)} BTC → detentores garantindo ativos`;
  const volatilityMode = sentimentLabelLower.includes('fear') || sentimentLabelLower.includes('panic') || sentimentLabelLower.includes('medo')
    ? 'fase de expansão (volatilidade impulsionada por pânico)'
    : sentimentLabelLower.includes('greed') || sentimentLabelLower.includes('ganância') ? 'fase de expansão (volatilidade impulsionada por euforia)' : 'consolidação';
  const liquidityRegimeText = inflow >= 0
    ? 'Liquidez de venda densa abaixo do preço; liquidez rala acima'
    : 'Acumulação de compra; rebalanceamento de liquidez';
  lines.push(`• Trap Score: ${trapScoreRadar != null ? trapScoreRadar + '/100 (' + trapRiskLabelRadar + ')' : 'N/A'}`);
  lines.push(`• CQ Risk: ${cqRiskText}`);
  lines.push(`• X Sentiment: ${hasGrokData && !isGrokOffline ? 'Disponível' : 'Dados faltando → interpretar como "silêncio de sentimento" (incerteza elevada)'}`);
  lines.push('• Macro Pressure: Risk-off dominante');
  lines.push(`• Liquidity Regime: ${liquidityRegimeText}`);
  lines.push(`• Volatility Mode: ${volatilityMode}`);
  lines.push('');
  lines.push('### Key Metrics');
  lines.push(`• BTC Price: ${formatUsd(priceUsd)}`);
  lines.push(`• Netflow: ${inflow >= 0 ? '+' : ''}${(inflow || 0).toFixed(0)} BTC`);
  lines.push(`• MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push(`• Sentiment: ${sentimentLabel || 'Desconhecido'}`);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🔬 Estrutura Nos Bastidores');
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
      // PT-BR市場用: ポルトガル語以外の言語が混入している場合を検出
      // エラーでない場合のみ言語チェックを実行
      // ポルトガル語特有の文字（ã, õ, ç, á, é, í, ó, ú）またはポルトガル語の一般的な単語が含まれているかチェック
      const hasPortugueseChars = /[ãõçáéíóúâêôàèìòùÃÕÇÁÉÍÓÚÂÊÔÀÈÌÒÙ]/.test(gptNewsText);
      const hasPortugueseWords = /\b(o|a|os|as|de|do|da|dos|das|em|no|na|nos|nas|é|está|são|com|por|para|que|um|uma|mais|muito|também|como|mas|se|não|sim|muito|bem|mais|menos|muito|tão|tanto|todos|todas|este|esta|estes|estas|esse|essa|esses|essas|aquele|aquela|aqueles|aquelas)\b/i.test(gptNewsText);
      // 日本語・英語・その他の言語が混入している場合を検出
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      const hasEnglishOnly = !hasPortugueseChars && !hasPortugueseWords && !hasJapaneseChars && gptNewsText.length > 50;
      if (hasJapaneseChars || (hasEnglishOnly && !hasPortugueseChars && !hasPortugueseWords)) {
        // 日本語または英語のみが含まれている場合はnullに設定してポルトガル語フォールバックを使用
        console.warn('[Regular PT-BR] Non-Portuguese language detected in GPT analysis, using fallback');
        gptNewsText = null;
      } else if (!hasPortugueseChars && !hasPortugueseWords && gptNewsText.length > 50) {
        // ポルトガル語が含まれていない場合はnullに設定してポルトガル語フォールバックを使用
        gptNewsText = null;
      }
    }
  }
  
  if (!gptNewsText || String(gptNewsText || "").trim() === '') {
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    gptNewsText = `## 2-1. Whale Intent (inferência estrutural)
${inflow >= 0 ? 'As baleias parecem absorver oferta em zonas de pânico, deixando o preço cair em direção aos bolsões de liquidez antes de acumular de forma silenciosa.' : 'Os fluxos de baleias sugerem detentores garantindo ativos. A saída indica acumulação ou rebalanceamento.'}

## 2-2. Algo Behavior Patterns
Os algoritmos exploram zonas de liquidez rala criadas por vendas emocionais. Padrões mostram caças de liquidez sincronizadas seguidas de reversão à média—sistemas automatizados colhendo liquidez antes de resetar o preço.

## 2-3. Retail Psychological Distortion
Sentimento varejista dominado por ${sentimentLabel || 'neutro'}. Se faltarem dados do X, "silêncio de sentimento" é significativo: desengajamento varejista costuma preceder expansão de volatilidade.

## 2-4. Liquidity Map
${inflow >= 0 ? 'Liquidez de venda densa abaixo do preço por vendas forçadas e distribuição de mineradores (MPI ' + mpiDisplay + '). Acima do preço, liquidez rala—movimento altista poderia acelerar se entradas reverterem.' : 'Acumulação de compra visível. Rebalanceamento de liquidez em progresso.'}`;
  }
  gptNewsText = gptNewsText.replace(/(\*\*Scenario Map\*\*|## Scenario Map|Scenario Map\s*\().*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Trap Defence Value\*\*.*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent \(structural inference( only)?\)\*\*/g, '## 2-1. Whale Intent (inferência estrutural)');
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent\*\*(?!\s*\()/g, '## 2-1. Whale Intent');
  gptNewsText = gptNewsText.replace(/\*\*Algo Behavior Patterns\*\*/g, '## 2-2. Algo Behavior Patterns');
  gptNewsText = gptNewsText.replace(/\*\*Retail Psychological Distortion\*\*/g, '## 2-3. Retail Psychological Distortion');
  gptNewsText = gptNewsText.replace(/\*\*Liquidity Map\*\*/g, '## 2-4. Liquidity Map');
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+(?!2-[1-4]\.)/gm, '')
    .replace(/^#\s+(?!2-[1-4]\.)/gm, '');
  gptNewsDisplay = gptNewsDisplay.replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 Interpretação Psicológica de Métricas On-Chain');
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

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📐 Estrutura Atual do BTC');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const currentStructureNote = inflow >= 0 && sentimentLabelLower.includes('fear')
    ? 'O BTC está em uma "fase de liberação de oferta impulsionada por pânico". Não é uma reversão de tendência—é reconfiguração de liquidez.'
    : inflow >= 0
      ? 'Oferta voltando às exchanges. A estrutura sugere fase de distribuição ou absorção.'
      : 'Detentores garantindo ativos. A estrutura sugere acumulação ou consolidação.';
  lines.push(`• Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`);
  lines.push(`• Structural meaning: ${currentStructureNote}`);
  const keyLevelsNote = inflow >= 0
    ? `• Netflow: +${Math.abs(inflow).toFixed(0)} BTC → oferta indo para exchanges`
    : `• Netflow: −${Math.abs(inflow).toFixed(0)} BTC → detentores garantindo ativos`;
  lines.push(keyLevelsNote);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🗺️ Mapa de Cenários');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const scenarioBullets = [];
  if (inflow > 0) {
    scenarioBullets.push(`• Continuação de choque de oferta — entrada de ${Math.abs(inflow).toFixed(0)} BTC em exchanges pode manter pressão de venda`);
  }
  if (mpi != null && mpi > 0.5) {
    scenarioBullets.push(`• Aumento de pressão mineradora — MPI ${mpi.toFixed(2)} sugere distribuição mineradora, risco de volatilidade próximo`);
  }
  const sentimentLower = (sentimentLabel || '').toLowerCase();
  if (sentimentLower.includes('fear') || sentimentLower.includes('panic') || sentimentLower.includes('medo') || sentimentLower.includes('pânico')) {
    scenarioBullets.push(`• Pânico varejista — sentimento ${sentimentLabel} pode impulsionar capitulação ou vendas forçadas`);
  }
  if (sentimentLower.includes('greed') || sentimentLower.includes('euphoria') || sentimentLower.includes('ganância') || sentimentLower.includes('euforia')) {
    scenarioBullets.push(`• Euforia varejista — sentimento ${sentimentLabel} pode preceder armadilhas de distribuição`);
  }
  if (trapDetection?.trapDetected || hasActiveTrapAlert) {
    scenarioBullets.push(`• Volatilidade impulsionada por algos — condições de armadilha (${trapDetection?.trapType || 'anomalia'}) podem desencadear caças de liquidez`);
  }
  scenarioBullets.push('• Regime macro — fluxos ETF, política de juros ou choques externos podem alterar a estrutura');
  scenarioBullets.slice(0, 5).forEach(b => lines.push(b));
  lines.push('');

  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】Infográfico NanoBanana');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 Verifique a imagem/vídeo anexo!');
    lines.push('');
  }
  // Usa uma única fonte canônica de Trap Score para evitar inconsistências no mesmo briefing.
  const trapScoreForEvidence = effectiveTrapScore;
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Evidência Baseada em Dados');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : null;
    const isLowTrap = trapScoreRounded != null && trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded != null && trapScoreRounded >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 Trap Score ${trapScoreRounded}/100 → risco significativo de armadilha`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} detectado`);
        lines.push(`• Pico de netflow → oferta indo para exchanges`);
        lines.push(`• MPI de mineradores elevado → pressão de distribuição`);
        lines.push(`• Medo extremo + divergência de preço → setup estrutural de armadilha`);
      } else if (isLowTrap) {
        lines.push(`✅ Trap Score ${trapScoreRounded}/100 → baixo risco de armadilha`);
        lines.push(`• A estrutura sugere pressão reduzida de caça de liquidez`);
      } else {
        lines.push(`⚡ Trap Score ${trapScoreRounded}/100 → risco moderado de armadilha`);
        lines.push(`• Estrutura mista — condições de liquidez pouco claras`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'Anomalia').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (Score: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`• Anomalias on-chain detectadas — a estrutura sugere condições elevadas de armadilha`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (Severidade: ${trapAlert.severity})`);
      lines.push(`• A estrutura sugere risco elevado de armadilha`);
    }
    lines.push('');
  }

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
      console.warn('[Regular PT-BR] Japanese characters detected in grokXAnalysis, skipping');
    }
  }
  if (!hasGrokData || isGrokOffline) {
    lines.push('📱 X Sentiment: "Silêncio de sentimento" — Os dados faltando são significativos. Quando o varejo congela por medo, as postagens caem. O mercado entra em vácuo psicológico—condições onde os algos se movem mais livremente.');
    lines.push('');
  }

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
      ? '💚 Estado Psicológico: NEUTRO (Risco: BAIXO)'
      : `💚 Estado Psicológico: ${stateEmoji} ${psychologicalSupport.psychologicalState} (Risco: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    const rawAdvice = psychologicalSupport.psychologicalAdvice || '';
    const hasJapaneseInAdvice = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawAdvice);
    const portugueseAdvice = getPortuguesePsychologicalAdvice(
      psychologicalSupport.psychologicalState,
      psychologicalSupport.psychologicalRisk
    );
    const adviceLine = hasJapaneseInAdvice ? portugueseAdvice : (rawAdvice ? rawAdvice.slice(0, 120) + (rawAdvice.length > 120 ? '…' : '') : portugueseAdvice);
    lines.push(`   💡 ${adviceLine}`);
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Dopamina disparando = a armadilha. 3 respirações. Impulso de perseguir = química, não insight. Aguarde o pullback.';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = 'O medo protege mas paralisa. Verifique dados, não emoções.';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = 'Euforia = armadilha. Proteja o capital primeiro.';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = 'Pare. Respire. Os dados dizem temporário. Sem decisões no pânico.';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Tolerância ao tédio > alavancagem. Feche a tela hoje.';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = 'Celebração = armadilhas sendo armadas. Mantenha disciplina.';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = 'Não force uma operação. Em dúvida, espere.';
    } else {
      mentalNote = 'Paciência = força estratégica. Os melhores traders sabem quando NÃO operar.';
    }
    lines.push(`💊 Nota Mental do Dr. Grok: "${mentalNote}"`);
  } else {
    lines.push('💚 Estado Psicológico: NEUTRO (Risco: BAIXO)');
    lines.push('   💡 Condições do mercado relativamente estáveis. Mantenha disciplina.');
    lines.push('💊 Nota Mental do Dr. Grok: "Paciência = força estratégica. Os melhores traders sabem quando NÃO operar."');
  }

  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 Valor do Trap Defence');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('• Clareza estrutural — visibilidade nos bastidores (Whale / Algo / Retail / Liquidity)');
  lines.push('• Insight psicológico — diagnóstico de psicologia varejista');
  lines.push('• Integração CQ × X × 3AI — análise unificada das mecânicas de mercado');
  lines.push('');

  lines.push('📋 Snapshot');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  const displayTrapScore = effectiveTrapScore;
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 ALTO RISCO' : displayTrapScore >= 40 ? '⚠️ MODERADO' : '✅ BAIXO';
    lines.push(`🎯 Pontuação de Armadilha: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
  }
  lines.push('');
  
  // Phase1-Product: Exit Map表示（簡略化：最大8行）
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ Mapa de Saída');
    lines.push(`   Status da Posição: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} P&L Não Realizado: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 Zonas de Realização de Lucros:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} Zona ${zone.zone}: $${zone.price.toLocaleString()} (Realizar ${zone.takeProfitPct}%)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 Zona ${zone.zone}: $${zone.price.toLocaleString()} (Realizar ${zone.takeProfitPct}%)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ Condições de Saída:');
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

  lines.push('Apenas para fins educacionais. Não constitui recomendação ou aconselhamento financeiro.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
