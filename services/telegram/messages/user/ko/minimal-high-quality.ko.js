// 無料版（Minimal Version）Telegram配信用
// services/telegram/messages/user/ko/minimal-high-quality.ko.js
// Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— 韓国語版
// Minimal High Quality（4-post）は廃止。Zeigarnik Edition のみ。

/**
 * 영어/혼합 감정 라벨 → 한국어 표시 (주요 지표의 센티먼트)
 */
function toKoreanSentimentLabel(raw) {
  if (!raw || typeof raw !== 'string') return '알 수 없음';
  const s = raw.trim().toLowerCase();
  if (s.includes('extreme fear') || /극심한 두려움|극도의 두려움/.test(raw)) return '극심한 두려움';
  if (s.includes('fear') || s.includes('panic') || /공포|공황|두려움/.test(raw)) return '두려움';
  if (s.includes('extreme greed') || /극심한 탐욕|극도의 탐욕/.test(raw)) return '극심한 탐욕';
  if (s.includes('greed') || s.includes('fomo') || s.includes('euphoria') || /탐욕|황홀/.test(raw)) return '탐욕';
  if (s.includes('neutral') || /중립/.test(raw)) return '중립';
  return raw;
}

/**
 * X Sentiment を無料版用に軽量化（心理の空気だけ。深度を出さない）
 * v1.4: Market Snapshot の X Sentiment は "Extreme Fear" → "Fear-dominant" 等に変換
 * KO: 韓国語ラベル
 */
function toSurfaceSentiment(raw) {
  if (!raw || typeof raw !== 'string') return '센티먼트 침묵';
  const s = raw.toLowerCase();
  if (s.includes('extreme fear') || s.includes('fear') || s.includes('panic') || /공포|공황|두려움/.test(s)) return '두려움 지배';
  if (s.includes('extreme greed') || s.includes('greed') || s.includes('fomo') || s.includes('euphoria') || /탐욕|황홀/.test(s)) return '탐욕 지배';
  if (s.includes('neutral') || /중립/.test(s)) return '중립';
  return '센티먼트 침묵';
}

/**
 * Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— 韓国語版
 */
