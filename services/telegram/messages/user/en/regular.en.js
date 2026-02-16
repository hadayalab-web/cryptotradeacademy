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

/**
 * Phase 3: Extract legacy-shaped payload from snapshot + opts for formatRegularBriefingCore
 */
function extractPayloadFromSnapshot(snapshot, lang = 'en', opts = {}) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const raw = snapshot.raw || {};
  const cqDeep = snapshot.cqDeep || {};
  const td = snapshot.trapDetection || {};
  const asOf = snapshot.as_of_utc || new Date().toISOString();
  const now = typeof asOf === 'string' ? new Date(asOf) : asOf;
  return {
    now,
    inflow: raw.inflow ?? cqDeep.exchangeNetflow ?? 0,
    mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0,
    sentimentLabel: raw.sentimentLabel ?? 'Unknown',
    priceUsd: raw.priceUsd ?? null,
    change24h: raw.change24h ?? null,
    score: snapshot.market_score ?? 0,
    tradeSignal: snapshot.tradeSignal || { signal: 'STANDBY', tp: null, sl: null, rr: null },
    trap: td.trapDetected ? { isTrap: true, label: td.label ?? 'Trap', confidence: td.trapSeverity ?? 'MEDIUM' } : { isTrap: false, label: 'No trap', confidence: 'LOW' },
    aiAnalysis: snapshot.drGrok?.base ?? (typeof snapshot.gptStructureReasoning === 'string' ? snapshot.gptStructureReasoning : null),
    stats: null,
    trapScore: cqDeep.trapScore ?? td.trapScore ?? null,
    whaleFlows: cqDeep.whaleFlows ?? null,
    liquidations: cqDeep.liquidations ?? null,
    noTradeAlert: null,
    trapRisk: null,
    exitMap: null,
    trapDetection: td,
    marketBug: opts.marketBug ?? null,
    trapAlert: snapshot.trapAlert ?? null,
    divergenceSignal: snapshot.divergenceSignal ?? null,
    psychologicalSupport: opts.psychologicalSupport ?? null,
    hasGeminiContent: !!(snapshot.sosovalueArticle && snapshot.sosovalueArticle.trim()),
    sosovalueArticle: snapshot.sosovalueArticle ?? null,
    gptReporterAnalysis: snapshot.gptStructureReasoning ?? null,
    grokXAnalysis: opts.grokXAnalysis ?? snapshot.highResX ?? null,
    nonUserImpactReport: opts.nonUserImpactReport ?? null,
    missedOpportunities: opts.missedOpportunities ?? null,
    riskReward: cqDeep.riskReward ?? null,
    nupl: cqDeep.longTerm?.nupl ?? cqDeep.nupl ?? null,
    sopr30d: cqDeep.longTerm?.sopr30d ?? cqDeep.sopr30d ?? null,
    kimchiPremium: cqDeep.kimchiPremium ?? null,
    upbitPrice: cqDeep.upbitPrice ?? null,
    diff: snapshot.diff ?? null
  };
}

/**
 * Phase 3: Snapshot-native Regular Briefing (EN)
 * @param {Object} snapshotOrPayload - btcSnapshot or legacy payload (backward compat during Task 10 migration)
 * @param {string} [lang='en']
 * @param {Object} [opts] - { psychologicalSupport, nonUserImpactReport, missedOpportunities, grokXAnalysis }
 */
function formatRegularBriefing(snapshotOrPayload, lang = 'en', opts = {}) {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🌤️ Trap Defence BTC - Regular Briefing — No snapshot data available.';
  }
  const isSnapshot = snapshotOrPayload.raw != null;
  if (isSnapshot) {
    const payload = extractPayloadFromSnapshot(snapshotOrPayload, lang, opts);
    if (!payload) return '🌤️ Trap Defence BTC - Regular Briefing — Invalid snapshot.';
    return formatRegularBriefingCore(payload);
  }
  // Backward compat: legacy payload (now, inflow, ...) passed directly
  return formatRegularBriefingCore(snapshotOrPayload);
}

