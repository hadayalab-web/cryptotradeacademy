// Tier1 BTC regular briefing (JP)
// services/telegram/messages/user/ja/regular.ja.js

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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
  stats, // reserved
  riskReward, // Phase 2: JA市場専用
  nupl, // Phase 2: JA市場専用
  sopr30d, // Phase 2: JA市場専用
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 BTC 現在価格: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 取引所ネットフロー: ${flowDir} ${flowAbs.toFixed(0)} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 投資家センチメント: *${sentimentLabel || '不明'}*`;

  const scoreLine = `📈 マーケットスコア: ${Math.round(score ?? 0)}/100`;

  // Phase 2: Risk/Reward表示（JA市場専用）
  if (riskReward != null) {
    // riskRewardは後でメッセージに追加
  }

  const trapLine = trap?.isTrap
    ? `🧨 トラップ検知: ${trap.label || 'トラップの可能性'} (${trap.confidence} 信頼度)`
    : '✅ トラップ検知: 重大なトラップは検知されていません。';

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
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• リスクリワード (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';
  const modeLine = isNoTrade
    ? '• モード: Bug Standby — 明確な優位性が出るまで待機。守りを優先。'
    : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grokは現在オフラインです（オンチェーン/価格データのみで判定中）。';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('📚 Dr. Grok Market Leak');
  lines.push(`セッションブリーフィング @ ${ts}`);
  lines.push('');

  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);

  // Phase 2: Risk/Reward表示（JA市場専用）
  if (riskReward != null) {
    const rrLine = `⚖️ リスクリワード比: ${riskReward.toFixed(2)} ${riskReward >= 2.0 ? '✅ 良好' : riskReward >= 1.5 ? '⚠️ 注意' : '❌ 低い'}`;
    lines.push(rrLine);
    if (nupl != null) {
      lines.push(`• NUPL (含み損益): ${nupl.toFixed(3)}`);
    }
    if (sopr30d != null) {
      lines.push(`• SOPR 30日平均: ${sopr30d.toFixed(3)}`);
    }
  }

  lines.push(trapLine);
  lines.push('');

  lines.push('🎯 トレード・ヴァーディクト');
  lines.push(`${dirEmoji} シグナル: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  lines.push('🧬 Dr. Grok の見立て');
  lines.push('以下は戦略アイデアであり、公式な True Bug エントリーシグナルではありません。ご自身のトレードプランとリスク管理と整合するときにのみ活用してください。');
  lines.push(grokText);
  lines.push('');
  lines.push('本情報は教育目的で提供されるものであり、投資助言・金融商品の勧誘を行うものではありません。');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
