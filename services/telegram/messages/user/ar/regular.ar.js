// Tier1 BTC regular briefing (AR)
// services/telegram/messages/user/ar/regular.ar.js

const { hasJapanese, filterJapaneseFromArray, cleanTimingInfo, hasJapaneseInPsychologicalInsights, formatViralScore } = require('../../shared/contentFilters');

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * アラビア語の心理的アドバイスを取得（日本語が含まれている場合のフォールバック）
 * @param {string} psychologicalState - 心理状態
 * @param {string} psychologicalRisk - リスクレベル
 * @returns {string} アラビア語のアドバイス
 */
function getArabicPsychologicalAdvice(psychologicalState, psychologicalRisk) {
  if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'LOW') {
    return '✅ حالة محايدة - لم يتم اكتشاف عوائق عقلية: مشاعر السوق متوازنة. لم يتم اكتشاف مشاعر متطرفة. الظروف مستقرة.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'MEDIUM') {
    return '⚠️ حالة محايدة - راقب عن كثب: مشاعر السوق متوازنة لكن الظروف قد تتغير. ابق متيقظاً.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'HIGH') {
    return '🚨 حالة محايدة - مخاطر عالية: هذه المشاعر "المحايدة" قد تخفي ظروف فخ. حافظ على الانضباط.';
  } else if (psychologicalState === 'FOMO') {
    return '🚨 تم اكتشاف FOMO - ضغط شراء شديد: المتداولون الصغار يطاردون بينما الحيتان قد توزع. هذا نمط فخ كلاسيكي.';
  } else if (psychologicalState === 'FEAR') {
    return '😨 تم اكتشاف الخوف - السوق يظهر اهتماماً صغيراً من المتداولين: الخوف قد يكون شللاً، لكنه قد يشير أيضاً إلى فرص محتملة.';
  } else if (psychologicalState === 'GREED') {
    return '😍 تم اكتشاف الجشع - ظروف نشوة: الجشع هو المشاعر الأكثر خطورة في التداول. فكر في جني الأرباح.';
  } else if (psychologicalState === 'PANIC') {
    return '😱 تم اكتشاف الذعر - خوف شديد: الذعر هو لوزة المخ لديك تختطف قشرة الفص الجبهي. توقف. تنفس. تحقق من البيانات.';
  } else if (psychologicalState === 'EUPHORIA') {
    return '😄 تم اكتشاف النشوة - احتفال السوق: النشوة هي طريقة السوق لجعلك تنسى المخاطر. حافظ على الانضباط.';
  } else if (psychologicalState === 'CONFUSION') {
    return '🤔 تم اكتشاف الارتباك - إشارات غير واضحة: الارتباك هو دماغك يطلب الوضوح. لا تجبر عملية. عند الشك، انتظر.';
  }
  
  // デフォルト
  return 'ظروف السوق مستقرة نسبياً. حافظ على الانضباط وانتظر إعدادات الجودة.';
}

