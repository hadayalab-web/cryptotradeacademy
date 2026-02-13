// 無料版（Minimal Version）Telegram配信用
// services/telegram/messages/user/ar/minimal-high-quality.ar.js
// Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— アラビア語版
// Minimal High Quality（4-post）は廃止。Zeigarnik Edition のみ。

/**
 * X Sentiment を無料版用に軽量化（心理の空気だけ。深度を出さない）
 * v1.4: Market Snapshot の X Sentiment は "Extreme Fear" → "Fear-dominant" 等に変換
 * AR: アラビア語ラベル
 */
function toSurfaceSentiment(raw) {
  if (!raw || typeof raw !== 'string') return 'صمت المشاعر';
  const s = raw.toLowerCase();
  if (s.includes('extreme fear') || s.includes('fear') || s.includes('panic') || /خوف|ذعر|فزع/.test(s)) return 'الخوف مهيمن';
  if (s.includes('extreme greed') || s.includes('greed') || s.includes('fomo') || s.includes('euphoria') || /جشع|نشوة/.test(s)) return 'الجشع مهيمن';
  if (s.includes('neutral') || /محايد/.test(s)) return 'محايد';
  return 'صمت المشاعر';
}

/**
 * Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— アラビア語版
 */
function formatMinimalBriefingOSv26({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'ar',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || 'غير معروف';
  const netflow = trapData?.exchangeNetflow ?? 0;
  const netflowStr = netflow >= 0 ? `+${netflow.toFixed(0)} BTC` : `${netflow.toFixed(0)} BTC`;
  const mpi = marketData?.mpi ?? 0;
  const priceStr = priceUsd != null ? `$${priceUsd.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = netflow >= 0
    ? 'تدفق داخلي مرتفع للبورصات → ضغط بيع قصير المدى'
    : 'تدفق خارجي → الحائزون يؤمنون الأصول';
  const cqSummary = `${cqBase} (رؤية سطحية)`;
  const xSummary = toSurfaceSentiment(sentimentData?.sentiment);
  const macroSummary = 'Risk-off مهيمن؛ ظروف سيولة ضيقة';
  const insight = trapScore != null && trapScore < 30
    ? 'الهيكل السطحي يُظهر سيولة تتحرك تحت ضغط الخوف؛ ديناميكا الحيتان-الخوارزمية الأعمق تُكشف فقط في البريفينغ الكامل.'
    : trapScore != null && trapScore >= 50
      ? 'التدفقات الظاهرة تشير إلى إعادة تكوين؛ المحركات الهيكلية الكامنة تبقى خارج هذه اللقطة الدنيا.'
      : 'تحولات السيولة المدفوعة بالخوف واضحة؛ خريطة الهيكل الكاملة متاحة فقط في البريفينغ المنتظم.';

  return `🌤️ Trap Defence BTC — بريفينغ أدنى
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 Market Snapshot
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 مقاييس رئيسية
━━━━━━━━━━━━━━━━━━━━
• السعر: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${mpi.toFixed(2)}
• المشاعر: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}

لأغراض تعليمية فقط.
*(هذه اللقطة غير مكتملة عمداً؛ التفصيل الهيكلي الكامل متاح في البريفينغ المنتظم.)*`.trim();
}

/**
 * Phase 3: Snapshot-native Minimal Briefing (AR)
 */
function formatMinimalBriefing(snapshotOrPayload, lang = 'ar') {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🌤️ Trap Defence BTC — لا توجد بيانات متاحة.';
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
  const sentimentLabel = raw.sentimentLabel ?? 'غير معروف';
  const mpi = raw.mpi ?? snapshot.cqDeep?.mpi ?? snapshot.cqDeep?.minerMPI ?? 0;
  const meta = snapshot.meta || {};
  const watchNote = meta.watch ? '\n⚠️ WATCH: الظروف تستدعي الانتباه.' : '';

  const asOf = snapshot.as_of_utc ?? snapshotOrPayload?.now;
  const tsRaw = typeof asOf === 'string' ? asOf : (asOf && typeof asOf.toISOString === 'function' ? asOf.toISOString() : new Date().toISOString());
  const ts = tsRaw.replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const netflowStr = inflow >= 0 ? `+${Number(inflow).toFixed(0)} BTC` : `${Number(inflow).toFixed(0)} BTC`;
  const priceStr = priceUsd != null ? `$${Number(priceUsd).toLocaleString('ar-SA', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = inflow >= 0
    ? 'تدفق داخلي مرتفع للبورصات → ضغط بيع قصير المدى'
    : 'تدفق خارجي → الحائزون يؤمنون الأصول';
  const cqSummary = `${cqBase} (رؤية سطحية)`;
  const xSummary = toSurfaceSentiment(sentimentLabel);
  const macroSummary = 'Risk-off مهيمن؛ ظروف سيولة ضيقة';
  const insight = trapScore != null && trapScore < 30
    ? 'الهيكل السطحي يُظهر سيولة تتحرك تحت ضغط الخوف؛ ديناميكا الحيتان-الخوارزمية الأعمق تُكشف فقط في البريفينغ الكامل.'
    : trapScore != null && trapScore >= 50
      ? 'التدفقات الظاهرة تشير إلى إعادة تكوين؛ المحركات الهيكلية الكامنة تبقى خارج هذه اللقطة الدنيا.'
      : 'تحولات السيولة المدفوعة بالخوف واضحة؛ خريطة الهيكل الكاملة متاحة فقط في البريفينغ المنتظم.';

  return `🌤️ Trap Defence BTC — بريفينغ أدنى
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 Market Snapshot
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 مقاييس رئيسية
━━━━━━━━━━━━━━━━━━━━
• السعر: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${Number(mpi).toFixed(2)}
• المشاعر: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}${watchNote}

لأغراض تعليمية فقط.
*(هذه اللقطة غير مكتملة عمداً؛ التفصيل الهيكلي الكامل متاح في البريفينغ المنتظم.)*`.trim();
}

const formatMinimalHighQualityBriefing = formatMinimalBriefing;

module.exports = { formatMinimalBriefingOSv26, formatMinimalBriefing, formatMinimalHighQualityBriefing };
