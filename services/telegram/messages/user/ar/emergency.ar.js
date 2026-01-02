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
  const trapSide =
    trap?.side === 'SHORT'
      ? '🔻 فخ على جانب SHORT'
      : trap?.side === 'LONG'
        ? '🔺 فخ على جانب LONG'
        : '⚠️ تم رصد فخ في السوق';

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
  // Header - 緊急性の視覚的強調
  lines.push('🚨🚨🚨 *تنبيه فخ* 🚨🚨🚨');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // TRAP INFORMATION (最優先情報を最上部に配置)
  lines.push('⚠️ *تم رصد فخ*');
  lines.push(`${trapSide} | *${trap?.confidence || 'UNKNOWN'}* مستوى ثقة`);
  lines.push(`*${trapLabel}*`);
  lines.push('');

  // ACTION REQUIRED (アクショナブルな情報を明確化)
  lines.push('💡 *إجراءات موصى بها*');
  if (trap?.side === 'SHORT') {
    lines.push('• تقليل التعرض فوراً');
    lines.push('• تجنب مراكز LONG جديدة');
    lines.push('• النظر في جني الأرباح إذا كان لديك LONG');
  } else if (trap?.side === 'LONG') {
    lines.push('• تقليل التعرض فوراً');
    lines.push('• تجنب مراكز SHORT جديدة');
    lines.push('• مراقبة حركة السعر بعناية');
  } else {
    lines.push('• تقليل التعرض فوراً');
    lines.push('• تجنب المراكز الجديدة');
    lines.push('• مراقبة حركة السعر بعناية');
  }
  if (trap?.note) lines.push(`• ${trap.note}`);
  if (trap?.hint) lines.push(`• ${trap.hint}`);
  lines.push('');

  // MARKET DATA
  lines.push('📊 *بيانات السوق*');
  lines.push(`💰 BTC: ${formatUsd(priceUsd)}`);
  lines.push(`📊 التدفق: ${flowDir} ${flowAbs.toFixed(0)} BTC | MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push('');

  // AI Analysis
  lines.push('🧬 *تحليل AI*');
  lines.push(grokText);
  lines.push('');

  // Footer
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('_لأغراض تعليمية فقط. لا يُعدّ هذا نصيحة مالية أو استثمارية._');

  return lines.join('\n');
}

module.exports = { formatTrapAlert };
