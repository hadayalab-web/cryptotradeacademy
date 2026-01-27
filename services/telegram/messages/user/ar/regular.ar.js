// Tier1 BTC regular briefing (AR)
// services/telegram/messages/user/ar/regular.ar.js

const { hasJapanese, filterJapaneseFromArray, cleanTimingInfo, hasJapaneseInPsychologicalInsights, formatViralScore } = require('../shared/contentFilters');

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
  integratedOptimization, // Grok Xアルゴリズム解析 × Gemini深層心理解析の統合結果
  // Phase 2: 市場別深掘りデータ
  whaleFlows, // Whale Flows（EN市場専用だが、他の言語でも表示可能）
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
  const trapLine = trap?.isTrap
    ? `🧨 كاشف الفخاخ: ${trap.label || 'فخ محتمل'} (${trap.confidence} مستوى ثقة)`
    : '✅ كاشف الفخاخ: لا توجد فخاخ حرجة مكتشفة';

  let dirEmoji;
  let dirLabel;
  // تنبيهات الفخ فقط (تم حذف BUY/SELL/LONG/SHORT بالكامل)
  if (trapAlert && trapAlert.alert) {
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
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isNoTrade = true; // وضع الانتظار دائماً (تم حذف إشارات BUY/SELL بالكامل)
  const entryLine = isNoTrade
    ? '• الدخول: الاستعداد للنصر — انتظار محفز واضح'
    : `• سعر الدخول (مرجع سبوت): ${formatUsd(priceUsd)}`;
  const tpLine = isNoTrade
    ? '• Take Profit: TBD (سيتم تحديده)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a');
  const slLine = isNoTrade
    ? '• Stop Loss: TBD (سيتم تحديده)'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a');
  const rrLine = isNoTrade
    ? '• نسبة المخاطرة إلى العائد (RR): انتظار'
    : (tradeSignal?.rr != null ? `• نسبة المخاطرة إلى العائد (RR): ${tradeSignal.rr.toFixed(2)}` : '');
  const modeLine = isNoTrade ? '• الوضع: Trap Standby — انتظر أفضلية واضحة. أولوية للدفاع' : '';

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
  lines.push('🌤️ Trap Defence BTC - تقرير مدفوع');
  // COO最適化: 緊急感強化
  const urgencyLevel = (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) ? 'عاجل' : 'مهم';
  lines.push(`🚨 تنبيه ${urgencyLevel}: بريفينغ دفاع الفخ — الوقت يدق!`);
  lines.push(`📅 ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（最上部に配置） =====
  lines.push('🎯 حكم التداول');
  lines.push(`${dirEmoji} الإشارة: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // COO最適化: 矛盾の提示（低リスクなのに売り圧力）
  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40)); // 推定クジラ比率
    const whaleDollarValue = Math.floor((whaleRatioEstimate / 100) * priceUsd * 1000); // 推定ドル価値
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🤔 تنبيه التناقض');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`درجة السوق: ${Math.round(score)}/100 (محايد/مستقر)`);
    lines.push(`لكن صافي تدفق البورصات: +${Math.abs(inflow).toFixed(0)} BTC داخل`);
    lines.push(`والمشاعر: ${sentimentLabel}`);
    lines.push('');
    lines.push(`⚠️ هذا التناقض يشير إلى: مخاطر منخفضة لكن ضغط بيع يتزايد.`);
    lines.push(`   نسبة الحيتان المقدرة ${whaleRatioEstimate.toFixed(0)}% = $${whaleDollarValue}M+ جاهزة للبيع.`);
    lines.push(`   ماذا يعني هذا لرأس مالك؟`);
    lines.push('');
  }

  // ===== 【コア機能ハイライト】3つの強み =====
  lines.push('✨ أبرز اليوم (3 ميزات أساسية)');
  lines.push('');
  
  // Core Feature 1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    const trapType = trapData.trapType || trapData.bugType || 'شذوذ';
    const trapTypeText = trapType.replace(/_/g, ' ');
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ الميزة الأساسية 1: دفاع الفخ - ${trapEmoji} ${trapTypeText} (الدرجة: ${trapScore.toFixed(0)}/100)`);
    
    // Display score calculation components (transparency)
    if (trapData.details) {
      const components = [];
      if (trapData.details.multipleDivergences >= 3) {
        components.push(`انحرافات متعددة (${trapData.details.multipleDivergences})`);
      } else if (trapData.details.multipleDivergences >= 2) {
        components.push(`انحرافات متعددة (${trapData.details.multipleDivergences})`);
      }
      if (trapData.details.anomalyDetected) {
        components.push('شذوذ عالي الدقة');
      }
      if (trapData.details.accelerationDetected) {
        components.push('تسارع الاتجاه');
      }
      if (Math.abs(trapData.details.onchainSocialDivergence || 0) > 40) {
        components.push('انحراف الحوت/التجزئة');
      }
      if (trapData.details.priceOnchainDivergence) {
        components.push('انحراف السعر/Onchain');
      }
      if (trapData.details.priceSocialDivergence) {
        components.push('انحراف السعر/المشاعر');
      }
      if (components.length > 0) {
        lines.push(`   📊 المكونات: ${components.join(' + ')}`);
      }
    }
    
    // Display trap alert details if available
    if (trapAlert && trapAlert.alert) {
      const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
      const recommendationText = trapAlert.recommendation ? trapAlert.recommendation.replace(/_/g, '-') : 'UNKNOWN';
      lines.push(`   🚨 نوع التنبيه: ${alertTypeText} (الشدة: ${trapAlert.severity})`);
      lines.push(`   💡 التوصية: ${recommendationText}`);
      if (trapAlert.confidence) {
        lines.push(`   📊 الثقة: ${(trapAlert.confidence * 100).toFixed(0)}%`);
      }
    }
  } else {
    lines.push('🛡️ الميزة الأساسية 1: دفاع الفخ - لا توجد فخاخ مكتشفة حالياً');
  }
  
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
      // AR市場用: アラビア語以外の言語が混入している場合を検出
      // エラーでない場合のみ言語チェックを実行
      // アラビア文字が含まれていない場合は英文と判断
      const hasArabicChars = /[\u0600-\u06FF]/.test(gptNewsText);
      // 日本語・英語・その他の言語が混入している場合を検出
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      const hasEnglishOnly = !hasArabicChars && !hasJapaneseChars && gptNewsText.length > 50;
      if (hasJapaneseChars || (hasEnglishOnly && !hasArabicChars)) {
        // 日本語または英語のみが含まれている場合はnullに設定してアラビア語フォールバックを使用
        console.warn('[Regular AR] Non-Arabic language detected in GPT analysis, using fallback');
        gptNewsText = null;
      } else if (!hasArabicChars && gptNewsText.length > 50) {
        // アラビア語が含まれていない場合はnullに設定してアラビア語フォールバックを使用
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
  
  // 文字数制限を緩和して、重要な情報が切れないようにする（600文字まで）
  const gptNewsLimit = 600;
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
  
  // データに基づく理由セクション（常に表示して価値を提供）
  // 優先順位: trapDetection.trapScore > trapRisk.trapRiskScore（値が0の場合は次のソースをチェック）
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('📊 أسباب مبنية على البيانات');
    
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      if (trapScoreRounded >= 50) {
        lines.push(`🎯 درجة الفخ: ${trapScoreRounded}/100 تشير إلى مخاطر فخ كبيرة`);
        if (trapTypeForEvidence) {
          const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
          lines.push(`⚠️ نوع الفخ: تم اكتشاف ${trapTypeDisplay}`);
        }
        lines.push(`💡 الدليل: تشير الانحرافات المتعددة والانحرافات on-chain إلى أن وضع "انتظار" حكيم`);
        lines.push(`📈 لماذا الانتظار؟ تُظهر البيانات ${trapScoreRounded >= 70 ? 'قوية' : 'معتدلة'} إشارات أن الدخول الآن قد يعرضك لفخاخ السوق`);
      } else {
        lines.push(`✅ درجة الفخ: ${trapScoreRounded}/100 تشير إلى مخاطر فخ منخفضة`);
        lines.push(`💡 الدليل: Trap Score عند ${trapScoreRounded}/100—نظيف بقدر ما يمكن. لكن الجزء اللي ما أحد يتكلم عنه: الفخاخ تُبنى في الصمت`);
      }
    } else if (trapDetection || trapAlert) {
      // フォールバック: trapDetectionやtrapAlertから証拠を生成
      if (trapDetection && trapDetection.trapDetected) {
        const trapTypeText = (trapDetection.trapType || 'شذوذ').replace(/_/g, ' ');
        lines.push(`🎯 اكتشاف الفخ: ${trapTypeText} (الدرجة: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
        lines.push(`💡 الدليل: تم اكتشاف انحرافات متعددة on-chain بناءً على البيانات`);
      } else if (trapAlert && trapAlert.alert) {
        const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
        lines.push(`🚨 تنبيه الفخ: ${alertTypeText} (الشدة: ${trapAlert.severity})`);
        lines.push(`💡 الدليل: تم اكتشاف مخاطر فخ السوق بناءً على بيانات on-chain وتحليل المشاعر`);
      }
    }
    
    // 戦略的インサイトセクションを追加
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      const marketScore = Math.round(score ?? 0);
      const isBullish = marketScore >= 50;
      const isLowTrapRisk = trapScoreRounded < 30;
      
      lines.push('');
      lines.push(`💡 رؤى استراتيجية`);
      if (trapScoreRounded >= 70) {
        lines.push(`  🚨 درجة الفخ ${trapScoreRounded}/100: إشارات قوية تشير إلى فخاخ سوق محتملة`);
        lines.push(`  📊 تُظهر البيانات انحرافات متعددة وانحرافات on-chain`);
        lines.push(`  🛡️ الاستعداد الاستراتيجي ليس ضعفاً—إنه استعداد للنصر. خلّك هادي. لا تخلي العاطفة تسوقك`);
      } else if (trapScoreRounded >= 50) {
        lines.push(`  ⚡ درجة الفخ ${trapScoreRounded}/100: تم اكتشاف مؤشرات فخ معتدلة`);
        lines.push(`  📊 بعض الانحرافات تشير إلى الحذر`);
        lines.push(`  🛡️ مارس الحذر. راقب ظروف السوق عن كثب قبل اتخاذ إجراء`);
      } else {
        // مخاطر منخفضة: رسالة حسب ظروف السوق
        if (isLowTrapRisk && isBullish) {
          // مخاطر منخفضة وصاعدة: رسالة أكثر نشاطاً
          lines.push(`  ✅ درجة الفخ ${trapScoreRounded}/100: تم اكتشاف مخاطر فخ منخفضة`);
          lines.push(`  📈 النقاط ${marketScore}/100—الظروف تبدو جيدة. لكن النقد موقف أيضاً. انتظر إعدادات الجودة`);
          lines.push(`  💡 مخاطر منخفضة + زخم صاعد = ظروف مواتية. ابق متيقظاً لإعدادات الجودة`);
        } else if (isLowTrapRisk) {
          // مخاطر منخفضة لكن محايدة/هابطة: رسالة دفاع قياسية
          lines.push(`  ✅ درجة الفخ ${trapScoreRounded}/100: مخاطر فخ منخفضة حالياً`);
          lines.push(`  🛡️ البيانات نظيفة، لكن الانضباط يهزم FOMO. انتظر إعدادات الجودة`);
          lines.push(`  💡 الصبر يؤتي ثماره. إعدادات الجودة تتطلب مخاطر منخفضة واتجاه سوق واضح`);
        } else {
          // Fallback (إذا لم يتم الحصول على النقاط)
          lines.push(`  ✅ درجة الفخ ${trapScoreRounded}/100: مخاطر فخ منخفضة حالياً، لكن الأسواق تتغير دائماً`);
          lines.push(`  🛡️ حافظ على الانضباط. راقب الظروف وانتظر إشارات واضحة`);
        }
      }
    }
    lines.push('');
  }
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('📊 رسم بياني NanoBanana');
    lines.push('🎬 تحقق من الوسائط المرفقة!');
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grokメンタルコーチ（固定コーナー）
  lines.push('💊 رؤية سريعة من Dr. Grok');
  
  // ===== عرض نتائج التحسين المتكاملة لـ Grok و Gemini =====
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
  
  // Dr. Grokの心理的サポート（癒し系コメンテーターとして）- 統合最適化がない場合のフォールバック
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
    if (psychologicalSupport.psychologicalAdvice) {
      const advice = psychologicalSupport.psychologicalAdvice;
      // 日本語が含まれている場合はアラビア語フォールバックを使用
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(advice)) {
        const fallbackAdvice = getArabicPsychologicalAdvice(
          psychologicalSupport.psychologicalState,
          psychologicalSupport.psychologicalRisk
        );
        lines.push(`   💡 ${fallbackAdvice}`);
      } else {
        lines.push(`   💡 ${advice}`);
      }
    }
    
    lines.push('');
    
    if (psychologicalSupport.mentalNote) {
      if (!hasJapanese(psychologicalSupport.mentalNote)) {
        lines.push(`💊 ملاحظة Dr. Grok العقلية:`);
        lines.push(`"${psychologicalSupport.mentalNote}"`);
      } else {
        const fallbackNote = 'الصبر ليس ضعفاً—بل قوة استراتيجية. أفضل المتداولين يعرفون متى لا يتداولون.';
        lines.push(`💊 ملاحظة Dr. Grok العقلية:`);
        lines.push(`"${fallbackNote}"`);
      }
    }
  } else if (!integratedOptimization || !integratedOptimization.integrated) {
    // Fallback: توفير رسالة قيمة حتى عندما لا تكون البيانات متاحة
    lines.push('💚 الحالة النفسية: 😐 NEUTRAL (المخاطرة: 💡 منخفضة)');
    lines.push('');
    lines.push('   💡 البيانات نظيفة، لكن لا تثق كثيراً. حافظ على الانضباط');
    lines.push('');
    lines.push('💊 ملاحظة Dr. Grok العقلية:');
    lines.push('"الصبر ليس ضعفاً—إنه قوة استراتيجية. أفضل المتداولين يعرفون متى لا يتداولون."');
  }
  
  lines.push('');

  // COO最適化: FOMO強化（有料版の価値を明確化）
  // تحسين بناءً على تقييم GPT: توضيح القيمة في 3 فئات
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 هذا هو سبب دفعك لهذا التقرير');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('بينما يرى المستخدمون المجانيون النقاط فقط، أنت تحصل على:');
  lines.push('');
  lines.push('🎯 إشارات العمل في الوقت الفعلي:');
  lines.push('✅ تنبيهات AVOID-LONG / AVOID-SHORT / STANDBY (إشعارات فورية)');
  lines.push('✅ دليل خريطة الخروج (معرفة متى تخرج بالضبط)');
  lines.push('✅ تنبيهات NO TRADE (تجنب الخسائر قبل حدوثها)');
  lines.push('');
  lines.push('📊 تحليل الاستخبارات العميق:');
  lines.push('✅ تحليل on-chain كامل (بيانات CryptoQuant، جميع المؤشرات)');
  lines.push('✅ اكتشاف أنماط الفخاخ المدعوم بالذكاء الاصطناعي (مراقبة على مدار الساعة)');
  lines.push('✅ تحليل مشاعر X في الوقت الفعلي (توقع مشاعر السوق)');
  lines.push('');
  lines.push('💊 الدعم النفسي الكامل:');
  lines.push('✅ التدريب النفسي من Dr. Grok (التغلب على FOMO، الخوف، الجشع)');
  lines.push('✅ دليل التدريب العقلي المخصص');
  lines.push('✅ تشخيص الحالة النفسية وحل العوائق');
  lines.push('');
  lines.push('🛡️ إشارة واحدة مفقودة = رأس مال مفقود. هذا هو سبب دفعك لهذا التقرير.');
  lines.push('');

  // ===== 基本市場データ（補足情報として後半に配置） =====
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);
  
  // Whale Ratio情報（EN市場専用だが、他の言語でも表示可能）
  // PR #14: whaleFlows の構造が { whaleRatio, isHighPressure, interpretation } に変更
  // 重要: whaleFlowsが存在し、whaleRatioがnullでない場合に表示
  if (whaleFlows && whaleFlows.whaleRatio != null) {
    // whaleRatioは0-1の範囲の数値として返される（deepMetrics.js参照）
    // パーセンテージに変換（0.56 -> 56%）
    const whaleRatioValue = typeof whaleFlows.whaleRatio === 'number' 
      ? whaleFlows.whaleRatio * 100 
      : parseFloat(whaleFlows.whaleRatio) * 100 || 0;
    const isHighPressure = whaleFlows.isHighPressure === true || whaleRatioValue >= 80;
    const whaleLine = `🐋 نسبة الحيتان: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(ضغط عالي)' : '(عادي)'}`;
    lines.push(whaleLine);
  } else if (whaleFlows) {
    // デバッグ用: whaleFlowsは存在するがwhaleRatioがnullの場合
    console.warn('[Regular AR] whaleFlows exists but whaleRatio is null:', whaleFlows);
  }
  
  // Phase1-Product: Trap Riskスコア表示
  if (trapRisk && trapRisk.trapRiskScore != null) {
    const riskEmoji = trapRisk.riskLevel === 'CRITICAL' ? '🚨' : 
                      trapRisk.riskLevel === 'HIGH' ? '⚠️' : 
                      trapRisk.riskLevel === 'MEDIUM' ? '⚡' : '✅';
    const trapRiskLine = `${riskEmoji} درجة مخاطر الفخ: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
    lines.push(trapRiskLine);
    
    // 主要なリスク要因を表示（最大3つ）
    if (trapRisk.riskFactors && trapRisk.riskFactors.length > 0) {
      const topRisks = trapRisk.riskFactors.slice(0, 3);
      topRisks.forEach(risk => {
        if (risk.score >= 20) {
          lines.push(`   • ${risk.factor}: ${risk.description.substring(0, 60)}...`);
        }
      });
    }
  }
  
  // Phase1-Product: NO TRADEアラート表示
  if (noTradeAlert && noTradeAlert.shouldNoTrade) {
    const noTradeEmoji = noTradeAlert.confidence === 'HIGH' ? '🚫' : 
                         noTradeAlert.confidence === 'MEDIUM' ? '⚠️' : '⏸️';
    const noTradeLine = `${noTradeEmoji} تنبيه عدم التداول (${noTradeAlert.confidence} ثقة، درجة المخاطرة: ${noTradeAlert.riskScore}/100)`;
    lines.push(noTradeLine);
    
    // 主要な理由を表示（最大3つ）
    if (noTradeAlert.reasons && noTradeAlert.reasons.length > 0) {
      const topReasons = noTradeAlert.reasons.slice(0, 3);
      topReasons.forEach(reason => {
        lines.push(`   • ${reason}`);
      });
    }
    
    lines.push(`   💡 ${noTradeAlert.recommendation}`);
  }
  
  lines.push(trapLine);
  
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
