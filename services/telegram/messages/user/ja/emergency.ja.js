// Tier1 BTC trap alert (JA) - 緊急配信: 面白く・刺さるコンテンツ（Grok + Gemini 1ライナー）
// services/telegram/messages/user/ja/emergency.ja.js

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
  const flowDir = inflow >= 0 ? '流入' : '流出';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || trapDetection?.trapType || 'クジラの罠';
  const trapScoreDisplay =
    trapDetection?.trapScore != null ? `Trap Score *${Math.round(trapDetection.trapScore)}/100*` : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = '高リスク局面です。防御を最優先し、感情的なエントリーは避けてください。';
  } else if (isOffline) {
    grokText = 'Grokはオフラインです。この価格帯はハイリスク・トラップゾーンとして扱ってください。';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *トラップアラート — 今がその瞬間です。*');
  lines.push(`*${trapLabel}* ${trapScoreDisplay ? `| ${trapScoreDisplay}` : ''} (${trap?.confidence || 'HIGH'} 信頼度)`);
  lines.push('');
  lines.push(`💰 BTC: *${formatUsd(priceUsd)}* | 📊 ネットフロー *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');

  if (grokReasoningShort && typeof grokReasoningShort === 'string' && grokReasoningShort.trim()) {
    lines.push('⚡ *今なぜ危険か:*');
    lines.push(grokReasoningShort.trim());
    lines.push('');
  }

  if (geminiInsightShort && typeof geminiInsightShort === 'string' && geminiInsightShort.trim()) {
    lines.push('🎯 *今やること:*');
    lines.push(geminiInsightShort.trim());
    lines.push('');
  }

  lines.push('⚠️ *トラップ検知* — 追いかけない。スコアが落ち着くまで sidelines で待機。');
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);

  lines.push('');
  lines.push('🧬 *Dr. Grok の見立て*');
  lines.push(grokText);
  lines.push('');
  lines.push('_本情報は教育目的で提供されるものであり、投資助言・金融商品の勧誘を行うものではありません。_');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
