// Tier1 BTC regular briefing (PT-BR)
// services/telegram/messages/user/pt-br/regular.pt-br.js

const { hasJapanese, filterJapaneseFromArray, cleanTimingInfo, hasJapaneseInPsychologicalInsights, formatViralScore } = require('../shared/contentFilters');

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
  integratedOptimization, // Grok Xアルゴリズム解析 × Gemini深層心理解析の統合結果
  // Phase 2: 市場別深掘りデータ
  whaleFlows, // Whale Flows（EN市場専用だが、他の言語でも表示可能）
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
  const trapLine = trap?.isTrap
    ? `🧨 Detector de armadilhas: ${trap.label || 'Armadilha potencial'} (${trap.confidence} confiança)`
    : '✅ Detector de armadilhas: Nenhuma armadilha crítica detectada';

  let dirEmoji;
  let dirLabel;
  // Apenas alertas de armadilha (BUY/SELL/LONG/SHORT completamente removidos)
  if (trapAlert && trapAlert.alert) {
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
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isNoTrade = true; // Sempre modo de espera (sinais BUY/SELL completamente removidos)
  const entryLine = isNoTrade
    ? '• Entrada: Preparação para a Vitória — Aguardando Gatilho Claro'
    : `• Entrada (ref. spot): ${formatUsd(priceUsd)}`;
  const tpLine = isNoTrade
    ? '• Take Profit: TBD (A Ser Determinado)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a');
  const slLine = isNoTrade
    ? '• Stop Loss: TBD (A Ser Determinado)'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a');
  const rrLine = isNoTrade
    ? '• Risco/Retorno (RR): Aguardar'
    : (tradeSignal?.rr != null ? `• Risco/Retorno (RR): ${tradeSignal.rr.toFixed(2)}` : '');
  const modeLine = isNoTrade ? '• Modo: Trap Standby — aguarde vantagem clara. Priorizar defesa' : '';

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
  // COO最適化: 緊急感強化
  const urgencyLevel = (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) ? 'CRÍTICO' : 'URGENTE';
  lines.push(`🚨 ALERTA ${urgencyLevel}: Briefing de Defesa de Armadilhas AGORA!`);
  lines.push(`📅 ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（最上部に配置） =====
  lines.push('🎯 Veredito de trade');
  lines.push(`${dirEmoji} Sinal: ${dirLabel}`);
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
    lines.push('🤔 ALERTA DE CONTRADIÇÃO');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Score de mercado: ${Math.round(score)}/100 (Neutro/Estável)`);
    lines.push(`MAS Fluxo líquido nas exchanges: +${Math.abs(inflow).toFixed(0)} BTC ENTRADA`);
    lines.push(`E Sentimento: ${sentimentLabel}`);
    lines.push('');
    lines.push(`⚠️ Esta contradição sinaliza: Baixo risco MAS pressão de venda se acumulando.`);
    lines.push(`   Ratio estimado de baleias ${whaleRatioEstimate.toFixed(0)}% = $${whaleDollarValue}M+ prontas para vender.`);
    lines.push(`   O que isso significa para o SEU capital?`);
    lines.push('');
  }

  // ===== 【コア機能ハイライト】3つの強み =====
  lines.push('✨ Destaques de hoje (3 Características Principais)');
  lines.push('');
  
  // Core Feature 1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    const trapType = trapData.trapType || trapData.bugType || 'Anomalia';
    const trapTypeText = trapType.replace(/_/g, ' ');
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ Característica Principal 1: Defesa de Armadilhas - ${trapEmoji} ${trapTypeText} (Pontuação: ${trapScore.toFixed(0)}/100)`);
    
    // Display score calculation components (transparency)
    if (trapData.details) {
      const components = [];
      if (trapData.details.multipleDivergences >= 3) {
        components.push(`Divergências Múltiplas (${trapData.details.multipleDivergences})`);
      } else if (trapData.details.multipleDivergences >= 2) {
        components.push(`Divergências Múltiplas (${trapData.details.multipleDivergences})`);
      }
      if (trapData.details.anomalyDetected) {
        components.push('Anomalia de Alta Resolução');
      }
      if (trapData.details.accelerationDetected) {
        components.push('Aceleração de Tendência');
      }
      if (Math.abs(trapData.details.onchainSocialDivergence || 0) > 40) {
        components.push('Divergência Baleia/Varejo');
      }
      if (trapData.details.priceOnchainDivergence) {
        components.push('Divergência Preço/Onchain');
      }
      if (trapData.details.priceSocialDivergence) {
        components.push('Divergência Preço/Sentimento');
      }
      if (components.length > 0) {
        lines.push(`   📊 Componentes: ${components.join(' + ')}`);
      }
    }
    
    // Display trap alert details if available
    if (trapAlert && trapAlert.alert) {
      const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
      const recommendationText = trapAlert.recommendation ? trapAlert.recommendation.replace(/_/g, '-') : 'UNKNOWN';
      lines.push(`   🚨 Tipo de Alerta: ${alertTypeText} (Severidade: ${trapAlert.severity})`);
      lines.push(`   💡 Recomendação: ${recommendationText}`);
      if (trapAlert.confidence) {
        lines.push(`   📊 Confiança: ${(trapAlert.confidence * 100).toFixed(0)}%`);
      }
    }
  } else {
    lines.push('🛡️ Característica Principal 1: Defesa de Armadilhas - Nenhuma armadilha detectada atualmente');
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
  const gptNewsLimit = 600;
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
    lines.push('📊 Razões Baseadas em Dados');
    
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      if (trapScoreRounded >= 50) {
        lines.push(`🎯 Pontuação de Armadilha: ${trapScoreRounded}/100 indica risco significativo de armadilha`);
        if (trapTypeForEvidence) {
          const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
          lines.push(`⚠️ Tipo de Armadilha: ${trapTypeDisplay} detectado`);
        }
        lines.push(`💡 Evidência: Múltiplas divergências e anomalias on-chain sugerem que um modo "Espera" é prudente`);
        lines.push(`📈 Por que esperar? Os dados mostram sinais ${trapScoreRounded >= 70 ? 'fortes' : 'moderados'} de que entrar agora pode expor você a armadilhas do mercado`);
      } else {
        lines.push(`✅ Pontuação de Armadilha: ${trapScoreRounded}/100 indica baixo risco de armadilha`);
        lines.push(`💡 Evidência: Trap Score está em ${trapScoreRounded}/100—tão limpo quanto pode ser. Mas olha: muita armadilha nasce no silêncio`);
      }
    } else if (trapDetection || trapAlert) {
      // フォールバック: trapDetectionやtrapAlertから証拠を生成
      if (trapDetection && trapDetection.trapDetected) {
        const trapTypeText = (trapDetection.trapType || 'Anomalia').replace(/_/g, ' ');
        lines.push(`🎯 Detecção de Armadilha: ${trapTypeText} (Pontuação: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
        lines.push(`💡 Evidência: Múltiplas anomalias on-chain detectadas com base em dados`);
      } else if (trapAlert && trapAlert.alert) {
        const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
        lines.push(`🚨 Alerta de Armadilha: ${alertTypeText} (Severidade: ${trapAlert.severity})`);
        lines.push(`💡 Evidência: Risco de armadilha do mercado detectado com base em dados on-chain e análise de sentimento`);
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
        lines.push(`  🚨 Pontuação de Armadilha ${trapScoreRounded}/100: Sinais fortes indicam armadilhas potenciais do mercado`);
        lines.push(`  📊 Os dados mostram múltiplas divergências e anomalias on-chain`);
        lines.push(`  🛡️ A preparação estratégica não é fraqueza—é preparação para a vitória. Calma. Respira. Não deixa o medo te empurrar`);
      } else if (trapScoreRounded >= 50) {
        lines.push(`  ⚡ Pontuação de Armadilha ${trapScoreRounded}/100: Indicadores de armadilha moderados detectados`);
        lines.push(`  📊 Algumas divergências sugerem cautela`);
        lines.push(`  🛡️ Tá dando aquela coceira de clicar, né? Mas espera confirmação antes de entrar`);
      } else {
        // Baixo risco: Mensagem de acordo com condições do mercado
        if (isLowTrapRisk && isBullish) {
          // Baixo risco e altista: Mensagem mais proativa
          lines.push(`  ✅ Pontuação de Armadilha ${trapScoreRounded}/100: Risco de armadilha baixo detectado`);
          lines.push(`  📈 As condições do mercado parecem favoráveis (Pontuação: ${marketScore}/100). Monitore oportunidades de entrada claras`);
          lines.push(`  💡 Baixo risco + impulso altista = condições favoráveis. Fique alerta para configurações de qualidade`);
        } else if (isLowTrapRisk) {
          // Baixo risco mas neutro/baixista: Mensagem de defesa padrão
          lines.push(`  ✅ Pontuação de Armadilha ${trapScoreRounded}/100: Risco de armadilha baixo atualmente`);
          lines.push(`  🛡️ Os dados estão limpos, mas disciplina vence FOMO. Espera configurações de qualidade`);
          lines.push(`  💡 A paciência compensa. Configurações de qualidade requerem tanto baixo risco quanto direção clara do mercado`);
        } else {
          // Fallback (se não conseguir obter o score)
          lines.push(`  ✅ Pontuação de Armadilha ${trapScoreRounded}/100: Risco de armadilha baixo atualmente, mas os mercados sempre mudam`);
          lines.push(`  🛡️ Mantenha a disciplina. Monitore as condições e aguarde sinais claros`);
        }
      }
    }
    lines.push('');
  }
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('📊 Infográfico NanoBanana');
    lines.push('🎬 Verifique as mídias anexas!');
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grokメンタルコーチ（固定コーナー）
  lines.push('💊 Insight Rápido de Dr. Grok');
  
  // ===== Exibir resultados de otimização integrada de Grok e Gemini =====
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
  
  // Dr. Grokの心理的サポート（癒し系コメンテーターとして）- 統合最適化がない場合のフォールバック
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
    if (psychologicalSupport.psychologicalAdvice) {
      const advice = psychologicalSupport.psychologicalAdvice;
      // 日本語が含まれている場合はポルトガル語フォールバックを使用
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(advice)) {
        const fallbackAdvice = getPortuguesePsychologicalAdvice(
          psychologicalSupport.psychologicalState,
          psychologicalSupport.psychologicalRisk
        );
        lines.push(`   💡 ${fallbackAdvice}`);
      } else {
        lines.push(`   💡 ${advice}`);
      }
    }
    
    lines.push('');
    
    if (psychologicalSupport.mentalNote) {
      if (!hasJapanese(psychologicalSupport.mentalNote)) {
        lines.push(`💊 Nota Mental de Dr. Grok:`);
        lines.push(`"${psychologicalSupport.mentalNote}"`);
      } else {
        const fallbackNote = 'A paciência não é fraqueza—é força estratégica. Os melhores traders sabem quando não negociar.';
        lines.push(`💊 Nota Mental de Dr. Grok:`);
        lines.push(`"${fallbackNote}"`);
      }
    }
  } else if (!integratedOptimization || !integratedOptimization.integrated) {
    // Fallback: Fornecer uma mensagem valiosa mesmo quando os dados não estão disponíveis
    lines.push('💚 Estado Psicológico: 😐 NEUTRAL (Risco: 💡 BAIXO)');
    lines.push('');
    lines.push('   💡 Os dados estão limpos, mas não se confie demais. Mantenha a disciplina');
    lines.push('');
    lines.push('💊 Nota Mental de Dr. Grok:');
    lines.push('"A paciência não é fraqueza—é força estratégica. Os melhores traders sabem quando não operar."');
  }
  
  lines.push('');

  // COO最適化: FOMO強化（有料版の価値を明確化）
  // Melhoria baseada em avaliação GPT: Clarificação de valor em 3 categorias
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 É POR ISSO QUE VOCÊ PAGOU POR ESTE RELATÓRIO');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('Enquanto usuários gratuitos veem apenas a pontuação, VOCÊ obtém:');
  lines.push('');
  lines.push('🎯 Sinais de Ação em Tempo Real:');
  lines.push('✅ Alertas AVOID-LONG / AVOID-SHORT / STANDBY (notificações instantâneas)');
  lines.push('✅ Guia do Mapa de Saída (saber exatamente quando sair)');
  lines.push('✅ Alertas NO TRADE (evitar perdas antes que ocorram)');
  lines.push('');
  lines.push('📊 Análise Profunda de Inteligência:');
  lines.push('✅ Análise completa on-chain (dados CryptoQuant, todos os indicadores)');
  lines.push('✅ Detecção de padrões de armadilha impulsionada por IA (monitoramento 24/7)');
  lines.push('✅ Análise de sentimento X em tempo real (prevê emoções do mercado)');
  lines.push('');
  lines.push('💊 Suporte Psicológico Completo:');
  lines.push('✅ Coaching mental do Dr. Grok (superar FOMO, MEDO, GANÂNCIA)');
  lines.push('✅ Guia de treinamento mental personalizado');
  lines.push('✅ Diagnóstico do estado psicológico e resolução de bloqueios');
  lines.push('');
  lines.push('🛡️ Um sinal perdido = Capital perdido. É por isso que você pagou por este relatório.');
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
    const whaleLine = `🐋 Ratio de Baleias: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(Alta Pressão)' : '(Normal)'}`;
    lines.push(whaleLine);
  } else if (whaleFlows) {
    // デバッグ用: whaleFlowsは存在するがwhaleRatioがnullの場合
    console.warn('[Regular PT-BR] whaleFlows exists but whaleRatio is null:', whaleFlows);
  }
  
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
