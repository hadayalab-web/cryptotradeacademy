// 無料版（Minimal Version）Telegram配信用
// services/telegram/messages/user/ja/minimal-high-quality.ja.js
// Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— 日本語版
// Minimal High Quality（4-post）は廃止。Zeigarnik Edition のみ。

/**
 * X Sentiment を無料版用に軽量化（心理の空気だけ。深度を出さない）
 * v1.4: Market Snapshot の X Sentiment は "Extreme Fear" → "Fear-dominant" 等に変換
 * JA: 日本語ラベル
 */
function toSurfaceSentiment(raw) {
  if (!raw || typeof raw !== 'string') return 'センチメント沈黙';
  const s = raw.toLowerCase();
  if (s.includes('extreme fear') || s.includes('fear') || s.includes('panic') || /恐怖|パニック|恐慌/.test(s)) return '恐怖優位';
  if (s.includes('extreme greed') || s.includes('greed') || s.includes('fomo') || s.includes('euphoria') || /強欲|ユーフォリア/.test(s)) return '強欲優位';
  if (s.includes('neutral') || /中立/.test(s)) return '中立';
  return 'センチメント沈黙';
}

/**
 * Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— 日本語版
 */
function formatMinimalBriefingOSv26({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'ja',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || '不明';
  const netflow = trapData?.exchangeNetflow ?? 0;
  const netflowStr = netflow >= 0 ? `+${netflow.toFixed(0)} BTC` : `${netflow.toFixed(0)} BTC`;
  const mpi = marketData?.mpi ?? 0;
  const priceStr = priceUsd != null ? `$${priceUsd.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = netflow >= 0
    ? '取引所流入増加 → 短期売り圧力'
    : '流出 → ホルダーが資産保護中';
  const cqSummary = `${cqBase} (表面的な視点)`;
  const xSummary = toSurfaceSentiment(sentimentData?.sentiment);
  const macroSummary = 'Risk-off優位；流動性条件逼迫';
  const insight = trapScore != null && trapScore < 30
    ? '表層構造は恐怖圧力下で流動性の移動を示す；その深層構造は正規ブリーフィングでのみ明らかになる。'
    : trapScore != null && trapScore >= 50
      ? '可視化された流入は再構成を示唆；基盤となる構造ドライバーはこの最小スナップショットの外に残る。'
      : '恐怖主導の流動性シフトが顕著；完全な構造マップは正規ブリーフィングでのみ利用可能。';

  return `🌤️ Trap Defence BTC — 最小ブリーフィング
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 Market Snapshot
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 主要指標
━━━━━━━━━━━━━━━━━━━━
• 価格: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${mpi.toFixed(2)}
• センチメント: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}

教育目的のみ。
*(このスナップショットは意図的に不完全；完全な構造分析は正規ブリーフィングで確認可能。)*`.trim();
}

/**
 * Phase 3: Snapshot-native Minimal Briefing (JA)
 */
function formatMinimalBriefing(snapshotOrPayload, lang = 'ja') {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🌤️ Trap Defence BTC — データなし';
  }
  const isSnapshot = snapshotOrPayload.raw != null && snapshotOrPayload.as_of_utc != null;
  const snapshot = isSnapshot ? snapshotOrPayload : {
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
  const inflow = raw.inflow ?? 0;
  const sentimentLabel = raw.sentimentLabel ?? '不明';
  const mpi = raw.mpi ?? snapshot.cqDeep?.mpi ?? snapshot.cqDeep?.minerMPI ?? 0;
  const meta = snapshot.meta || {};
  const watchNote = meta.watch ? '\n⚠️ WATCH: 注意が必要な状況です。' : '';

  const asOf = snapshot.as_of_utc ?? snapshotOrPayload?.now;
  const tsRaw = typeof asOf === 'string' ? asOf : (asOf && typeof asOf.toISOString === 'function' ? asOf.toISOString() : new Date().toISOString());
  const ts = tsRaw.replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const netflowStr = inflow >= 0 ? `+${Number(inflow).toFixed(0)} BTC` : `${Number(inflow).toFixed(0)} BTC`;
  const priceStr = priceUsd != null ? `$${Number(priceUsd).toLocaleString('ja-JP', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = inflow >= 0 ? '取引所流入増加 → 短期売り圧力' : '流出 → ホルダーが資産保護中';
  const cqSummary = `${cqBase} (表面的な視点)`;
  const xSummary = toSurfaceSentiment(sentimentLabel);
  const macroSummary = 'Risk-off優位；流動性条件逼迫';
  const insight = trapScore != null && trapScore < 30
    ? '表層構造は恐怖圧力下で流動性の移動を示す；その深層構造は正規ブリーフィングでのみ明らかになる。'
    : trapScore != null && trapScore >= 50
      ? '可視化された流入は再構成を示唆；基盤となる構造ドライバーはこの最小スナップショットの外に残る。'
      : '恐怖主導の流動性シフトが顕著；完全な構造マップは正規ブリーフィングでのみ利用可能。';

  return `🌤️ Trap Defence BTC — 最小ブリーフィング
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 Market Snapshot
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 主要指標
━━━━━━━━━━━━━━━━━━━━
• 価格: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${Number(mpi).toFixed(2)}
• センチメント: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}${watchNote}

教育目的のみ。
*(このスナップショットは意図的に不完全；完全な構造分析は正規ブリーフィングで確認可能。)*`.trim();
}

const formatMinimalHighQualityBriefing = formatMinimalBriefing;

module.exports = { formatMinimalBriefingOSv26, formatMinimalBriefing, formatMinimalHighQualityBriefing };
