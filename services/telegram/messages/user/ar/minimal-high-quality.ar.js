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
    return '⚠️ مخاطر الفخ عالية: إشارات قوية تشير إلى فخاخ السوق المحتملة. مارس الحذر الشديد';
  } else if (score >= 50) {
    return '⚡ مخاطر الفخ متوسطة: تم اكتشاف بعض مؤشرات الفخ. ابق متيقظاً';
  } else if (score >= 30) {
    return '✅ مخاطر الفخ منخفضة: مؤشرات الفخ ضئيلة. ظروف السوق تبدو آمنة نسبياً';
  } else {
    return '✅ مخاطر الفخ منخفضة جداً: تم اكتشاف مؤشرات فخ قليلة جداً. ظروف السوق تبدو آمنة';
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
        avoidItems.push('تجنب مراكز LONG — تم اكتشاف مخاطر فخ عالية');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('تجنب مراكز SHORT — تم اكتشاف مخاطر فخ عالية');
      }
    }
  }

  // الإجراءات الافتراضية التي يجب تجنبها
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('تجنب فتح مراكز جديدة — تم اكتشاف إشارات فخ قوية');
      avoidItems.push('انتظر إشارات السوق الأكثر وضوحاً قبل التداول');
    } else if (trapScore >= 50) {
      avoidItems.push('مارس الحذر — بعض مؤشرات الفخ موجودة');
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
      const absValue = Math.abs(netflow);
      if (netflow < 0) {
        // التدفق الخارجي: إشارة إيجابية
        evidenceItems.push(`صافي تدفق البورصات: ${absValue.toFixed(0)} BTC (تدفق خارجي) — الحائزون يحتفظون بالأصول`);
      } else if (netflow > 0) {
        // التدفق الداخلي: تحذير
        evidenceItems.push(`صافي تدفق البورصات: +${absValue.toFixed(0)} BTC (تدفق داخلي) — احتمال ضغط بيع`);
      } else {
        evidenceItems.push(`صافي تدفق البورصات: متوازن`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`نسبة الحيتان: ${whaleRatio.toFixed(0)}% — تم اكتشاف ضغط بيع عالي`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`نسبة الحيتان: ${whaleRatio.toFixed(0)}% — ضغط بيع مرتفع نسبياً`);
      } else {
        evidenceItems.push(`نسبة الحيتان: ${whaleRatio.toFixed(0)}% — النطاق الطبيعي (نشاط الحيتان مستقر)`);
      }
    }
  }

  // استخراج الدليل من Market Data
  if (marketData) {
    if (marketData.mpi !== undefined && marketData.mpi !== null) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`مؤشر مراكز المعدّنين: ${mpi.toFixed(2)} — المعدّنون يبيعون (الحذر مطلوب)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`مؤشر مراكز المعدّنين: ${mpi.toFixed(2)} — المعدّنون يحتفظون (إشارة إيجابية)`);
      } else {
        evidenceItems.push(`مؤشر مراكز المعدّنين: ${mpi.toFixed(2)} — النطاق الطبيعي`);
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
    // Trap Score منخفض: توفير قيمة حتى في المخاطر المنخفضة
    const lowRiskMessages = [
      '"الصبر قوة استراتيجية. استمر في انتظار الفرص الواضحة."',
      '"المخاطر منخفضة الآن، لكن الأسواق تتغير دائماً. عدم الاستعداد هو طريق الهزيمة."',
      '"الدفاع ليس ضعفاً. 70% من الوقت، عدم فعل شيء هو أقوى استراتيجية."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"FOMO مرتفع الآن. لا تدع الجشع يتغلب على استراتيجية دفاعك. انتظر. هذا هو الوقت الأكثر خطورة."');
  } else if (trapScore >= 50) {
    comments.push('"حافظ على الانضباط. السوق يختبر صبرك. الدفاع أولاً. انتظر إشارات واضحة."');
  } else {
    comments.push('"انضباط جيد. استمر في انتظار الفرص الواضحة. المخاطر المنخفضة لا تعني خفض حذرتك."');
  }

  // تعليق إضافي من Sentiment Data
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"مشاعر السوق عاطفية. هذا عندما تحدث الفخاخ. حافظ على الهدوء."');
    } else if (sentimentData.sentiment === 'FEAR') {
      comments.push('"الخوف طبيعي. لكن القرارات القائمة على البيانات تحميك."');
    }
  }

  return comments[0] || null;
}

/**
 * إنشاء Mental Note
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"70% من الوقت، لا تفعل شيئاً. الدفاع حتى تظهر ميزة واضحة."',
    '"حماية رأس المال هي الأولوية الأولى. عدم الخسارة أهم من الفوز."',
    '"70% من السوق ضوضاء. تفاعل فقط مع الإشارات الواضحة. هذا هو طريق النصر."',
    '"الانتظار ليس ضعفاً. إنه أقوى استراتيجية."',
    '"الدفاع هو أعلى شكل من أشكال الهجوم. حماية رأس المال هي حيث يبدأ كل شيء."',
    '"90% من المتداولين المحترفين يعطون الأولوية لوقت الانتظار. اتخذ نفس الاستراتيجية."',
  ];
  
  // إذا تم استخدام "المتداولون المحترفون يعطون الأولوية لوقت الانتظار" في الرؤى الاستراتيجية، تجنبها في Mental Note
  let availableNotes = allMentalNotes;
  if (avoidProTraderMessage) {
    availableNotes = availableNotes.filter(note => !note.includes('المتداولين المحترفين'));
  }
  
  // تجنب التكرار مع تعليق Dr. Grok
  if (drGrokComment) {
    // إذا كان التعليق يحتوي على "70% من الوقت"، تجنب نفس العبارة في Mental Note
    if (drGrokComment.includes('70% من الوقت') || drGrokComment.includes('70%')) {
      availableNotes = availableNotes.filter(note => !note.includes('70% من الوقت') && !note.includes('70%'));
    }
    // إذا كان التعليق يحتوي على "الدفاع ليس ضعفاً"، تجنب نفس العبارة في Mental Note
    if (drGrokComment.includes('الدفاع ليس ضعفاً')) {
      availableNotes = availableNotes.filter(note => !note.includes('الدفاع ليس ضعفاً'));
    }
    // إذا كان التعليق يحتوي على "ليس ضعفاً"، تجنب نفس العبارة في Mental Note
    if (drGrokComment.includes('ليس ضعفاً')) {
      availableNotes = availableNotes.filter(note => !note.includes('ليس ضعفاً'));
    }
    // إذا كان التعليق يحتوي على "أقوى استراتيجية"، تجنب نفس العبارة في Mental Note
    if (drGrokComment.includes('أقوى استراتيجية')) {
      availableNotes = availableNotes.filter(note => !note.includes('أقوى استراتيجية'));
    }
  }
  
  // إذا لم تكن هناك رسائل متاحة، اختر من الكل
  if (availableNotes.length === 0) {
    availableNotes = allMentalNotes;
  }
  
  const selectedNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
  return selectedNote;
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
  
  // إذا كان هناك احتمال استخدام "المتداولون المحترفون يعطون الأولوية لوقت الانتظار" في الرؤى الاستراتيجية، تجنبها في Mental Note
  const trapScoreRounded = trapScore !== null ? Math.round(trapScore) : null;
  const useProTraderMessageInInsight = trapScoreRounded !== null && trapScoreRounded < 50 && trapScoreRounded >= 0;
  const mentalNote = generateMentalNote(trapScore, useProTraderMessageInInsight, drGrokComment);

  let message = `🌤️ Trap Defence BTC - تقرير مجاني
🚨 BREAKING: بريفينغ دفاع الفخ
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score اليوم
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // قسم عرض المشكلة (بناءً على Trap Score)
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    
    if (trapScoreRounded >= 70) {
      message += `\n\n🚨 السوق يظهر إشارات فخ قوية. على الرغم مما قد توحي به مخططات الأسعار، فإن بيانات on-chain تكشف عن مخاطر خفية`;
      message += `\n💡 تشير عدة انحرافات وشذوذات إلى فخاخ سوق محتملة. الدخول الآن قد يعرضك لمخاطر كبيرة`;
    } else if (trapScoreRounded >= 50) {
      message += `\n\n⚡ السوق يظهر مؤشرات فخ متوسطة. بعض الانحرافات تشير إلى الحذر`;
      message += `\n💡 إشارات الفخ موجودة. التسرع في التداول الآن قد يؤدي إلى خسائر`;
    } else {
      message += `\n\n✅ ظروف السوق تبدو آمنة نسبياً، لكن أنماط الفخ يمكن أن تظهر بسرعة`;
      message += `\n💡 حتى في ظروف المخاطر المنخفضة، الصبر قوة استراتيجية`;
    }
  } else if (trapScore !== null && trapScore < 30) {
    // حتى في المخاطر المنخفضة، تقديم حالة السوق بشكل موجز
    message += `\n\n💡 ظروف السوق الحالية مستقرة نسبياً، لكن من المهم أن تبقى متيقظاً دائماً`;
  }

  // الخطوة 2: قسم الدليل (Evidence)
  // عرض قسم الدليل دائماً حتى في المخاطر المنخفضة (لتوفير القيمة)
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 أسباب مبنية على البيانات
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // Market Dataから追加情報を表示（MPI、Sentimentなど）
    // 重要: evidenceセクションの後に追加情報として表示（常に表示）
    if (marketData) {
      if (marketData.mpi !== undefined && marketData.mpi !== null) {
        const mpi = marketData.mpi;
        if (mpi > 2.0) {
          message += `\n• مؤشر مراكز المعدّنين (MPI): ${mpi.toFixed(2)} — المعدّنون يبيعون (الحذر مطلوب)`;
        } else if (mpi < 0.5) {
          message += `\n• مؤشر مراكز المعدّنين (MPI): ${mpi.toFixed(2)} — المعدّنون يحتفظون (إشارة إيجابية)`;
        } else {
          message += `\n• مؤشر مراكز المعدّنين (MPI): ${mpi.toFixed(2)} — النطاق الطبيعي`;
        }
      }
    }
    
    // Sentiment Dataから追加情報を表示
    // 重要: sentimentDataが存在する場合、必ず表示
    if (sentimentData && sentimentData.sentiment) {
      const sentiment = sentimentData.sentiment;
      const sentimentEmoji = sentiment.toLowerCase().includes('fear') ? '😨' :
                             sentiment.toLowerCase().includes('greed') ? '😍' :
                             sentiment.toLowerCase().includes('fomo') ? '😰' :
                             sentiment.toLowerCase().includes('panic') ? '😱' : '😐';
      message += `\n• المشاعر: ${sentimentEmoji} ${sentiment}`;
    }
    
    // 【تحسين 2: دمج شرح قائم على الأدلة لـ"استراتيجية الانتظار 70%"】ربط Evidence و Mental Note
    // إضافة شرح حتى في المخاطر المنخفضة (لتوفير القيمة)
    if (trapScore !== null) {
      const trapScoreRounded = Math.round(trapScore);
      const marketScore = score ?? marketData?.score ?? null;
      const marketScoreRounded = marketScore !== null ? Math.round(marketScore) : null;
      const isBullish = marketScoreRounded !== null && marketScoreRounded >= 50;
      const isLowTrapRisk = trapScoreRounded < 30;
      
      message += `\n\n💡 رؤى استراتيجية`;
      if (trapScoreRounded >= 70) {
        message += `\n  🚨 Trap Score ${trapScoreRounded}/100: إشارات قوية تشير إلى فخاخ سوق محتملة`;
        message += `\n  🛡️ الاستعداد الاستراتيجي ليس ضعفاً—إنه استعداد للنصر. مارس الحذر الشديد`;
      } else if (trapScoreRounded >= 50) {
        message += `\n  ⚡ Trap Score ${trapScoreRounded}/100: تم اكتشاف مؤشرات فخ متوسطة`;
        message += `\n  🛡️ مارس الحذر. راقب ظروف السوق عن كثب قبل اتخاذ إجراء`;
      } else {
        // مخاطر منخفضة: رسالة حسب ظروف السوق
        if (isLowTrapRisk && isBullish) {
          // مخاطر منخفضة وصاعدة: رسالة أكثر نشاطاً
          message += `\n  ✅ Trap Score ${trapScoreRounded}/100: تم اكتشاف مخاطر فخ منخفضة`;
          message += `\n  📈 ظروف السوق تبدو مواتية (النقاط: ${marketScoreRounded}/100). راقب فرص الدخول الواضحة`;
          message += `\n  💡 مخاطر منخفضة + زخم صاعد = ظروف مواتية. ابق متيقظاً لإعدادات الجودة`;
        } else if (isLowTrapRisk) {
          // مخاطر منخفضة لكن محايدة/هابطة: رسالة دفاع قياسية
          message += `\n  ✅ Trap Score ${trapScoreRounded}/100: مخاطر فخ منخفضة حالياً`;
          message += `\n  🛡️ ظروف السوق مستقرة. حافظ على الانضباط وانتظر فرص عالية الجودة`;
          message += `\n  💡 الصبر يؤتي ثماره. إعدادات الجودة تتطلب مخاطر منخفضة واتجاه سوق واضح`;
        } else {
          // Fallback (إذا لم يتم الحصول على النقاط)
          message += `\n  ✅ Trap Score ${trapScoreRounded}/100: مخاطر فخ منخفضة حالياً، لكن الأسواق تتغير دائماً`;
          message += `\n  🛡️ حافظ على الانضباط. راقب الظروف وانتظر إشارات واضحة`;
        }
      }
    }
  }

  // الخطوة 3: الحل (What to Avoid)
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 ما يجب تجنبه
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // الخطوة 4: النهاية الناجحة (تعليق Dr. Grok + Mental Note)
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 رؤية سريعة من Dr. Grok
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // Mental Note
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ Mental Note
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }

  // CTA (تحسين الـupsell: CTA مع إلحاح لضمان أموال التطوير)
  // VSL2 ورابط Whop يتم توزيعهما بشكل منفصل، لذلك لا يتم تضمينهما في Minimal Briefing العادي
  // تحسين بناءً على تقييم GPT: رسائل ديناميكية بناءً على Trap Score
  
  // تغيير رسالة CTA ديناميكيًا بناءً على Trap Score
  const trapScoreRounded = trapScore !== null ? Math.round(trapScore) : null;
  let ctaHeadline = '';
  let ctaUrgency = '';
  
  if (trapScoreRounded !== null && trapScoreRounded >= 50) {
    // خطر متوسط أو عالي: التأكيد على الإلحاح
    ctaHeadline = '🚨 قم بالترقية الآن: احصل على تنبيهات الفخاخ في الوقت الفعلي قبل فقدان رأس المال';
    ctaUrgency = '⚠️ في هذه اللحظة، يتم اكتشاف إشارات الفخ. المستخدمون المجانيون يرون النتيجة فقط—أنت تحتاج إلى نظام الدفاع الكامل لحماية رأس مالك.';
  } else {
    // خطر منخفض: التأكيد على عرض القيمة
    ctaHeadline = '🚀 قم بالترقية الآن: احصل على إشارات التداول التفصيلية والتنبيهات في الوقت الفعلي';
    ctaUrgency = '💡 خطر منخفض الآن، لكن الأسواق تتغير بسرعة. قم بالترقية للحصول على تنبيهات فورية عند تشكل الفخاخ.';
  }
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
${ctaHeadline}