function formatMinimalBriefingOSv26({
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
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || '알 수 없음';
  const netflow = trapData?.exchangeNetflow ?? 0;
  const netflowStr = netflow >= 0 ? `+${netflow.toFixed(0)} BTC` : `${netflow.toFixed(0)} BTC`;
  const mpi = marketData?.mpi ?? 0;
  const priceStr = priceUsd != null ? `$${priceUsd.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = netflow >= 0
    ? '거래소 유입 증가 → 단기 매도 압력'
    : '유출 → 보유자들이 자산 보호 중';
  const cqSummary = `${cqBase} (표면적 관점)`;
  const xSummary = toSurfaceSentiment(sentimentData?.sentiment);
  const macroSummary = 'Risk-off 지배; 유동성 조건 경직';
  const insight = trapScore != null && trapScore < 30
    ? '표면적 구조는 공포 압력 아래에서 유동성 이동을 보여줌; 고래-알고리즘의 더 깊은 역학은 정식 브리핑에서만 드러납니다.'
    : trapScore != null && trapScore >= 50
      ? '가시적 유입은 재구성을 시사; 기저 구조 동력은 이 최소 스냅샷 밖에 남아 있습니다.'
      : '공포 주도 유동성 변화가 뚜렷함; 전체 구조 맵은 정식 브리핑에서만 이용 가능합니다.';

  return `🌤️ Trap Defence BTC — 최소 브리핑
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 시장 스냅샷
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 주요 지표
━━━━━━━━━━━━━━━━━━━━
• 가격: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${mpi.toFixed(2)}
• 센티먼트: ${toKoreanSentimentLabel(sentimentLabel)}

━━━━━━━━━━━━━━━━━━━━
🧠 인사이트
━━━━━━━━━━━━━━━━━━━━
${insight}

교육 목적 전용.
*(이 스냅샷은 의도적으로 불완전함; 전체 구조 분석은 정식 브리핑에서 확인할 수 있습니다.)*`.trim();
}

/**
 * Phase 3: Snapshot-native Minimal Briefing (KO)
 */
function formatMinimalBriefing(snapshotOrPayload, lang = 'ko') {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🌤️ Trap Defence BTC — 데이터 없음.';
  }
  const isSnapshot = snapshotOrPayload.raw != null && snapshotOrPayload.as_of_utc != null;
  const snapshot = isSnapshot ? snapshotOrPayload : {
    raw: {
      priceUsd: snapshotOrPayload.priceUsd,
      change24h: snapshotOrPayload.change24h,
      inflow: snapshotOrPayload.trapData?.exchangeNetflow ?? 0,
      mpi: snapshotOrPayload.minimalMarketData?.mpi ?? 0,
      sentimentLabel: snapshotOrPayload.sentimentLabel ?? snapshotOrPayload.sentimentData?.sentiment
    },
    as_of_utc: snapshotOrPayload.now,
    trapDetection: { trapScore: snapshotOrPayload.minimalTrapScore },
    cqDeep: { whaleRatio: snapshotOrPayload.trapData?.whaleRatio, mpi: snapshotOrPayload.minimalMarketData?.mpi },
    meta: {}
  };
  const raw = snapshot.raw || {};
  const trapScore = snapshot.trapDetection?.trapScore ?? snapshot.cqDeep?.trapScore ?? null;
  const priceUsd = raw.priceUsd ?? null;
  const inflow = raw.inflow ?? 0;
  const sentimentLabel = raw.sentimentLabel ?? '알 수 없음';
  const mpi = raw.mpi ?? snapshot.cqDeep?.mpi ?? snapshot.cqDeep?.minerMPI ?? 0;
  const meta = snapshot.meta || {};
  const watchNote = meta.watch ? '\n⚠️ WATCH: 주의가 필요합니다.' : '';

  const asOf = snapshot.as_of_utc ?? snapshotOrPayload?.now;
  const tsRaw = typeof asOf === 'string' ? asOf : (asOf && typeof asOf.toISOString === 'function' ? asOf.toISOString() : new Date().toISOString());
  const ts = tsRaw.replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const netflowStr = inflow >= 0 ? `+${Number(inflow).toFixed(0)} BTC` : `${Number(inflow).toFixed(0)} BTC`;
  const priceStr = priceUsd != null ? `$${Number(priceUsd).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = inflow >= 0
    ? '거래소 유입 증가 → 단기 매도 압력'
    : '유출 → 보유자들이 자산 보호 중';
  const cqSummary = `${cqBase} (표면적 관점)`;
  const xSummary = toSurfaceSentiment(sentimentLabel);
  const macroSummary = 'Risk-off 지배; 유동성 조건 경직';
  const insight = trapScore != null && trapScore < 30
    ? '표면적 구조는 공포 압력 아래에서 유동성 이동을 보여줌; 고래-알고리즘의 더 깊은 역학은 정식 브리핑에서만 드러납니다.'
    : trapScore != null && trapScore >= 50
      ? '가시적 유입은 재구성을 시사; 기저 구조 동력은 이 최소 스냅샷 밖에 남아 있습니다.'
      : '공포 주도 유동성 변화가 뚜렷함; 전체 구조 맵은 정식 브리핑에서만 이용 가능합니다.';

  return `🌤️ Trap Defence BTC — 최소 브리핑
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 시장 스냅샷
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 주요 지표
━━━━━━━━━━━━━━━━━━━━
• 가격: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${Number(mpi).toFixed(2)}
• 센티먼트: ${toKoreanSentimentLabel(sentimentLabel)}

━━━━━━━━━━━━━━━━━━━━
🧠 인사이트
━━━━━━━━━━━━━━━━━━━━
${insight}${watchNote}

교육 목적 전용.
*(이 스냅샷은 의도적으로 불완전함; 전체 구조 분석은 정식 브리핑에서 확인할 수 있습니다.)*`.trim();
}

const formatMinimalHighQualityBriefing = formatMinimalBriefing;

module.exports = { formatMinimalBriefingOSv26, formatMinimalBriefing, formatMinimalHighQualityBriefing };
