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
  const sentimentLine = `🧠 حالة الشعور في السوق: *${sentimentLabel || 'غير معروف'}*`;

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

  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';

  const lines = [];
  if (isHighTrapForHeader) {
    lines.push(`🚨 تنبيه دفاع الفخ — مخاطر فخ ${trapSeverityForHeader}`);
  } else {
    lines.push('📋 بريفينغ دفاع الفخ');
  }
  lines.push(`📅 ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（最上部に配置） =====
  lines.push('🎯 حكم التداول');
  lines.push(`${dirEmoji} الإشارة: ${dirLabel}`);
  if (isNoTradeZone) {
    lines.push(`• No Trade Zone — الدخول/TP/SL غير محدد. انتظر أفضلية واضحة.`);
  } else {
    lines.push(entryLine);
    if (modeLine) lines.push(modeLine);
    if (tpLine) lines.push(tpLine);
    if (slLine) lines.push(slLine);
    if (rrLine) lines.push(rrLine);
  }
  lines.push('');

  let actionPreview = '';
  if (sosovalueArticle && typeof sosovalueArticle === 'string' && sosovalueArticle.trim()) {
    const firstSentence = sosovalueArticle.split(/[.!?\n]/)[0]?.trim() || sosovalueArticle.trim();
    actionPreview = firstSentence.length > 120 ? firstSentence.slice(0, 117) + '…' : firstSentence;
    if (actionPreview) {
      lines.push('📌 حركتك: ' + actionPreview);
      lines.push('');
    }
  }

  // Context（クジラは数値出さない）
  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40));
    const contextNote = whaleRatioEstimate >= 80
      ? 'جزء كبير من التدفق قد يتحول إلى ضغط بيع. يجدر مراقبته لإدارة المخاطر.'
      : 'جزء كبير من التدفق قد يكون مرتبطاً بالحيتان. يجدر مراقبته لإدارة المخاطر.';
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 السياق');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`درجة السوق: ${Math.round(score)}/100${scoreInterpretation}`);
    lines.push(`صافي تدفق البورصات: +${Math.abs(inflow).toFixed(0)} BTC داخل`);
    lines.push(`المشاعر: ${sentimentLabel}`);
    lines.push('');
    lines.push(contextNote);
    const contextInterpretation = 'Netflow + MPI + المشاعر معاً: Trap Defence يفسر هذه المجموعة كمخاطر فخ مرتفعة — خوف التجزئة + تدفق للبورصات + سلوك المعدّنين.';
    lines.push(`💡 ${contextInterpretation}`);
    lines.push('');
  }

  // ===== 【ハイライト】Trap / CQ / Action の3項目に整理 =====
  lines.push('✨ أبرز اليوم');
  lines.push('');
  const trapData = trapDetection || marketBug;
  const unifiedTrapScore = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : (trapData?.trapScore != null ? Math.round(trapData.trapScore) : null);
  const trapTypeRaw = (trapData?.trapType || trapData?.bugType || 'شذوذ').replace(/_/g, ' ');
  const multiLayerNote = /MULTI\s*LAYER|MULTI_LAYER/i.test(trapTypeRaw) ? ' (شذوذات متعددة مكتشفة في نفس الوقت)' : '';
  const trapOneLine = trapData && (trapData.trapDetected || trapData.bugDetected)
    ? `🛡️ الفخ: ${trapTypeRaw} (${unifiedTrapScore ?? Math.round(trapData.trapScore || trapData.bugScore || 0)}/100)${multiLayerNote}`
    : '🛡️ الفخ: لا فخ مكتشف';
  const trapRiskLabel = isLowTrapRisk ? 'منخفض' : (effectiveTrapScore != null && effectiveTrapScore >= 50 ? 'عالي' : 'متوسط');
  const cqOneLine = inflow >= 0
    ? `📊 CQ: صافي التدفق +${Math.abs(inflow).toFixed(0)} BTC؛ مخاطر الفخ ${trapRiskLabel}.`
    : `📊 CQ: صافي التدفق −${Math.abs(inflow).toFixed(0)} BTC؛ مخاطر الفخ ${trapRiskLabel}.`;
  lines.push(trapOneLine);
  lines.push(cqOneLine);
  lines.push(`📌 الحركة: ${actionPreview || 'انتظر أفضلية واضحة.'}`);
  lines.push('');

  // ===== 【ニュース番組構造】データ → 解説 → コメンテーター =====
  // GPTリポーター: CryptoQuantデータ解析に基づくトラップニュース
  // エラーメッセージやnullの場合は、フォールバック処理
  let gptNewsText = gptReporterAnalysis || aiAnalysis || null;
  
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
  
  // フォールバック: GPT分析が利用できない場合の代替メッセージ
  if (!gptNewsText || gptNewsText.trim() === '') {
    // CryptoQuantデータから基本的な分析を生成
    const inflowDisplay = inflow >= 0 ? `تدفق داخلي ${Math.abs(inflow).toFixed(0)} BTC` : `تدفق خارجي ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    const priceChangeDisplay = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`;
    
    // COO最適化: ストーリーテリング改善
    gptNewsText = `📖 القصة وراء البيانات

بينما أنت نائم، الحيتان تتجهز. هذا ما يحدث الآن:

1. 🏦 البورصات مغمورة: ${inflowDisplay}
   → ${inflow >= 0 ? 'البائعون يحملون. هذا ليس طبيعياً.' : 'الحائزون يؤمنون الأصول. هذا صاعد.'}

2. ⛏️ المعدّنون ${mpi >= 0 ? 'يبيعون' : 'يحتفظون'}: MPI ${mpiDisplay}
   → ${mpi >= 0 ? 'المعدّنون يبيعون. هذا هابط على المدى القصير.' : 'المعدّنون لا يبيعون. هذا صاعد على المدى الطويل.'}

3. 🧠 مشاعر ${sentimentLabel}
   → ${sentimentLabel.toLowerCase().includes('fear') ? 'ذعر التجزئة. هذه فرصة للأموال الذكية.' : sentimentLabel.toLowerCase().includes('greed') ? 'نشوة التجزئة. هذا خطر للمشترين المتأخرين.' : 'ظروف محايدة. كن حذراً.'}

💡 التفسير النفسي:

تُظهر بيانات CryptoQuant ${inflowDisplay}، ومؤشر مراكز المعدّنين (MPI) ${mpiDisplay}، ومشاعر ${sentimentLabel.toLowerCase()}، بينما تغير السعر ${priceChangeDisplay} خلال 24 ساعة.

من منظور نفسي، تشير هذه المقاييس إلى بيئة سوق ${sentimentLabel.toLowerCase()}. يشير ${inflow >= 0 ? 'التدفق الداخلي' : 'التدفق الخارجي'} إلى ${inflow >= 0 ? 'المزيد من العملات المشفرة تدخل البورصات' : 'المزيد من العملات المشفرة تغادر البورصات'}، مما يشير غالباً إلى ${inflow >= 0 ? 'ضغط بيع محتمل' : 'الحائزون يؤمنون أصولهم خارج البورصة'}.

${score <= 25 && inflow > 0 ? '⚠️ تناقض: درجة مخاطر منخفضة لكن ضغط بيع عالي. هذا بالضبط عندما تتشكل الفخاخ. كن حذراً.' : 'السوق في وضع انتظار، حيث يراقب المتداولون الظروف بعناية.'}`;
  }
  
  // 要約1行＋短めの本文で全体長を抑える（420文字まで、ENと統一）
  const gptNewsLimit = 420;
  // Telegram互換性: Markdown見出し（###）を削除してTelegramネイティブな形式に変換（先に実行）
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '') // ###見出しを削除
    .replace(/^##\s+/gm, '')   // ##見出しを削除
    .replace(/^#\s+/gm, '');   // #見出しを削除
  // プレーンテキストの見出しも改善（「التفسير النفسي لمقاييس On-Chain」など）
  gptNewsDisplay = gptNewsDisplay.replace(/^التفسير النفسي لمقاييس On-Chain$/gm, '💡 التفسير النفسي لمقاييس On-Chain');
  
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
  
  // モバイル最適化: 冒頭に1行の要約を追加
  const trapDataForSummary = trapDetection || marketBug;
  const hasTrapForSummary = trapDataForSummary && (trapDataForSummary.trapDetected || trapDataForSummary.bugDetected);
  const trapTypeForSummary = trapDataForSummary?.trapType || trapDataForSummary?.bugType || '';
  const trapSeverityForSummary = trapDataForSummary?.trapSeverity || trapDataForSummary?.bugSeverity || 'NONE';
  
  let summaryLine = '';
  if (hasTrapForSummary && trapSeverityForSummary !== 'NONE') {
    const trapTypeDisplay = trapTypeForSummary.replace(/_/g, ' ');
    summaryLine = `📰 الملخص: تُظهر مقاييس On-Chain وضع "انتظار". يشير ${trapTypeDisplay} إلى فخ مخفي رغم الأسعار المستقرة.`;
  } else {
    summaryLine = `📰 الملخص: تُظهر مقاييس On-Chain وضع "انتظار". البيانات نظيفة، لكن لا تثق كثيراً`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // 詳細な分析を表示
  if (gptNewsDisplay && gptNewsDisplay !== 'جارٍ تحليل البيانات...') {
    lines.push(`📰 ${gptNewsDisplay}`);
    lines.push('');
  }

  // ===== EN版と同一構成: hasGeminiContent → sosovalueArticle → Data-Backed =====
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】رسم بياني NanoBanana');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 تحقق من الوسائط المرفقة!');
    lines.push('');
  }
  if (sosovalueArticle) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📰 رؤية on-chain (CQ + سياق سابق)');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(sosovalueArticle);
    lines.push('');
  }
  // Data-Backed Reasons（ENと同一ロジック）
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
    lines.push('📊 أسباب مبنية على البيانات');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded >= 50;
    if (trapScoreForEvidence != null) {
      if (isHighTrap) {
        lines.push(`🎯 درجة الفخ: ${trapScoreRounded}/100 → مخاطر فخ كبيرة`);
        if (trapTypeForEvidence) lines.push(`⚠️ تم اكتشاف ${(trapTypeForEvidence || '').replace(/_/g, ' ')}`);
        lines.push(`• ارتفاع صافي التدفق → العرض يتحرك للبورصات`);
        lines.push(`• ارتفاع MPI المعدّنين → ضغط التوزيع`);
        lines.push(`• خوف شديد + تباعد السعر → إعداد فخ كلاسيكي`);
        lines.push(`💡 انتظار. الدخول الآن قد يعرضك لفخاخ.`);
      } else if (isLowTrap) {
        lines.push(`✅ درجة الفخ: ${trapScoreRounded}/100 → مخاطر فخ منخفضة`);
        lines.push(`📐 نافذة وضع المراكز — يمكن التفكير في long/short أو رافعة مع مخاطرة محددة عندما تكون الأفضلية واضحة.`);
      } else {
        lines.push(`⚡ درجة الفخ: ${trapScoreRounded}/100 → حذر معتدل`);
        lines.push(`💡 انتظر التأكيد قبل الدخول.`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'شذوذ').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (الدرجة: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`💡 انحرافات on-chain تشير إلى انتظار.`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (الشدة: ${trapAlert.severity})`);
      lines.push(`💡 حافظ على الدفاع حتى تظهر أفضلية واضحة.`);
    }
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok（ENと同一: 区切り線）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 رؤية سريعة من Dr. Grok');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  if (integratedOptimization && integratedOptimization.integrated && integratedOptimization.optimization) {
    const opt = integratedOptimization.optimization;
    
    // تحويل رموز الخطأ إلى رسائل متعددة اللغات（العربية）
    const errorMessages = {
      GROK_UNAVAILABLE: 'تحليل خوارزمية X لـ Grok غير متاح',
      GROK_ERROR: 'حدث خطأ في تحليل خوارزمية X لـ Grok',
      GEMINI_UNAVAILABLE: 'التحليل النفسي العميق لـ Gemini غير متاح',
      GEMINI_ERROR: 'حدث خطأ في التحليل النفسي العميق لـ Gemini',
    };
    
    // عرض رسائل الخطأ（التكامل الجزئي）
    if (integratedOptimization.errorCodes && integratedOptimization.errorCodes.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('⚠️ بعض التحليلات غير متاحة');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      integratedOptimization.errorCodes.forEach(code => {
        const msg = errorMessages[code] || code;
        lines.push(`   • ${msg}`);
      });
      lines.push('   💡 عرض النتائج المتاحة فقط');
      lines.push('');
    }
    
    // التحقق من وجود بيانات Grok（بناءً على sources）
    const hasGrok = !!integratedOptimization.sources?.grok && !integratedOptimization.sources.grok.error;
    
    // رؤى تحسين خوارزمية X（من تحليل Grok）- عرض بناءً على sources
    // P0 FIX: questionCTAとengagementBoostersは有料版レポートの文脈に合わないため、バイラル可能性スコアとタイミング情報のみを表示
    if (hasGrok && opt.content && (opt.viralPotential !== undefined || opt.timing)) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('📱 تحسين منشورات X'); // P0 FIX: 日本語の括弧を削除
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      
      // Viral potential score display
      if (opt.viralPotential !== null && opt.viralPotential !== undefined) {
        const { emoji, label, score } = formatViralScore(opt.viralPotential, {
          high: '[عالية]',
          medium: '[متوسطة]',
          low: '[منخفضة]'
        });
        lines.push(`   ${emoji} ${label} درجة الإمكانات الفيروسية: ${score}/100`);
        if (opt.viralFactors && opt.viralFactors.length > 0) {
          const filteredFactors = filterJapaneseFromArray(opt.viralFactors);
          if (filteredFactors.length > 0) {
            lines.push(`   📊 العوامل الرئيسية: ${filteredFactors.slice(0, 2).join('، ')}`);
          }
        }
      }
      
      if (opt.timing && opt.timing.length > 0) {
        const arabicTimings = cleanTimingInfo(opt.timing);
        if (arabicTimings.length > 0) {
          lines.push(`⏰ أوقات النشر المثلى: ${arabicTimings.slice(0, 2).join('، ')}`);
        }
      }
      
      lines.push('');
    }
    
    // التحقق من وجود بيانات Gemini（بناءً على sources）
    const hasGemini = !!integratedOptimization.sources?.gemini && !integratedOptimization.sources.gemini.error;
    
    // رؤى نفسية عميقة（من تحليل Gemini）- إبراز كمعلومات مهمة（عرض بناءً على sources）
    if (hasGemini && opt.psychologicalInsights) {
      const psyInsights = opt.psychologicalInsights;
      
      // Check if entire psychologicalInsights object contains Japanese
      if (hasJapaneseInPsychologicalInsights(psyInsights)) {
        console.warn('[Regular AR] Japanese characters detected in psychologicalInsights, skipping entire section');
        // フォールバック: 基本的な心理状態のみ表示
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
          lines.push('━━━━━━━━━━━━━━━━━━━━');
          lines.push('🧠 [مهم] رؤى نفسية عميقة');
          lines.push('━━━━━━━━━━━━━━━━━━━━');
          lines.push(`💚 الحالة النفسية: ${stateEmoji} ${psychologicalSupport.psychologicalState} (المخاطرة: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
          if (psychologicalSupport.psychologicalAdvice) {
            if (!hasJapanese(psychologicalSupport.psychologicalAdvice)) {
              lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
            } else {
              const arabicAdvice = getArabicPsychologicalAdvice(
                psychologicalSupport.psychologicalState,
                psychologicalSupport.psychologicalRisk
              );
              if (arabicAdvice) {
                lines.push(`   💡 ${arabicAdvice}`);
              }
            }
          }
          lines.push('');
        }
      } else {
        // 日本語が含まれていない場合のみ表示
        lines.push('━━━━━━━━━━━━━━━━━━━━');
        lines.push('🧠 [مهم] رؤى نفسية عميقة');
        lines.push('━━━━━━━━━━━━━━━━━━━━');
        
        if (psyInsights.currentState && psyInsights.currentState !== 'NEUTRAL') {
          if (!hasJapanese(psyInsights.currentState)) {
            const stateEmoji = psyInsights.currentState === 'FOMO' ? '😰' :
                               psyInsights.currentState === 'FEAR' ? '😨' :
                               psyInsights.currentState === 'GREED' ? '😍' :
                               psyInsights.currentState === 'PANIC' ? '😱' :
                               psyInsights.currentState === 'EUPHORIA' ? '😄' :
                               psyInsights.currentState === 'CONFUSION' ? '🤔' : '😐';
            lines.push(`💚 الحالة النفسية: ${stateEmoji} ${psyInsights.currentState}`);
          }
        }
        
        if (psyInsights.mentalBlocks && psyInsights.mentalBlocks.length > 0) {
          const filteredBlocks = filterJapaneseFromArray(psyInsights.mentalBlocks);
          if (filteredBlocks.length > 0) {
            lines.push(`🚧 العوائق العقلية: ${filteredBlocks.slice(0, 2).join('، ')}`);
          }
        }
        
        if (psyInsights.breakthroughInsights && psyInsights.breakthroughInsights.length > 0) {
          const filteredInsights = filterJapaneseFromArray(psyInsights.breakthroughInsights);
          if (filteredInsights.length > 0) {
            lines.push(`   💡 [مهم] رؤى الاختراق:`);
            filteredInsights.slice(0, 2).forEach(insight => {
              lines.push(`   🔥 ${insight}`);
            });
          }
        }
        
        if (psyInsights.personalizedCoaching && psyInsights.personalizedCoaching.trim()) {
          const coachingText = psyInsights.personalizedCoaching;
          const coachingLimit = 300;
          let coachingDisplay = coachingText;
          
          if (hasJapanese(coachingText)) {
            coachingDisplay = getArabicPsychologicalAdvice(
              psyInsights.currentState || 'NEUTRAL',
              'LOW'
            );
          }
          
          if (coachingDisplay.length > coachingLimit) {
            coachingDisplay = coachingDisplay.slice(0, coachingLimit) + '…';
          }
          lines.push(`💊 التدريب الشخصي:`);
          lines.push(`"${coachingDisplay}"`);
        }
        
        lines.push('');
      }
    }
  }
  
  // Grok X解析結果（Xセンチメント分析）- 統合最適化がない場合のフォールバック
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    // P0 FIX: 日本語が含まれている場合はスキップ
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(grokXAnalysis);
    if (!hasJapanese) {
      const grokXLimit = 600;
      let grokXDisplay = grokXAnalysis;
      if (grokXAnalysis.length > grokXLimit) {
        // 文の終わりで切るようにする（最後の文の終わりを探す）
        const truncated = grokXAnalysis.slice(0, grokXLimit);
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
        
        if (lastSentenceEnd > grokXLimit * 0.5) {
          const endPos = truncated[lastSentenceEnd + 1] === ' ' ? lastSentenceEnd + 1 : lastSentenceEnd;
          grokXDisplay = truncated.slice(0, endPos) + '…';
        } else {
          grokXDisplay = truncated + '…';
        }
      }
      lines.push(`📱 تحليل المشاعر على X: ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular AR] Japanese characters detected in grokXAnalysis, skipping');
    }
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
    lines.push(`💚 الحالة النفسية: ${stateEmoji} ${psychologicalSupport.psychologicalState} (المخاطرة: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
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
  } else if (!integratedOptimization || !integratedOptimization.integrated) {
    lines.push('💚 الحالة النفسية: 😐 NEUTRAL (المخاطرة: 💡 منخفضة)');
    lines.push('   💡 ظروف السوق مستقرة نسبياً. حافظ على الانضباط.');
    lines.push('💊 ملاحظة Dr. Grok العقلية: "الصبر = قوة استراتيجية. أفضل المتداولين يعرفون متى لا يتداولون."');
  }
  
  lines.push('');

  // 有料版の価値（簡潔に）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 هذا هو سبب دفعك لهذا التقرير');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🎯 إشارات العمل (AVOID-LONG/SHORT، STANDBY) + خريطة الخروج + تنبيهات NO TRADE');
  lines.push('📊 تحليل CQ كامل + اكتشاف الفخاخ + مشاعر X (Dr. Grok)');
  lines.push('💊 التدريب العقلي وتشخيص الحالة النفسية');
  lines.push('');
  lines.push('🛡️ إشارة واحدة مفقودة = رأس مال مفقود.');
  lines.push('');

  // ===== Snapshot（5項目に絞る: Price, Netflow, MPI, Sentiment, Trap Score） =====
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
