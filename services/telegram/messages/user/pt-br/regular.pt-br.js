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

  const priceLine = `💰 Preço do BTC: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Fluxo líquido nas exchanges: ${flowDir} ${flowAbs.toFixed(0)} BTC${inflow < 0 ? ' — Detentores mantendo ativos' : ' — Pressão de venda detectada'}`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 Sentimento de mercado: *${sentimentLabel || 'Desconhecido'}*`;

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

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - Relatório Pago');
  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';
  if (isHighTrapForHeader) {
    lines.push(`🚨 Alerta de Defesa de Armadilhas — Risco de armadilha ${trapSeverityForHeader}`);
  } else {
    lines.push('📋 Briefing de Defesa de Armadilhas');
  }
  lines.push(`📅 ${ts}`);
  lines.push('');

  lines.push('🎯 Veredito de trade');
  lines.push(`${dirEmoji} Sinal: ${dirLabel}`);
  if (isNoTradeZone) {
    lines.push(`• No Trade Zone — Entry/TP/SL indefinidos. Aguarde vantagem clara.`);
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
      lines.push('📌 Sua jogada: ' + actionPreview);
      lines.push('');
    }
  }

  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40));
    const contextNote = whaleRatioEstimate >= 80
      ? 'Grande parte do fluxo de entrada pode virar pressão de venda. Vale monitorar para sua gestão de risco.'
      : 'Uma parte significativa do fluxo de entrada pode ser de baleias. Vale monitorar para sua gestão de risco.';
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Contexto');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Score de mercado: ${Math.round(score)}/100${scoreInterpretation}`);
    lines.push(`Fluxo líquido nas exchanges: +${Math.abs(inflow).toFixed(0)} BTC ENTRADA`);
    lines.push(`Sentimento: ${sentimentLabel}`);
    lines.push('');
    lines.push(contextNote);
    const contextInterpretation = 'Netflow + MPI + Sentimento juntos: Trap Defence interpreta esta combinação como maior risco de armadilha — medo varejista + entrada em exchanges + comportamento de mineradores.';
    lines.push(`💡 ${contextInterpretation}`);
    lines.push('');
  }

  lines.push('✨ Destaques de hoje');
  lines.push('');
  const trapData = trapDetection || marketBug;
  const unifiedTrapScore = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : (trapData?.trapScore != null ? Math.round(trapData.trapScore) : null);
  const trapTypeRaw = (trapData?.trapType || trapData?.bugType || 'Anomalia').replace(/_/g, ' ');
  const multiLayerNote = /MULTI\s*LAYER|MULTI_LAYER/i.test(trapTypeRaw) ? ' (múltiplas anomalias detectadas simultaneamente)' : '';
  const trapOneLine = trapData && (trapData.trapDetected || trapData.bugDetected)
    ? `🛡️ Armadilha: ${trapTypeRaw} (${unifiedTrapScore ?? Math.round(trapData.trapScore || trapData.bugScore || 0)}/100)${multiLayerNote}`
    : '🛡️ Armadilha: Nenhuma detectada';
  const trapRiskLabel = isLowTrapRisk ? 'baixo' : (effectiveTrapScore != null && effectiveTrapScore >= 50 ? 'alto' : 'moderado');
  const cqOneLine = inflow >= 0
    ? `📊 CQ: Fluxo líquido +${Math.abs(inflow).toFixed(0)} BTC; risco de armadilha ${trapRiskLabel}.`
    : `📊 CQ: Fluxo líquido −${Math.abs(inflow).toFixed(0)} BTC; risco de armadilha ${trapRiskLabel}.`;
  lines.push(trapOneLine);
  lines.push(cqOneLine);
  lines.push(`📌 Ação: ${actionPreview || 'Aguarde vantagem clara.'}`);
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
  
  // フォールバック: GPT分析が利用できない場合の代替メッセージ
  if (!gptNewsText || gptNewsText.trim() === '') {
    // CryptoQuantデータから基本的な分析を生成
    const inflowDisplay = inflow >= 0 ? `Entrada ${Math.abs(inflow).toFixed(0)} BTC` : `Saída ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    const priceChangeDisplay = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`;
    
    // COO最適化: ストーリーテリング改善
    gptNewsText = `📖 A HISTÓRIA POR TRÁS DOS DADOS

Enquanto você dorme, as baleias estão se posicionando. Isso é o que está acontecendo AGORA MESMO:

1. 🏦 Exchanges lotados: ${inflowDisplay}
   → ${inflow >= 0 ? 'Vendedores estão carregando. Isso NÃO é normal.' : 'Detentores estão garantindo ativos. Isso é ALTISTA.'}

2. ⛏️ Mineradores ${mpi >= 0 ? 'vendendo' : 'mantendo'}: MPI ${mpiDisplay}
   → ${mpi >= 0 ? 'Mineradores estão vendendo. Isso é BAIXISTA no curto prazo.' : 'Mineradores NÃO estão vendendo. Isso é ALTISTA no longo prazo.'}

3. 🧠 Sentimento ${sentimentLabel}
   → ${sentimentLabel.toLowerCase().includes('fear') ? 'Pânico de varejo. Esta é uma OPORTUNIDADE para dinheiro inteligente.' : sentimentLabel.toLowerCase().includes('greed') ? 'Euforia de varejo. Este é um RISCO para compradores tardios.' : 'Condições neutras. Fique alerta.'}

💡 Interpretação Psicológica:

Os dados do CryptoQuant mostram ${inflowDisplay}, um Índice de Posição de Mineradores (MPI) de ${mpiDisplay}, e sentimento ${sentimentLabel.toLowerCase()}, enquanto o preço mudou ${priceChangeDisplay} em 24 horas.

De uma perspectiva psicológica, essas métricas sugerem um ambiente de mercado ${sentimentLabel.toLowerCase()}. O ${inflow >= 0 ? 'fluxo de entrada' : 'fluxo de saída'} indica ${inflow >= 0 ? 'mais criptomoedas entrando nas exchanges' : 'mais criptomoedas saindo das exchanges'}, o que frequentemente indica ${inflow >= 0 ? 'pressão de venda potencial' : 'os detentores garantindo seus ativos fora da exchange'}.

${score <= 25 && inflow > 0 ? '⚠️ CONTRADIÇÃO: Pontuação de baixo risco MAS alta pressão de venda. Isso é EXATAMENTE quando as armadilhas se formam. Fique alerta.' : 'O mercado está em modo de espera, onde os traders monitoram as condições cuidadosamente.'}`;
  }
  
  // 文字数制限を緩和して、重要な情報が切れないようにする（600文字まで）
  const gptNewsLimit = 420;
  // Telegram互換性: Markdown見出し（###）を削除してTelegramネイティブな形式に変換（先に実行）
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '') // ###見出しを削除
    .replace(/^##\s+/gm, '')   // ##見出しを削除
    .replace(/^#\s+/gm, '');   // #見出しを削除
  // プレーンテキストの見出しも改善（「Interpretação Psicológica de Métricas On-Chain」など）
  gptNewsDisplay = gptNewsDisplay.replace(/^Interpretação Psicológica de Métricas On-Chain$/gm, '💡 Interpretação Psicológica de Métricas On-Chain');
  
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
    summaryLine = `📰 Resumo: As métricas On-Chain mostram um modo "Espera". ${trapTypeDisplay} sugere uma armadilha oculta apesar de preços estáveis.`;
  } else {
    summaryLine = `📰 Resumo: As métricas On-Chain mostram um modo "Espera". As condições do mercado estão estáveis, mas permaneça alerta a padrões de armadilha`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // 詳細な分析を表示
  if (gptNewsDisplay && gptNewsDisplay !== 'Analisando dados...') {
    lines.push(`📰 ${gptNewsDisplay}`);
    lines.push('');
  }
  
  // ===== Data-Backed / Gemini（全言語共通構成） =====
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Infográfico NanoBanana');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 Verifique as mídias anexas!');
    lines.push('');
  }
  if (sosovalueArticle) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📰 Insight on-chain (CQ + contexto passado)');
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
    lines.push('📊 Razões Baseadas em Dados');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const tr = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = tr < 30;
    const isHighTrap = tr >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 Pontuação de Armadilha ${tr}/100 → risco significativo`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} detectado`);
        lines.push(`• Pico de netflow → oferta indo para exchanges`);
        lines.push(`• MPI de mineradores elevado → pressão de distribuição`);
        lines.push(`• Medo extremo + divergência de preço → setup clássico de armadilha`);
        lines.push(`💡 Modo espera. Entrar agora pode expor você a armadilhas.`);
      } else if (isLowTrap) {
        lines.push(`✅ Pontuação de Armadilha ${tr}/100 → baixo risco`);
        lines.push(`📐 Janela de posicionamento — considere long/short ou alavancagem com risco definido quando a vantagem for clara.`);
      } else {
        lines.push(`⚡ Pontuação de Armadilha ${tr}/100 → cautela moderada`);
        lines.push(`💡 Aguarde confirmação antes de agir.`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'Anomalia').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (Pontuação: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`💡 Anomalias on-chain sugerem modo espera.`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (Severidade: ${trapAlert.severity})`);
      lines.push(`💡 Priorize defesa até vantagem clara.`);
    }
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok（固定コーナー、全言語共通）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Insight Rápido de Dr. Grok');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  if (integratedOptimization && integratedOptimization.integrated && integratedOptimization.optimization) {
    const opt = integratedOptimization.optimization;
    
    // Converter códigos de erro para mensagens multilíngues（Português）
    const errorMessages = {
      GROK_UNAVAILABLE: 'A análise do algoritmo X do Grok não está disponível',
      GROK_ERROR: 'Ocorreu um erro na análise do algoritmo X do Grok',
      GEMINI_UNAVAILABLE: 'A análise psicológica profunda do Gemini não está disponível',
      GEMINI_ERROR: 'Ocorreu um erro na análise psicológica profunda do Gemini',
    };
    
    // Exibir mensagens de erro（integração parcial）
    if (integratedOptimization.errorCodes && integratedOptimization.errorCodes.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('⚠️ Algumas análises não estão disponíveis');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      integratedOptimization.errorCodes.forEach(code => {
        const msg = errorMessages[code] || code;
        lines.push(`   • ${msg}`);
      });
      lines.push('   💡 Exibindo apenas resultados disponíveis');
      lines.push('');
    }
    
    // Verificar se há dados do Grok（baseado em sources）
    const hasGrok = !!integratedOptimization.sources?.grok && !integratedOptimization.sources.grok.error;
    
    // Insights de otimização do algoritmo X（da análise do Grok）- exibir baseado em sources
    // P0 FIX: questionCTAとengagementBoostersは有料版レポートの文脈に合わないため、バイラル可能性スコアとタイミング情報のみを表示
    if (hasGrok && opt.content && (opt.viralPotential !== undefined || opt.timing)) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('📱 Otimização de postagens X'); // P0 FIX: 日本語の括弧を削除
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      
      // Viral potential score display
      if (opt.viralPotential !== null && opt.viralPotential !== undefined) {
        const { emoji, label, score } = formatViralScore(opt.viralPotential, {
          high: '[ALTO]',
          medium: '[MÉDIO]',
          low: '[BAIXO]'
        });
        lines.push(`   ${emoji} ${label} Pontuação de potencial viral: ${score}/100`);
        if (opt.viralFactors && opt.viralFactors.length > 0) {
          const filteredFactors = filterJapaneseFromArray(opt.viralFactors);
          if (filteredFactors.length > 0) {
            lines.push(`   📊 Fatores-chave: ${filteredFactors.slice(0, 2).join(', ')}`);
          }
        }
      }
      
      if (opt.timing && opt.timing.length > 0) {
        const portugueseTimings = cleanTimingInfo(opt.timing);
        if (portugueseTimings.length > 0) {
          lines.push(`⏰ Horários ideais de postagem: ${portugueseTimings.slice(0, 2).join(', ')}`);
        }
      }
      
      lines.push('');
    }
    
    // Verificar se há dados do Gemini（baseado em sources）
    const hasGemini = !!integratedOptimization.sources?.gemini && !integratedOptimization.sources.gemini.error;
    
    // Insights psicológicos profundos（da análise do Gemini）- destacar como informação importante（exibir baseado em sources）
    if (hasGemini && opt.psychologicalInsights) {
      const psyInsights = opt.psychologicalInsights;
      
      // Check if entire psychologicalInsights object contains Japanese
      if (hasJapaneseInPsychologicalInsights(psyInsights)) {
        console.warn('[Regular PT-BR] Japanese characters detected in psychologicalInsights, skipping entire section');
        // フォールバック: 基本的な心理状態のみ表示
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
          lines.push('━━━━━━━━━━━━━━━━━━━━');
          lines.push('🧠 [IMPORTANTE] Insights psicológicos profundos');
          lines.push('━━━━━━━━━━━━━━━━━━━━');
          lines.push(`💚 Estado Psicológico: ${stateEmoji} ${psychologicalSupport.psychologicalState} (Risco: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
          if (psychologicalSupport.psychologicalAdvice) {
            if (!hasJapanese(psychologicalSupport.psychologicalAdvice)) {
              lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
            } else {
              const portugueseAdvice = getPortuguesePsychologicalAdvice(
                psychologicalSupport.psychologicalState,
                psychologicalSupport.psychologicalRisk
              );
              if (portugueseAdvice) {
                lines.push(`   💡 ${portugueseAdvice}`);
              }
            }
          }
          lines.push('');
        }
      } else {
        // 日本語が含まれていない場合のみ表示
        lines.push('━━━━━━━━━━━━━━━━━━━━');
        lines.push('🧠 [IMPORTANTE] Insights psicológicos profundos');
        lines.push('━━━━━━━━━━━━━━━━━━━━');
        
        if (psyInsights.currentState && psyInsights.currentState !== 'NEUTRAL') {
          if (!hasJapanese(psyInsights.currentState)) {
            const stateEmoji = psyInsights.currentState === 'FOMO' ? '😰' :
                               psyInsights.currentState === 'FEAR' ? '😨' :
                               psyInsights.currentState === 'GREED' ? '😍' :
                               psyInsights.currentState === 'PANIC' ? '😱' :
                               psyInsights.currentState === 'EUPHORIA' ? '😄' :
                               psyInsights.currentState === 'CONFUSION' ? '🤔' : '😐';
            lines.push(`💚 Estado psicológico: ${stateEmoji} ${psyInsights.currentState}`);
          }
        }
        
        if (psyInsights.mentalBlocks && psyInsights.mentalBlocks.length > 0) {
          const filteredBlocks = filterJapaneseFromArray(psyInsights.mentalBlocks);
          if (filteredBlocks.length > 0) {
            lines.push(`🚧 Bloqueios mentais: ${filteredBlocks.slice(0, 2).join(', ')}`);
          }
        }
        
        if (psyInsights.breakthroughInsights && psyInsights.breakthroughInsights.length > 0) {
          const filteredInsights = filterJapaneseFromArray(psyInsights.breakthroughInsights);
          if (filteredInsights.length > 0) {
            lines.push(`   💡 [IMPORTANTE] Insights de avanço:`);
            filteredInsights.slice(0, 2).forEach(insight => {
              lines.push(`   🔥 ${insight}`);
            });
          }
        }
        
        if (psyInsights.personalizedCoaching && psyInsights.personalizedCoaching.trim()) {
          const coachingText = psyInsights.personalizedCoaching;
          const coachingLimit = 300;
          let coachingDisplay = coachingText;
          
          if (hasJapanese(coachingText)) {
            coachingDisplay = getPortuguesePsychologicalAdvice(
              psyInsights.currentState || 'NEUTRAL',
              'LOW'
            );
          }
          
          if (coachingDisplay.length > coachingLimit) {
            coachingDisplay = coachingDisplay.slice(0, coachingLimit) + '…';
          }
          lines.push(`💊 Coaching personalizado:`);
          lines.push(`"${coachingDisplay}"`);
        }
        
        lines.push('');
      }
    }
  }
  
  // Grok X analysis fallback (X sentiment analysis)
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    if (!hasJapanese(grokXAnalysis)) {
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
      lines.push(`📱 Análise de Sentimento X: ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular PT-BR] Japanese characters detected in grokXAnalysis, skipping');
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
    lines.push(`💚 Estado Psicológico: ${stateEmoji} ${psychologicalSupport.psychologicalState} (Risco: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    const rawAdvice = psychologicalSupport.psychologicalAdvice || '';
    const hasJapaneseInAdvice = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawAdvice);
    const portugueseAdvice = getPortuguesePsychologicalAdvice(psychologicalSupport.psychologicalState, psychologicalSupport.psychologicalRisk);
    const adviceLine = hasJapaneseInAdvice ? portugueseAdvice : (rawAdvice ? rawAdvice.slice(0, 120) + (rawAdvice.length > 120 ? '…' : '') : portugueseAdvice);
    lines.push(`   💡 ${adviceLine}`);
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Dopamina disparando = a armadilha. 3 respirações. Impulso de perseguir = química, não insight. Espere o pullback.';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = 'O medo protege mas paralisa. Verifique dados, não emoções.';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = 'Euforia = armadilha. Proteja o capital primeiro.';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = 'Pare. Respire. Dados dizem temporário. Sem decisões em pânico.';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Tolerância ao tédio > alavancagem. Feche a tela hoje.';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = 'Celebração = armadilhas sendo armadas. Mantenha disciplina.';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = 'Não force uma operação. Em dúvida, espere.';
    } else {
      mentalNote = 'Paciência = força estratégica. Os melhores traders sabem quando NÃO operar.';
    }
    lines.push(`💊 Nota Mental de Dr. Grok: "${mentalNote}"`);
  } else if (!integratedOptimization || !integratedOptimization.integrated) {
    lines.push('💚 Estado Psicológico: 😐 NEUTRAL (Risco: 💡 BAIXO)');
    lines.push('   💡 Condições do mercado relativamente estáveis. Mantenha disciplina.');
    lines.push('💊 Nota Mental de Dr. Grok: "Paciência = força estratégica. Os melhores traders sabem quando NÃO operar."');
  }
  
  lines.push('');

  // 有料版の価値（簡潔に）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 É POR ISSO QUE VOCÊ PAGOU POR ESTE RELATÓRIO');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🎯 Sinais de ação (AVOID-LONG/SHORT, STANDBY) + Mapa de Saída + Alertas NO TRADE');
  lines.push('📊 Análise CQ completa + detecção de armadilhas + sentimento X (Dr. Grok)');
  lines.push('💊 Coaching mental e diagnóstico do estado psicológico');
  lines.push('');
  lines.push('🛡️ Um sinal perdido = Capital perdido.');
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
