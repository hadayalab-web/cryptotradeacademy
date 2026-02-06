// Tier1 BTC regular briefing (EN)
// services/telegram/messages/user/en/regular.en.js

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
 * 英語の心理的アドバイスを取得（日本語が含まれている場合のフォールバック）
 * @param {string} psychologicalState - 心理状態
 * @param {string} psychologicalRisk - リスクレベル
 * @returns {string} 英語のアドバイス
 */
function getEnglishPsychologicalAdvice(psychologicalState, psychologicalRisk) {
  if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'LOW') {
    return '✅ Neutral state - No mental blocks detected: Market sentiment is balanced. No extreme emotions detected. Conditions are stable.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'MEDIUM') {
    return '⚠️ Neutral state - Monitor closely: Market sentiment is balanced but conditions may change. Stay alert.';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'HIGH') {
    return '🚨 Neutral state - High risk: This "neutral" sentiment may be masking trap conditions. Stay disciplined.';
  } else if (psychologicalState === 'FOMO') {
    return '🚨 FOMO detected - Extreme buying pressure: Retail is chasing while whales may be distributing. This is a classic trap pattern.';
  } else if (psychologicalState === 'FEAR') {
    return '😨 Fear detected - Market shows low retail interest: Fear can be paralyzing, but it can also signal potential opportunities.';
  } else if (psychologicalState === 'GREED') {
    return '😍 Greed detected - Euphoric conditions: Greed is the most dangerous emotion in trading. Consider taking profits.';
  } else if (psychologicalState === 'PANIC') {
    return '😱 Panic detected - Extreme fear: Panic is your amygdala hijacking your prefrontal cortex. Stop. Breathe. Check the data.';
  } else if (psychologicalState === 'EUPHORIA') {
    return '😄 Euphoria detected - Market celebration: Euphoria is the market\'s way of making you forget risk. Stay disciplined.';
  } else if (psychologicalState === 'CONFUSION') {
    return '🤔 Confusion detected - Unclear signals: Confusion is your brain asking for clarity. Don\'t force a trade. When in doubt, wait.';
  }
  
  // デフォルト
  return 'Market conditions are relatively stable. Maintain discipline and wait for quality setups.';
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
  stats, // reserved
  trapScore, // Phase 2: EN市場専用
  whaleFlows, // Phase 2: EN市場専用
  liquidations, // Phase 2: EN市場専用
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
  hasGeminiContent = false, // Gemini画像・動画が生成されたかどうか（後方互換性）
  sosovalueArticle = null, // Gemini: CQ最新+過去比較でSoSoValue風記事
  gptReporterAnalysis, // GPT: CQ総合分析→Trapアラート
  grokXAnalysis, // Grok: Xセンチメント→トレード依存症サポート
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 BTC Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 Exchange Netflow: ${flowDir} ${flowAbs.toFixed(0)} BTC${inflow < 0 ? ' — Holders are keeping assets' : ' — Selling pressure detected'}`;

  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 Sentiment: ${sentimentLabel || 'Unknown'}`;

  // Market Scoreの解釈補助を追加
  const marketScore = Math.round(score ?? 0);
  let scoreInterpretation = '';
  if (marketScore >= 50) {
    scoreInterpretation = ' (Bullish)';
  } else if (marketScore >= 20) {
    scoreInterpretation = ' (Neutral/Stable)';
  } else if (marketScore >= -20) {
    scoreInterpretation = ' (Neutral/Stable)';
  } else if (marketScore >= -50) {
    scoreInterpretation = ' (Bearish)';
  } else {
    scoreInterpretation = ' (Very Bearish)';
  }
  const scoreLine = `📈 Market Score: ${marketScore}/100${scoreInterpretation}`;

  // 低トラップ判定: ポジション・レバレッジ検討の可否に使用（閾値 35）
  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;
  
  // データの不整合修正: Trap Detectorの矛盾を修正（trapDetectionとtrapの整合性を確認）
  let trapLine = '✅ Trap Detector: No critical trap detected';
  if (trapDetection && trapDetection.trapDetected) {
    const trapSeverity = trapDetection.trapSeverity || 'NONE';
    const trapScore = trapDetection.trapScore || 0;
    if (trapSeverity !== 'NONE' && trapScore > 0) {
      const trapEmoji = trapSeverity === 'CRITICAL' ? '🚨' :
                        trapSeverity === 'HIGH' ? '⚠️' :
                        trapSeverity === 'MEDIUM' ? '⚡' : '💡';
      const trapTypeLabel = (trapDetection.trapType || 'Trap').replace(/_/g, ' ');
      trapLine = `${trapEmoji} Trap Detector: ${trapTypeLabel} detected (Severity: ${trapSeverity}, Score: ${trapScore}/100)`;
    }
  } else if (trap?.isTrap) {
    trapLine = `🧨 Trap Detector: ${trap.label || 'Potential trap'} (*${trap.confidence}* confidence)`;
  }

  let dirEmoji;
  let dirLabel;
  // 低トラップ時: ポジション・レバレッジ検討の窓を表示。それ以外は Trap Alert または Standby
  if (hasActiveTrapAlert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ Trap Alert: Avoid Long';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ Trap Alert: Avoid Short';
    } else {
      dirLabel = '🛡️ Trap Alert: Standby';
    }
  } else if (isLowTrapRisk) {
    dirEmoji = '📐';
    dirLabel = 'LOW TRAP RISK — Positioning window';
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  // 低トラップ時は「仕込み可」、それ以外は Standby（冷静なガイドとして一貫）
  const isPositioningWindow = isLowTrapRisk && !hasActiveTrapAlert;
  const entryPrice = priceUsd;
  const tpPrice = tradeSignal?.tp;
  const slPrice = tradeSignal?.sl;
  const isNoTradeZone = !isPositioningWindow && (
    (tpPrice == null && slPrice == null) ||
    (entryPrice === tpPrice && entryPrice === slPrice)
  );
  const entryLine = isPositioningWindow
    ? `• Entry: Consider quality setups when edge is clear (ref. ${formatUsd(priceUsd)})`
    : (!isLowTrapRisk && !hasActiveTrapAlert
      ? '• Entry: Preparing for Victory — Waiting for Clear Trigger'
      : `• Entry (spot ref.): ${formatUsd(priceUsd)}`);
  const tpLine = isPositioningWindow
    ? '• Take Profit: Set your level (define before entry)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: TBD (To Be Determined)');
  const slLine = isPositioningWindow
    ? '• Stop Loss: Define before entry'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: TBD (To Be Determined)');
  const rrLine = tradeSignal?.rr != null ? `• Risk/Reward (RR): ${tradeSignal.rr.toFixed(2)}` : (isPositioningWindow ? '• Risk/Reward (RR): Define per setup' : '• Risk/Reward (RR): Standby');

  const modeLine = isPositioningWindow
    ? '• Mode: Low trap risk — consider long/short with defined risk. Leverage only when edge is clear.'
    : (!isLowTrapRisk ? '• Mode: Trap Standby — wait for clear edge. Prioritize defense.' : '');

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok is offline — using system-only signals (on-chain/price).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - Paid Report');
  // 冷静なガイド: 本当にトラップが高い時だけ Alert、通常は Briefing
  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';
  if (isHighTrapForHeader) {
    lines.push(`🚨 Trap Defence Alert — ${trapSeverityForHeader} trap risk`);
  } else {
    lines.push('📋 Trap Defence Briefing');
  }
  lines.push(`📅 ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（3行以内・簡潔 / No Trade Zone明記） =====
  lines.push('🎯 Trade Verdict');
  lines.push(`${dirEmoji} Signal: ${dirLabel}`);
  if (isNoTradeZone) {
    lines.push(`• No Trade Zone — Entry/TP/SL undefined. Wait for clear edge.`);
  } else {
    lines.push(entryLine);
    if (modeLine) lines.push(modeLine);
    if (tpLine) lines.push(tpLine);
    if (slLine) lines.push(slLine);
    if (rrLine) lines.push(rrLine);
  }
  lines.push('');

  // Gemini役割: 「次のアクションを指示」→ 記事があれば冒頭に1行で要約（3項目ハイライトでも再利用）
  let actionPreview = '';
  if (sosovalueArticle && typeof sosovalueArticle === 'string' && sosovalueArticle.trim()) {
    const firstSentence = sosovalueArticle.trim().split(/[.\n]/)[0].trim();
    actionPreview = firstSentence.length > 120 ? firstSentence.slice(0, 117) + '…' : firstSentence;
    if (actionPreview) {
      lines.push('📌 Your move: ' + actionPreview);
      lines.push('');
    }
  }

  // 矛盾の提示（低スコアなのに売り圧力）— 3指標をセットで意味づけ
  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40));
    const contextNote = whaleRatioEstimate >= 80
      ? 'Much of the inflow could turn into selling pressure. Worth monitoring for your risk management.'
      : 'A significant portion of inflow may be whale-related. Worth monitoring for your risk management.';
    const contextInterpretation = 'Netflow + MPI + Sentiment together: Trap Defence interprets this combo as elevated trap risk—retail fear + exchange inflow + miner behavior.';
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Context');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Market Score: ${Math.round(score)}/100${scoreInterpretation}`);
    lines.push(`Exchange Netflow: +${Math.abs(inflow).toFixed(0)} BTC IN`);
    lines.push(`Sentiment: ${sentimentLabel}`);
    lines.push('');
    lines.push(contextNote);
    lines.push(`💡 ${contextInterpretation}`);
    lines.push('');
  }

  // ===== 【ハイライト】Trap / CQ / Action（Trap Score統一・MULTI LAYER ANOMALY説明） =====
  lines.push('✨ Today\'s Highlights');
  lines.push('');
  const trapData = trapDetection || marketBug;
  const unifiedTrapScore = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : (trapData?.trapScore != null ? Math.round(trapData.trapScore) : null);
  const trapTypeRaw = (trapData?.trapType || trapData?.bugType || 'Anomaly').replace(/_/g, ' ');
  const multiLayerNote = /MULTI\s*LAYER|MULTI_LAYER/i.test(trapTypeRaw) ? ' (multiple anomalies detected simultaneously)' : '';
  const trapOneLine = trapData && (trapData.trapDetected || trapData.bugDetected)
    ? `🛡️ Trap: ${trapTypeRaw} (${unifiedTrapScore ?? Math.round(trapData.trapScore || trapData.bugScore || 0)}/100)${multiLayerNote}`
    : '🛡️ Trap: No trap detected';
  const trapRiskLabel = isLowTrapRisk ? 'low' : (effectiveTrapScore != null && effectiveTrapScore >= 50 ? 'high' : 'moderate');
  const cqOneLine = inflow >= 0
    ? `📊 CQ: Netflow +${Math.abs(inflow).toFixed(0)} BTC; trap risk ${trapRiskLabel}.`
    : `📊 CQ: Netflow −${Math.abs(inflow).toFixed(0)} BTC; trap risk ${trapRiskLabel}.`;
  lines.push(trapOneLine);
  lines.push(cqOneLine);
  lines.push(`📌 Action: ${actionPreview || 'Wait for clear edge.'}`);
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
      // EN版で日本語が混在している場合、フィルタリング（日本語文字を検出）
      // 日本語文字の正規表現: ひらがな、カタカナ、漢字
      // 重要: このチェックはエラーチェックの後に実行（エラーでない場合のみ）
      const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
      if (japanesePattern.test(gptNewsText)) {
        console.warn('[Regular EN] Japanese characters detected in GPT analysis, using fallback');
        gptNewsText = null; // 日本語が含まれている場合はnullに設定してフォールバック
      }
    }
  }
  
  // フォールバック: GPT分析が利用できない場合の代替メッセージ
  if (!gptNewsText || gptNewsText.trim() === '') {
    // CryptoQuantデータから基本的な分析を生成
    const inflowDisplay = inflow >= 0 ? `Inflow ${Math.abs(inflow).toFixed(0)} BTC` : `Outflow ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    const priceChangeDisplay = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`;
    
    // COO最適化: ストーリーテリング改善
    gptNewsText = `📖 THE STORY BEHIND THE DATA

While you sleep, whales are positioning. Here's what's happening RIGHT NOW:

1. 🏦 Exchanges flooded: ${inflowDisplay}
   → ${inflow >= 0 ? 'Sellers are loading up. This is NOT normal.' : 'Holders are securing assets. This is BULLISH.'}

2. ⛏️ Miners ${mpi >= 0 ? 'selling' : 'holding'}: MPI ${mpiDisplay}
   → ${mpi >= 0 ? 'Miners are selling. This is BEARISH short-term.' : 'Miners are NOT selling. This is BULLISH long-term.'}

3. 🧠 ${sentimentLabel} sentiment
   → ${sentimentLabel.toLowerCase().includes('fear') ? 'Retail panic. This is OPPORTUNITY for smart money.' : sentimentLabel.toLowerCase().includes('greed') ? 'Retail euphoria. This is RISK for late buyers.' : 'Neutral conditions. Stay alert.'}

💡 Psychological Interpretation:

The CryptoQuant data shows ${inflowDisplay}, a Miners' Position Index (MPI) of ${mpiDisplay}, and ${sentimentLabel.toLowerCase()} sentiment, while the price has changed ${priceChangeDisplay} over 24 hours.

From a psychological perspective, these metrics suggest a ${sentimentLabel.toLowerCase()} market environment. The ${inflow >= 0 ? 'inflow' : 'outflow'} indicates ${inflow >= 0 ? 'more cryptocurrency entering exchanges' : 'more cryptocurrency leaving exchanges'}, which often signals ${inflow >= 0 ? 'potential selling pressure' : 'holders securing their assets off-exchange'}.

${score <= 25 && inflow > 0 ? '⚠️ CONTRADICTION: Low risk score BUT high selling pressure. This is EXACTLY when traps form. Stay alert.' : 'The market is in a wait-and-see mode, where traders are monitoring conditions carefully.'}`;
  }
  
  // Telegram互換性: Markdown見出し（###）を削除してTelegramネイティブな形式に変換（先に実行）
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '') // ###見出しを削除
    .replace(/^##\s+/gm, '')   // ##見出しを削除
    .replace(/^#\s+/gm, '');   // #見出しを削除
  // プレーンテキストの見出しも改善（「Psychological Interpretation of On-Chain Metrics」など）
  gptNewsDisplay = gptNewsDisplay.replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 Psychological Interpretation of On-Chain Metrics');
  
  // 要約1行＋短めの本文で全体長を抑える（420文字まで）
  const gptNewsLimit = 420;
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
  
  // モバイル最適化: 冒頭に1行の要約を追加（100点満点への最後の仕上げ）
  // トラップ検出状況に基づいて要約を生成
  const trapDataForSummary = trapDetection || marketBug;
  const hasTrapForSummary = trapDataForSummary && (trapDataForSummary.trapDetected || trapDataForSummary.bugDetected);
  const trapTypeForSummary = trapDataForSummary?.trapType || trapDataForSummary?.bugType || '';
  const trapSeverityForSummary = trapDataForSummary?.trapSeverity || trapDataForSummary?.bugSeverity || 'NONE';
  
  let summaryLine = '';
  if (hasTrapForSummary && trapSeverityForSummary !== 'NONE') {
    const trapTypeDisplay = trapTypeForSummary.replace(/_/g, ' ');
    // Telegram Markdownでは [text] がリンクとして解釈されるため、[Summary]ではなく Summary: を使用
    summaryLine = `📰 Summary: On-chain metrics show a "Wait-and-See" mode. ${trapTypeDisplay} suggests a hidden trap despite stable prices.`;
  } else {
    summaryLine = `📰 Summary: On-chain metrics show a "Wait-and-See" mode. The data's clean, but don't let your guard down`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // 詳細な分析を表示
  lines.push(`📰 ${gptNewsDisplay}`);
  lines.push('');

  // ===== Data-Backed / Gemini（全言語共通構成） =====
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】NanoBanana Infographic');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 Check attached image/video!');
    lines.push('');
  }
  if (sosovalueArticle) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📰 On-chain insight (CQ + past context)');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(sosovalueArticle);
    lines.push('');
  }
  // Data-Backed Reasons（1ブロック、全言語共通ロジック）
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapScore != null && trapScore > 0) {
    trapScoreForEvidence = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Data-Backed Reasons');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 Trap Score ${trapScoreRounded}/100 → significant trap risk`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} detected`);
        lines.push(`• Netflow spike → supply moving to exchanges`);
        lines.push(`• Miner MPI elevated → distribution pressure`);
        lines.push(`• Extreme Fear + price divergence → classic trap setup`);
        lines.push(`💡 Wait-and-see. Entering now could expose you to traps.`);
      } else if (isLowTrap) {
        lines.push(`✅ Trap Score ${trapScoreRounded}/100 → low trap risk`);
        lines.push(`📐 Positioning window — consider long/short or leverage with defined risk when edge is clear.`);
      } else {
        lines.push(`⚡ Trap Score ${trapScoreRounded}/100 → moderate caution`);
        lines.push(`💡 Wait for confirmation before jumping in.`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'Anomaly').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (Score: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`💡 On-chain anomalies suggest wait-and-see.`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (Severity: ${trapAlert.severity})`);
      lines.push(`💡 Stay defensive until clear edge.`);
    }
    lines.push('');
  }

  // 【コメンテーター】Dr. Grok（固定コーナー、全言語共通）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Dr. Grok\'s Quick Insight');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X analysis fallback (X sentiment analysis)
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    if (!hasJapanese(grokXAnalysis)) {
      const grokXLimit = 600;
      let grokXDisplay = grokXAnalysis;
      if (grokXAnalysis.length > grokXLimit) {
        const truncated = grokXAnalysis.slice(0, grokXLimit);
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
      lines.push(`📱 X Sentiment Analysis: ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular EN] Japanese characters detected in grokXAnalysis, skipping');
    }
  }
  
  // Dr. Grok（2ブロック: 心理状態1行 + 行動の盲点1行 + Mental Note短く・断言）
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
    lines.push(`💚 Psychological State: ${stateEmoji} ${psychologicalSupport.psychologicalState} (Risk: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    const englishAdvice = getEnglishPsychologicalAdvice(
      psychologicalSupport.psychologicalState,
      psychologicalSupport.psychologicalRisk
    );
    const rawAdvice = psychologicalSupport.psychologicalAdvice || '';
    const hasJapaneseInAdvice = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawAdvice);
    const adviceLine = hasJapaneseInAdvice ? englishAdvice : (rawAdvice ? rawAdvice.slice(0, 120) + (rawAdvice.length > 120 ? '…' : '') : englishAdvice);
    lines.push(`   💡 ${adviceLine}`);
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Dopamine firing = the trap. Take 3 breaths. Chase urge = chemistry, not insight. Wait for pullback.';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = 'Fear protects but paralyzes. Check data, not emotions.';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = 'Euphoria = trap. Protect capital first.';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = 'Stop. Breathe. Data says temporary. No decisions in panic.';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Boredom tolerance > leverage. Close the screen today.';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = 'Celebration = traps being set. Stay disciplined.';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = 'Don\'t force a trade. When in doubt, wait.';
    } else {
      mentalNote = 'Patience = strategic strength. Best traders know when NOT to trade.';
    }
    lines.push(`💊 Dr. Grok's Mental Note: "${mentalNote}"`);
  } else {
    lines.push('💚 Psychological State: 😐 NEUTRAL (Risk: 💡 LOW)');
    lines.push('   💡 Market conditions relatively stable. Maintain discipline.');
    lines.push('💊 Dr. Grok\'s Mental Note: "Patience = strategic strength. Best traders know when NOT to trade."');
  }
  
  lines.push('');

  // 有料版の価値（簡潔に）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 THIS IS WHY YOU PAID FOR THIS REPORT');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🎯 Action signals (AVOID-LONG/SHORT, STANDBY) + Exit Map + NO TRADE alerts');
  lines.push('📊 Full CQ analysis + trap detection + X sentiment (Dr. Grok)');
  lines.push('💊 Mental coaching & psychological state diagnosis');
  lines.push('');
  lines.push('🛡️ One missed signal = Lost capital.');
  lines.push('');

  // ===== Snapshot（5項目に絞る: Price, Netflow, MPI, Sentiment, Trap Score） =====
  lines.push('📋 Snapshot');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  const displayTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore;
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 HIGH RISK' : displayTrapScore >= 40 ? '⚠️ MODERATE' : '✅ LOW';
    lines.push(`🎯 Trap Score: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
  }
  lines.push('');
  
  lines.push('');

  // Phase1-Product: Exit Map表示（簡略化：最大8行）- Snapshot外で必要時に表示
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ Exit Map');
    lines.push(`   Position Status: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} Unrealized P&L: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 Profit Taking Zones:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} Zone ${zone.zone}: $${zone.price.toLocaleString()} (Take ${zone.takeProfitPct}%)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 Zone ${zone.zone}: $${zone.price.toLocaleString()} (Take ${zone.takeProfitPct}%)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ Exit Conditions:');
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

  lines.push('For educational purposes only. Not financial advice.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