function extractPayloadFromSnapshot(snapshot, lang = 'ar', opts = {}) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const raw = snapshot.raw || {};
  const cqDeep = snapshot.cqDeep || {};
  const td = snapshot.trapDetection || {};
  const asOf = snapshot.as_of_utc || new Date().toISOString();
  const now = typeof asOf === 'string' ? new Date(asOf) : asOf;
  return {
    now, inflow: raw.inflow ?? cqDeep.exchangeNetflow ?? 0, mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0,
    sentimentLabel: raw.sentimentLabel ?? 'غير معروف', priceUsd: raw.priceUsd ?? null, change24h: raw.change24h ?? null,
    score: snapshot.market_score ?? 0, tradeSignal: snapshot.tradeSignal || { signal: 'STANDBY', tp: null, sl: null, rr: null },
    trap: td.trapDetected ? { isTrap: true, label: td.label ?? 'Trap', confidence: td.trapSeverity ?? 'MEDIUM' } : { isTrap: false, label: 'No trap', confidence: 'LOW' },
    aiAnalysis: snapshot.drGrok?.base ?? (typeof snapshot.gptStructureReasoning === 'string' ? snapshot.gptStructureReasoning : null),
    stats: null, trapScore: cqDeep.trapScore ?? td.trapScore ?? null, whaleFlows: cqDeep.whaleFlows ?? null, liquidations: cqDeep.liquidations ?? null,
    noTradeAlert: null, trapRisk: null, exitMap: null, trapDetection: td, marketBug: opts.marketBug ?? null, trapAlert: snapshot.trapAlert ?? null,
    divergenceSignal: snapshot.divergenceSignal ?? null, psychologicalSupport: opts.psychologicalSupport ?? null,
    hasGeminiContent: !!(snapshot.sosovalueArticle && snapshot.sosovalueArticle.trim()), sosovalueArticle: snapshot.sosovalueArticle ?? null,
    gptReporterAnalysis: snapshot.gptStructureReasoning ?? null, grokXAnalysis: opts.grokXAnalysis ?? snapshot.highResX ?? null,
    riskReward: cqDeep.riskReward ?? null, nupl: cqDeep.longTerm?.nupl ?? cqDeep.nupl ?? null, sopr30d: cqDeep.longTerm?.sopr30d ?? cqDeep.sopr30d ?? null,
    kimchiPremium: cqDeep.kimchiPremium ?? null, upbitPrice: cqDeep.upbitPrice ?? null
  };
}

function formatRegularBriefing(snapshotOrPayload, lang = 'ar', opts = {}) {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') return '🌤️ Trap Defence BTC - Regular Briefing — لا توجد بيانات لقطة.';
  const isSnapshot = snapshotOrPayload.raw != null;
  if (isSnapshot) {
    const payload = extractPayloadFromSnapshot(snapshotOrPayload, lang, opts);
    if (!payload) return '🌤️ Trap Defence BTC - Regular Briefing — لقطة غير صالحة.';
    return formatRegularBriefingCore(payload);
  }
  return formatRegularBriefingCore(snapshotOrPayload);
}

