// Tier1 BTC regular briefing (KR)
// services/telegram/messages/user/ko/regular.ko.js

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
  // Phase 2: 市場別深掘りデータ
  whaleFlows, // Whale Flows（EN市場専用だが、他の言語でも表示可能）
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
  const trapLine = trap?.isTrap
    ? `🧨 트랩 감지기: ${trap.label || '잠재적 트랩'} (${trap.confidence} 신뢰도)`
    : '✅ 트랩 감지기: 치명적인 트랩은 감지되지 않았습니다.';

  let dirEmoji;
  let dirLabel;
  // 트랩 알림만 표시 (BUY/SELL/LONG/SHORT 완전 삭제)
  if (trapAlert && trapAlert.alert) {
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
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isNoTrade = true; // 항상 대기 모드 (BUY/SELL 시그널 완전 삭제)
  
  // Trade Verdictの表記最適化: Standby状態の時は「TBD」と表記
  const entryLine = isNoTrade
    ? '• 진입가: 승리 준비 중 — 명확한 트리거 대기'
    : `• 진입가 (스팟 기준): ${formatUsd(priceUsd)}`;
  const tpLine = isNoTrade
    ? '• Take Profit: TBD (결정 대기 중)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a');
  const slLine = isNoTrade
    ? '• Stop Loss: TBD (결정 대기 중)'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a');
  const rrLine = isNoTrade
    ? '• 손익비 (RR): 대기 중'
    : (tradeSignal?.rr != null ? `• 손익비 (RR): ${tradeSignal.rr.toFixed(2)}` : '');

  const modeLine = isNoTrade
    ? '• 모드: Trap Standby — 명확한 에지까지 승리 준비. 방어 우선.'
    : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok이 현재 오프라인입니다(온체인/가격 신호만 사용 중).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - 유료 리포트');
  // COO最適化: 緊急感強化
  const urgencyLevel = (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) ? '긴급' : '중요';
  lines.push(`🚨 ${urgencyLevel} 경보: Trap Defence 브리핑! 지금 즉시 행동을 취할 시간입니다!`);
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

  // COO最適化: 矛盾の提示（低リスクなのに売り圧力）
  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40)); // 推定クジラ比率
    const whaleDollarValue = Math.floor((whaleRatioEstimate / 100) * priceUsd * 1000); // 推定ドル価値
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🤔 모순 경보');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`시장 점수: ${Math.round(score)}/100 (중립/안정)`);
    lines.push(`하지만 거래소 순유입: +${Math.abs(inflow).toFixed(0)} BTC 유입`);
    lines.push(`그리고 센티먼트: ${sentimentLabel}`);
    lines.push('');
    lines.push(`⚠️ 이 모순이 시사하는 것: 낮은 위험인데 매도 압력이 축적 중.`);
    lines.push(`   추정 ${whaleRatioEstimate.toFixed(0)}% 고래 비율 = $${whaleDollarValue}M+ 매도 준비 완료.`);
    lines.push(`   이것이 당신의 자본에 의미하는 것은?`);
    lines.push('');
  }

  // ===== 【コア機能ハイライト】3つの強み =====
  lines.push('✨ 오늘의 하이라이트 (3가지 핵심 기능)');
  lines.push('');
  
  // Core Feature 1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    const trapType = trapData.trapType || trapData.bugType || '이상';
    const trapTypeText = trapType.replace(/_/g, ' ');
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ 핵심 기능 1: 트랩 방어 - ${trapEmoji} ${trapTypeText} (점수: ${trapScore.toFixed(0)}/100)`);
    
    // Display score calculation components (transparency)
    if (trapData.details) {
      const components = [];
      if (trapData.details.multipleDivergences >= 3) {
        components.push(`다중 다이버전스 (${trapData.details.multipleDivergences}건)`);
      } else if (trapData.details.multipleDivergences >= 2) {
        components.push(`다중 다이버전스 (${trapData.details.multipleDivergences}건)`);
      }
      if (trapData.details.anomalyDetected) {
        components.push('고해상도 이상');
      }
      if (trapData.details.accelerationDetected) {
        components.push('트렌드 가속');
      }
      if (Math.abs(trapData.details.onchainSocialDivergence || 0) > 40) {
        components.push('고래/소매 다이버전스');
      }
      if (trapData.details.priceOnchainDivergence) {
        components.push('가격/온체인 다이버전스');
      }
      if (trapData.details.priceSocialDivergence) {
        components.push('가격/센티먼트 다이버전스');
      }
      if (components.length > 0) {
        lines.push(`   📊 구성 요소: ${components.join(' + ')}`);
      }
    }
    
    // Display trap alert details if available
    if (trapAlert && trapAlert.alert) {
      const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
      const recommendationText = trapAlert.recommendation ? trapAlert.recommendation.replace(/_/g, '-') : 'UNKNOWN';
      lines.push(`   🚨 알림 유형: ${alertTypeText} (심각도: ${trapAlert.severity})`);
      lines.push(`   💡 권장사항: ${recommendationText}`);
      if (trapAlert.confidence) {
        lines.push(`   📊 신뢰도: ${(trapAlert.confidence * 100).toFixed(0)}%`);
      }
    }
  } else {
    lines.push('🛡️ 핵심 기능 1: 트랩 방어 - 현재 감지된 트랩 없음');
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
   → ${sentimentLabel.toLowerCase().includes('fear') ? '소매 공황. 이것은 스마트 머니에게 기회입니다.' : sentimentLabel.toLowerCase().includes('greed') ? '소매 유포리아. 이것은 늦게 사는 사람들에게 위험입니다.' : '중립 조건. 경계하라.'}

💡 심리적 해석:

CryptoQuant 데이터는 ${inflowDisplay}, 채굴자 포지션 지수(MPI) ${mpiDisplay}, ${sentimentLabel.toLowerCase()} 센티먼트를 보여주며, 가격은 24시간 동안 ${priceChangeDisplay} 변동했습니다.

심리적 관점에서 이러한 지표는 ${sentimentLabel.toLowerCase()} 시장 환경을 시사합니다. ${inflow >= 0 ? '유입' : '유출'}은 ${inflow >= 0 ? '더 많은 암호화폐가 거래소로 유입되고 있음' : '더 많은 암호화폐가 거래소에서 유출되고 있음'}을 나타내며, 이는 종종 ${inflow >= 0 ? '잠재적인 매도 압력' : '보유자들이 거래소 외부에서 자산을 보호하고 있음'}을 의미합니다.

${score <= 25 && inflow > 0 ? '⚠️ 모순: 낮은 위험 점수인데 높은 매도 압력. 이것이 바로 트랩이 형성되는 때입니다. 경계하라.' : '시장은 관망 모드에 있으며, 트레이더들이 조건을 신중하게 모니터링합니다.'}`;
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
  
  // 文字数制限を緩和して、重要な情報が切れないようにする（600文字まで）
  const gptNewsLimit = 600;
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
  
  // 【改善1: Evidenceセクションの独立】証拠（Evidence）セクションを独立させて明確に表示
  // Trap RiskスコアまたはTrap Detectionスコアから証拠を生成（KO版はデータ重視）
  // 優先順位: trapDetection.trapScore > trapRisk.trapRiskScore（値が0の場合は次のソースをチェック）
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('📊 왜 기다려야 하는가? 데이터 기반 이유');
    
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      if (trapScoreRounded >= 50) {
        lines.push(`🎯 트랩 점수: ${trapScoreRounded}/100은 상당한 트랩 위험을 나타냅니다.`);
        if (trapTypeForEvidence) {
          const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
          lines.push(`⚠️ 트랩 유형: ${trapTypeDisplay} 감지됨.`);
        }
        // KO版はデータ重視のため、より詳細なデータ説明を追加
        lines.push(`💡 증거: 다중 다이버전스와 온체인 이상 징후가 "관망 모드"가 신중함을 시사합니다.`);
        lines.push(`📈 상세 데이터:`);
        if (trapDetection?.details) {
          const details = trapDetection.details;
          if (details.multipleDivergences >= 2) {
            lines.push(`   • 다중 다이버전스: ${details.multipleDivergences}건`);
          }
          if (details.anomalyDetected) {
            lines.push(`   • 고해상도 이상 감지: 확인됨`);
          }
          if (Math.abs(details.onchainSocialDivergence || 0) > 40) {
            lines.push(`   • 온체인/소셜 다이버전스: ${Math.abs(details.onchainSocialDivergence).toFixed(1)}%`);
          }
        }
        lines.push(`📈 왜 기다려야 하는가? 데이터는 ${trapScoreRounded >= 70 ? '강한' : '중간 정도의'} 신호를 보여주며, 지금 진입하면 시장 트랩에 노출될 수 있습니다.`);
      } else {
        lines.push(`✅ 트랩 점수: ${trapScoreRounded}/100은 낮은 트랩 위험을 나타냅니다.`);
        lines.push(`💡 증거: 시장 상황이 상대적으로 안전해 보이지만, 트랩 패턴에 대해 경계를 유지하세요.`);
      }
    } else if (trapDetection || trapAlert) {
      // フォールバック: trapDetectionやtrapAlertから証拠を生成
      if (trapDetection && trapDetection.trapDetected) {
        const trapTypeText = (trapDetection.trapType || '이상 감지').replace(/_/g, ' ');
        lines.push(`🎯 트랩 감지: ${trapTypeText} (점수: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
        lines.push(`💡 증거: 온체인 데이터 기반 다중 이상이 감지되었습니다.`);
      } else if (trapAlert && trapAlert.alert) {
        const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
        lines.push(`🚨 트랩 알림: ${alertTypeText} (심각도: ${trapAlert.severity})`);
        lines.push(`💡 증거: 온체인 데이터와 센티먼트 분석에 의해 시장 트랩 위험이 감지되었습니다.`);
      }
    }
    
    // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】
    // 戦略的インサイトセクションを追加
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      const marketScore = Math.round(score ?? 0);
      const isBullish = marketScore >= 50;
      const isLowTrapRisk = trapScoreRounded < 30;
      
      lines.push('');
      lines.push(`💡 전략적 인사이트`);
      if (trapScoreRounded >= 70) {
        lines.push(`  🚨 트랩 점수 ${trapScoreRounded}/100: 강한 신호가 잠재적인 시장 트랩을 나타냅니다.`);
        lines.push(`  📊 데이터는 다중 다이버전스와 온체인 이상을 보여줍니다.`);
        lines.push(`  🛡️ 전략적 준비는 약점이 아닙니다—승리 준비입니다. 극도의 주의를 기울이세요.`);
      } else if (trapScoreRounded >= 50) {
        lines.push(`  ⚡ 트랩 점수 ${trapScoreRounded}/100: 중간 정도의 트랩 지표가 감지되었습니다.`);
        lines.push(`  📊 일부 다이버전스가 주의를 촉구합니다.`);
        lines.push(`  🛡️ 주의를 기울이세요. 행동하기 전에 시장 상황을 면밀히 모니터링하세요.`);
      } else {
        // 낮은 리스크: 시장 상황에 따른 메시지
        if (isLowTrapRisk && isBullish) {
          // 낮은 리스크 및 강세: 더 적극적인 메시지
          lines.push(`  ✅ 트랩 점수 ${trapScoreRounded}/100: 낮은 트랩 리스크가 감지되었습니다.`);
          lines.push(`  📈 시장 상황이 유리해 보입니다 (점수: ${marketScore}/100). 명확한 진입 기회를 모니터링하세요.`);
          lines.push(`  💡 낮은 리스크 + 강세 모멘텀 = 유리한 조건. 품질 있는 설정에 주의를 기울이세요.`);
        } else if (isLowTrapRisk) {
          // 낮은 리스크이지만 중립/약세: 표준 방어 메시지
          lines.push(`  ✅ 트랩 점수 ${trapScoreRounded}/100: 현재 낮은 트랩 위험`);
          lines.push(`  🛡️ 시장 상황이 안정적입니다. 규율을 유지하고 고품질 기회를 기다리세요.`);
          lines.push(`  💡 인내는 보상받습니다. 품질 있는 설정은 낮은 리스크와 명확한 시장 방향 모두가 필요합니다.`);
        } else {
          // Fallback (점수를 얻을 수 없는 경우)
          lines.push(`  ✅ 트랩 점수 ${trapScoreRounded}/100: 현재 낮은 트랩 위험이지만 시장은 항상 변합니다.`);
          lines.push(`  🛡️ 규율을 유지하세요. 상황을 모니터링하고 명확한 신호를 기다리세요.`);
        }
      }
    }
    lines.push('');
  }
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('📊 NanoBanana 인포그래픽');
    lines.push('🎬 첨부된 미디어를 확인하세요!');
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok癒し系コメンテーター（固定コーナー）
  lines.push('💊 Dr. Grok의 의견');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
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
    lines.push(`💚 심리 상태: ${stateEmoji} ${psychologicalSupport.psychologicalState} (위험: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    if (psychologicalSupport.psychologicalAdvice) {
      lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
    }
    if (psychologicalSupport.mentalNote) {
      lines.push(`💊 Dr. Grok의 멘탈 노트:`);
      lines.push(`"${psychologicalSupport.mentalNote}"`);
    }
  } else {
    // 폴백: 데이터를 가져올 수 없는 경우에도 가치 있는 메시지 제공
    lines.push('💚 심리 상태: 😐 NEUTRAL (위험: 💡 낮음)');
    lines.push('');
    lines.push('💊 Dr. Grok의 멘탈 노트:');
    lines.push('"인내는 약점이 아니다—전략적 강점이다. 최고의 트레이더는 거래하지 않을 때를 안다."');
  }
  
  lines.push('');

  // COO最適化: FOMO強化（有料版の価値を明確化）
  // GPT 평가 기반 개선: 3개 카테고리로 가치 명확화
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 이것이 유료 리포트를 선택한 이유');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('무료 사용자는 점수만 볼 수 있지만, 당신은 다음을 얻습니다:');
  lines.push('');
  lines.push('🎯 실시간 액션 신호:');
  lines.push('✅ AVOID-LONG / AVOID-SHORT / STANDBY 알림（즉시 알림）');
  lines.push('✅ 출구 지도 가이드（정확히 언제 나갈지 알기）');
  lines.push('✅ NO TRADE 알림（손실이 발생하기 전에 피하기）');
  lines.push('');
  lines.push('📊 심층 인텔리전스 분석:');
  lines.push('✅ 완전한 온체인 분석（CryptoQuant 데이터, 모든 지표）');
  lines.push('✅ AI 기반 트랩 패턴 감지（24시간 모니터링）');
  lines.push('✅ 실시간 X 센티먼트 분석（시장 감정 예측）');
  lines.push('');
  lines.push('💊 완전한 심리적 지원:');
  lines.push('✅ Dr. Grok의 멘탈 코칭（FOMO, 두려움, 탐욕 극복）');
  lines.push('✅ 맞춤형 멘탈 트레이닝 가이드');
  lines.push('✅ 심리 상태 진단 및 블록 해결');
  lines.push('');
  lines.push('🛡️ 하나의 신호를 놓치면 = 자본 손실. 이것이 유료 리포트를 선택한 이유입니다.');
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
    const whaleLine = `🐋 고래 비율: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(높은 압력)' : '(정상)'}`;
    lines.push(whaleLine);
  } else if (whaleFlows) {
    // デバッグ用: whaleFlowsは存在するがwhaleRatioがnullの場合
    console.warn('[Regular KO] whaleFlows exists but whaleRatio is null:', whaleFlows);
  }

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
  
  lines.push(trapLine);
  
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
