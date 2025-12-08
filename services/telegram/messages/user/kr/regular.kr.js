// Tier1 BTC regular briefing (KR)

// services/telegram/messages/user/kr/regular.js

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;
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
  stats, // 향후: 승률 등 통계용 (현재는 미사용)
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  // --- 마켓 스냅샷 ------------------------------------------------------

  const priceLine = `💰 BTC 가격: *${formatUsd(priceUsd)}* (${formatPercent(
    change24h,
  )} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 거래소 순유입: *${flowDir}* ${flowAbs.toFixed(0)} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): *${(mpi ?? 0).toFixed(2)}*`;

  const sentimentLine = `🧠 시장 심리: *${sentimentLabel || '알 수 없음'}*`;

  // --- 점수 & 트랩 ------------------------------------------------------

  const scoreLine = `📈 *시장 점수:* ${Math.round(score ?? 0)}/100`;

  const trapLine = trap?.isTrap
    ? `🧨 *트랩 감지기:* ${
        trap.label || '잠재적 트랩'
      } (*${trap.confidence}* 신뢰도)`
    : '✅ *트랩 감지기:* 치명적인 트랩은 감지되지 않았습니다.';

  // --- 트레이드 카드 ----------------------------------------------------

  // BUY / SELL 이 아니면 BUG STANDBY (Defense Active) 로 표기
  let dirEmoji;
  let dirLabel;

  if (tradeSignal?.signal === 'BUY') {
    dirEmoji = '🟢';
    dirLabel = 'BUY';
  } else if (tradeSignal?.signal === 'SELL') {
    dirEmoji = '🔴';
    dirLabel = 'SELL';
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'BUG STANDBY (Defense Active)';
  }

  const entryLine = `• 진입가 (스팟 기준): *${formatUsd(priceUsd)}*`;

  const tpLine =
    tradeSignal?.tp != null
      ? `• Take Profit: *${formatUsd(tradeSignal.tp)}*`
      : '• Take Profit: n/a';

  const slLine =
    tradeSignal?.sl != null
      ? `• Stop Loss: *${formatUsd(tradeSignal.sl)}*`
      : '• Stop Loss: n/a';

  const rrLine =
    tradeSignal?.rr != null
      ? `• 손익비 (RR): *${tradeSignal.rr.toFixed(2)}*`
      : '';

  // NO TRADE (= BUG STANDBY) 전용 대기 모드 문구
  const isNoTrade =
    tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';

  const modeLine = isNoTrade
    ? '• 모드: *Bug Standby* — 시장이 과열/과매도 상태이지만 깔끔한 에지가 없습니다. 잠시 관망하며 자본을 보호하세요.'
    : '';

  // --- Grok 코멘트 ------------------------------------------------------

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline =
    !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);

  let grokText = raw;
  const GROK_LIMIT = 1500; // EN과 동일: 충분히 긴 분석 허용

  if (!grokText || isOffline) {
    grokText = 'HOLD - Grok offline.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  // --- 메시지 조립 ------------------------------------------------------

  const lines = [];

  // Header
  lines.push('📚 *Dr. Grok 마켓 리크*');
  lines.push(`_세션 브리핑 @ ${ts}_`);
  lines.push('');

  // 마켓 스냅샷
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // 점수 & 트랩
  lines.push(scoreLine);
  lines.push(trapLine);
  lines.push('');

  // 트레이드 카드
  lines.push('🎯 *트레이드 verdict*');
  lines.push(`${dirEmoji} *시그널:* ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine); // BUG STANDBY 에서만 노출
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // Grok 코멘트
  lines.push('🧬 *Dr. Grok의 인사이트*');
  lines.push(
    '_아래 내용은 전략 아이디어일 뿐, 공식 True Bug 진입 시그널이 아닙니다. 본인 매매 플랜과 리스크 관리에 맞을 때만 참고하세요._',
  );
  lines.push(grokText);
  lines.push('');
  lines.push(
    '_교육 목적의 정보 제공일 뿐이며, 투자/재무 자문을 구성하지 않습니다._',
  );

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
