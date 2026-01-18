// دالة تنسيق النص لتوزيع Telegram الإصدار الأدنى المجاني عالي الجودة
// services/telegram/messages/user/ar/minimal-high-quality.ar.js
// Trap Score + تحليل مبسط + تعليق مبسط من Dr. Grok + Mental Note

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
 * إنشاء What to Avoid（الإجراءات التي يجب تجنبها）
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  if (!trapScore || trapScore < 50) {
    return null;
  }

  const avoidItems = [];
  
  // استخراج الإجراءات التي يجب تجنبها من Trap Data
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('تجنب مراكز LONG - تم اكتشاف مخاطر فخ عالية');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('تجنب مراكز SHORT - تم اكتشاف مخاطر فخ عالية');
      }
    }
  }

  // الإجراءات الافتراضية التي يجب تجنبها
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('تجنب فتح مراكز جديدة - تم اكتشاف إشارات فخ قوية');
      avoidItems.push('انتظر إشارات السوق الأكثر وضوحاً قبل التداول');
    } else if (trapScore >= 50) {
      avoidItems.push('مارس الحذر - بعض مؤشرات الفخ موجودة');
      avoidItems.push('فكر في انتظار فرص دخول أفضل');
    }
  }

  return avoidItems;
}

/**
 * إنشاء Evidence（الدليل）
 */
function generateEvidence(trapData = null, marketData = null) {
  const evidenceItems = [];

  // استخراج الدليل من Trap Data
  if (trapData) {
    if (trapData.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
      const netflow = trapData.exchangeNetflow; // بوحدات BTC
      const sign = netflow >= 0 ? '+' : '';
      const absValue = Math.abs(netflow);
      const flowDir = netflow >= 0 ? 'تدفق داخلي' : 'تدفق خارجي';
      // عرض بوحدات BTC (موحد مع الإصدار المدفوع)
      evidenceItems.push(`صافي تدفق البورصات: ${sign}${absValue.toFixed(0)} BTC (${flowDir})`);
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      evidenceItems.push(`نسبة الحيتان: ${whaleRatio.toFixed(0)}% (${whaleRatio >= 80 ? 'ضغط بيع عالي' : 'طبيعي'})`);
    }
  }

  // استخراج الدليل من Market Data
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`مؤشر مراكز المعدّنين: ${mpi.toFixed(2)} (المعدّنون يبيعون)`);
      }
    }
  }

  // الدليل الافتراضي (إذا لم تكن هناك بيانات)
  if (evidenceItems.length === 0) {
    evidenceItems.push('تحليل بيانات on-chain يشير إلى مخاطر الفخ');
  }

  return evidenceItems.slice(0, 2); // الحد الأقصى 2
}

/**
 * إنشاء تعليق مبسط من Dr. Grok
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  if (!trapScore || trapScore < 30) {
    // حتى عندما يكون Trap Score منخفضاً، توفير رسالة افتراضية
    comments.push('"الصبر قوة استراتيجية. استمر في انتظار الفرص الواضحة."');
  } else if (trapScore >= 70) {
    comments.push('"FOMO مرتفع الآن. لا تدع الجشع يتغلب على استراتيجية دفاعك. انتظر."');
  } else if (trapScore >= 50) {
    comments.push('"حافظ على الانضباط. السوق يختبر صبرك. الدفاع أولاً."');
  } else {
    comments.push('"انضباط جيد. استمر في انتظار الفرص الواضحة."');
  }

  // تعليق إضافي من Sentiment Data
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"مشاعر السوق عاطفية. هذا عندما تحدث الفخاخ. حافظ على الهدوء."');
    }
  }

  return comments[0] || null;
}

/**
 * إنشاء Mental Note
 */
function generateMentalNote() {
  return '"70% من الوقت، لا تفعل شيئاً. الدفاع حتى تظهر ميزة واضحة."';
}

/**
 * إنشاء رسالة Telegram للإصدار الأدنى المجاني عالي الجودة
 * Trap Score + تحليل مبسط + تعليق مبسط من Dr. Grok + Mental Note
 * 
 * @param {Object} options - خيارات إنشاء الرسالة
 * @param {Date} options.now - الوقت الحالي
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - سعر BTC (USD)
 * @param {number|null} options.change24h - معدل التغيير لمدة 24 ساعة (%)
 * @param {Object} options.trapData - Trap Data (اختياري)
 * @param {Object} options.marketData - Market Data (اختياري)
 * @param {Object} options.sentimentData - Sentiment Data (اختياري)
 * @param {string} options.lang - رمز اللغة (الافتراضي: 'ar')
 * @returns {string} سلسلة رسالة Telegram
 */
