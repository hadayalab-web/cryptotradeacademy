// Tier1 BTC trap alert (KR)
// services/telegram/messages/user/ko/emergency.ko.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTrapAlert({ inflow, mpi, priceUsd, trap, aiAnalysis }) {
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || 'Whale Trap';
  const trapSide =
    trap?.side === 'SHORT'
      ? '🔻 SHORT 포지션 쪽 트랩'
      : trap?.side === 'LONG'
        ? '🔺 LONG 포지션 쪽 트랩'
        : '⚠️ 시장에서 트랩이 감지되었습니다.';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = '고위험 구간입니다. 레버리지를 줄이고 방어를 우선하세요.';
  } else if (isOffline) {
    grokText = '현재 Grok이 오프라인 상태입니다. 이 가격 구간을 고위험 트랩 존으로 간주하세요.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *Dr. Grok 트랩 알림*');
  lines.push(`*${trapLabel}* (${trap?.confidence || 'UNKNOWN'} 신뢰도)`);
  lines.push('');
  lines.push(`💰 BTC 가격: *${formatUsd(priceUsd)}*`);
  lines.push(`📊 거래소 순유입: *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI: *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');
  lines.push(trapSide);

  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);

  lines.push('');
  lines.push('🧬 *Dr. Grok의 인사이트*');
  lines.push(grokText);
  lines.push('');
  lines.push('_교육 목적의 정보 제공일 뿐이며, 투자/재무 자문을 구성하지 않습니다._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
