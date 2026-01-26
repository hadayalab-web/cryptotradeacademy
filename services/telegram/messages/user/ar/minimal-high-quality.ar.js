// دالة تنسيق النص لتوزيع Telegram الإصدار الأدنى المجاني عالي الجودة
// services/telegram/messages/user/ar/minimal-high-quality.ar.js
// Trap Score + تحليل مبسط + تعليق مبسط من Dr. Grok + Mental Note

/**
 * الحصول على hook Trap Score（ネイティブ調、ドバイ/湾岸系）
 */
function getTrapScoreHook(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'جاري حساب Trap Score… انتظر شوي.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'جاري حساب Trap Score… انتظر شوي.';
  }

  if (score >= 70) {
    return 'لا تتداول بسرعة. احم رأس المال. وضع الدفاع نشط.';
  } else if (score >= 50) {
    return 'منطقة مختلطة. انتظر التأكيد قبل الدخول.';
  } else if (score >= 30) {
    return 'الشموع تخوّف… بس البيانات ما تقول "خطر".';
  } else {
    return 'شكله مخيف… بس البيانات ما تعطيك "فخ واضح" (لحد الآن). لا ترخي حذرك.';
  }
}

/**
 * إنشاء What to Avoid（الإجراءات التي يجب تجنبها）
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 50) {
    return null;
  }

  const avoidItems = [];
  
  // استخراج الإجراءات التي يجب تجنبها من Trap Data
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('تجنب LONG — وضع الدفاع نشط');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('تجنب SHORT — وضع الدفاع نشط');
      }
    }
  }

  // الإجراءات الافتراضية التي يجب تجنبها（ネイティブ調）
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('لا تتداول بسرعة — احم رأس المال');
      avoidItems.push('انتظر إشارات أوضح');
    } else if (trapScore >= 50) {
      avoidItems.push('منطقة مختلطة — انتظر التأكيد');
      avoidItems.push('فرص دخول أفضل قادمة');
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
        // التدفق الخارجي: ネイティブ調な表現
        evidenceItems.push(`Netflow: **${absValue.toFixed(0)} BTC خروج** → أقل ضغط بيع فوري`);
      } else if (netflow > 0) {
        // التدفق الداخلي: ネイティブ調な表現
        evidenceItems.push(`Netflow: **+${absValue.toFixed(0)} BTC دخول** → ضغط بيع محتمل`);
      } else {
        evidenceItems.push(`Netflow: متوازن`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → راقب، لكن لا تدخل في ذعر`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → ضغط معتدل`);
      } else {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → نطاق طبيعي`);
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

  // الدليل الافتراضي (إذا لم تكن هناك بيانات, ネイティブ調)
  if (evidenceItems.length === 0) {
    evidenceItems.push('في on-chain ما في فخ قوي');
  }

  return evidenceItems.slice(0, 2); // الحد الأقصى 2
}

/**
 * إنشاء تعليق مبسط من Dr. Grok
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 30) {
    // Trap Score منخفض: 認知的不協和と油断の警告（ネイティブ調、ドバイ/湾岸系）
    const lowRiskMessages = [
      '"رأسك يريد البيع عشان يوقف الانزعاج من الشموع الحمراء. لا تخلط القلق مع الواقع. الفخ مو الهبوط: هو الخروج بالاندفاع."',
      '"الشموع تخوّف… بس البيانات ما تقول "خطر". السكور ممكن يقفز بسرعة—خصوصاً وأنت نايم."',
      '"الجزء اللي ما أحد يتكلم عنه: 0/100 ممكن يخليك واثق زيادة. الفخاخ الكبيرة تبنى في الهدوء."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"لا تتداول بسرعة. احم رأس المال. وضع الدفاع نشط. هذا هو الوقت الأكثر خطورة."');
  } else if (trapScore >= 50) {
    comments.push('"منطقة مختلطة. انتظر التأكيد. الدفاع أولاً. لا تستعجل."');
  } else {
    comments.push('"يبدو مخيف، البيانات تقول نظيف (لحد الآن). لا تخلط القلق مع واقع السوق."');
  }

  // تعليق إضافي من Sentiment Data（ネイティブ調）
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"السوق يبدو عاطفي. هنا تحدث الفخاخ. النقد أيضاً موقف."');
    } else if (sentimentData.sentiment === 'FEAR') {
      comments.push('"الخوف طبيعي. لكن لا تخلط الشموع الحمراء مع الخطر الحقيقي."');
    }
  }

  return comments[0] || null;
}

/**
 * إنشاء Mental Note
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"النقد أيضاً موقف."',
    '"لا تخلط الشموع الحمراء مع الخطر الحقيقي."',
    '"الصبر يؤتي ثماره. أفضل الفرص تأتي عندما يكون الخطر منخفضاً والاتجاه واضحاً."',
    '"الدفاع هو أعلى شكل من أشكال الهجوم. حماية رأس المال هي حيث يبدأ كل شيء."',
    '"معظم حركات السوق ضوضاء. تفاعل فقط مع الإشارات الواضحة."',
    '"الملل أيضاً موقف. حفظ رأس المال قيد التنفيذ."',
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

  // GPT設計書に完全準拠: 4-post thread形式（Telegram用に1メッセージに統合）
  const change24hFormatted = change24h != null ? (change24h >= 0 ? `+${change24h.toFixed(2)}` : change24h.toFixed(2)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || 'خوف شديد';
  const sentimentLabelAr = sentimentLabel === 'Extreme Fear' ? 'خوف شديد' :
                           sentimentLabel === 'Fear' ? 'خوف' :
                           sentimentLabel === 'Greed' ? 'جشع' :
                           sentimentLabel === 'FOMO' ? 'FOMO' : 'محايد';
  // trapScoreRoundedは上で既に定義済み
  
  // [1/4] Hook: Fear vs Trap Score contradiction + immediate action
  let message = `[1/4] 🚨 Hook
━━━━━━━━━━━━━━━━━━━━`;
  
  if (scoreDisplay === 'N/A') {
    message += `\n🚨 BTC نازل (${change24hFormatted}%) والناس على **${sentimentLabelAr}**…
لكن Trap Score جاري حسابه… خلّك هادي. لا تستعجل.`;
  } else {
    message += `\n🚨 BTC نازل (${change24hFormatted}%) والناس على **${sentimentLabelAr}**…
لكن Trap Score عندنا **${scoreDisplay}/100**.`;
  }
  
  message += `\n\nهذي لحظة "الإحساس ضد البيانات". خلّنا نفصلها بسرعة.`;

  // [2/4] Quick reads (2 bullets max, trader interpretation)
  message += `\n\n[2/4] 📊 مختصر ومفيد
━━━━━━━━━━━━━━━━━━━━`;
  
  // Exchange netflow（ネイティブ調）
  if (trapData?.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
    const netflow = trapData.exchangeNetflow;
    const absValue = Math.abs(netflow);
    if (netflow < 0) {
      message += `\n• صافي التدفق: **${absValue.toFixed(0)} BTC خروج** → عملات تطلع من المنصات`;
    } else if (netflow > 0) {
      message += `\n• صافي التدفق: **+${absValue.toFixed(0)} BTC دخول** → ضغط بيع محتمل`;
    }
  }
  
  // MPI
  if (marketData?.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    message += `\n• مؤشر المعدّنين (MPI): **${mpi.toFixed(2)}** → المعدّنون مو مستعجلين على البيع`;
  }
  
  message += `\n\nالشموع الحمراء تخوّف… بس مو دايم يعني فخ.`;

  // [3/4] Psych coaching: latency anxiety (低スコア時の認知的不協和)
  message += `\n\n[3/4] 🧠 توجيه نفسي
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapScoreRounded == null) {
    message += `\nالسكور جاري حسابه. لين يطلع، لا تستعجل.`;
  } else if (trapScoreRounded < 30) {
    message += `\nالجزء اللي ما أحد يتكلم عنه: **${trapScoreRounded}/100 (مثل 0/100) ممكن يخلّيك ترتاح زيادة.**\nكثير من الفخاخ تنبني وقت الهدوء.\n\nولو قفز Trap Score وأنت نايم، النسخة المجانية ما تلحق **نافذة الـ15 دقيقة**—هذي النافذة ممكن تقلب القرار.`;
  } else if (trapScoreRounded < 50) {
    message += `\nالشموع تخوّف… بس البيانات ما تقول "خطر".\nوظيفتك هنا: لا تخلط الخوف مع الإشارة.\n\n(مع ذلك: لو انقلب وأنت نايم، المجاني يفوّت عليك نافذة الـ15 دقيقة.)`;
  } else {
    message += `\nدفاع نشط. لا تخلط بين الشموع الحمراء والواقع. الفخ مو النزول—الفخ هو الخروج المتسرّع.`;
  }
  
  // [4/4] Poll + question + soft CTA (GPT設計書に完全準拠)
  message += `\n\n[4/4] 🗳️ تصويت + سؤال + CTA
━━━━━━━━━━━━━━━━━━━━
تصويت: Trap Score ${scoreDisplay === 'N/A' ? '(جاري الحساب)' : `**${scoreDisplay}/100**`} — ما خطتك؟
A) احتفاظ
B) شراء هبوط
C) تخفيف/بيع
D) انتظار تأكيد

اكتب لنا: سكالب ولا سوينغ؟

إذا تبغى تنبيهات لحظية؟ رد بكلمة **TRAP** وبرسل لك الرابط على الخاص. #BTC #Bitcoin #TrapDefence`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
