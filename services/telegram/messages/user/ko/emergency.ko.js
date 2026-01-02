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
  // Header - 緊急性の視覚的強調
  lines.push('🚨🚨🚨 *트랩 알림* 🚨🚨🚨');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRAP INFORMATION (最優先情報を最上部に配置)
  lines.push('⚠️ *트랩 검출*');
  lines.push(`${trapSide} | *${trap?.confidence || 'UNKNOWN'}* 신뢰도`);
  lines.push(`*${trapLabel}*`);
  lines.push('');

  // ACTION REQUIRED (アクショナブルな情報を明確化)
  lines.push('💡 *권장 조치*');
  if (trap?.side === 'SHORT') {
    lines.push('• 레버리지를 즉시 감소');
    lines.push('• 새로운 롱 포지션을 피하세요');
    lines.push('• 롱 포지션이 있다면 수익 실현을 고려');
  } else if (trap?.side === 'LONG') {
    lines.push('• 레버리지를 즉시 감소');
    lines.push('• 새로운 숏 포지션을 피하세요');
    lines.push('• 가격 움직임을 주의 깊게 모니터링');
  } else {
    lines.push('• 레버리지를 즉시 감소');
    lines.push('• 새로운 포지션을 피하세요');
    lines.push('• 가격 움직임을 주의 깊게 모니터링');
  }
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);
  lines.push('');

  // MARKET DATA
  lines.push('📊 *시장 데이터*');
  lines.push(`💰 BTC: ${formatUsd(priceUsd)}`);
  lines.push(`📊 순유입: ${flowDir} ${flowAbs.toFixed(0)} BTC | MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *AI 분석*');
  lines.push(grokText);
  lines.push('');

  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('_교육 목적의 정보 제공일 뿐이며, 투자/재무 자문을 구성하지 않습니다._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
