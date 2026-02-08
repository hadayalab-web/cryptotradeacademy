// 無料版（Minimal Version）Telegram配信用
// services/telegram/messages/user/en/minimal-high-quality.en.js
// Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）
// Minimal High Quality（4-post）は廃止。Zeigarnik Edition のみ。

/**
 * X Sentiment を無料版用に軽量化（心理の空気だけ。深度を出さない）
 * v1.4: Market Snapshot の X Sentiment は "Extreme Fear" → "Fear-dominant" 等に変換
 */
function toSurfaceSentiment(raw) {
  if (!raw || typeof raw !== 'string') return 'Sentiment silence';
  const s = raw.toLowerCase();
  if (s.includes('extreme fear') || s.includes('fear') || s.includes('panic')) return 'Fear-dominant';
  if (s.includes('extreme greed') || s.includes('greed') || s.includes('fomo') || s.includes('euphoria')) return 'Greed-dominant';
  if (s.includes('neutral')) return 'Neutral';
  return 'Sentiment silence';
}

/**
 * Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）
 * Market Snapshot + Key Metrics + Insight + ツァイガルニク効果（未完の緊張）
 * @param {Object} options - { now, trapScore, priceUsd, change24h, trapData, marketData, sentimentData, lang }
 * @returns {string} Telegram message
 */
function formatMinimalBriefingOSv26({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'en',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || 'Unknown';
  const netflow = trapData?.exchangeNetflow ?? 0;
  const netflowStr = netflow >= 0 ? `+${netflow.toFixed(0)} BTC` : `${netflow.toFixed(0)} BTC`;
  const mpi = marketData?.mpi ?? 0;
  const priceStr = priceUsd != null ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = netflow >= 0
    ? 'High exchange inflow → short-term selling pressure'
    : 'Outflow → holders securing assets';
  const cqSummary = `${cqBase} (surface-level view)`;
  const xSummary = toSurfaceSentiment(sentimentData?.sentiment);
  const macroSummary = 'Risk-off dominant; liquidity conditions tight';
  const insight = trapScore != null && trapScore < 30
    ? 'Surface structure shows liquidity shifting under fear pressure; deeper whale–algo dynamics are only revealed in the full briefing.'
    : trapScore != null && trapScore >= 50
      ? 'Visible flows indicate reconfiguration; the underlying structural drivers remain outside this minimal snapshot.'
      : 'Fear-driven liquidity shifts are evident; the full structural map is available only in the complete briefing.';

  return `🌤️ Trap Defence BTC — Minimal Briefing
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 Market Snapshot
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 Key Metrics
━━━━━━━━━━━━━━━━━━━━
• Price: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${mpi.toFixed(2)}
• Sentiment: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}

For educational purposes only.
*(This snapshot is intentionally incomplete; the full structural breakdown is available in the Regular Briefing.)*`.trim();
}

// formatMinimalBriefing は Zeigarnik Edition へのエイリアス（後方互換）
const formatMinimalBriefing = formatMinimalBriefingOSv26;

module.exports = { formatMinimalBriefingOSv26, formatMinimalBriefing };