/**
 * Core implementation (legacy payload shape).
 * @deprecated Use formatRegularBriefing(snapshot, lang, opts)
 */
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
  diff = null, // Phase 4: snapshot diff
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

  // Grok X Engine: v2.1 (for Market State Radar and Psychological Insight)
  let grokDisplaySource = grokXAnalysis;
  if (grokXAnalysis && typeof grokXAnalysis === 'object') {
    grokDisplaySource = grokXAnalysis.xEngineReport || grokXAnalysis.summary || null;
  }
  const hasGrokData = grokDisplaySource && typeof grokDisplaySource === 'string' && grokDisplaySource.trim();
  const isGrokOffline = !hasGrokData || /grok offline|live search unavailable|data unavailable/i.test(grokDisplaySource || '');

  const lines = [];
  // ----- 0. Header (Trap Defence OS v2.4 — 行動示唆ゼロ・部分生成禁止) -----
  lines.push('🌤️ Trap Defence BTC - Regular Briefing');
  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';
  if (isHighTrapForHeader) {
    lines.push(`🚨 Trap Defence Alert — ${trapSeverityForHeader} trap risk`);
  } else {
    lines.push('📋 Trap Defence Briefing');
  }
  lines.push(`📅 ${ts}`);
  lines.push('CQ × X × 3AI — Behind-the-Scenes Structure Report');
  lines.push('');

  // ----- 1. Market State Radar (v2.1) -----
  const trapScoreRadar = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : null;
  const trapRiskLabel = trapScoreRadar != null
    ? (trapScoreRadar < 30 ? 'low risk' : trapScoreRadar >= 50 ? 'high risk' : 'moderate')
    : 'N/A';
  const cqRiskText = inflow >= 0
    ? `High exchange inflow → supply returning to market, short-term selling pressure`
    : `Outflow ${Math.abs(inflow || 0).toFixed(0)} BTC → holders securing assets`;
  const sentimentLabelLower = (sentimentLabel || '').toLowerCase();
  const volatilityMode = sentimentLabelLower.includes('fear') || sentimentLabelLower.includes('panic')
    ? 'expansion phase (panic-driven volatility)'
    : sentimentLabelLower.includes('greed') ? 'expansion phase (euphoria-driven)' : 'consolidation';
  const liquidityRegimeText = inflow >= 0
    ? `Thick sell-side liquidity below price; thin above`
    : `Thick buy-side accumulation; liquidity rebalancing`;
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📡 Market State Radar');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`• Trap Score: ${trapScoreRadar != null ? trapScoreRadar + '/100 (' + trapRiskLabel + ')' : 'N/A'}`);
  lines.push(`• CQ Risk: ${cqRiskText}`);
  lines.push(`• X Sentiment: ${hasGrokData && !isGrokOffline ? 'Available' : 'Data missing → interpret as "sentiment silence" (elevated uncertainty)'}`);
  lines.push(`• Macro Pressure: Risk-off dominant`);
  lines.push(`• Liquidity Regime: ${liquidityRegimeText}`);
  lines.push(`• Volatility Mode: ${volatilityMode}`);
  lines.push('');
  // v2.8: Key Metrics MUST use ### Key Metrics (Markdown hierarchy — 見出し強制の最終最終版)
  lines.push('### Key Metrics');
  lines.push(`• BTC Price: ${formatUsd(priceUsd)}`);
  lines.push(`• Netflow: ${inflow >= 0 ? '+' : ''}${(inflow || 0).toFixed(0)} BTC`);
  lines.push(`• MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push(`• Sentiment: ${sentimentLabel || 'Unknown'}`);
  lines.push('');

  // ----- 2. Behind-the-Scenes Structure (v2.4 — NO Summary, NO "…" placeholders, ALL FOUR full paragraphs) -----
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🔬 Behind-the-Scenes Structure');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // GPT CQ Engine: CryptoQuant解析 → Whale Intent, Algo Behavior, Retail Psych Distortion, Liquidity Map
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
  
  // v2.2 フォールバック: 構造のみ、行動示唆ゼロ
  // v2.5: Behind-the-Scenes 4要素のみ、## 階層統一
  if (!gptNewsText || String(gptNewsText || "").trim() === '') {
    const inflowDisplay = inflow >= 0 ? `Inflow ${Math.abs(inflow).toFixed(0)} BTC` : `Outflow ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    gptNewsText = `## 2-1. Whale Intent (structural inference)
${inflow >= 0 ? 'Whale flows indicate controlled absorption or distribution. The inflow spike suggests supply moving to exchanges—either absorption during volatility flush or distribution pressure.' : 'Whale flows suggest holders securing assets. Outflow indicates accumulation or rebalancing.'}

## 2-2. Algo Behavior Patterns
Algos exploit thin liquidity zones created by emotional selling. Patterns show synchronized liquidity hunts followed by mean reversion—automated systems harvesting liquidity before resetting price.

## 2-3. Retail Psychological Distortion
Retail sentiment dominated by ${sentimentLabel || 'neutral'}. If X data is missing, "sentiment silence" is meaningful: retail disengagement often precedes volatility expansion.

## 2-4. Liquidity Map
${inflow >= 0 ? 'Sell-side liquidity dense below price from forced selling and miner distribution (MPI ' + mpiDisplay + '). Above price, liquidity thin—upward move could accelerate if inflows reverse.' : 'Buy-side accumulation visible. Liquidity rebalancing in progress.'}`;
  }

  // v2.5: Scenario Map 重複禁止 — GPT出力内の Scenario Map / Trap Defence Value を除去（テンプレートで表示）
  gptNewsText = gptNewsText.replace(/(\*\*Scenario Map\*\*|## Scenario Map|Scenario Map\s*\().*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Trap Defence Value\*\*.*$/s, '').trim();

  // v2.8: 太字見出し禁止 — **Whale Intent** 等を ## 2-X. に正規化（GPTが**で逃げる余地を潰す）
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent \(structural inference( only)?\)\*\*/g, '## 2-1. Whale Intent (structural inference only)');
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent\*\*(?!\s*\()/g, '## 2-1. Whale Intent');
  gptNewsText = gptNewsText.replace(/\*\*Algo Behavior Patterns\*\*/g, '## 2-2. Algo Behavior Patterns');
  gptNewsText = gptNewsText.replace(/\*\*Retail Psychological Distortion\*\*/g, '## 2-3. Retail Psychological Distortion');
  gptNewsText = gptNewsText.replace(/\*\*Liquidity Map\*\*/g, '## 2-4. Liquidity Map');
  
  // Telegram互換性: Markdown見出し（###）を削除してTelegramネイティブな形式に変換（先に実行）
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '') // ###見出しを削除
    .replace(/^##\s+/gm, '')   // ##見出しを削除
    .replace(/^#\s+/gm, '');   // #見出しを削除
  // プレーンテキストの見出しも改善（「Psychological Interpretation of On-Chain Metrics」など）
  gptNewsDisplay = gptNewsDisplay.replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 Psychological Interpretation of On-Chain Metrics');
  
  // v2.5: Behind-the-Scenes 4要素のみ（Scenario Map は別セクション）— 1400文字まで表示（部分生成禁止）
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
  
  // v2.2: NO Summary before Behind-the-Scenes — structure only, zero action suggestions
  lines.push(gptNewsDisplay);
  lines.push('');

  // ----- 3. Current BTC Structure (v2.1 — structural meaning only) -----
  const currentStructureNote = inflow >= 0 && sentimentLabelLower.includes('fear')
    ? 'BTC is in a "panic-driven supply release phase". This is not a trend reversal—it is liquidity reconfiguration.'
    : inflow >= 0
      ? 'Supply returning to exchanges. Structure suggests distribution or absorption phase.'
      : 'Holders securing assets. Structure suggests accumulation or consolidation.';
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📐 Current BTC Structure');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`• Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`);
  lines.push(`• Structural meaning: ${currentStructureNote}`);
  const keyLevelsNote = inflow >= 0
    ? `• Netflow: +${Math.abs(inflow).toFixed(0)} BTC → supply moving to exchanges`
    : `• Netflow: −${Math.abs(inflow).toFixed(0)} BTC → holders securing assets`;
  lines.push(keyLevelsNote);
  lines.push('');

  // ----- 4. Scenario Map (MANDATORY: 3–5 structural scenarios, NOT trade setups) -----
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🗺️ Scenario Map');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const scenarioBullets = [];
  if (inflow > 0) {
    scenarioBullets.push(`• Supply shock continuation — ${Math.abs(inflow).toFixed(0)} BTC inflow to exchanges may sustain selling pressure`);
  }
  if (mpi != null && mpi > 0.5) {
    scenarioBullets.push(`• Miner pressure increase — MPI ${mpi.toFixed(2)} suggests miner distribution, near-term volatility risk`);
  }
  const sentimentLower = (sentimentLabel || '').toLowerCase();
  if (sentimentLower.includes('fear') || sentimentLower.includes('panic')) {
    scenarioBullets.push(`• Retail panic — ${sentimentLabel} sentiment may drive capitulation or forced selling`);
  }
  if (sentimentLower.includes('greed') || sentimentLower.includes('euphoria')) {
    scenarioBullets.push(`• Retail euphoria — ${sentimentLabel} sentiment may precede distribution traps`);
  }
  if (trapDetection?.trapDetected || hasActiveTrapAlert) {
    scenarioBullets.push(`• Algo-driven volatility — trap conditions (${trapDetection?.trapType || 'anomaly'}) may trigger liquidity hunts`);
  }
  scenarioBullets.push('• Macro regime — ETF flows, rate policy, or external shocks can shift structure');
  const scenariosToShow = scenarioBullets.slice(0, 5);
  scenariosToShow.forEach(b => lines.push(b));
  lines.push('');

  // ----- 5. Data-Backed Evidence / Gemini -----
  // v2.2: On-chain insight — omit from report (行動示唆ゼロ; Gemini output often contains action suggestions)
  // sosovalueArticle kept for future structural-only Macro Engine output
  // Data-Backed Reasons（1ブロック、全言語共通ロジック）
  // Use the same canonical score across all sections to avoid mismatched values.
  const trapScoreForEvidence = effectiveTrapScore;
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 Data-Backed Evidence');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : null;
    const isLowTrap = trapScoreRounded != null && trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded != null && trapScoreRounded >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 Trap Score ${trapScoreRounded}/100 → significant trap risk`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} detected`);
        lines.push(`• Netflow spike → supply moving to exchanges`);
        lines.push(`• Miner MPI elevated → distribution pressure`);
        lines.push(`• Extreme Fear + price divergence → structural trap setup`);
      } else if (isLowTrap) {
        lines.push(`✅ Trap Score ${trapScoreRounded}/100 → low trap risk`);
        lines.push(`• Structure suggests reduced liquidity-hunt pressure`);
      } else {
        lines.push(`⚡ Trap Score ${trapScoreRounded}/100 → moderate trap risk`);
        lines.push(`• Structure mixed — liquidity conditions unclear`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || 'Anomaly').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (Score: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`• On-chain anomalies detected — structure suggests elevated trap conditions`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (Severity: ${trapAlert.severity})`);
      lines.push(`• Structure suggests elevated trap risk`);
    }
    lines.push('');
  }

  // ----- 6. Psychological Insight (Dr. Grok) -----
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Psychological Insight (Dr. Grok)');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X Engine: v2.1 (grokDisplaySource, hasGrokData, isGrokOffline defined earlier)
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
      console.warn('[Regular EN] Japanese characters detected in grokXAnalysis, skipping');
    }
  }
  if (!hasGrokData || isGrokOffline) {
    // v2.1 Grok null fallback: "sentiment silence" with structural meaning
    lines.push('📱 X Sentiment: "Sentiment silence" — Data missing is meaningful. When retail freezes from fear, posting drops. Market enters psychological vacuum—conditions where algos move most freely.');
    lines.push('');
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

  // ----- 7. Trap Defence Value (v2.1 — structural only, no trading) -----
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 Trap Defence Value');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('• Structural clarity — behind-the-scenes visibility (Whale / Algo / Retail / Liquidity)');
  lines.push('• Psychological insight — retail psychology diagnosis');
  lines.push('• CQ × X × 3AI integration — unified analysis of market mechanics');
  lines.push('');

  // ===== Snapshot（5項目に絞る: Price, Netflow, MPI, Sentiment, Trap Score） =====
  lines.push('📋 Snapshot');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  const displayTrapScore = effectiveTrapScore;
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 HIGH RISK' : displayTrapScore >= 40 ? '⚠️ MODERATE' : '✅ LOW';
    lines.push(`🎯 Trap Score: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
  }
  if (diff && diff.summaryText) {
    lines.push(`📊 Diff: ${diff.summaryText}`);
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
