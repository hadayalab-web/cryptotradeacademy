// 무료 하이퀄리티版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/ko/minimal-high-quality.ko.js
// Trap Score + 간단한 분석 + 간단한 Dr. Grok 코멘트 + Mental Note

/**
 * Trap Score의 설명을 가져오기（ネイティブ調）
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined || isNaN(Number(trapScore))) {
    return 'Trap Score 계산 중. 지금은 먼저 들어가지 말고 잠깐 대기.';
  }
  const score = Number(trapScore);

  if (score >= 70) {
    return 'Trap Score 높음. 오늘은 "방어 모드"가 정답.';
  } else if (score >= 50) {
    return '혼합 구간. 확인 나오기 전엔 무리하지 않기.';
  } else if (score >= 30) {
    return '차트는 무서운데, 데이터는 아직 "함정" 쪽이 아니에요.';
  } else {
    return 'Trap Score 낮음(일단은). 대신 방심이 제일 위험해요.';
  }
}

/**
 * What to Avoid（회피 행동）생성
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Trap Data에서 회피 행동 추출
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('지금은 방어 모드 — 무리한 진입 금지');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('지금은 방어 모드 — 무리한 진입 금지');
      }
    }
  }

  // 기본 회피 행동（ネイティブ調）
  if (avoidItems.length === 0) {
    if (score >= 70) {
      avoidItems.push('지금은 속도전 금지 — 방어 모드');
      avoidItems.push('새 포지션은 가급적 안 열기 (열면 사이즈 최소)');
    } else if (score >= 50) {
      avoidItems.push('혼합 구간 — 확인 전엔 무리 진입 X');
      avoidItems.push('오버트레이드가 오늘의 함정이에요');
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
        evidenceItems.push(`거래소 순유입량: ${absValue.toFixed(0)} BTC (유출) — 코인이 거래소 밖으로(급한 매도 압박은 덜함)`);
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
        evidenceItems.push(`고래 비율: ${whaleRatio.toFixed(0)}% — 물량 압박은 체크(패닉은 X)`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`고래 비율: ${whaleRatio.toFixed(0)}% — 중간 정도의 매도 압력`);
      } else {
        evidenceItems.push(`고래 비율: ${whaleRatio.toFixed(0)}% — 정상 범위(패닉 X)`);
      }
    }
  }

  // Market Data에서 근거 추출
  if (marketData) {
    if (marketData.mpi !== undefined && marketData.mpi !== null) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`채굴자 포지션 인덱스(MPI): ${mpi.toFixed(2)} — 채굴자 매도 중 (주의)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`채굴자 포지션 인덱스(MPI): ${mpi.toFixed(2)} — 매도 급하지 않음`);
      } else {
        evidenceItems.push(`채굴자 포지션 인덱스(MPI): ${mpi.toFixed(2)} — 정상 범위`);
      }
    }
  }

  // 기본 근거（데이터가 없는 경우、ネイティブ調）
  if (evidenceItems.length === 0) {
    evidenceItems.push('온체인은 아직 결정타 없음 (그래서 더 조심)');
  }

  return evidenceItems.slice(0, 2); // 최대 2개
}

/**
 * 간단한 Dr. Grok 코멘트 생성
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 30) {
    // Trap Score 낮음: 認知的不協和と油断の警告（ネイティブ調）
    const lowRiskMessages = [
      '"빨간 캔들이 주는 불편함을 없애려고 팔고 싶어집니다. 하지만 불안=현실이 아니에요. 함정은 하락이 아니라 충동 청산입니다."',
      '"차트는 무서운데, 데이터는 아직 "함정" 쪽이 아니에요. 주의: 0/100은 방심을 만듭니다."',
      '"아무도 말하지 않는 부분: 0/100은 방심을 만듭니다. 큰 함정은 조용할 때 설계됩니다."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (score >= 70) {
    comments.push('"FOMO가 지금 높다. 탐욕이 방어 전략을 압도하지 않도록 하자. 기다리자. 이것이 가장 위험한 순간이다."');
  } else if (score >= 50) {
    comments.push('"규율을 유지하자. 시장이 당신의 인내를 시험하고 있다. 방어 우선. 명확한 신호를 기다리자."');
  } else {
    comments.push('"좋은 규율이다. 명확한 기회를 계속 기다리자. 낮은 리스크는 경계를 늦추는 것을 의미하지 않는다."');
  }

  // Sentiment Data에서 추가 코멘트
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"시장 심리가 감정적이다. 이것이 트랩이 발생하는 때다. 침착함을 유지하자."');
    } else if (sentimentData.sentiment === 'FEAR' || sentimentData.sentiment === 'Fear') {
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
    '"기다림도 포지션입니다."',
    '"오늘 목표는 수익이 아니라 실수 안 하기."',
    '"빨간 캔들 ≠ 바로 위험."',
    '"신호 없으면 노트레이드."',
    '"현금도 포지션. 방어는 능동적."',
    '"손이 근질거리면 그게 신호가 아니라 감정."',
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
  score = null, // Market Score (optional, can also be in marketData.score)
  grokGeminiOptimization = null, // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化結果
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

  // GPT設計書に完全準拠: 4-post thread形式（Telegram用に1メッセージに統合）
  const change24hFormatted = change24h != null ? (change24h >= 0 ? `+${change24h.toFixed(2)}` : change24h.toFixed(2)) : 'N/A';
  const sentimentRaw = sentimentData?.sentiment;
  const sentimentLabelKo =
    sentimentRaw === 'Extreme Fear' ? '극도의 공포' :
    sentimentRaw === 'Extreme Greed' ? '극도의 탐욕' :
    (sentimentRaw === 'Fear' || sentimentRaw === 'FEAR') ? '공포' :
    (sentimentRaw === 'Greed' || sentimentRaw === 'GREED') ? '탐욕' :
    sentimentRaw === 'FOMO' ? 'FOMO' :
    sentimentRaw === 'Neutral' ? '중립' : '중립';
  // trapScoreRoundedは上で既に定義済み
  
  // [1/4] Hook: Trap Score理由1行 + gut vs data
  let message = `[1/4] 🚨 Hook
━━━━━━━━━━━━━━━━━━━━`;
  
  if (scoreDisplay === 'N/A') {
    message += `\n🚨 BTC ${change24hFormatted}%, 심리는 **${sentimentLabelKo}**…
근데 Trap Score는 계산 중이에요. 먼저 들어가진 마요.`;
  } else {
    const trapReasonLine = (trapData?.exchangeNetflow > 0 || marketData?.mpi > 2)
      ? ` Netflow + MPI + 센티먼트 = Trap Defence는 Standby Mode로 읽음.`
      : ``;
    message += `\n🚨 BTC ${change24hFormatted}%, 심리는 **${sentimentLabelKo}**…
근데 Trap Score는 **${scoreDisplay}/100**입니다.${trapReasonLine}`;
  }
  
  message += `\n\n복수 매매 금지. 확인 대기. 직감 vs 데이터—데이터 승.`;

  // [2/4] Quick reads (2 bullets max, trader interpretation)
  message += `\n\n[2/4] 📊 핵심만
━━━━━━━━━━━━━━━━━━━━`;
  
  // Exchange netflow（ネイティブ調）
  if (trapData?.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
    const netflow = trapData.exchangeNetflow;
    const absValue = Math.abs(netflow);
    if (netflow < 0) {
      message += `\n• 거래소 Netflow: **${absValue.toFixed(0)} BTC 유출** → 코인이 거래소 밖으로`;
    } else if (netflow > 0) {
      message += `\n• 거래소 Netflow: **+${absValue.toFixed(0)} BTC 유입** → 매도 압력 가능성`;
    }
  }
  
  // MPI
  if (marketData?.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    message += `\n• MPI: **${mpi.toFixed(2)}** → 채굴자 매도 압박 낮음`;
  }
  
  message += `\n\nNetflow + MPI 합쳐서: Trap Defence는 캔들보다 먼저 읽어요. 빨간 캔들 ≠ 즉시 함정.`;

  // [3/4] Psych coaching: 短く・刺さる・Dr. Grok世界観
  message += `\n\n[3/4] 🧠 심리 코칭 (Dr. Grok)
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapScoreRounded == null) {
    message += `\n스코어 계산 중. 먼저 들어가지 마세요.`;
  } else if (trapScoreRounded < 30) {
    message += `\n${trapScoreRounded}/100 = 방심 리스크. 큰 함정은 고요할 때 만들어져요. 경계 유지.`;
  } else if (trapScoreRounded < 50) {
    message += `\n차트 무서운데 데이터는 아직 함정 아님. 공포가 대신 클릭하게 두지 마.`;
  } else {
    message += `\n방어 모드. 캔들 시끄럽고 리스크는 아직. Standby Mode.`;
  }
  
  // [4/4] Poll + シンプルCTA（返信負荷軽減）
  message += `\n\n[4/4] 🗳️ 투표 + CTA
━━━━━━━━━━━━━━━━━━━━
투표: Trap Score ${scoreDisplay === 'N/A' ? '(계산 중)' : `**${scoreDisplay}/100**`} — 오늘 선택은?
A) 홀드  B) 눌림 매수  C) 비중 축소/매도  D) 확인 후 진입

다음 덤프 전에 실시간 알림 받고 싶어? **TRAP** 답장하면 링크 드려요. 하나 놓치면 자본 감소. #BTC #Bitcoin #TrapDefence`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
