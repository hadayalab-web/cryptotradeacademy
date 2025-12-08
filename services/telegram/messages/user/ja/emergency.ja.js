// Tier1 BTC trap alert (JP)

// services/telegram/messages/user/jp/emergency.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;
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

  // Grok コメント
  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline =
    !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);

  let grokText = raw;
  const GROK_LIMIT = 260;

  if (!grokText) {
    grokText =
      'Grok は現在価格帯近辺で、最大限慎重な対応を取るべきと示唆しています。';
  } else if (isOffline) {
    grokText =
      '現在 Grok はオフラインです。この価格帯はいわゆる「ハイリスク・トラップゾーン」として扱ってください。';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];

  lines.push('🚨 *Dr. Grok トラップアラート*');
  lines.push(`*${trapLabel}* (${trap?.confidence || 'UNKNOWN'} 信頼度)`);
  lines.push('');

  lines.push(`💰 BTC 現在価格: *${formatUsd(priceUsd)}*`);
  lines.push(
    `📊 取引所ネットフロー: *${flowDir}* ${flowAbs.toFixed(
      0,
    )} BTC | MPI: *${(mpi ?? 0).toFixed(2)}*`,
  );
  lines.push('');

  lines.push(trapSide);

  if (trap?.note) {
    lines.push(`• ${trap.note}`);
  }

  if (trap?.hint) {
    lines.push(`• ${trap.hint}`);
  }

  lines.push('');
  lines.push('🧬 *Dr. Grok の見立て*');
  lines.push(grokText);
  lines.push('');
  lines.push(
    '_本情報は教育目的で提供されるものであり、投資助言・金融商品の勧誘を行うものではありません。_',
  );

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