function formatRegularBriefingCore({
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
  trapScore, // Phase 2: トラップスコア（ENと同様）
  // Phase1-Product: 新機能データ
  noTradeAlert, // NO TRADEアラート結果
  trapRisk, // Trap Riskスコア結果
  exitMap, // Exit Map結果
  // USP1: トラップ防御結果
  trapDetection, // トラップ防御結果（優先）
  marketBug, // トラップ防御結果（後方互換性）
  trapAlert, // トラップアラート
  divergenceSignal, // ダイバージェンスシグナル
  // USP3: Dr. Grokの心理的サポート
  psychologicalSupport, // 心理的サポート診断結果
  // USP2: Geminiコンテンツ生成
  hasGeminiContent = false, // Gemini画像・動画が生成されたかどうか
  // ニュース番組構造用パラメータ
  gptReporterAnalysis, // GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
  grokXAnalysis, // Grok X解析結果（Xセンチメント分析）
  // GrokとGeminiの統合最適化結果
  sosovalueArticle = null, // Gemini: CQ+過去比較SoSoValue風記事
  integratedOptimization = null, // 廃止
  // Phase 2: 市場別深掘りデータ
  whaleFlows, // Whale Flows（ENと同様）
  liquidations = null, // ENと同様（24h清算）
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 سعر BTC: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 صافي تدفق البورصات: ${flowDir} ${flowAbs.toFixed(0)} BTC${inflow < 0 ? ' — الحائزون يحتفظون بالأصول' : ' — ضغط بيع محتمل'}`;
  const mpiLine = `⛏ مؤشر مراكز المعدّنين (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 المشاعر: ${sentimentLabel || 'غير معروف'}`;

  // Market Scoreの解釈補助を追加
  const marketScore = Math.round(score ?? 0);
  let scoreInterpretation = '';
  if (marketScore >= 50) {
    scoreInterpretation = ' (صاعد)';
  } else if (marketScore >= 20) {
    scoreInterpretation = ' (محايد/مستقر)';
  } else if (marketScore >= -20) {
    scoreInterpretation = ' (محايد/مستقر)';
  } else if (marketScore >= -50) {
    scoreInterpretation = ' (هابط)';
  } else {
    scoreInterpretation = ' (هابط جداً)';
  }
  const scoreLine = `📈 درجة السوق: ${marketScore}/100${scoreInterpretation}`;

  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;

  let trapLine = '✅ كاشف الفخاخ: لا توجد فخاخ حرجة مكتشفة';
  if (trapDetection && trapDetection.trapDetected) {
    const trapSev = trapDetection.trapSeverity || 'NONE';
    const trapSc = trapDetection.trapScore || 0;
    if (trapSev !== 'NONE' && trapSc > 0) {
      const trapEmoji = trapSev === 'CRITICAL' ? '🚨' : trapSev === 'HIGH' ? '⚠️' : trapSev === 'MEDIUM' ? '⚡' : '💡';
      const trapTypeLabel = (trapDetection.trapType || 'فخ').replace(/_/g, ' ');
      trapLine = `${trapEmoji} كاشف الفخاخ: ${trapTypeLabel} (الشدة: ${trapSev}, النقاط: ${trapSc}/100)`;
    }
  } else if (trap?.isTrap) {
    trapLine = `🧨 كاشف الفخاخ: ${trap.label || 'فخ محتمل'} (${trap.confidence} مستوى ثقة)`;
  }

  let dirEmoji;
  let dirLabel;
  if (hasActiveTrapAlert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ تنبيه الفخ: تجنب الشراء الطويل';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ تنبيه الفخ: تجنب البيع القصير';
    } else {
      dirLabel = '🛡️ تنبيه الفخ: انتظار';
    }
  } else if (isLowTrapRisk) {
    dirEmoji = '📐';
    dirLabel = 'انخفاض مخاطر الفخ — نافذة وضع المراكز';
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isPositioningWindow = isLowTrapRisk && !hasActiveTrapAlert;
  const entryPrice = priceUsd;
  const tpPrice = tradeSignal?.tp;
  const slPrice = tradeSignal?.sl;
  const isNoTradeZone = !isPositioningWindow && (
    (tpPrice == null && slPrice == null) ||
    (entryPrice === tpPrice && entryPrice === slPrice)
  );
  const entryLine = isPositioningWindow
    ? `• الدخول: فكّر في صفقات نوعية عندما تكون الأفضلية واضحة (مرجع ${formatUsd(priceUsd)})`
    : (!isLowTrapRisk && !hasActiveTrapAlert
      ? '• الدخول: الاستعداد للنصر — انتظار محفز واضح'
      : `• سعر الدخول (مرجع سبوت): ${formatUsd(priceUsd)}`);
  const tpLine = isPositioningWindow
    ? '• Take Profit: حدد مستواك (قبل الدخول)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: TBD (سيتم تحديده)');
  const slLine = isPositioningWindow
    ? '• Stop Loss: حدد قبل الدخول'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: TBD (سيتم تحديده)');
  const rrLine = tradeSignal?.rr != null ? `• نسبة المخاطرة إلى العائد (RR): ${tradeSignal.rr.toFixed(2)}` : (isPositioningWindow ? '• نسبة المخاطرة إلى العائد (RR): حدد حسب الصفقة' : '• نسبة المخاطرة إلى العائد (RR): انتظار');
  const modeLine = isPositioningWindow
    ? '• الوضع: انخفاض مخاطر الفخ — يمكن وضع مراكز long/short مع مخاطرة محددة. الرافعة فقط عندما تكون الأفضلية واضحة.'
    : (!isLowTrapRisk ? '• الوضع: Trap Standby — انتظر أفضلية واضحة. أولوية للدفاع' : '');

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok غير متصل حالياً (يتم الاعتماد فقط على إشارات النظام: on-chain/السعر).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  let grokDisplaySource = grokXAnalysis;
  if (grokXAnalysis && typeof grokXAnalysis === 'object') {
    grokDisplaySource = grokXAnalysis.xEngineReport || grokXAnalysis.summary || null;
  }
  const hasGrokData = grokDisplaySource && typeof grokDisplaySource === 'string' && grokDisplaySource.trim();
  const isGrokOffline = !hasGrokData || /grok offline|live search unavailable|data unavailable/i.test(grokDisplaySource || '');

  const sentimentLabelLower = (sentimentLabel || '').toLowerCase();

  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - تقرير منتظم');
  if (isHighTrapForHeader) {
    lines.push(`🚨 تنبيه Trap Defence — مخاطر فخ ${trapSeverityForHeader}`);
  } else {
    lines.push('📋 بريفينغ Trap Defence');
  }
  lines.push(`📅 ${ts}`);
  lines.push('CQ × X × 3AI — تقرير الهيكل خلف الكواليس');
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📡 رادار حالة السوق');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const trapScoreRadar = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : null;
  const trapRiskLabelRadar = trapScoreRadar != null
    ? (trapScoreRadar < 30 ? 'مخاطر منخفضة' : trapScoreRadar >= 50 ? 'مخاطر عالية' : 'متوسطة')
    : 'N/A';
  const cqRiskText = inflow >= 0
    ? 'تدفق داخلي مرتفع للبورصات → العرض يعود للسوق، ضغط بيع قصير المدى'
    : `تدفق خارجي ${Math.abs(inflow || 0).toFixed(0)} BTC → الحائزون يؤمنون الأصول`;
  const volatilityMode = sentimentLabelLower.includes('fear') || sentimentLabelLower.includes('panic') || /خوف|ذعر|فزع/.test(sentimentLabelLower)
    ? 'مرحلة توسع (تقلبات مدفوعة بالذعر)'
    : sentimentLabelLower.includes('greed') || /جشع|نشوة/.test(sentimentLabelLower) ? 'مرحلة توسع (مدفوعة بالنشوة)' : 'استقرار';
  const liquidityRegimeText = inflow >= 0
    ? 'سيولة بيع كثيفة أسفل السعر؛ سيولة ضعيفة فوق السعر'
    : 'تراكم شراء؛ إعادة موازنة السيولة';
  lines.push(`• Trap Score: ${trapScoreRadar != null ? trapScoreRadar + '/100 (' + trapRiskLabelRadar + ')' : 'N/A'}`);
  lines.push(`• CQ Risk: ${cqRiskText}`);
  lines.push(`• X Sentiment: ${hasGrokData && !isGrokOffline ? 'متاح' : 'بيانات ناقصة → تفسير على أنها "صمت المشاعر" (عدم يقين مرتفع)'}`);
  lines.push('• Macro Pressure: Risk-off مهيمن');
  lines.push(`• Liquidity Regime: ${liquidityRegimeText}`);
  lines.push(`• Volatility Mode: ${volatilityMode}`);
  lines.push('');
  lines.push('### Key Metrics');
  lines.push(`• BTC Price: ${formatUsd(priceUsd)}`);
  lines.push(`• Netflow: ${inflow >= 0 ? '+' : ''}${(inflow || 0).toFixed(0)} BTC`);
  lines.push(`• MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push(`• Sentiment: ${sentimentLabel || 'غير معروف'}`);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🔬 الهيكل خلف الكواليس');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // GPT CQ Engine
  // エラーメッセージやnullの場合は、フォールバック処理
  let gptNewsText = gptReporterAnalysis || aiAnalysis || null;
  if (gptNewsText != null && typeof gptNewsText !== "string") {
    console.warn("[REGULAR] gptNewsText is not a string (type: " + typeof gptNewsText + "), using empty");
    gptNewsText = "";
  }
  // エラーメッセージを検出（API error, unavailable, error等のキーワード）
  if (gptNewsText && typeof gptNewsText === 'string') {
    const errorKeywords = ['api error', 'unavailable', 'error', 'failed', 'timeout'];
    const isError = errorKeywords.some(keyword => 
      gptNewsText.toLowerCase().includes(keyword)
    );
    if (isError) {
      gptNewsText = null; // エラーメッセージの場合はnullに設定してフォールバック
    } else {
      // AR市場用: アラビア語以外の言語が混入している場合を検出（Extended-A・Supplement含む）
      const hasArabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(gptNewsText);
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      const hasEnglishOnly = !hasArabicChars && !hasJapaneseChars && gptNewsText.length > 50;
      const longEnoughToWarn = gptNewsText.length > 80;
      if (hasJapaneseChars || (hasEnglishOnly && !hasArabicChars)) {
        gptNewsText = null;
        if (longEnoughToWarn) {
          console.log('[Regular AR] Using Arabic fallback (GPT analysis was not in Arabic).');
        }
      } else if (!hasArabicChars && gptNewsText.length > 50) {
        gptNewsText = null;
      }
    }
  }
  
  if (!gptNewsText || String(gptNewsText || "").trim() === '') {
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    gptNewsText = `## 2-1. Whale Intent (استنتاج هيكلي)
${inflow >= 0 ? 'الحيتان تبدو تمتص العرض في مناطق الذعر، تاركة السعر يسقط نحو جيوب السيولة قبل التراكم بصمت.' : 'تدفقات الحيتان تشير إلى أن الحائزين يؤمنون الأصول. التدفق الخارجي يشير إلى تراكم أو إعادة موازنة.'}

## 2-2. Algo Behavior Patterns
الخوارزميات تستغل مناطق سيولة ضعيفة ناتجة عن مبيعات عاطفية. الأنماط تُظهر مطاردات سيولة متزامنة متبوعة بعودة للمتوسط—أنظمة آلية تحصد السيولة قبل إعادة ضبط السعر.

## 2-3. Retail Psychological Distortion
مشاعر التجزئة تهيمن عليها ${sentimentLabel || 'محايدة'}. إن نَقصت بيانات X، "صمت المشاعر" ذو مغزى: انفصال التجزئة غالباً يسبق توسع التقلبات.

## 2-4. Liquidity Map
${inflow >= 0 ? 'سيولة بيع كثيفة أسفل السعر من مبيعات إجبارية وتوزيع المعدّنين (MPI ' + mpiDisplay + '). فوق السعر، سيولة ضعيفة—التحرك الصاعد قد يتسارع إذا انعكست التدفقات الداخلة.' : 'تراكم شراء ظاهر. إعادة موازنة السيولة جارية.'}`;
  }
  gptNewsText = gptNewsText.replace(/(\*\*Scenario Map\*\*|## Scenario Map|Scenario Map\s*\().*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Trap Defence Value\*\*.*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent \(structural inference( only)?\)\*\*/g, '## 2-1. Whale Intent (استنتاج هيكلي)');
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent\*\*(?!\s*\()/g, '## 2-1. Whale Intent');
  gptNewsText = gptNewsText.replace(/\*\*Algo Behavior Patterns\*\*/g, '## 2-2. Algo Behavior Patterns');
  gptNewsText = gptNewsText.replace(/\*\*Retail Psychological Distortion\*\*/g, '## 2-3. Retail Psychological Distortion');
  gptNewsText = gptNewsText.replace(/\*\*Liquidity Map\*\*/g, '## 2-4. Liquidity Map');
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+(?!2-[1-4]\.)/gm, '')
    .replace(/^#\s+(?!2-[1-4]\.)/gm, '');
  gptNewsDisplay = gptNewsDisplay.replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 التفسير النفسي لمقاييس On-Chain');
  const gptNewsLimit = 1400;
  if (gptNewsDisplay.length > gptNewsLimit) {
    // 文の終わりで切るようにする（最後の文の終わりを探す）
    const truncated = gptNewsDisplay.slice(0, gptNewsLimit);
    // 文の終わりを探す（ピリオド、感嘆符、疑問符、改行）
    const sentenceEnds = [
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('.\n'),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('!\n'),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('?\n'),
      truncated.lastIndexOf('\n\n'),
      truncated.lastIndexOf('\n')
    ].filter(pos => pos !== -1);
    
    const lastSentenceEnd = sentenceEnds.length > 0 ? Math.max(...sentenceEnds) : -1;
    
    // 文の終わりが見つかった場合、その位置で切る（50%以上の場合のみ）
    if (lastSentenceEnd > gptNewsLimit * 0.5) {
      // 文の終わりの後にスペースがある場合は、その位置で切る
      const endPos = truncated[lastSentenceEnd + 1] === ' ' ? lastSentenceEnd + 1 : lastSentenceEnd;
      gptNewsDisplay = truncated.slice(0, endPos) + '…';
    } else {
      // 文の終わりが見つからない場合、単純に切る
      gptNewsDisplay = truncated + '…';
    }
  }
  lines.push(gptNewsDisplay);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📐 هيكل BTC الحالي');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const currentStructureNote = inflow >= 0 && (sentimentLabelLower.includes('fear') || /خوف|ذعر/.test(sentimentLabelLower))
    ? 'BTC في "مرحلة إطلاق عرض مدفوعة بالذعر". ليست انعكاس اتجاه—إنها إعادة تكوين السيولة.'
    : inflow >= 0
      ? 'العرض يعود للبورصات. الهيكل يشير إلى مرحلة توزيع أو امتصاص.'
      : 'الحائزون يؤمنون الأصول. الهيكل يشير إلى تراكم أو تراجع.';
  lines.push(`• Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`);
  lines.push(`• Structural meaning: ${currentStructureNote}`);
  const keyLevelsNote = inflow >= 0
    ? `• Netflow: +${Math.abs(inflow).toFixed(0)} BTC → العرض يتحرك للبورصات`
    : `• Netflow: −${Math.abs(inflow).toFixed(0)} BTC → الحائزون يؤمنون الأصول`;
  lines.push(keyLevelsNote);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🗺️ خريطة السيناريوهات');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const scenarioBullets = [];
  if (inflow > 0) {
    scenarioBullets.push(`• استمرار صدمة العرض — تدفق داخلي ${Math.abs(inflow).toFixed(0)} BTC للبورصات قد يحافظ على ضغط البيع`);
  }
  if (mpi != null && mpi > 0.5) {
    scenarioBullets.push(`• ارتفاع ضغط المعدّنين — MPI ${mpi.toFixed(2)} يشير إلى توزيع المعدّنين، مخاطر تقلبات قريبة`);
  }
  const sentimentLower = (sentimentLabel || '').toLowerCase();
  if (sentimentLower.includes('fear') || sentimentLower.includes('panic') || /خوف|ذعر|فزع/.test(sentimentLower)) {
    scenarioBullets.push(`• ذعر التجزئة — مشاعر ${sentimentLabel} قد تدفع الاستسلام أو المبيعات الإجبارية`);
  }
  if (sentimentLower.includes('greed') || sentimentLower.includes('euphoria') || /جشع|نشوة/.test(sentimentLower)) {
    scenarioBullets.push(`• نشوة التجزئة — مشاعر ${sentimentLabel} قد تسبق فخاخ التوزيع`);
  }
  if (trapDetection?.trapDetected || hasActiveTrapAlert) {
    scenarioBullets.push(`• تقلبات مدفوعة بالخوارزميات — ظروف فخ (${trapDetection?.trapType || 'شذوذ'}) قد تطلق صيد السيولة`);
  }
  scenarioBullets.push('• النظام الكلي — تدفقات ETF، سياسة الفائدة، أو صدمات خارجية قد تغير الهيكل');
  scenarioBullets.slice(0, 5).forEach(b => lines.push(b));
  lines.push('');

  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】رسم بياني NanoBanana');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 تحقق من الصورة/الفيديو المرفق!');
    lines.push('');
  }
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapScore != null && trapScore > 0) {
    trapScoreForEvidence = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence != null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 أدلة مبنية على البيانات');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded >= 50;
    if (trapScoreForEvidence != null) {
      if (isHighTrap) {
        lines.push(`🎯 Trap Score ${trapScoreRounded}/100 → مخاطر فخ كبيرة`);
        if (trapTypeForEvidence) lines.push(`⚠️ تم اكتشاف ${(trapTypeForEvidence || '').replace(/_/g, ' ')}`);
        lines.push(`• ارتفاع صافي التدفق → العرض يتحرك للبورصات`);
        lines.push(`• ارتفاع MPI المعدّنين → ضغط التوزيع`);
        lines.push(`• خوف شديد + تباعد السعر → إعداد فخ هيكلي`);
      } else if (isLowTrap) {
        lines.push(`✅ Trap Score ${trapScoreRounded}/100 → مخاطر فخ منخفضة`);
        lines.push(`• الهيكل يشير إلى ضغط صيد سيولة مخفّض`);
      } else {
        lines.push(`⚡ Trap Score ${trapScoreRounded}/100 → مخاطر فخ متوسطة`);
        lines.push(`• هيكل مختلط — ظروف السيولة غير واضحة`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'شذوذ').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (Score: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`• شذوذات on-chain مكتشفة — الهيكل يشير إلى ظروف فخ مرتفعة`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (الشدة: ${trapAlert.severity})`);
      lines.push(`• الهيكل يشير إلى مخاطر فخ مرتفعة`);
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 الرؤية النفسية (Dr. Grok)');
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  if (hasGrokData && !isGrokOffline) {
    if (!hasJapanese(grokDisplaySource)) {
      const grokXLimit = 600;
      let grokXDisplay = grokDisplaySource;
      if (grokDisplaySource.length > grokXLimit) {
        const truncated = grokDisplaySource.slice(0, grokXLimit);
        const lastSentenceEnd = Math.max(
          truncated.lastIndexOf('.'),
          truncated.lastIndexOf('!'),
          truncated.lastIndexOf('?'),
          truncated.lastIndexOf('\n')
        );
        if (lastSentenceEnd > grokXLimit * 0.7) {
          grokXDisplay = truncated.slice(0, lastSentenceEnd + 1) + '…';
        } else {
          grokXDisplay = truncated + '…';
        }
      }
      lines.push(`📱 X Sentiment (Dr. Grok): ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular AR] Japanese characters detected in grokXAnalysis, skipping');
    }
  }
  if (!hasGrokData || isGrokOffline) {
    lines.push('📱 X Sentiment: "صمت المشاعر" — البيانات الناقصة ذات مغزى. عندما يتجمد التجزئة من الخوف، تنخفض المنشورات. السوق يدخل فراغاً نفسياً—ظروف حيث الخوارزميات تتحرك بحرية أكبر.');
    lines.push('');
  }
  
  // Dr. Grok（2ブロック: 心理1行＋行動の盲点1行＋Mental Note短く・断言）
  if (psychologicalSupport && psychologicalSupport.psychologicalState !== 'UNKNOWN') {
    const stateEmoji = psychologicalSupport.psychologicalState === 'FOMO' ? '😰' :
                       psychologicalSupport.psychologicalState === 'FEAR' ? '😨' :
                       psychologicalSupport.psychologicalState === 'GREED' ? '😍' :
                       psychologicalSupport.psychologicalState === 'PANIC' ? '😱' :
                       psychologicalSupport.psychologicalState === 'EUPHORIA' ? '😄' :
                       psychologicalSupport.psychologicalState === 'CONFUSION' ? '🤔' : '😐';
    const riskEmoji = psychologicalSupport.psychologicalRisk === 'CRITICAL' ? '🚨' :
                      psychologicalSupport.psychologicalRisk === 'HIGH' ? '⚠️' :
                      psychologicalSupport.psychologicalRisk === 'MEDIUM' ? '⚡' : '💡';
    const isNeutralLow = psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'LOW';
    lines.push(isNeutralLow
      ? 'الحالة النفسية: محايدة (مخاطر منخفضة)'
      : `💚 الحالة النفسية: ${stateEmoji} ${psychologicalSupport.psychologicalState} (المخاطرة: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    const rawAdvice = psychologicalSupport.psychologicalAdvice || '';
    const hasJapaneseInAdvice = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawAdvice);
    const arabicAdvice = getArabicPsychologicalAdvice(psychologicalSupport.psychologicalState, psychologicalSupport.psychologicalRisk);
    const adviceLine = hasJapaneseInAdvice ? arabicAdvice : (rawAdvice ? rawAdvice.slice(0, 120) + (rawAdvice.length > 120 ? '…' : '') : arabicAdvice);
    lines.push(`   💡 ${adviceLine}`);
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'الدوبامين يطلق = الفخ. 3 أنفاس. الرغبة بالمطاردة = كيمياء، ليست بصيرة. انتظر التراجع.';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = 'الخوف يحمي لكن يشلّ. راجع البيانات، ليس المشاعر.';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = 'النشوة = فخ. حمِّ رأس المال أولاً.';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = 'توقف. تنفس. البيانات تقول مؤقت. لا قرارات في الذعر.';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'تحمل الملل > الرافعة. أغلق الشاشة اليوم.';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = 'الاحتفال = الفخاخ تُمدّ. حافظ على الانضباط.';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = 'لا تجبر صفقة. عند الشك، انتظر.';
    } else {
      mentalNote = 'الصبر = قوة استراتيجية. أفضل المتداولين يعرفون متى لا يتداولون.';
    }
    lines.push(`💊 ملاحظة Dr. Grok العقلية: "${mentalNote}"`);
  } else {
    lines.push('الحالة النفسية: محايدة (مخاطر منخفضة)');
    lines.push('   💡 ظروف السوق مستقرة نسبياً. حافظ على الانضباط.');
    lines.push('💊 ملاحظة Dr. Grok العقلية: "الصبر = قوة استراتيجية. أفضل المتداولين يعرفون متى لا يتداولون."');
  }
  
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 قيمة Trap Defence');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('• وضوح هيكلي — رؤية خلف الكواليس (Whale / Algo / Retail / Liquidity)');
  lines.push('• رؤية نفسية — تشخيص نفسية التجزئة');
  lines.push('• تكامل CQ × X × 3AI — تحليل موحد لميكانيكيات السوق');
  lines.push('');

  lines.push('📋 لقطة');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  const displayTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore;
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 مخاطر عالية' : displayTrapScore >= 40 ? '⚠️ متوسطة' : '✅ منخفضة';
    lines.push(`🎯 درجة الفخ: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
  }
  lines.push('');

  // Phase1-Product: Exit Map表示（簡略化：最大8行）
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ خريطة الخروج');
    lines.push(`   حالة المركز: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} الربح/الخسارة غير المحققة: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 مناطق جني الأرباح:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} المنطقة ${zone.zone}: $${zone.price.toLocaleString()} (خذ ${zone.takeProfitPct}%)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 المنطقة ${zone.zone}: $${zone.price.toLocaleString()} (خذ ${zone.takeProfitPct}%)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ شروط الخروج:');
      const criticalConditions = exitMap.exitMap.exitConditions
        .filter(condition => condition.priority === 'CRITICAL' || condition.priority === 'HIGH')
        .slice(0, 2);
      if (criticalConditions.length === 0) {
        exitMap.exitMap.exitConditions.slice(0, 2).forEach(condition => {
          const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : 
                                condition.priority === 'HIGH' ? '⚠️' : '⚡';
          lines.push(`   ${priorityEmoji} ${condition.condition}`);
        });
      } else {
        criticalConditions.forEach(condition => {
          const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : '⚠️';
          lines.push(`   ${priorityEmoji} ${condition.condition}`);
        });
      }
    }
    
    if (exitMap.exitMap.recommendation) {
      lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
    }
  }
  
  lines.push('');

  lines.push('لأغراض تعليمية فقط. لا يُعدّ هذا نصيحة مالية أو استثمارية.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
