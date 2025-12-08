// Tier1 BTC regular briefing (AR)

// services/telegram/messages/user/ar/regular.js

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
  stats, // مستقبلاً: إحصائيات الأداء وغيرها (غير مستخدم حالياً)
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  // --- لمحة عن السوق ----------------------------------------------------

  const priceLine = `💰 سعر BTC: ${formatUsd(priceUsd)} (${formatPercent(
    change24h,
  )} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 صافي تدفق البورصات: ${flowDir} ${flowAbs.toFixed(
    0,
  )} BTC`;

  const mpiLine = `⛏ مؤشر مراكز المعدّنين (MPI): ${(mpi ?? 0).toFixed(2)}`;

  const sentimentLine = `🧠 حالة الشعور في السوق: *${
    sentimentLabel || 'غير معروف'
  }*`;

  // --- الدرجة والفخاخ ---------------------------------------------------

  const scoreLine = `📈 درجة السوق: ${Math.round(score ?? 0)}/100`;

  const trapLine = trap?.isTrap
    ? `🧨 كاشف الفخاخ: ${
        trap.label || 'فخ محتمل'
      } (${trap.confidence} مستوى ثقة)`
    : '✅ كاشف الفخاخ: لا توجد فخاخ حرجة مكتشفة.';

  // --- بطاقة التداول ----------------------------------------------------

  // أي إشارة غير BUY / SELL تُعرض كـ BUG STANDBY (Defense Active)
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
      ? `• نسبة المخاطرة إلى العائد (RR): ${tradeSignal.rr.toFixed(2)}`
      : '';

  // سطر خاص لوضع الانتظار في حالة NO TRADE (= BUG STANDBY)
  const isNoTrade =
    tradeSignal?.signal !== 'BUY' && tradeSignal?.signal !== 'SELL';

  const modeLine = isNoTrade
    ? '• الوضع: Bug Standby — السوق متوتر ولا توجد أفضلية واضحة. ابتعد مؤقتاً واحمِ رأس مالك.'
    : '';

  // --- تعليق Grok ------------------------------------------------------

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline =
    !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);

  let grokText = raw;
  const GROK_LIMIT = 1500; // نفس حد EN للسماح بتحليلات طويلة

  if (!grokText || isOffline) {
    grokText = 'HOLD - Grok offline.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  // --- بناء الرسالة ----------------------------------------------------

  const lines = [];

  // العنوان
  lines.push('📚 تسريب السوق من Dr. Grok');
  lines.push(`تقرير الجلسة @ ${ts}`);
  lines.push('');

  // لمحة عن السوق
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  // الدرجة والفخاخ
  lines.push(scoreLine);
  lines.push(trapLine);
  lines.push('');

  // بطاقة التداول
  lines.push('🎯 حكم التداول');
  lines.push(`${dirEmoji} الإشارة: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine); // يظهر فقط في BUG STANDBY
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // تعليق Grok
  lines.push('🧬 رؤية Dr. Grok');
  lines.push(
    'ما يلي فكرة استراتيجية، وليست إشارة دخول رسمية من True Bug. استخدمها فقط إذا كانت متوافقة مع خطتك وإدارة المخاطر الخاصة بك.',
  );
  lines.push(grokText);
  lines.push('');
  lines.push(
    'لأغراض تعليمية فقط. لا يُعدّ هذا نصيحة مالية أو استثمارية.',
  );

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };


