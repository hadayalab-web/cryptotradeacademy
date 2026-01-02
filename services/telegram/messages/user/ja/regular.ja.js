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

  const GROK_LIMIT = 80; // Strategic OS requirement: 60-second reads (300 chars max, ~80 for analysis)
  if (!grokText || isOffline) {
    grokText = 'Grokオフライン。オンチェーンシグナルのみ。';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = grokText.slice(0, GROK_LIMIT) + '...';
  }

  const lines = [];
  // Header
  lines.push('📚 *TrapShield マーケットブリーフ*');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRADE SIGNAL (最優先情報を上部に配置)
  lines.push('🎯 *トレードシグナル*');
  lines.push(`${dirEmoji} *${dirLabel}* | エントリー: ${formatUsd(priceUsd)}`);
  if (tpLine && slLine) {
    const tp = tradeSignal?.tp ? formatUsd(tradeSignal.tp) : 'n/a';
    const sl = tradeSignal?.sl ? formatUsd(tradeSignal.sl) : 'n/a';
    lines.push(`TP: ${tp} | SL: ${sl}${rrLine ? ` | RR: ${tradeSignal.rr.toFixed(2)}` : ''}`);
  }
  if (modeLine) lines.push(modeLine);
  lines.push('');

  // MARKET STATUS
  lines.push('📊 *市場状況*');
  lines.push(scoreLine);

  // Phase 2: Risk/Reward表示（JA市場専用）
  if (riskReward != null) {
    const rrStatusLine = `⚖️ リスクリワード比: ${riskReward.toFixed(2)} ${riskReward >= 2.0 ? '✅ 良好' : riskReward >= 1.5 ? '⚠️ 注意' : '❌ 低い'}`;
    lines.push(rrStatusLine);
    if (nupl != null) {
      lines.push(`• NUPL: ${nupl.toFixed(3)}`);
    }
    if (sopr30d != null) {
      lines.push(`• SOPR 30日平均: ${sopr30d.toFixed(3)}`);
    }
  }

  const trapStatusLine = trap?.isTrap
    ? `🧨 トラップ: ${trap.label || '可能性'} (*${trap.confidence}* 信頼度)`
    : '✅ トラップ: 検知なし';
  lines.push(trapStatusLine);
  lines.push('');

  // KEY METRICS
  lines.push('📈 *主要指標*');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *AI分析* (60秒読了)');
  lines.push(grokText); // Already limited to 80 chars by GROK_LIMIT
  lines.push('');

  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('⚠️ 教育目的のみ。投資助言ではありません。');

  const message = lines.join('\n');

  // 文字数チェック（300文字以内）
  if (message.length > 300) {
    console.warn(`[JA] Message exceeds 300 characters: ${message.length} chars`);
    // 最後の部分を削減
    const excess = message.length - 300;
    const lastLineIndex = lines.length - 1;
    if (lastLineIndex >= 0 && lines[lastLineIndex].length > excess) {
      lines[lastLineIndex] = lines[lastLineIndex].slice(0, -excess - 3) + '...';
    }
    return lines.join('\n');
  }

  return message;
}

module.exports = { formatRegularBriefing };