${ctaUrgency}

✨ ما يحصل عليه الأعضاء الكاملون (ما تفقده):

🎯 تنبيهات الفخاخ في الوقت الفعلي
• إشارات AVOID-LONG / AVOID-SHORT / STANDBY (إشعارات فورية)
• دليل خريطة الخروج (معرفة متى تخرج بالضبط)
• تنبيهات NO TRADE (تجنب الخسائر قبل حدوثها)

📊 تقرير الاستخبارات الكامل
• تحليل on-chain كامل (جميع المؤشرات في الوقت الفعلي)
• رؤى السوق المدعومة بالذكاء الاصطناعي وكشف الفخاخ (مراقبة على مدار الساعة)
• تحليل مشاعر X في الوقت الفعلي (توقع مشاعر السوق)

💊 الدعم النفسي الكامل من Dr. Grok
• حل العوائق العقلية (التغلب على FOMO، الخوف، الجشع)
• دليل التدريب العقلي المخصص
• تشخيص الحالة النفسية

💎 كل هذا مصمم لحماية رأس مالك

📊 النسخة المجانية مقابل النسخة الكاملة
• مجاني: Trap Score فقط (تلميح اتجاهي)
• كامل: جميع البيانات + تنبيهات في الوقت الفعلي (خطة عمل محددة)

🛡️ إشارة واحدة فائتة يمكن أن تحدد ما إذا كنت تحمي أو تفقد رأس مالك

🎯 قم بالترقية الآن واحصل على نظام الدفاع الكامل

━━━━━━━━━━━━━━━━━━━━
هذا تقرير مجاني. للتحليل المفصل وتنبيهات الفخ، قم بالترقية إلى Trap Defence BTC

لأغراض تعليمية فقط. ليست نصيحة مالية`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
