// Tier1 BTC regular briefing (AR)
// services/telegram/messages/user/ar/regular.ar.js

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
  stats,
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 سعر BTC: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 صافي تدفق البورصات: ${flowDir} ${flowAbs.toFixed(0)} BTC`;
  const mpiLine = `⛏ مؤشر مراكز المعدّنين (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 حالة الشعور في السوق: *${sentimentLabel || 'غير معروف'}*`;

  const scoreLine = `📈 درجة السوق: ${Math.round(score ?? 0)}/100`;
  const trapLine = trap?.isTrap
    ? `🧨 كاشف الفخاخ: ${trap.label || 'فخ محتمل'} (${trap.confidence} مستوى ثقة)`
    : '✅ كاشف الفخاخ: لا توجد فخاخ حرجة مكتشفة.';

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

  const entryLine = `• سعر الدخول (مرجع سبوت): ${formatUsd(priceUsd)}`;
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• نسبة المخاطرة إلى العائد (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';
  const modeLine = isNoTrade ? '• الوضع: Bug Standby — لا توجد أفضلية واضحة الآن. انتظر واحمِ رأس مالك.' : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok غير متصل حالياً (يتم الاعتماد فقط على إشارات النظام: on-chain/السعر).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  // Header
  lines.push('📚 *TrapShield ملخص السوق*');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRADE SIGNAL (最優先情報を上部に配置)
  lines.push('🎯 *إشارة التداول*');
  lines.push(`${dirEmoji} *${dirLabel}* | الدخول: ${formatUsd(priceUsd)}`);
  if (tpLine && slLine) {
    const tp = tradeSignal?.tp ? formatUsd(tradeSignal.tp) : 'n/a';
    const sl = tradeSignal?.sl ? formatUsd(tradeSignal.sl) : 'n/a';
    lines.push(`TP: ${tp} | SL: ${sl}${rrLine ? ` | RR: ${tradeSignal.rr.toFixed(2)}` : ''}`);
  }
  if (modeLine) lines.push(modeLine);
  lines.push('');

  // MARKET STATUS
  lines.push('📊 *حالة السوق*');
  lines.push(scoreLine);
  
  const trapStatusLine = trap?.isTrap
    ? `🧨 الفخ: ${trap.label || 'محتمل'} (*${trap.confidence}* مستوى ثقة)`
    : '✅ الفخ: لا يوجد';
  lines.push(trapStatusLine);
  lines.push('');

  // KEY METRICS
  lines.push('📈 *المؤشرات الرئيسية*');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *تحليل AI* (قراءة 60 ثانية)');
  lines.push(grokText);
  lines.push('');
  
  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('⚠️ لأغراض تعليمية فقط. لا يُعدّ هذا نصيحة مالية أو استثمارية.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
