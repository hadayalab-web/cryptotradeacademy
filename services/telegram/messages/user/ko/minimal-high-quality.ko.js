// 무료 하이퀄리티版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/ko/minimal-high-quality.ko.js
// Trap Score + 간단한 분석 + 간단한 Dr. Grok 코멘트 + Mental Note

/**
 * Trap Score의 설명을 가져오기
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score를 계산 중입니다. 잠시 후 다시 확인해 주세요.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score를 계산 중입니다. 잠시 후 다시 확인해 주세요.';
  }

  if (score >= 70) {
    return '⚠️ 높은 리스크: 시장 트랩 가능성이 높은 신호가 감지되었습니다. 극도의 주의가 필요합니다';
  } else if (score >= 50) {
    return '⚡ 중간 리스크: 일부 트랩 지표가 감지되었습니다. 경계를 늦추지 마세요';
  } else if (score >= 30) {
    return '✅ 낮은 리스크: 트랩 지표가 최소한입니다. 시장 상황이 상대적으로 안전해 보입니다';
  } else {
    return '✅ 매우 낮은 리스크: 트랩 지표가 거의 감지되지 않았습니다. 시장 상황이 안전해 보입니다';
  }
}

/**
 * What to Avoid（회피 행동）생성
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  if (!trapScore || trapScore < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Trap Data에서 회피 행동 추출
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('LONG 포지션 피하기 — 높은 트랩 리스크 감지됨');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('SHORT 포지션 피하기 — 높은 트랩 리스크 감지됨');
      }
    }
  }

  // 기본 회피 행동
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('새로운 포지션 열기 피하기 — 강한 트랩 신호 감지됨');
      avoidItems.push('거래 전 더 명확한 시장 신호를 기다리기');
    } else if (trapScore >= 50) {
      avoidItems.push('주의를 기울이기 — 일부 트랩 지표 존재');
      avoidItems.push('더 나은 진입 기회를 기다리는 것 고려');
    }
  }

  return avoidItems;
}

/**
 * Evidence（근거）생성
 */
function generateEvidence(trapData = null, marketData = null) {
  const evidenceItems = [];

  // Trap Data에서 근거 추출
  if (trapData) {
    if (trapData.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
      const netflow = trapData.exchangeNetflow; // BTC 단위
      const absValue = Math.abs(netflow);
      if (netflow < 0) {
        // 유출: 긍정적 신호
        evidenceItems.push(`거래소 순유입량: ${absValue.toFixed(0)} BTC (유출) — 홀더가 자산을 보유 중`);
      } else if (netflow > 0) {
        // 유입: 경고
        evidenceItems.push(`거래소 순유입량: +${absValue.toFixed(0)} BTC (유입) — 매도 압력 가능성`);
      } else {
        evidenceItems.push(`거래소 순유입량: 균형`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`고래 비율: ${whaleRatio.toFixed(0)}% — 높은 매도 압력 감지됨`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`고래 비율: ${whaleRatio.toFixed(0)}% — 중간 정도의 매도 압력`);
      } else {
        evidenceItems.push(`고래 비율: ${whaleRatio.toFixed(0)}% — 정상 범위（고래 활동 안정적）`);
      }
    }
  }

  // Market Data에서 근거 추출
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`광부 포지션 인덱스: ${mpi.toFixed(2)} — 광부가 매도 중（주의 필요）`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`광부 포지션 인덱스: ${mpi.toFixed(2)} — 광부가 보유 중（긍정적 신호）`);
      }
    }
  }

  // 기본 근거（데이터가 없는 경우）
  if (evidenceItems.length === 0) {
    evidenceItems.push('온체인 데이터 분석이 트랩 리스크를 나타냅니다');
  }

  return evidenceItems.slice(0, 2); // 최대 2개
}