function formatMinimalHighQualityBriefing({
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
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 سعر BTC: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 سعر BTC: جاري الجلب...';

  const whatToAvoid = generateWhatToAvoid(trapScore, trapData);
  const evidence = generateEvidence(trapData, marketData);
  const drGrokComment = generateDrGrokComment(trapScore, sentimentData);
  const mentalNote = generateMentalNote();

  // 【تحسين 1: إضافة تنسيق برنامج إخباري】إضافة قسم Opening
  let message = `🌤️ Trap Defense BTC - تقرير مجاني
🚨 BREAKING: بريفينغ دفاع الفخ
📺 【الافتتاح】بريفينغ استخبارات السوق
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score اليوم
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 【تحسين 1: إضافة هيكل القصة】إضافة قسم عرض المشكلة
  // الخطوة 1: عرض المشكلة (بناءً على Trap Score)
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📖 【قصة السوق】المشكلة
━━━━━━━━━━━━━━━━━━━━`;
    
    if (trapScoreRounded >= 70) {
      message += `\n🚨 السوق يظهر إشارات فخ قوية. على الرغم مما قد توحي به مخططات الأسعار، فإن بيانات on-chain تكشف عن مخاطر خفية.`;
      message += `\n💡 المشكلة: تشير عدة انحرافات وشذوذات إلى فخاخ سوق محتملة. الدخول الآن قد يعرضك لمخاطر كبيرة.`;
    } else if (trapScoreRounded >= 50) {
      message += `\n⚡ السوق يظهر مؤشرات فخ متوسطة. بعض الانحرافات تشير إلى الحذر.`;
      message += `\n💡 المشكلة: إشارات الفخ موجودة. التسرع في التداول الآن قد يؤدي إلى خسائر.`;
    } else {
      message += `\n✅ ظروف السوق تبدو آمنة نسبياً، لكن أنماط الفخ يمكن أن تظهر بسرعة.`;
      message += `\n💡 المشكلة: حتى في ظروف المخاطر المنخفضة، الصبر قوة استراتيجية.`;
    }
  }

  // الخطوة 2: قسم الدليل (Evidence)
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 【الدليل】لماذا الانتظار؟ أسباب مبنية على البيانات
مثبت ببيانات ON-CHAIN
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【تحسين 2: دمج شرح قائم على الأدلة لـ"استراتيجية الانتظار 70%"】ربط Evidence و Mental Note
    if (trapScore !== null && trapScore >= 30) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 لماذا الانتظار؟ (قائم على الأدلة)`;
      if (trapScoreRounded >= 70) {
        message += `\n   🚨 Trap Score ${trapScoreRounded}/100: إشارات قوية تشير إلى فخاخ سوق محتملة.`;
        message += `\n   🛡️ الاستعداد الاستراتيجي ليس ضعفاً—إنه استعداد للنصر. 70% من الوقت، استعد للنصر.`;
      } else if (trapScoreRounded >= 50) {
        message += `\n   ⚡ Trap Score ${trapScoreRounded}/100: تم اكتشاف مؤشرات فخ متوسطة.`;
        message += `\n   🛡️ الدفاع أولاً. انتظر إشارات السوق الأكثر وضوحاً.`;
      } else {
        message += `\n   ✅ Trap Score ${trapScoreRounded}/100: مخاطر فخ منخفضة، لكن ابق متيقظاً.`;
        message += `\n   🛡️ حتى في ظروف المخاطر المنخفضة، الاستعداد الاستراتيجي هو استعداد للنصر.`;
      }
    }
  }

  // الخطوة 3: الحل (What to Avoid)
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 【الحل】ما يجب تجنبه
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // الخطوة 4: النهاية الناجحة (تعليق Dr. Grok + Mental Note)
  // 【تحسين 1: إضافة تنسيق برنامج إخباري】قسم المعلق
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 【المعلق】رؤية سريعة من Dr. Grok
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // 【تحسين 1: إضافة هيكل القصة】النهاية الناجحة (Mental Note)
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ 【النهاية الناجحة】Mental Note
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }
  
  // 【تحسين 1: إضافة تنسيق برنامج إخباري】إضافة قسم Closing
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
📺 【الختام】ترقبوا الحلقة القادمة
━━━━━━━━━━━━━━━━━━━━`;

  // CTA (تحسين الـupsell: CTA مع إلحاح لضمان أموال التطوير)
  // VSL2 ورابط Whop يتم توزيعهما بشكل منفصل، لذلك لا يتم تضمينهما في Minimal Briefing العادي
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 قم بفتح تقرير الاستخبارات الكامل

أنت ترى لمحة. الأعضاء الكاملون يحصلون على:

✨ تقرير الاستخبارات الكامل
• تحليل on-chain كامل (جميع المؤشرات)
• رؤى السوق المدعومة بالذكاء الاصطناعي وكشف الفخاخ
• تنبيهات في الوقت الفعلي: EVITAR-LONG / EVITAR-SHORT / STANDBY
• خريطة الخروج وإرشادات التدريب العقلي
• الدعم النفسي الكامل من Dr. Grok
• تحليل مشاعر X في الوقت الفعلي

💡 لماذا الترقية؟
الفرق بين حماية رأس المال وفقدانه غالباً ما يكون مجرد إشارة فخ فائتة.

━━━━━━━━━━━━━━━━━━━━
هذا تقرير مجاني. للتحليل المفصل وتنبيهات الفخ، قم بالترقية إلى Trap Defense BTC.

لأغراض تعليمية فقط. ليست نصيحة مالية.`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
