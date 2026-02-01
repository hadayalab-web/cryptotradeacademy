// Tier1 BTC trap alert (JP)
// services/telegram/messages/user/ja/emergency.ja.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTrapAlert({ inflow, mpi, priceUsd, trap, aiAnalysis }) {
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || 'Whale Trap';
  // BUY/SELL/LONG/SHORTは完全削除 - トラップ検知のみ表示
  const trapSide = '⚠️ 相場上にトラップが検知されています。';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = '高リスク局面です。レバレッジを落とし、防御を最優先してください。';
  } else if (isOffline) {
    grokText = '現在Grokはオフラインです。この価格帯は「ハイリスク・トラップゾーン」として扱ってください。';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *Dr. Grok トラップアラート*');
  lines.push(`*${trapLabel}* (${trap?.confidence || 'UNKNOWN'} 信頼度)`);
  lines.push('');
  lines.push(`💰 BTC 現在価格: *${formatUsd(priceUsd)}*`);
  lines.push(`📊 取引所ネットフロー: *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI: *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');
  lines.push(trapSide);

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
