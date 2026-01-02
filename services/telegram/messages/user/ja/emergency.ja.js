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
  const trapSide =
    trap?.side === 'SHORT'
      ? '🔻 ショート側のトラップ'
      : trap?.side === 'LONG'
        ? '🔺 ロング側のトラップ'
        : '⚠️ 相場上にトラップが検知されています。';

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
  // Header - 緊急性の視覚的強調
  lines.push('🚨🚨🚨 *トラップアラート* 🚨🚨🚨');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRAP INFORMATION (最優先情報を最上部に配置)
  lines.push('⚠️ *トラップ検知*');
  lines.push(`${trapSide} | *${trap?.confidence || 'UNKNOWN'}* 信頼度`);
  lines.push(`*${trapLabel}*`);
  lines.push('');

  // ACTION REQUIRED (アクショナブルな情報を明確化)
  lines.push('💡 *推奨アクション*');
  if (trap?.side === 'SHORT') {
    lines.push('• レバレッジを即座に削減');
    lines.push('• 新規ロングポジションを回避');
    lines.push('• ロングポジションは利確を検討');
  } else if (trap?.side === 'LONG') {
    lines.push('• レバレッジを即座に削減');
    lines.push('• 新規ショートポジションを回避');
    lines.push('• 価格変動を注意深く監視');
  } else {
    lines.push('• レバレッジを即座に削減');
    lines.push('• 新規ポジションを回避');
    lines.push('• 価格変動を注意深く監視');
  }
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);
  lines.push('');

  // MARKET DATA
  lines.push('📊 *市場データ*');
  lines.push(`💰 BTC: ${formatUsd(priceUsd)}`);
  lines.push(`📊 フロー: ${flowDir} ${flowAbs.toFixed(0)} BTC | MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *AI分析*');
  lines.push(grokText);
  lines.push('');

  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('_本情報は教育目的で提供されるものであり、投資助言・金融商品の勧誘を行うものではありません。_');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
