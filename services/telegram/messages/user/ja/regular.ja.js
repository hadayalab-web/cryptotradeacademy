// Tier1 BTC regular briefing (JP)

// services/telegram/messages/user/jp/regular.js

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
  stats, // 将来: 勝率や統計情報を入れる想定（現時点では未使用）
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  // --- マーケットスナップショット --------------------------------------

  const priceLine = `💰 BTC 現在価格: ${formatUsd(priceUsd)} (${formatPercent(
    change24h,
  )} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 取引所ネットフロー: ${flowDir} ${flowAbs.toFixed(
    0,
  )} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;

  const sentimentLine = `🧠 投資家センチメント: *${
    sentimentLabel || '不明'
  }*`;

  // --- スコア & トラップ -------------------------------------------------

  const scoreLine = `📈 マーケットスコア: ${Math.round(score ?? 0)}/100`;

  const trapLine = trap?.isTrap
    ? `🧨 トラップ検知: ${
        trap.label || 'トラップの可能性'
      } (${trap.confidence} 信頼度)`
    : '✅ トラップ検知: 重大なトラップは検知されていません。';

  // --- トレードカード ----------------------------------------------------

  // BUY / SELL 以外は BUG STANDBY (Defense Active) として表示
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

  const entryLine = `• 想定エントリー（スポット参考）: ${formatUsd(priceUsd)}`;

  const tpLine =
    tradeSignal?.tp != null
      ? `• Take Profit: ${formatUsd(tradeSignal.tp)}`
      : '• Take Profit: n/a';

  const slLine =
    tradeSignal?.sl != null
      ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}`
      : '• Stop Loss: n/a';

  const rrLine =
    tradeSignal?.rr != null
      ? `• リスクリワード (RR): ${tradeSignal.rr.toFixed(2)}`
      : '';

  // NO TRADE (= BUG STANDBY) 専用の「待機モード」行
  const isNoTrade =
    tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';

  const modeLine = isNoTrade
    ? '• モード: Bug Standby — 相場はストレス状態だが、優位性の明確なエントリーポイントはありません。いったん様子見し、資金を守るフェーズです。'
    : '';

  // --- Grok コメント -----------------------------------------------------

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline =
    !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);

  let grokText = raw;
  const GROK_LIMIT = 1500; // EN と同じく十分長い分析を許容

  if (!grokText || isOffline) {
    grokText = 'HOLD - Grok offline.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  // --- 行の組み立て -----------------------------------------------------

  const lines = [];

  // ヘッダー
  lines.push('📚 Dr. Grok Market Leak');
  lines.push(`セッションブリーフィング @ ${ts}`);
  lines.push('');

  // マーケットスナップショット
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // スコア & トラップ
  lines.push(scoreLine);
  lines.push(trapLine);
  lines.push('');

  // トレードカード
  lines.push('🎯 トレード・ヴァーディクト');
  lines.push(`${dirEmoji} シグナル: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine); // BUG STANDBY のときだけ表示
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // Grok の見解
  lines.push('🧬 Dr. Grok の見立て');
  lines.push(
    '以下は戦略アイデアであり、公式な True Bug エントリーシグナルではありません。ご自身のトレードプランとリスク管理と整合するときにのみ活用してください。',
  );
  lines.push(grokText);
  lines.push('');
  lines.push(
    '本情報は教育目的で提供されるものであり、投資助言・金融商品の勧誘を行うものではありません。',
  );

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };


