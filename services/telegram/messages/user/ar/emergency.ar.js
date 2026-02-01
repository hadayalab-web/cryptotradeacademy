// Tier1 BTC trap alert (AR)
// services/telegram/messages/user/ar/emergency.ar.js

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTrapAlert({ inflow, mpi, priceUsd, trap, aiAnalysis }) {
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);

  const trapLabel = trap?.label || 'Whale Trap';
  // BUY/SELL/LONG/SHORT تم حذفه بالكامل - يتم عرض اكتشاف الفخ فقط
  const trapSide = '⚠️ تم رصد فخ في السوق';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 260;
  if (!grokText) {
    grokText = 'منطقة عالية المخاطر. خفّض التعرض وتجنب القرارات العاطفية.';
  } else if (isOffline) {
    grokText = 'Grok غير متصل حالياً؛ تعامَل مع هذه المنطقة كمنطقة فخ عالية المخاطر.';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🚨 *تنبيه فخ من Dr. Grok*');
  lines.push(`*${trapLabel}* (${trap?.confidence || 'UNKNOWN'} مستوى ثقة)`);
  lines.push('');
  lines.push(`💰 سعر BTC: *${formatUsd(priceUsd)}*`);
  lines.push(`📊 صافي تدفق البورصات: *${flowDir}* ${flowAbs.toFixed(0)} BTC | MPI: *${(mpi ?? 0).toFixed(2)}*`);
  lines.push('');
  lines.push(trapSide);

  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);

  lines.push('');
  lines.push('🧬 *رؤية Dr. Grok*');
  lines.push(grokText);
  lines.push('');
  lines.push('_لأغراض تعليمية فقط. لا يُعدّ هذا نصيحة مالية أو استثمارية._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
