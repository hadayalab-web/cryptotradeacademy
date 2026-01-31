// Tier1 BTC trap alert (KO) - 緊急配信: 面白く・刺さるコンテンツ（Grok + Gemini 1ライナー）
// services/telegram/messages/user/ko/emergency.ko.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTrapAlert({
  inflow,
  mpi,
  priceUsd,
  trap,
  aiAnalysis,
  grokReasoningShort = null,
  geminiInsightShort = null,
  trapDetection = null,
} = {}) {
  const flowDir = inflow >= 0 ? '유입' : '유출';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || trapDetection?.trapType || '고래 함정';
  const trapScoreDisplay =
    trapDetection?.trapScore != null ? `Trap Score *${Math.round(trapDetection.trapScore)}/100*` : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = '고위험 구간입니다. 방어를 우선하고 감정적 진입은 피하세요.';
  } else if (isOffline) {
    grokText = 'Grok이 오프라인입니다. 이 구간을 고위험 함정 존으로 간주하세요.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *함정 알림 — 지금이 그 순간입니다.*');
  lines.push(`*${trapLabel}* ${trapScoreDisplay ? `| ${trapScoreDisplay}` : ''} (${trap?.confidence || 'HIGH'} 신뢰도)`);
  lines.push('');
  lines.push(`💰 BTC: *${formatUsd(priceUsd)}* | 📊 Netflow *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');

  if (grokReasoningShort && typeof grokReasoningShort === 'string' && grokReasoningShort.trim()) {
    lines.push('⚡ *왜 지금 위험한가:*');
    lines.push(grokReasoningShort.trim());
    lines.push('');
  }

  if (geminiInsightShort && typeof geminiInsightShort === 'string' && geminiInsightShort.trim()) {
    lines.push('🎯 *지금 할 일:*');
    lines.push(geminiInsightShort.trim());
    lines.push('');
  }

  lines.push('⚠️ *함정 감지* — 추격하지 마세요. 스코어가 안정될 때까지 사이드라인 대기.');
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
