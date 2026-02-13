// Tier1 BTC regular briefing (KR)
// services/telegram/messages/user/ko/regular.ko.js
// EN v2.8 구조 적용 — Market State Radar, Behind-the-Scenes 4요소

const { hasJapanese } = require('../../shared/contentFilters');

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
  return '시장 조건이 상대적으로 안정적입니다. 규율을 유지하고 품질 있는 설정을 기다리세요.';
}

function extractPayloadFromSnapshot(snapshot, lang = 'ko', opts = {}) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const raw = snapshot.raw || {};
  const cqDeep = snapshot.cqDeep || {};
  const td = snapshot.trapDetection || {};
  const asOf = snapshot.as_of_utc || new Date().toISOString();
  const now = typeof asOf === 'string' ? new Date(asOf) : asOf;
  return {
    now, inflow: raw.inflow ?? cqDeep.exchangeNetflow ?? 0, mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0,
    sentimentLabel: raw.sentimentLabel ?? '알 수 없음', priceUsd: raw.priceUsd ?? null, change24h: raw.change24h ?? null,
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

function formatRegularBriefing(snapshotOrPayload, lang = 'ko', opts = {}) {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') return '🌤️ Trap Defence BTC - Regular Briefing — 스냅샷 데이터 없음.';
  const isSnapshot = snapshotOrPayload.raw != null;
  if (isSnapshot) {
    const payload = extractPayloadFromSnapshot(snapshotOrPayload, lang, opts);
    if (!payload) return '🌤️ Trap Defence BTC - Regular Briefing — 잘못된 스냅샷.';
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
  trapScore,
  kimchiPremium,
  upbitPrice,
  noTradeAlert,
  trapRisk,
  exitMap,
  trapDetection,
  marketBug,
  trapAlert,
  divergenceSignal,
  psychologicalSupport,
  hasGeminiContent = false,
  gptReporterAnalysis,
  grokXAnalysis,
  sosovalueArticle = null,
  integratedOptimization = null,
  whaleFlows,
  liquidations = null,
  lang = 'ko',
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 BTC 가격: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? '유입' : '유출';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 거래소 순${flowDir}: ${flowDir} ${flowAbs.toFixed(0)} BTC${inflow < 0 ? ' — 보유자들이 자산 보호 중' : ' — 잠재적 매도 압력'}`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 센티먼트: ${sentimentLabel || '알 수 없음'}`;

  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;

  let grokDisplaySource = grokXAnalysis;
  if (grokXAnalysis && typeof grokXAnalysis === 'object') {
    grokDisplaySource = grokXAnalysis.xEngineReport || grokXAnalysis.summary || null;
  }
  const hasGrokData = grokDisplaySource && typeof grokDisplaySource === 'string' && grokDisplaySource.trim();
  const isGrokOffline = !hasGrokData || /grok offline|live search unavailable|data unavailable/i.test(grokDisplaySource || '');

  const sentimentLabelLower = (sentimentLabel || '').toLowerCase();

  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - 정식 리포트');
  if (isHighTrapForHeader) {
    lines.push(`🚨 Trap Defence 알림 — ${trapSeverityForHeader} 트랩 리스크`);
  } else {
    lines.push('📋 Trap Defence 브리핑');
  }
  lines.push(`📅 ${ts}`);
  lines.push('CQ × X × 3AI — 막후 구조 리포트');
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📡 시장 상태 레이더');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const trapScoreRadar = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : null;
  const trapRiskLabelRadar = trapScoreRadar != null
    ? (trapScoreRadar < 30 ? '낮은 위험' : trapScoreRadar >= 50 ? '높은 위험' : '중간')
    : 'N/A';
  const cqRiskText = inflow >= 0
    ? '거래소 유입 증가 → 공급 시장 복귀, 단기 매도 압력'
    : `유출 ${Math.abs(inflow || 0).toFixed(0)} BTC → 보유자들이 자산 보호 중`;
  const volatilityMode = sentimentLabelLower.includes('fear') || sentimentLabelLower.includes('panic') || /공포|공황|두려움/.test(sentimentLabelLower)
    ? '확장 국면 (공황 주도 변동성)'
    : sentimentLabelLower.includes('greed') || /탐욕|황홀/.test(sentimentLabelLower) ? '확장 국면 (황홀 주도)' : '안정';
  const liquidityRegimeText = inflow >= 0
    ? '가격 하단 매도 측 유동성 밀집; 가격 상단 유동성 얇음'
    : '매수 누적; 유동성 재조정';
  lines.push(`• Trap Score: ${trapScoreRadar != null ? trapScoreRadar + '/100 (' + trapRiskLabelRadar + ')' : 'N/A'}`);
  lines.push(`• CQ Risk: ${cqRiskText}`);
  lines.push(`• X Sentiment: ${hasGrokData && !isGrokOffline ? '가능' : '데이터 부족 → "센티먼트 침묵" 해석 (불확실성 상승)'}`);
  lines.push('• Macro Pressure: Risk-off 지배');
  lines.push(`• Liquidity Regime: ${liquidityRegimeText}`);
  lines.push(`• Volatility Mode: ${volatilityMode}`);
  lines.push('');
  lines.push('### Key Metrics');
  lines.push(`• BTC Price: ${formatUsd(priceUsd)}`);
  lines.push(`• Netflow: ${inflow >= 0 ? '+' : ''}${(inflow || 0).toFixed(0)} BTC`);
  lines.push(`• MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push(`• Sentiment: ${sentimentLabel || '알 수 없음'}`);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🔬 막후 구조');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  let gptNewsText = gptReporterAnalysis || aiAnalysis || null;
  if (gptNewsText && typeof gptNewsText === 'string') {
    const errorKeywords = ['api error', 'unavailable', 'error', 'failed', 'timeout'];
    const isError = errorKeywords.some(keyword => gptNewsText.toLowerCase().includes(keyword));
    if (isError) {
      gptNewsText = null;
    } else {
      const hasKoreanChars = /[\uAC00-\uD7AF]/.test(gptNewsText);
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      const hasEnglishOnly = !hasKoreanChars && !hasJapaneseChars && gptNewsText.length > 50;
      if (hasJapaneseChars || (hasEnglishOnly && !hasKoreanChars) || (!hasKoreanChars && gptNewsText.length > 50)) {
        console.warn('[Regular KO] Non-Korean language detected in GPT analysis, using fallback');
        gptNewsText = null;
      }
    }
  }

  if (!gptNewsText || String(gptNewsText || "").trim() === '') {
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    gptNewsText = `## 2-1. Whale Intent (구조적 추론)
${inflow >= 0 ? '고래들이 공황 구간에서 공급을 흡수하는 듯 보이며, 가격이 유동성 포켓으로 하락한 뒤 조용히 누적하기 전에 흡수하고 있습니다.' : '고래 유입은 보유자들이 자산을 보호 중임을 시사합니다. 유출은 누적 또는 재조정을 가리킵니다.'}

## 2-2. Algo Behavior Patterns
알고리즘이 감정적 매도로 생긴 박리 유동성 구역을 활용합니다. 패턴은 동시에 발생하는 유동성 사냥 패턴 후 평균 회귀—자동 시스템이 가격 리셋 전 유동성을 수확합니다.

## 2-3. Retail Psychological Distortion
소매 센티먼트는 ${sentimentLabel || '중립'}에 지배됩니다. X 데이터가 부족하면 "센티먼트 침묵"이 의미 있음: 소매 이탈은 흔히 변동성 확장에 선행합니다.

## 2-4. Liquidity Map
${inflow >= 0 ? '강제 매도와 채굴자 분배(MPI ' + mpiDisplay + ')로 가격 하단 매도 측 유동성 밀집. 가격 상단 유동성 얇음—유입 반전 시 상승 모멘텀 가속 가능.' : '매수 누적 뚜렷함. 유동성 재조정 진행 중.'}`;
  }
  gptNewsText = gptNewsText.replace(/(\*\*Scenario Map\*\*|## Scenario Map|Scenario Map\s*\().*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Trap Defence Value\*\*.*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent \(structural inference( only)?\)\*\*/g, '## 2-1. Whale Intent (구조적 추론)');
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent\*\*(?!\s*\()/g, '## 2-1. Whale Intent');
  gptNewsText = gptNewsText.replace(/\*\*Algo Behavior Patterns\*\*/g, '## 2-2. Algo Behavior Patterns');
  gptNewsText = gptNewsText.replace(/\*\*Retail Psychological Distortion\*\*/g, '## 2-3. Retail Psychological Distortion');
  gptNewsText = gptNewsText.replace(/\*\*Liquidity Map\*\*/g, '## 2-4. Liquidity Map');
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+(?!2-[1-4]\.)/gm, '')
    .replace(/^#\s+(?!2-[1-4]\.)/gm, '');
  gptNewsDisplay = gptNewsDisplay.replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 온체인 지표의 심리적 해석');
  const gptNewsLimit = 1400;
  if (gptNewsDisplay.length > gptNewsLimit) {
    const truncated = gptNewsDisplay.slice(0, gptNewsLimit);
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
    if (lastSentenceEnd > gptNewsLimit * 0.5) {
      const endPos = truncated[lastSentenceEnd + 1] === ' ' ? lastSentenceEnd + 1 : lastSentenceEnd;
      gptNewsDisplay = truncated.slice(0, endPos) + '…';
    } else {
      gptNewsDisplay = truncated + '…';
    }
  }
  lines.push(gptNewsDisplay);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📐 현재 BTC 구조');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const currentStructureNote = inflow >= 0 && (sentimentLabelLower.includes('fear') || /공포|공황/.test(sentimentLabelLower))
    ? 'BTC는 "공황 주도 공급 방출 국면". 추세 반전이 아니라 유동성 재구성입니다.'
    : inflow >= 0
      ? '공급이 거래소로 복귀. 구조는 분배 또는 흡수 국면을 시사합니다.'
      : '보유자들이 자산을 보호 중. 구조는 누적 또는 하락을 시사합니다.';
  lines.push(`• Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`);
  lines.push(`• Structural meaning: ${currentStructureNote}`);
  const keyLevelsNote = inflow >= 0
    ? `• Netflow: +${Math.abs(inflow).toFixed(0)} BTC → 공급이 거래소로 이동`
    : `• Netflow: −${Math.abs(inflow).toFixed(0)} BTC → 보유자들이 자산 보호 중`;
  lines.push(keyLevelsNote);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🗺️ 시나리오 맵');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const scenarioBullets = [];
  if (inflow > 0) {
    scenarioBullets.push(`• 공급 충격 지속 — 거래소 유입 ${Math.abs(inflow).toFixed(0)} BTC가 매도 압력 유지 가능`);
  }
  if (mpi != null && mpi > 0.5) {
    scenarioBullets.push(`• 채굴자 압력 — MPI ${mpi.toFixed(2)}가 채굴자 분배 시사, 가까운 변동성 위험`);
  }
  const sentimentLower = (sentimentLabel || '').toLowerCase();
  if (sentimentLower.includes('fear') || sentimentLower.includes('panic') || /공포|공황|두려움/.test(sentimentLower)) {
    scenarioBullets.push(`• 소매 공황 — ${sentimentLabel} 센티먼트가 투항 또는 강제 매도 유발 가능`);
  }
  if (sentimentLower.includes('greed') || sentimentLower.includes('euphoria') || /탐욕|황홀/.test(sentimentLower)) {
    scenarioBullets.push(`• 소매 황홀 — ${sentimentLabel} 센티먼트가 분배 트랩 선행 가능`);
  }
  if (trapDetection?.trapDetected || hasActiveTrapAlert) {
    scenarioBullets.push(`• 알고리즘 주도 변동성 — 트랩 조건(${trapDetection?.trapType || '이상'})이 유동성 수확 유발 가능`);
  }
  scenarioBullets.push('• 거시 환경 — ETF 유입, 금리 정책, 외부 충격이 구조 변경 가능');
  scenarioBullets.slice(0, 5).forEach(b => lines.push(b));
  lines.push('');

  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】NanoBanana 인포그래픽');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 첨부된 미디어를 확인하세요!');
    lines.push('');
  }

  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapScore != null && trapScore > 0) {
    trapScoreForEvidence = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence != null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 데이터 기반 근거');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded >= 50;
    if (trapScoreForEvidence != null) {
      if (isHighTrap) {
        lines.push(`🎯 Trap Score ${trapScoreRounded}/100 → 상당한 트랩 위험`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} 감지됨`);
        lines.push(`• 순유입 급증 → 공급이 거래소로 유입`);
        lines.push(`• 채굴자 MPI 상승 → 분배 압력`);
        lines.push(`• 극단적 공포 + 가격 괴리 → 구조적 트랩 세팅`);
      } else if (isLowTrap) {
        lines.push(`✅ Trap Score ${trapScoreRounded}/100 → 낮은 트랩 위험`);
        lines.push(`• 구조는 유동성 수확 압력 완화를 시사`);
      } else {
        lines.push(`⚡ Trap Score ${trapScoreRounded}/100 → 중간 트랩 위험`);
        lines.push(`• 혼합 구조 — 유동성 조건 불명확`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || '이상').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (점수: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`• 온체인 이상 감지 — 구조가 높은 트랩 조건 시사`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (심각도: ${trapAlert.severity})`);
      lines.push(`• 구조가 높은 트랩 위험 시사`);
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 심리 인사이트 (Dr. Grok)');
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
      lines.push(`📱 X Sentiment: ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular KO] Japanese characters detected in grokXAnalysis, skipping');
    }
  }
  if (!hasGrokData || isGrokOffline) {
    lines.push('📱 X Sentiment: "센티먼트 침묵" — 데이터 부족이 의미 있음. 공포로 소매가 얼어붙으면 포스팅이 감소합니다. 시장은 심리적 진공에 진입—알고리즘이 더 자유롭게 움직이는 조건.');
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
      ? '심리 상태: 중립 (낮은 위험도)'
      : `💚 심리 상태: ${stateEmoji} ${psychologicalSupport.psychologicalState} (위험: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    const rawAdvice = psychologicalSupport.psychologicalAdvice || '';
    const hasJapaneseInAdvice = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawAdvice);
    const koreanAdvice = getKoreanPsychologicalAdvice(psychologicalSupport.psychologicalState, psychologicalSupport.psychologicalRisk);
    const adviceLine = hasJapaneseInAdvice ? koreanAdvice : (rawAdvice ? rawAdvice.slice(0, 120) + (rawAdvice.length > 120 ? '…' : '') : koreanAdvice);
    lines.push(`   💡 ${adviceLine}`);
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = '도파민 발화 = 트랩. 3번 심호흡. 추격 충동 = 화학, 통찰 아님. 풀백 대기.';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = '공포는 보호하지만 마비시킴. 감정 대신 데이터 확인.';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = '열광 = 트랩. 자본 먼저 보호.';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = '멈춰. 숨 쉬어. 데이터는 일시적. 패닉에선 결정 금지.';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = '지루함 인내 > 레버리지. 오늘은 화면 닫아.';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = '축하 = 트랩 설치 중. 규율 유지.';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = '거래 강요 말 것. 의심되면 대기.';
    } else {
      mentalNote = '인내 = 전략적 강점. 최고 트레이더는 거래 안 할 때를 안다.';
    }
    lines.push(`💊 Dr. Grok의 멘탈 노트: "${mentalNote}"`);
  } else {
    lines.push('심리 상태: 중립 (낮은 위험도)');
    lines.push('   💡 시장 조건 비교적 안정. 규율 유지.');
    lines.push('💊 Dr. Grok의 멘탈 노트: "인내 = 전략적 강점. 최고 트레이더는 거래 안 할 때를 안다."');
  }

  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 Trap Defence 가치');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('• 구조적 명확성 — 막후 가시성 (Whale / Algo / Retail / Liquidity)');
  lines.push('• 심리 인사이트 — 소매 심리 진단');
  lines.push('• CQ × X × 3AI 통합 — 시장 메커니즘 통합 분석');
  lines.push('');

  lines.push('📋 스냅샷');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  const displayTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore;
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 고위험' : displayTrapScore >= 40 ? '⚠️ 중간' : '✅ 낮음';
    lines.push(`🎯 트랩 점수: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
  }
  lines.push('');

  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ 출구 지도');
    lines.push(`   포지션 상태: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} 미실현 손익: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 이익 실현 구간:');
      const highPriorityZones = exitMap.exitMap.zones.filter(zone => zone.priority === 'HIGH').slice(0, 2);
      (highPriorityZones.length > 0 ? highPriorityZones : exitMap.exitMap.zones.slice(0, 2)).forEach(zone => {
        lines.push(`   🔴 구간 ${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}% 실현)`);
      });
    }
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ 출구 조건:');
      const criticalConditions = exitMap.exitMap.exitConditions
        .filter(condition => condition.priority === 'CRITICAL' || condition.priority === 'HIGH')
        .slice(0, 2);
      (criticalConditions.length > 0 ? criticalConditions : exitMap.exitMap.exitConditions.slice(0, 2)).forEach(condition => {
        const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : '⚠️';
        lines.push(`   ${priorityEmoji} ${condition.condition}`);
      });
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
