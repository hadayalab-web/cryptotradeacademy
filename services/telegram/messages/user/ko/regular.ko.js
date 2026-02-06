// Tier1 BTC regular briefing (KR)
// services/telegram/messages/user/ko/regular.ko.js

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
 * 한국어의 심리적 조언을 가져오기（일본어가 포함되어 있는 경우의 폴백）
 * @param {string} psychologicalState - 심리 상태
 * @param {string} psychologicalRisk - 위험 수준
 * @returns {string} 한국어 조언
 */
function getKoreanPsychologicalAdvice(psychologicalState, psychologicalRisk) {
  if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'LOW') {
    return '✅ 중립 상태 - 멘탈 블록 미검출: 시장 센티먼트가 균형을 이루고 있습니다. 극단적인 감정이 감지되지 않았습니다. 조건이 안정적입니다.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'MEDIUM') {
    return '⚠️ 중립 상태 - 면밀히 모니터링: 시장 센티먼트가 균형을 이루고 있지만 조건이 변할 수 있습니다. 경계를 유지하세요.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'HIGH') {
    return '🚨 중립 상태 - 높은 위험: 이 "중립" 센티먼트가 트랩 조건을 숨기고 있을 수 있습니다. 규율을 유지하세요.';
  } else if (psychologicalState === 'FOMO') {
    return '🚨 FOMO 감지 - 극단적인 매수 압력: 소매 투자자들이 추격하는 동안 고래들이 분배하고 있을 수 있습니다. 이것은 고전적인 트랩 패턴입니다.';
  } else if (psychologicalState === 'FEAR') {
    return '😨 두려움 감지 - 시장이 낮은 소매 관심을 보여줍니다: 두려움은 마비시킬 수 있지만 잠재적 기회를 시사할 수도 있습니다.';
  } else if (psychologicalState === 'GREED') {
    return '😍 탐욕 감지 - 황홀한 조건: 탐욕은 트레이딩에서 가장 위험한 감정입니다. 이익 실현을 고려하세요.';
  } else if (psychologicalState === 'PANIC') {
    return '😱 공황 감지 - 극단적인 두려움: 공황은 편도체가 전두엽 피질을 납치하는 것입니다. 멈추세요. 숨을 쉬세요. 데이터를 확인하세요.';
  } else if (psychologicalState === 'EUPHORIA') {
    return '😄 황홀감 감지 - 시장 축제: 황홀감은 시장이 당신에게 위험을 잊게 만드는 방법입니다. 규율을 유지하세요.';
  } else if (psychologicalState === 'CONFUSION') {
    return '🤔 혼란 감지 - 불명확한 신호: 혼란은 당신의 뇌가 명확성을 요구하는 것입니다. 거래를 강요하지 마세요. 의심스러우면 기다리세요.';
  }
  
  // デフォルト
  return '시장 조건이 상대적으로 안정적입니다. 규율을 유지하고 품질 있는 설정을 기다리세요.';
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
  kimchiPremium, // Phase 2: KO市場専用
  upbitPrice, // Phase 2: KO市場専用
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

  const priceLine = `💰 BTC 가격: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? '유입' : '유출';
  const flowAbs = Math.abs(inflow || 0);
  const flowExplanation = inflow >= 0 
    ? '유입: 거래소로 자금이 들어오고 있음 (잠재적 매도 압력)'
    : '유출: 거래소에서 자금이 나가고 있음 (보유자들이 자산을 보호 중)';
  const flowLine = `📊 거래소 순${flowDir}: ${flowAbs.toFixed(0)} BTC (${flowExplanation})`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 시장 심리: ${sentimentLabel || '알 수 없음'}`;

  // Market Scoreの解釈補助を追加
  const marketScore = Math.round(score ?? 0);
  let scoreInterpretation = '';
  if (marketScore >= 50) {
    scoreInterpretation = ' (상승세)';
  } else if (marketScore >= 20) {
    scoreInterpretation = ' (중립/안정)';
  } else if (marketScore >= -20) {
    scoreInterpretation = ' (중립/안정)';
  } else if (marketScore >= -50) {
    scoreInterpretation = ' (하락세)';
  } else {
    scoreInterpretation = ' (매우 하락세)';
  }
  const scoreLine = `📈 시장 점수: ${marketScore}/100${scoreInterpretation}`;

  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;

  let trapLine = '✅ 트랩 감지기: 치명적인 트랩은 감지되지 않았습니다.';
  if (trapDetection && trapDetection.trapDetected) {
    const trapSev = trapDetection.trapSeverity || 'NONE';
    const trapSc = trapDetection.trapScore || 0;
    if (trapSev !== 'NONE' && trapSc > 0) {
      const trapEmoji = trapSev === 'CRITICAL' ? '🚨' : trapSev === 'HIGH' ? '⚠️' : trapSev === 'MEDIUM' ? '⚡' : '💡';
      const trapTypeLabel = (trapDetection.trapType || '트랩').replace(/_/g, ' ');
      trapLine = `${trapEmoji} 트랩 감지기: ${trapTypeLabel} (심각도: ${trapSev}, 점수: ${trapSc}/100)`;
    }
  } else if (trap?.isTrap) {
    trapLine = `🧨 트랩 감지기: ${trap.label || '잠재적 트랩'} (${trap.confidence} 신뢰도)`;
  }

  let dirEmoji;
  let dirLabel;
  if (hasActiveTrapAlert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ 트랩 알림: 롱 회피 권장';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ 트랩 알림: 숏 회피 권장';
    } else {
      dirLabel = '🛡️ 트랩 알림: 대기 권장';
    }
  } else if (isLowTrapRisk) {
    dirEmoji = '📐';
    dirLabel = '낮은 트랩 리스크 — 포지셔닝 윈도우';
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isPositioningWindow = isLowTrapRisk && !hasActiveTrapAlert;
  const entryLine = isPositioningWindow
    ? `• 진입가: 에지가 명확할 때 질적 진입 검토 (기준 ${formatUsd(priceUsd)})`
    : (!isLowTrapRisk && !hasActiveTrapAlert
      ? '• 진입가: 승리 준비 중 — 명확한 트리거 대기'
      : `• 진입가 (스팟 기준): ${formatUsd(priceUsd)}`);
  const tpLine = isPositioningWindow
    ? '• Take Profit: 진입 전에 설정'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: TBD (결정 대기 중)');
  const slLine = isPositioningWindow
    ? '• Stop Loss: 진입 전에 설정'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: TBD (결정 대기 중)');
  const rrLine = tradeSignal?.rr != null ? `• 손익비 (RR): ${tradeSignal.rr.toFixed(2)}` : (isPositioningWindow ? '• 손익비 (RR): 포지션에 따라 설정' : '• 손익비 (RR): 대기 중');
  const modeLine = isPositioningWindow
    ? '• 모드: 낮은 트랩 리스크 — long/short 포지션 검토 가능(리스크 한정). 에지가 명확할 때만 레버리지.'
    : (!isLowTrapRisk ? '• 모드: Trap Standby — 명확한 에지까지 대기. 방어 우선.' : '');

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok이 현재 오프라인입니다(온체인/가격 신호만 사용 중).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';

  const lines = [];
  if (isHighTrapForHeader) {
    lines.push(`🚨 Trap Defence 알림 — ${trapSeverityForHeader} 트랩 리스크`);
  } else {
    lines.push('📋 Trap Defence 브리핑');
  }
  lines.push(`📅 ${ts}`);
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

  let actionPreview = '';
  if (sosovalueArticle && typeof sosovalueArticle === 'string' && sosovalueArticle.trim()) {
    const firstSentence = sosovalueArticle.split(/[.!?\n]/)[0]?.trim() || sosovalueArticle.trim();
    actionPreview = firstSentence.length > 120 ? firstSentence.slice(0, 117) + '…' : firstSentence;
    if (actionPreview) {
      lines.push('📌 당신의 행동: ' + actionPreview);
      lines.push('');
    }
  }

  // Context（クジラは数値出さない）
  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40));
    const contextNote = whaleRatioEstimate >= 80
      ? '유입의 상당 부분이 매도 압력으로 전환될 수 있습니다. 리스크 관리 차원에서 모니터링할 가치가 있습니다.'
      : '유입의 상당 부분이 고래와 연관되었을 수 있습니다. 리스크 관리 차원에서 모니터링할 가치가 있습니다.';
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 컨텍스트');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`시장 점수: ${Math.round(score)}/100${scoreInterpretation}`);
    lines.push(`거래소 순유입: +${Math.abs(inflow).toFixed(0)} BTC 유입`);
    lines.push(`센티먼트: ${sentimentLabel}`);
    lines.push('');
    lines.push(contextNote);
    lines.push('');
  }

  // ===== 【ハイライト】Trap / CQ / Action の3項目に整理 =====
  lines.push('✨ 오늘의 하이라이트');
  lines.push('');
  const trapData = trapDetection || marketBug;
  const trapOneLine = trapData && (trapData.trapDetected || trapData.bugDetected)
    ? `🛡️ 트랩: ${(trapData.trapType || trapData.bugType || '이상').replace(/_/g, ' ')} (${Math.round(trapData.trapScore || trapData.bugScore || 0)}/100)`
    : '🛡️ 트랩: 감지된 트랩 없음';
  const trapRiskLabel = isLowTrapRisk ? '낮음' : (effectiveTrapScore != null && effectiveTrapScore >= 50 ? '높음' : '보통');
  const cqOneLine = inflow >= 0
    ? `📊 CQ: 순유입 +${Math.abs(inflow).toFixed(0)} BTC; 트랩 리스크 ${trapRiskLabel}.`
    : `📊 CQ: 순유출 −${Math.abs(inflow).toFixed(0)} BTC; 트랩 리스크 ${trapRiskLabel}.`;
  lines.push(trapOneLine);
  lines.push(cqOneLine);
  lines.push(`📌 행동: ${actionPreview || '명확한 에지까지 대기.'}`);
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
      // KO市場用: 韓国語以外の言語が混入している場合を検出
      // エラーでない場合のみ言語チェックを実行
      // ハングルが含まれていない場合は英文と判断
      const hasKoreanChars = /[\uAC00-\uD7AF]/.test(gptNewsText);
      // 日本語・英語・その他の言語が混入している場合を検出
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      const hasEnglishOnly = !hasKoreanChars && !hasJapaneseChars && gptNewsText.length > 50;
      if (hasJapaneseChars || (hasEnglishOnly && !hasKoreanChars)) {
        // 日本語または英語のみが含まれている場合はnullに設定して韓国語フォールバックを使用
        console.warn('[Regular KO] Non-Korean language detected in GPT analysis, using fallback');
        gptNewsText = null;
      } else if (!hasKoreanChars && gptNewsText.length > 50) {
        // 韓国語が含まれていない場合はnullに設定して韓国語フォールバックを使用
        gptNewsText = null;
      }
    }
  }
  
  // フォールバック: GPT分析が利用できない場合の代替メッセージ
  if (!gptNewsText || gptNewsText.trim() === '') {
    // CryptoQuantデータから基本的な分析を生成
    const inflowDisplay = inflow >= 0 ? `유입 ${Math.abs(inflow).toFixed(0)} BTC` : `유출 ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    const priceChangeDisplay = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`;
    
    // COO最適化: ストーリーテリング改善
    gptNewsText = `📖 데이터 뒤에 숨은 이야기

당신이 잠든 동안, 고래들이 포지셔닝 중입니다. 지금 일어나고 있는 일:

1. 🏦 거래소 유입: ${inflowDisplay}
   → ${inflow >= 0 ? '매도자들이 로딩 중. 이것은 정상이 아닙니다.' : '보유자들이 자산을 보호 중. 이것은 강세입니다.'}

2. ⛏️ 채굴자들 ${mpi >= 0 ? '매도 중' : '보유 중'}: MPI ${mpiDisplay}
   → ${mpi >= 0 ? '채굴자들이 매도 중. 이것은 단기적으로 약세입니다.' : '채굴자들이 매도하지 않습니다. 이것은 장기적으로 강세입니다.'}

3. 🧠 ${sentimentLabel} 센티먼트
   → ${sentimentLabel.toLowerCase().includes('fear') ? '소매 공황. 이것은 스마트 머니에게 기회입니다.' : sentimentLabel.toLowerCase().includes('greed') ? '소매 유포리아. 이것은 늦게 사는 사람들에게 위험입니다.' : '중립 조건. 서두르지 마세요.'}

💡 심리적 해석:

CryptoQuant 데이터는 ${inflowDisplay}, 채굴자 포지션 지수(MPI) ${mpiDisplay}, ${sentimentLabel.toLowerCase()} 센티먼트를 보여주며, 가격은 24시간 동안 ${priceChangeDisplay} 변동했습니다.

심리적 관점에서 이러한 지표는 ${sentimentLabel.toLowerCase()} 시장 환경을 시사합니다. ${inflow >= 0 ? '유입' : '유출'}은 ${inflow >= 0 ? '더 많은 암호화폐가 거래소로 유입되고 있음' : '더 많은 암호화폐가 거래소에서 유출되고 있음'}을 나타내며, 이는 종종 ${inflow >= 0 ? '잠재적인 매도 압력' : '보유자들이 거래소 외부에서 자산을 보호하고 있음'}을 의미합니다.

${score <= 25 && inflow > 0 ? '⚠️ 모순: 낮은 위험 점수인데 높은 매도 압력. 이것이 바로 트랩이 형성되는 때입니다. 서두르지 마세요.' : '시장은 관망 모드입니다. 서두르지 마세요.'}`;
  }
  
  // Telegram互換性: Markdown見出し（###）を削除してTelegramネイティブな形式に変換（先に実行）
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '') // ###見出しを削除
    .replace(/^##\s+/gm, '')   // ##見出しを削除
    .replace(/^#\s+/gm, '');   // #見出しを削除
  // プレーンテキストの見出しも改善（英語と韓国語の両方に対応）
  gptNewsDisplay = gptNewsDisplay
    .replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 온체인 지표의 심리적 해석')
    .replace(/^온체인 지표의 심리적 해석$/gm, '💡 온체인 지표의 심리적 해석'); // 韓国語見出しにも絵文字を追加
  
  // 要約1行＋短めの本文で全体長を抑える（420文字まで、EN/JAと統一）
  const gptNewsLimit = 420;
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
  
  // モバイル最適化: 冒頭に1行の要約を追加（100点満点への最後の仕上げ）
  // トラップ検出状況に基づいて要約を生成
  const trapDataForSummary = trapDetection || marketBug;
  const hasTrapForSummary = trapDataForSummary && (trapDataForSummary.trapDetected || trapDataForSummary.bugDetected);
  const trapTypeForSummary = trapDataForSummary?.trapType || trapDataForSummary?.bugType || '';
  const trapSeverityForSummary = trapDataForSummary?.trapSeverity || trapDataForSummary?.bugSeverity || 'NONE';
  
  let summaryLine = '';
  if (hasTrapForSummary && trapSeverityForSummary !== 'NONE') {
    const trapTypeDisplay = trapTypeForSummary.replace(/_/g, ' ');
    // Telegram Markdownでは [text] がリンクとして解釈されるため、[Summary]ではなく Summary: を使用
    summaryLine = `📰 요약: 온체인 지표는 "관망 모드"를 보여줍니다. ${trapTypeDisplay}는 안정적인 가격에도 불구하고 숨겨진 트랩을 시사합니다.`;
  } else {
    summaryLine = `📰 요약: 온체인 지표는 "관망 모드"를 보여줍니다. 시장 조건은 안정적이지만 트랩 패턴에 대해 경계를 유지하세요.`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // GPT分析の見出しを改善（プレーンテキスト見出しに絵文字を追加）
  let gptNewsDisplayFinal = gptNewsDisplay;
  // 「온체인 지표의 심리적 해석」という見出しに絵文字を追加
  gptNewsDisplayFinal = gptNewsDisplayFinal.replace(/^온체인 지표의 심리적 해석$/gm, '💡 온체인 지표의 심리적 해석');
  
  // 英語版と統一するため、GPT分析の前に📰絵文字を追加
  lines.push(`📰 ${gptNewsDisplayFinal}`);
  lines.push('');
  
  // ===== Data-Backed / Gemini（全言語共通構成） =====
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 NanoBanana 인포그래픽');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 첨부된 미디어를 확인하세요!');
    lines.push('');
  }
  if (sosovalueArticle) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📰 온체인 인사이트 (CQ + 과거 맥락)');
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
    lines.push('📊 데이터 기반 이유');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 트랩 점수: ${trapScoreRounded}/100 → 상당한 트랩 위험`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} 감지됨`);
        lines.push(`💡 관망. 지금 진입하면 트랩에 노출될 수 있습니다.`);
      } else if (isLowTrap) {
        lines.push(`✅ 트랩 점수: ${trapScoreRounded}/100 → 낮은 트랩 위험`);
        lines.push(`📐 포지셔닝 윈도우 — 에지가 명확할 때 long/short 또는 한정 리스크로 레버리지 검토 가능.`);
      } else {
        lines.push(`⚡ 트랩 점수: ${trapScoreRounded}/100 → 보통 수준 주의`);
        lines.push(`💡 진입 전 확인을 기다리세요.`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || '이상').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (점수: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`💡 온체인 이상 징후로 관망 권장.`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (심각도: ${trapAlert.severity})`);
      lines.push(`💡 명확한 에지가 나올 때까지 방어 유지.`);
    }
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok（固定コーナー、全言語共通）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Dr. Grok의 의견');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  if (integratedOptimization && integratedOptimization.integrated && integratedOptimization.optimization) {
    const opt = integratedOptimization.optimization;
    
    // 에러 코드를 다국어 메시지로 변환（한국어）
    const errorMessages = {
      GROK_UNAVAILABLE: 'Grok X 알고리즘 분석을 사용할 수 없습니다',
      GROK_ERROR: 'Grok X 알고리즘 분석에서 오류가 발생했습니다',
      GEMINI_UNAVAILABLE: 'Gemini 심층 심리 분석을 사용할 수 없습니다',
      GEMINI_ERROR: 'Gemini 심층 심리 분석에서 오류가 발생했습니다',
    };
    
    // 에러 메시지 표시（부분 통합의 경우）
    if (integratedOptimization.errorCodes && integratedOptimization.errorCodes.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('⚠️ 일부 분석을 사용할 수 없습니다');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      integratedOptimization.errorCodes.forEach(code => {
        const msg = errorMessages[code] || code;
        lines.push(`   • ${msg}`);
      });
      lines.push('   💡 사용 가능한 결과만 표시합니다');
      lines.push('');
    }
    
    // Grok 기원 데이터 확인（sources 기반）
    const hasGrok = !!integratedOptimization.sources?.grok && !integratedOptimization.sources.grok.error;
    
    // X 알고리즘 최적화 인사이트（Grok 분석에서）- sources 기반으로 표시 판정
    // P0 FIX: questionCTAとengagementBoostersは有料版レポートの文脈に合わないため、バイラル可能性スコアとタイミング情報のみを表示
    if (hasGrok && opt.content && (opt.viralPotential !== undefined || opt.timing)) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('📱 X 게시물 최적화'); // P0 FIX: 日本語の括弧を削除
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      
      // Viral potential score display
      if (opt.viralPotential !== null && opt.viralPotential !== undefined) {
        const { emoji, label, score } = formatViralScore(opt.viralPotential, {
          high: '【높음】',
          medium: '【중간】',
          low: '【낮음】'
        });
        lines.push(`   ${emoji} ${label} 바이럴 가능성 점수: ${score}/100`);
        if (opt.viralFactors && opt.viralFactors.length > 0) {
          const filteredFactors = filterJapaneseFromArray(opt.viralFactors);
          if (filteredFactors.length > 0) {
            lines.push(`   📊 주요 요인: ${filteredFactors.slice(0, 2).join(', ')}`);
          }
        }
      }
      
      if (opt.timing && opt.timing.length > 0) {
        const koreanTimings = cleanTimingInfo(opt.timing);
        if (koreanTimings.length > 0) {
          lines.push(`⏰ 최적 게시 시간: ${koreanTimings.slice(0, 2).join(', ')}`);
        }
      }
      
      lines.push('');
    }
    
    // Gemini 기원 데이터 확인（sources 기반）
    const hasGemini = !!integratedOptimization.sources?.gemini && !integratedOptimization.sources.gemini.error;
    
    // 심층 심리 인사이트（Gemini 분석에서）- 중요 정보로 강조 표시（sources 기반으로 표시 판정）
    if (hasGemini && opt.psychologicalInsights) {
      const psyInsights = opt.psychologicalInsights;
      
      // Check if entire psychologicalInsights object contains Japanese
      if (hasJapaneseInPsychologicalInsights(psyInsights)) {
        console.warn('[Regular KO] Japanese characters detected in psychologicalInsights, skipping entire section');
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
          lines.push('🧠 【중요】심층 심리 인사이트');
          lines.push('━━━━━━━━━━━━━━━━━━━━');
          lines.push(`💚 심리 상태: ${stateEmoji} ${psychologicalSupport.psychologicalState} (위험: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
          if (psychologicalSupport.psychologicalAdvice) {
            if (!hasJapanese(psychologicalSupport.psychologicalAdvice)) {
              lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
            } else {
              const koreanAdvice = getKoreanPsychologicalAdvice(
                psychologicalSupport.psychologicalState,
                psychologicalSupport.psychologicalRisk
              );
              if (koreanAdvice) {
                lines.push(`   💡 ${koreanAdvice}`);
              }
            }
          }
          lines.push('');
        }
      } else {
        // 日本語が含まれていない場合のみ表示
        lines.push('━━━━━━━━━━━━━━━━━━━━');
        lines.push('🧠 【중요】심층 심리 인사이트');
        lines.push('━━━━━━━━━━━━━━━━━━━━');
        
        if (psyInsights.currentState && psyInsights.currentState !== 'NEUTRAL') {
          if (!hasJapanese(psyInsights.currentState)) {
            const stateEmoji = psyInsights.currentState === 'FOMO' ? '😰' :
                               psyInsights.currentState === 'FEAR' ? '😨' :
                               psyInsights.currentState === 'GREED' ? '😍' :
                               psyInsights.currentState === 'PANIC' ? '😱' :
                               psyInsights.currentState === 'EUPHORIA' ? '😄' :
                               psyInsights.currentState === 'CONFUSION' ? '🤔' : '😐';
            lines.push(`💚 심리 상태: ${stateEmoji} ${psyInsights.currentState}`);
          }
        }
        
        if (psyInsights.mentalBlocks && psyInsights.mentalBlocks.length > 0) {
          // 日本語が含まれている要素をフィルタリング
          const filteredBlocks = psyInsights.mentalBlocks.filter(block => 
            !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(block)
          );
          if (filteredBlocks.length > 0) {
            lines.push(`🚧 멘탈 블록: ${filteredBlocks.slice(0, 2).join(', ')}`);
          }
        }
        
        if (psyInsights.breakthroughInsights && psyInsights.breakthroughInsights.length > 0) {
          const filteredInsights = filterJapaneseFromArray(psyInsights.breakthroughInsights);
          if (filteredInsights.length > 0) {
            lines.push(`   💡 【중요】브레이크스루 인사이트:`);
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
            coachingDisplay = getKoreanPsychologicalAdvice(
              psyInsights.currentState || 'NEUTRAL',
              'LOW'
            );
          }
          
          if (coachingDisplay.length > coachingLimit) {
            coachingDisplay = coachingDisplay.slice(0, coachingLimit) + '…';
          }
          lines.push(`💊 개인화된 코칭:`);
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
        const lastSentenceEnd = Math.max(
          truncated.lastIndexOf('.'),
          truncated.lastIndexOf('!'),
          truncated.lastIndexOf('?'),
          truncated.lastIndexOf('\n')
        );
        // 文の終わりが見つかった場合、その位置で切る
        if (lastSentenceEnd > grokXLimit * 0.7) {
          grokXDisplay = truncated.slice(0, lastSentenceEnd + 1) + '…';
        } else {
          // 文の終わりが見つからない場合、単純に切る
          grokXDisplay = truncated + '…';
        }
      }
      lines.push(`📱 X 센티먼트 분석: ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular KO] Japanese characters detected in grokXAnalysis, skipping');
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
    lines.push(`💚 심리 상태: ${stateEmoji} ${psychologicalSupport.psychologicalState} (위험: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    if (psychologicalSupport.psychologicalAdvice) {
      const advice = psychologicalSupport.psychologicalAdvice;
      // 日本語が含まれている場合は韓国語フォールバックを使用
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(advice)) {
        const fallbackAdvice = getKoreanPsychologicalAdvice(
          psychologicalSupport.psychologicalState,
          psychologicalSupport.psychologicalRisk
        );
        lines.push(`   💡 ${fallbackAdvice}`);
      } else {
        lines.push(`   💡 ${advice}`);
      }
    }
    if (psychologicalSupport.mentalNote) {
      if (!hasJapanese(psychologicalSupport.mentalNote)) {
        lines.push(`💊 Dr. Grok의 멘탈 노트:`);
        lines.push(`"${psychologicalSupport.mentalNote}"`);
      } else {
        const fallbackNote = '인내는 약점이 아닙니다—전략적 강점입니다. 최고의 트레이더들은 거래하지 않을 때를 압니다.';
        lines.push(`💊 Dr. Grok의 멘탈 노트:`);
        lines.push(`"${fallbackNote}"`);
      }
    }
  } else if (!integratedOptimization || !integratedOptimization.integrated) {
    // 폴백: 데이터를 가져올 수 없는 경우에도 가치 있는 메시지 제공
    lines.push('💚 심리 상태: 😐 NEUTRAL (위험: 💡 낮음)');
    lines.push('');
    lines.push('💊 Dr. Grok의 멘탈 노트:');
    lines.push('"인내는 약점이 아니다—전략적 강점이다. 최고의 트레이더는 거래하지 않을 때를 안다."');
  }
  
  lines.push('');

  // 有料版の価値（簡潔に）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 이것이 유료 리포트를 선택한 이유');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🎯 액션 신호 (AVOID-LONG/SHORT, STANDBY) + 출구 지도 + NO TRADE 알림');
  lines.push('📊 전체 CQ 분석 + 트랩 감지 + X 센티먼트 (Dr. Grok)');
  lines.push('💊 멘탈 코칭 및 심리 상태 진단');
  lines.push('');
  lines.push('🛡️ 하나의 신호를 놓치면 = 자본 손실.');
  lines.push('');

  // ===== 基本市場データ（スキャンしやすい1ブロック） =====
  lines.push('📋 스냅샷');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push(scoreLine);
  lines.push('');

  // Trap Score表示（EN과 동일）
  let displayTrapScore = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore >= 0) {
    displayTrapScore = trapDetection.trapScore;
  } else if (trapScore != null && trapScore >= 0) {
    displayTrapScore = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore >= 0) {
    displayTrapScore = trapRisk.trapRiskScore;
  }
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 고위험' : displayTrapScore >= 40 ? '⚠️ 중간' : '✅ 낮음';
    lines.push(`🎯 트랩 점수: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
    lines.push('');
  }

  // Whale Ratio정보（EN과 동일）
  if (whaleFlows && whaleFlows.whaleRatio != null) {
    // whaleRatioは0-1の範囲の数値として返される（deepMetrics.js参照）
    // パーセンテージに変換（0.56 -> 56%）
    const whaleRatioValue = typeof whaleFlows.whaleRatio === 'number' 
      ? whaleFlows.whaleRatio * 100 
      : parseFloat(whaleFlows.whaleRatio) * 100 || 0;
    const isHighPressure = whaleFlows.isHighPressure === true || whaleRatioValue >= 80;
    const whaleLine = `🐋 고래 비율: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(높은 압력)' : '(정상)'}`;
    lines.push(whaleLine);
  } else if (whaleFlows) {
    console.warn('[Regular KO] whaleFlows exists but whaleRatio is null:', whaleFlows);
  }

  // 24h 청산（EN과 동일）
  const totalLiquidations = typeof liquidations === 'number'
    ? liquidations
    : (liquidations?.totalLiquidations ?? 0);
  if (totalLiquidations > 0) {
    if (typeof liquidations === 'object' && liquidations.longLiquidations != null && liquidations.shortLiquidations != null) {
      const liqLine = `💥 24h 청산: ${formatUsd(totalLiquidations)} (롱: ${formatUsd(liquidations.longLiquidations)}, 숏: ${formatUsd(liquidations.shortLiquidations)})`;
      lines.push(liqLine);
    } else {
      lines.push(`💥 24h 청산: ${formatUsd(totalLiquidations)}`);
    }
  }

  lines.push(trapLine);

  // Phase 2: Kimchi Premium表示（KO市場専用）
  if (kimchiPremium != null) {
    const premiumPct = kimchiPremium * 100; // Convert decimal to percentage
    const premiumLine = `🥟 김치 프리미엄: ${premiumPct.toFixed(2)}% ${premiumPct > 5 ? '🚨 함정' : premiumPct > 3 ? '⚠️ 주의' : '✅ 정상'}`;
    lines.push(premiumLine);
    if (upbitPrice) lines.push(`• 업비트: ₩${upbitPrice.toLocaleString('ko-KR')}`);
  }

  // Phase1-Product: Trap Riskスコア表示
  if (trapRisk && trapRisk.trapRiskScore != null) {
    const riskEmoji = trapRisk.riskLevel === 'CRITICAL' ? '🚨' : 
                      trapRisk.riskLevel === 'HIGH' ? '⚠️' : 
                      trapRisk.riskLevel === 'MEDIUM' ? '⚡' : '✅';
    const trapRiskLine = `${riskEmoji} 트랩 리스크 점수: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
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
    const noTradeLine = `${noTradeEmoji} NO TRADE 알림 (${noTradeAlert.confidence} 신뢰도, 리스크 점수: ${noTradeAlert.riskScore}/100)`;
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
  
  // Phase1-Product: Exit Map表示（簡略化：最大8行）
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ 출구 지도');
    lines.push(`   포지션 상태: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} 미실현 손익: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 이익 실현 구간:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} 구간 ${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}% 실현)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 구간 ${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}% 실현)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ 출구 조건:');
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

  lines.push('교육 목적의 정보 제공일 뿐이며, 투자/재무 자문을 구성하지 않습니다.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
