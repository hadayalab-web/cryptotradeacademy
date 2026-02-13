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
 * Phase 3: Snapshot-native Minimal Briefing
 * Accepts btcSnapshot or legacy payload (for backward compat).
 * @param {Object} snapshotOrPayload - btcSnapshot or legacy { now, minimalTrapScore, trapData, ... }
 * @param {string} [lang='en']
 * @returns {string} Telegram message
 */
function formatMinimalBriefing(snapshotOrPayload, lang = 'en') {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🌤️ Trap Defence BTC — No data available.';
  }
  // Detect snapshot vs legacy
  const isSnapshot = snapshotOrPayload.raw != null && snapshotOrPayload.as_of_utc != null;
  const snapshot = isSnapshot
    ? snapshotOrPayload
    : {
        raw: {
          priceUsd: snapshotOrPayload.priceUsd,
          change24h: snapshotOrPayload.change24h,
          inflow: snapshotOrPayload.trapData?.exchangeNetflow ?? 0,
          mpi: snapshotOrPayload.minimalMarketData?.mpi ?? 0,
          sentimentLabel: snapshotOrPayload.sentimentLabel ?? snapshotOrPayload.sentimentData?.sentiment
        },
        as_of_utc: snapshotOrPayload.now,
        trapDetection: { trapScore: snapshotOrPayload.minimalTrapScore },
        cqDeep: { whaleRatio: snapshotOrPayload.trapData?.whaleRatio, mpi: snapshotOrPayload.minimalMarketData?.mpi },
        meta: {}
      };
  const raw = snapshot.raw || {};
  const trapScore = snapshot.trapDetection?.trapScore ?? snapshot.cqDeep?.trapScore ?? null;
  const priceUsd = raw.priceUsd ?? null;
  const change24h = raw.change24h ?? null;
  const inflow = raw.inflow ?? 0;
  const sentimentLabel = raw.sentimentLabel ?? 'Unknown';
  const mpi = raw.mpi ?? snapshot.cqDeep?.mpi ?? snapshot.cqDeep?.minerMPI ?? 0;
  const whaleRatio = snapshot.cqDeep?.whaleFlows?.whaleRatio ?? snapshot.cqDeep?.whaleRatio ?? null;
  const meta = snapshot.meta || {};
  const watchNote = meta.watch ? '\n⚠️ WATCH: Conditions warrant closer attention.' : '';

  const ts = (snapshot.as_of_utc || new Date().toISOString()).replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const netflowStr = inflow >= 0 ? `+${Number(inflow).toFixed(0)} BTC` : `${Number(inflow).toFixed(0)} BTC`;
  const priceStr = priceUsd != null ? `$${Number(priceUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = inflow >= 0
    ? 'High exchange inflow → short-term selling pressure'
    : 'Outflow → holders securing assets';
  const cqSummary = `${cqBase} (surface-level view)`;
  const xSummary = toSurfaceSentiment(sentimentLabel);
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
• MPI: ${Number(mpi).toFixed(2)}
• Sentiment: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}${watchNote}

For educational purposes only.
*(This snapshot is intentionally incomplete; the full structural breakdown is available in the Regular Briefing.)*`.trim();
}

/**
 * Legacy shape support (mapSnapshotToMinimalPayload 経由等)
 * @deprecated Use formatMinimalBriefing(snapshot, lang)
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

// formatMinimalBriefingOSv26 は legacy 用、formatMinimalBriefing が snapshot-native の主
module.exports = { formatMinimalBriefingOSv26, formatMinimalBriefing };