/**
 * 간단한 Dr. Grok 코멘트 생성
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  if (!trapScore || trapScore < 30) {
    // Trap Score 낮음: 낮은 리스크에서도 가치 제공
    const lowRiskMessages = [
      '"인내는 전략적 강점이다. 명확한 기회를 계속 기다리자."',
      '"지금은 리스크가 낮지만, 시장은 항상 변한다. 준비하지 않는 것이 패배의 길이다."',
      '"방어는 약점이 아니다. 70%의 시간, 아무것도 하지 않는 것이 가장 강한 전략이다."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"FOMO가 지금 높다. 탐욕이 방어 전략을 압도하지 않도록 하자. 기다리자. 이것이 가장 위험한 순간이다."');
  } else if (trapScore >= 50) {
    comments.push('"규율을 유지하자. 시장이 당신의 인내를 시험하고 있다. 방어 우선. 명확한 신호를 기다리자."');
  } else {
    comments.push('"좋은 규율이다. 명확한 기회를 계속 기다리자. 낮은 리스크는 경계를 늦추는 것을 의미하지 않는다."');
  }

  // Sentiment Data에서 추가 코멘트
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"시장 심리가 감정적이다. 이것이 트랩이 발생하는 때다. 침착함을 유지하자."');
    } else if (sentimentData.sentiment === 'FEAR') {
      comments.push('"두려움은 자연스럽다. 하지만 데이터 기반 결정이 당신을 보호한다."');
    }
  }

  return comments[0] || null;
}

/**
 * Mental Note 생성
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"70%의 시간, 아무것도 하지 않는다. 명확한 우위가 나타날 때까지 방어한다."',
    '"자본을 보호하는 것이 최우선이다. 잃지 않는 것이 이기는 것보다 더 중요하다."',
    '"시장의 70%는 노이즈다. 명확한 신호에만 반응하자. 이것이 승리의 길이다."',
    '"기다리는 것은 약점이 아니다. 가장 강한 전략이다."',
    '"방어는 공격의 최고 형태다. 자본을 보호하는 것이 모든 것의 시작이다."',
    '"프로 트레이더의 90%는 대기 시간을 최우선으로 한다. 같은 전략을 취하자."',
  ];
  
  // "프로 트레이더가 대기 시간을 우선시"가 전략적 인사이트에 사용되면 Mental Note에서 피하기
  let availableNotes = allMentalNotes;
  if (avoidProTraderMessage) {
    availableNotes = availableNotes.filter(note => !note.includes('프로 트레이더'));
  }
  
  // Dr. Grok 코멘트와 중복 방지
  if (drGrokComment) {
    // 코멘트에 "70%의 시간"이 포함되면 Mental Note에서 같은 문구 피하기
    if (drGrokComment.includes('70%의 시간') || drGrokComment.includes('70%')) {
      availableNotes = availableNotes.filter(note => !note.includes('70%의 시간') && !note.includes('70%'));
    }
    // 코멘트에 "방어는 약점이 아니다"가 포함되면 Mental Note에서 같은 문구 피하기
    if (drGrokComment.includes('방어는 약점이 아니다')) {
      availableNotes = availableNotes.filter(note => !note.includes('방어는 약점이 아니다'));
    }
    // 코멘트에 "약점이 아니다"가 포함되면 Mental Note에서 같은 문구 피하기
    if (drGrokComment.includes('약점이 아니다')) {
      availableNotes = availableNotes.filter(note => !note.includes('약점이 아니다'));
    }
    // 코멘트에 "가장 강한 전략"이 포함되면 Mental Note에서 같은 문구 피하기
    if (drGrokComment.includes('가장 강한 전략')) {
      availableNotes = availableNotes.filter(note => !note.includes('가장 강한 전략'));
    }
  }
  
  // 사용 가능한 메시지가 없으면 모든 메시지에서 선택
  if (availableNotes.length === 0) {
    availableNotes = allMentalNotes;
  }
  
  const selectedNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
  return selectedNote;
}

/**
 * 무료 하이퀄리티版의 Telegram 메시지 생성
 * Trap Score + 간단한 분석 + 간단한 Dr. Grok 코멘트 + Mental Note
 * 
 * @param {Object} options - 메시지 생성 옵션
 * @param {Date} options.now - 현재 시간
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - BTC 가격（USD）
 * @param {number|null} options.change24h - 24시간 변동률（%）
 * @param {Object} options.trapData - Trap Data（선택사항）
 * @param {Object} options.marketData - Market Data（선택사항）
 * @param {Object} options.sentimentData - Sentiment Data（선택사항）
 * @param {string} options.lang - 언어 코드（기본값: 'ko'）
 * @returns {string} Telegram 메시지 문자열
 */
function formatMinimalHighQualityBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'ko',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 BTC 가격: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 BTC 가격: 가져오는 중...';

  const whatToAvoid = generateWhatToAvoid(trapScore, trapData);
  const evidence = generateEvidence(trapData, marketData);
  const drGrokComment = generateDrGrokComment(trapScore, sentimentData);
  
  // "프로 트레이더가 대기 시간을 우선시"가 전략적 인사이트에 사용될 가능성이 있으면 Mental Note에서 피하기
  const trapScoreRounded = trapScore !== null ? Math.round(trapScore) : null;
  const useProTraderMessageInInsight = trapScoreRounded !== null && trapScoreRounded < 50 && trapScoreRounded >= 0;
  const mentalNote = generateMentalNote(trapScore, useProTraderMessageInInsight, drGrokComment);

  let message = `🌤️ Trap Defence BTC - 무료 리포트
🚨 BREAKING: 트랩 방어 브리핑
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 오늘의 Trap Score
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 문제 제시 섹션（Trap Score 기반）
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    
    if (trapScoreRounded >= 70) {
      message += `\n\n🚨 시장이 강한 트랩 신호를 보이고 있습니다. 가격 차트가 시사하는 것에도 불구하고, 온체인 데이터는 숨겨진 리스크를 드러냅니다`;
      message += `\n💡 여러 다이버전스와 이상 징후가 잠재적인 시장 트랩을 나타냅니다. 지금 진입하면 상당한 리스크에 노출될 수 있습니다`;
    } else if (trapScoreRounded >= 50) {
      message += `\n\n⚡ 시장이 중간 정도의 트랩 지표를 보이고 있습니다. 일부 다이버전스가 주의를 촉구합니다`;
      message += `\n💡 트랩 신호가 존재합니다. 지금 서두르며 거래하면 손실로 이어질 수 있습니다`;
    } else {
      message += `\n\n✅ 시장 상황이 상대적으로 안전해 보이지만, 트랩 패턴이 빠르게 나타날 수 있습니다`;
      message += `\n💡 낮은 리스크 조건에서도 인내는 전략적 강점입니다`;
    }
  } else if (trapScore !== null && trapScore < 30) {
    // 낮은 리스크에서도 시장 상태를 간결하게 제시
    message += `\n\n💡 현재 시장 상황은 상대적으로 안정적이지만, 항상 경계를 늦추지 않는 것이 중요합니다`;
  }

  // Step 2: 근거（Evidence）섹션
  // 낮은 리스크에서도 가치를 제공하기 위해 근거 섹션 항상 표시
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 데이터 기반 이유
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【개선 2: "70% 대기 전략"의 근거 기반 설명 통합】Evidence와 Mental Note 연동
    // 낮은 리스크에서도 가치를 제공하기 위해 설명 추가
    if (trapScore !== null) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 전략적 인사이트`;
      if (trapScoreRounded >= 70) {
        message += `\n  🚨 Trap Score ${trapScoreRounded}/100: 강한 신호가 잠재적인 시장 트랩을 나타냅니다`;
        message += `\n  🛡️ 전략적 준비는 약점이 아니다—승리를 위한 준비다. 70%의 시간, 승리를 위해 준비하자`;
      } else if (trapScoreRounded >= 50) {
        message += `\n  ⚡ Trap Score ${trapScoreRounded}/100: 중간 정도의 트랩 지표가 감지되었습니다`;
        message += `\n  🛡️ 방어 우선. 더 명확한 시장 신호를 기다리자`;
      } else {
        // 낮은 리스크에서도 가치 제공
        message += `\n  ✅ Trap Score ${trapScoreRounded}/100: 현재 트랩 리스크가 낮지만, 시장은 항상 변합니다`;
        message += `\n  🛡️ 낮은 리스크 시기가 바로 전략적 준비가 가장 중요한 때입니다. 명확한 우위가 나타날 때까지 방어를 계속하자`;
        message += `\n  💎 프로 트레이더는 "대기 시간"을 최우선으로 한다. 같은 전략을 취하자`;
      }
    }
  }

  // Step 3: 해결책（What to Avoid）
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 피해야 할 것
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Step 4: 성공적인 결말（Dr. Grok Comment + Mental Note）
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grok의 빠른 인사이트
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // Mental Note
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ 멘탈 노트
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }

  // CTA（업셀 최적화: 개발 자금 확보를 위한 긴박감 있는 CTA）
  // VSL2와 Whop 링크는 별도로 배포되므로 정기 배포의 Minimal Briefing에는 포함하지 않음
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 완전한 인텔리전스 리포트 잠금 해제

당신은 일부를 보고 있습니다. 전체 회원은 다음을 얻습니다:

✨ 완전한 인텔리전스 리포트
• 완전한 온체인 분석（모든 지표를 실시간으로）
• AI 기반 시장 인사이트 및 트랩 감지（24시간 모니터링）
• 실시간 알림: AVOID-LONG / AVOID-SHORT / STANDBY（즉시 알림）
• 출구 지도 및 멘탈 트레이닝 가이드（실용적인 전략）
• 완전한 Dr. Grok의 심리적 지원（멘탈 블록 해결）
• 실시간 X 센티먼트 분석（시장 감정 예측）

💎 이 모든 것이 당신의 자본을 보호하기 위해 설계되었습니다

📊 무료版 vs 완전版
• 무료: Trap Score만（방향성 힌트）
• 완전: 모든 데이터 + 실시간 알림（구체적인 행동 계획）

🛡️ 하나의 놓친 신호가 당신의 자본을 보호할지 잃을지 결정할 수 있습니다

🎯 지금 업그레이드하여 완전한 방어 시스템을 얻으세요

━━━━━━━━━━━━━━━━━━━━
이것은 무료 리포트입니다. 상세 분석과 트랩 알림을 위해서는 Trap Defence BTC로 업그레이드하세요

교육 목적으로만 제공됩니다. 금융 조언이 아닙니다`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
