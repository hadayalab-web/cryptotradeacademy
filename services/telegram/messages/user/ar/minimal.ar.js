// دالة تنسيق النص لتوزيع Telegram الإصدار الأدنى المجاني
// services/telegram/messages/user/ar/minimal.ar.js
// يعرض Trap Score فقط (بدون تحليل مفصل)

/**
 * الحصول على وصف Trap Score
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score قيد الحساب. يرجى التحقق لاحقاً.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score قيد الحساب. يرجى التحقق لاحقاً.';
  }

  if (score >= 70) {
    return '⚠️ مخاطر الفخ عالية: إشارات قوية تشير إلى فخاخ السوق المحتملة. مارس الحذر الشديد.';
  } else if (score >= 50) {
    return '⚡ مخاطر الفخ متوسطة: تم اكتشاف بعض مؤشرات الفخ. ابق متيقظاً.';
  } else if (score >= 30) {
    return '✅ مخاطر الفخ منخفضة: مؤشرات الفخ ضئيلة. ظروف السوق تبدو آمنة نسبياً.';
  } else {
    return '✅ مخاطر الفخ منخفضة جداً: تم اكتشاف مؤشرات فخ قليلة جداً. ظروف السوق تبدو آمنة.';
  }
}

/**
 * إنشاء رسالة Telegram للإصدار الأدنى المجاني
 * يعرض Trap Score فقط (بدون تحليل مفصل)
 * 
 * @param {Object} options - خيارات إنشاء الرسالة
 * @param {Date} options.now - الوقت الحالي
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - سعر BTC (USD)
 * @param {number|null} options.change24h - معدل التغيير لمدة 24 ساعة (%)
 * @param {string} options.lang - رمز اللغة (الافتراضي: 'ar')
 * @returns {string} سلسلة رسالة Telegram
 */
function formatMinimalBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  lang = 'ar',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 سعر BTC: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 سعر BTC: جاري الجلب...';

  return `🌤️ Trap Defence BTC - تقرير أدنى مجاني
📅 ${ts}

🎯 Trap Score اليوم
${scoreDisplay}/100

${scoreDescription}

${priceLine}

🔒 تريد أن تعرف لماذا؟

التحليل المفصل وراء هذا Trap Score يتضمن:
• لماذا AVOID_LONG أو AVOID_SHORT؟
• تحليل مفصل لبيانات on-chain
• إرشادات التدريب العقلي
• الدعم النفسي من Dr. Grok

🚀 ترقية إلى الوصول الكامل
بدءاً من $69/شهر • إلغاء في أي وقت

هذا تقرير أدنى مجاني. للتحليل المفصل وتنبيهات الفخ، قم بالترقية إلى Trap Defence BTC.

لأغراض تعليمية فقط. ليست نصيحة مالية.`.trim();
}

module.exports = { formatMinimalBriefing };
