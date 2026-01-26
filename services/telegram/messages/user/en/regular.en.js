// Tier1 BTC regular briefing (EN)
// services/telegram/messages/user/en/regular.en.js

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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
  showContent = null, // Gemini番組プロデューサーの結果（テキストベース）
  // ニュース番組構造用パラメータ
  gptReporterAnalysis, // GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
  grokXAnalysis, // Grok X解析結果（Xセンチメント分析）
  // GrokとGeminiの統合最適化結果
  integratedOptimization, // Grok Xアルゴリズム解析 × Gemini深層心理解析の統合結果
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
  // Trap alerts only (BUY/SELL/LONG/SHORT completely removed)
  if (trapAlert && trapAlert.alert) {
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
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isNoTrade = true; // Always standby mode (BUY/SELL signals completely removed)
  
  // Trade Verdictの表記最適化: Standby状態の時は「Waiting for Trigger」や「TBD」と表記
  const entryLine = isNoTrade
    ? '• Entry: Preparing for Victory — Waiting for Clear Trigger'
    : `• Entry (spot ref.): ${formatUsd(priceUsd)}`;
  const tpLine = isNoTrade
    ? '• Take Profit: TBD (To Be Determined)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a');
  const slLine = isNoTrade
    ? '• Stop Loss: TBD (To Be Determined)'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a');
  const rrLine = isNoTrade
    ? '• Risk/Reward (RR): Standby'
    : (tradeSignal?.rr != null ? `• Risk/Reward (RR): ${tradeSignal.rr.toFixed(2)}` : '');

  const modeLine = isNoTrade
    ? '• Mode: Trap Standby — wait for clear edge. Prioritize defense.'
    : '';

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
  // COO最適化: 緊急感強化
  const urgencyLevel = (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) ? 'CRITICAL' : 'URGENT';
  lines.push(`🚨 ${urgencyLevel} ALERT: Trap Defence Crisis Briefing`);
  lines.push(`📅 ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（最上部に配置） =====
  lines.push('🎯 Trade Verdict');
  lines.push(`${dirEmoji} Signal: ${dirLabel}`);
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
    lines.push('🤔 CONTRADICTION ALERT');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Market Score: ${Math.round(score)}/100 (Neutral/Stable)`);
    lines.push(`BUT Exchange Netflow: +${Math.abs(inflow).toFixed(0)} BTC IN`);
    lines.push(`AND Sentiment: ${sentimentLabel}`);
    lines.push('');
    lines.push(`⚠️ This contradiction signals: Low risk BUT selling pressure building.`);
    lines.push(`   Estimated ${whaleRatioEstimate.toFixed(0)}% whale ratio = $${whaleDollarValue}M+ ready to sell.`);
    lines.push(`   What does this mean for YOUR capital?`);
    lines.push('');
  }

  // ===== 【コア機能ハイライト】3つの強み =====
  lines.push('✨ Today\'s Highlights (3 Core Features)');
  lines.push('');
  
  // Core Feature 1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    let trapType = trapData.trapType || trapData.bugType || 'Anomaly';
    // アンダースコアをスペースに変換して読みやすくする
    trapType = trapType.replace(/_/g, ' ');
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ Core Feature 1: Trap Defense - ${trapEmoji} ${trapType} (Score: ${trapScore.toFixed(0)}/100)`);
    
    // Display score calculation components (transparency)
    if (trapData.details) {
      const components = [];
      if (trapData.details.multipleDivergences >= 3) {
        components.push(`Multiple Divergences (${trapData.details.multipleDivergences})`);
      } else if (trapData.details.multipleDivergences >= 2) {
        components.push(`Multiple Divergences (${trapData.details.multipleDivergences})`);
      }
      if (trapData.details.anomalyDetected) {
        components.push('High-Res Anomaly');
      }
      if (trapData.details.accelerationDetected) {
        components.push('Trend Acceleration');
      }
      if (Math.abs(trapData.details.onchainSocialDivergence || 0) > 40) {
        components.push('Whale/Retail Divergence');
      }
      if (trapData.details.priceOnchainDivergence) {
        components.push('Price/Onchain Divergence');
      }
      if (trapData.details.priceSocialDivergence) {
        components.push('Price/Sentiment Divergence');
      }
      if (components.length > 0) {
        lines.push(`   📊 Components: ${components.join(' + ')}`);
      }
    }
    
    // Display trap alert details if available
    if (trapAlert && trapAlert.alert) {
      const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
      const recommendationText = trapAlert.recommendation ? trapAlert.recommendation.replace(/_/g, '-') : 'UNKNOWN';
      lines.push(`   🚨 Alert Type: ${alertTypeText} (Severity: ${trapAlert.severity})`);
      lines.push(`   💡 Recommendation: ${recommendationText}`);
      if (trapAlert.confidence) {
        lines.push(`   📊 Confidence: ${(trapAlert.confidence * 100).toFixed(0)}%`);
      }
    }
  } else {
    lines.push('🛡️ Core Feature 1: Trap Defense - No trap detected currently');
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
  
  // 文字数制限を緩和して、重要な情報が切れないようにする（600文字まで）
  const gptNewsLimit = 600;
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
  
  // Core Feature 2: Geminiコンテンツ生成（テキストベース版）
  if (showContent) {
    // 【改善1: ストーリー構造の明確化】「問題の提示 → 証拠 → 解決策 → 成功する結末」の流れを明確化
    const storyArcText = showContent.narrativeArc?.open || '';
    const dataPresentationText = showContent.dataPresentation?.problemVisualization || '';
    
    // 【改善1: 証拠セクションの独立】Evidenceセクションを独立させて明確に表示
    const evidenceText = showContent.evidence || null;
    // Trap ScoreやTrap Risk Scoreから証拠を生成（showContentにevidenceがない場合のフォールバック）
    // 優先順位: trapDetection.trapScore > trapScoreパラメータ > trapRisk.trapRiskScore
    const trapDataForEvidence = trapDetection || marketBug;
    let trapScoreForEvidence = null;
    if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
      trapScoreForEvidence = trapDetection.trapScore;
    } else if (trapScore != null && trapScore > 0) {
      trapScoreForEvidence = trapScore;
    } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
      trapScoreForEvidence = trapRisk.trapRiskScore;
    } else if (trapDataForEvidence?.trapScore != null && trapDataForEvidence.trapScore > 0) {
      trapScoreForEvidence = trapDataForEvidence.trapScore;
    }
    const trapTypeForEvidence = trapDataForEvidence?.trapType || trapDataForEvidence?.bugType || null;
    
    // 重複チェック: テキストの類似度をチェック（完全一致だけでなく、部分的な重複も検出）
    const isDuplicate = storyArcText && dataPresentationText && (
      storyArcText.trim() === dataPresentationText.trim() ||
      dataPresentationText.includes(storyArcText.trim()) ||
      storyArcText.includes(dataPresentationText.trim())
    );
    
    // Step 1: 問題の提示（Story Arc）
    if (storyArcText || (!isDuplicate && dataPresentationText)) {
      
      // Story Arcを優先表示（問題の提示）
      if (storyArcText) {
        lines.push(storyArcText);
        // Data Presentationが重複しておらず、Story Arcに追加情報を提供する場合のみ表示
        if (!isDuplicate && dataPresentationText && 
            dataPresentationText.length > storyArcText.length * 1.5) {
          // Data PresentationがStory Arcより50%以上長い場合のみ追加情報として表示
          lines.push('');
          lines.push(`📊 Market Analysis: ${dataPresentationText}`);
        }
      } else if (dataPresentationText) {
        // Story Arcがない場合のみData Presentationを表示
        lines.push(dataPresentationText);
      }
      lines.push('');
    }
    
    // Step 2: 証拠（Evidence）セクションを独立させて明確に表示
    if (evidenceText || trapScoreForEvidence !== null) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('📊 Data-Backed Reasons');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      
      if (evidenceText) {
        lines.push(evidenceText);
      } else {
        // フォールバック: Trap ScoreやTrap Risk Scoreから証拠を生成
        if (trapScoreForEvidence !== null) {
          const trapScoreRounded = Math.round(trapScoreForEvidence);
          if (trapScoreRounded >= 50) {
            lines.push(`🎯 Trap Score: ${trapScoreRounded}/100 indicates significant trap risk`);
            if (trapTypeForEvidence) {
              const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
              lines.push(`⚠️ Trap Type: ${trapTypeDisplay} detected`);
            }
            lines.push(`💡 Evidence: Multiple divergences and on-chain anomalies suggest a "Wait-and-See" mode is prudent`);
            lines.push(`📈 Why Wait? The data shows ${trapScoreRounded >= 70 ? 'strong' : 'moderate'} signals that entering now could expose you to market traps`);
          } else {
            lines.push(`✅ Trap Score: ${trapScoreRounded}/100 indicates low trap risk`);
            lines.push(`💡 Evidence: Trap Score's at ${trapScoreRounded}/100—about as clean as it gets. But here's the thing: traps build in the quiet`);
          }
        }
      }
      
      // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】
      // 戦略的インサイトセクションを追加
      if (trapScoreForEvidence !== null) {
        const trapScoreRounded = Math.round(trapScoreForEvidence);
        const marketScore = Math.round(score ?? 0);
        const isBullish = marketScore >= 50;
        const isLowTrapRisk = trapScoreRounded < 30;
        
        lines.push('');
        lines.push(`💡 Strategic Insights`);
        if (trapScoreRounded >= 70) {
          lines.push(`  🚨 Trap Score ${trapScoreRounded}/100: Strong signals indicate potential market traps`);
          lines.push(`  📊 The data shows multiple divergences and on-chain anomalies`);
          lines.push(`  🛡️ Strategic preparation is not weakness—it's victory preparation. Don't confuse red candles with real risk`);
        } else if (trapScoreRounded >= 50) {
          lines.push(`  ⚡ Trap Score ${trapScoreRounded}/100: Moderate trap indicators detected`);
          lines.push(`  📊 Some divergences suggest caution`);
          lines.push(`  🛡️ Your brain wants to do the wrong thing here. Wait for confirmation before jumping in`);
        } else {
          // 低リスク時：市場状況に応じたメッセージ
          if (isLowTrapRisk && isBullish) {
            // 低リスクかつ強気：より積極的なメッセージ
            lines.push(`  ✅ Trap Score ${trapScoreRounded}/100: Low trap risk detected`);
            lines.push(`  📈 Score's at ${marketScore}/100—conditions look good. But cash is a position too. Wait for quality setups`);
            lines.push(`  💡 Low risk + bullish momentum = favorable conditions. Stay alert for quality setups`);
          } else if (isLowTrapRisk) {
            // 低リスクだが中立/弱気：標準的な防御メッセージ
            lines.push(`  ✅ Trap Score ${trapScoreRounded}/100: Currently low trap risk`);
            lines.push(`  🛡️ The data's clean, but discipline beats FOMO. Wait for quality setups`);
            lines.push(`  💡 Patience pays. Quality setups require both low risk and clear market direction`);
          } else {
            // フォールバック（scoreが取得できない場合）
            lines.push(`  ✅ Trap Score ${trapScoreRounded}/100: Currently low trap risk, but markets always change`);
            lines.push(`  🛡️ Maintain discipline. Monitor conditions and wait for clear signals`);
          }
        }
      }
      lines.push('');
    }
  } else if (hasGeminiContent) {
    // 後方互換性: 画像・動画版（現在は使用されない）
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】NanoBanana Infographic');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 Check attached image/video!');
    lines.push('');
  } else {
    // showContentがない場合でも証拠セクションと戦略的インサイトセクションを表示
    // Trap RiskスコアまたはTrap Detectionスコアから証拠を生成
    // 優先順位: trapDetection.trapScore > trapScoreパラメータ > trapRisk.trapRiskScore
    let trapScoreForEvidence = null;
    if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
      trapScoreForEvidence = trapDetection.trapScore;
    } else if (trapScore != null && trapScore > 0) {
      trapScoreForEvidence = trapScore;
    } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
      trapScoreForEvidence = trapRisk.trapRiskScore;
    }
    const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
    
    // データに基づく理由セクション（常に表示して価値を提供）
    if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('📊 Data-Backed Reasons');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      
      if (trapScoreForEvidence !== null) {
        const trapScoreRounded = Math.round(trapScoreForEvidence);
        if (trapScoreRounded >= 50) {
          lines.push(`🎯 Trap Score: ${trapScoreRounded}/100 indicates significant trap risk`);
          if (trapTypeForEvidence) {
            const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
            lines.push(`⚠️ Trap Type: ${trapTypeDisplay} detected`);
          }
          lines.push(`💡 Evidence: Multiple divergences and on-chain anomalies suggest a "Wait-and-See" mode is prudent`);
          lines.push(`📈 Why Wait? The data shows ${trapScoreRounded >= 70 ? 'strong' : 'moderate'} signals that entering now could expose you to market traps`);
        } else {
          lines.push(`✅ Trap Score: ${trapScoreRounded}/100 indicates low trap risk`);
          lines.push(`💡 Evidence: Trap Score's at ${trapScoreRounded}/100—about as clean as it gets. But here's the thing: traps build in the quiet`);
        }
      } else if (trapDetection || trapAlert) {
        // フォールバック: trapDetectionやtrapAlertから証拠を生成
        if (trapDetection && trapDetection.trapDetected) {
          const trapTypeText = (trapDetection.trapType || 'Anomaly').replace(/_/g, ' ');
          lines.push(`🎯 Trap Detection: ${trapTypeText} (Score: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
          lines.push(`💡 Evidence: Multiple on-chain anomalies detected based on data`);
        } else if (trapAlert && trapAlert.alert) {
          const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
          lines.push(`🚨 Trap Alert: ${alertTypeText} (Severity: ${trapAlert.severity})`);
          lines.push(`💡 Evidence: Market trap risk detected based on on-chain data and sentiment analysis`);
        }
      }
      
      // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】
      // 戦略的インサイトセクションを追加
      if (trapScoreForEvidence !== null) {
        const trapScoreRounded = Math.round(trapScoreForEvidence);
        const marketScore = Math.round(score ?? 0);
        const isBullish = marketScore >= 50;
        const isLowTrapRisk = trapScoreRounded < 30;
        
        lines.push('');
        lines.push(`💡 Strategic Insights`);
        if (trapScoreRounded >= 70) {
          lines.push(`  🚨 Trap Score ${trapScoreRounded}/100: Strong signals indicate potential market traps`);
          lines.push(`  📊 The data shows multiple divergences and on-chain anomalies`);
          lines.push(`  🛡️ Strategic preparation is not weakness—it's victory preparation. Don't confuse red candles with real risk`);
        } else if (trapScoreRounded >= 50) {
          lines.push(`  ⚡ Trap Score ${trapScoreRounded}/100: Moderate trap indicators detected`);
          lines.push(`  📊 Some divergences suggest caution`);
          lines.push(`  🛡️ Your brain wants to do the wrong thing here. Wait for confirmation before jumping in`);
        } else {
          // 低リスク時：市場状況に応じたメッセージ
          if (isLowTrapRisk && isBullish) {
            // 低リスクかつ強気：より積極的なメッセージ
            lines.push(`  ✅ Trap Score ${trapScoreRounded}/100: Low trap risk detected`);
            lines.push(`  📈 Score's at ${marketScore}/100—conditions look good. But cash is a position too. Wait for quality setups`);
            lines.push(`  💡 Low risk + bullish momentum = favorable conditions. Stay alert for quality setups`);
          } else if (isLowTrapRisk) {
            // 低リスクだが中立/弱気：標準的な防御メッセージ
            lines.push(`  ✅ Trap Score ${trapScoreRounded}/100: Currently low trap risk`);
            lines.push(`  🛡️ The data's clean, but discipline beats FOMO. Wait for quality setups`);
            lines.push(`  💡 Patience pays. Quality setups require both low risk and clear market direction`);
          } else {
            // フォールバック（scoreが取得できない場合）
            lines.push(`  ✅ Trap Score ${trapScoreRounded}/100: Currently low trap risk, but markets always change`);
            lines.push(`  🛡️ Maintain discipline. Monitor conditions and wait for clear signals`);
          }
        }
      }
      lines.push('');
    }
  }
  
  // 【解説】GPTリポーターの詳細解説（既にオープニングで表示済みの場合は省略）
  // 必要に応じて追加の解説セクションをここに追加可能
  
  // 【コメンテーター】Dr. Grokメンタルコーチ（固定コーナー）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Dr. Grok\'s Quick Insight');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // ===== GrokとGeminiの統合最適化結果を表示 =====
  if (integratedOptimization && integratedOptimization.integrated && integratedOptimization.optimization) {
    const opt = integratedOptimization.optimization;
    
    // エラーコードを多言語メッセージに変換（英語）
    const errorMessages = {
      GROK_UNAVAILABLE: 'Grok X algorithm analysis is unavailable',
      GROK_ERROR: 'Error occurred in Grok X algorithm analysis',
      GEMINI_UNAVAILABLE: 'Gemini deep psychology analysis is unavailable',
      GEMINI_ERROR: 'Error occurred in Gemini deep psychology analysis',
    };
    
    // エラーメッセージの表示（部分的な統合の場合）
    if (integratedOptimization.errorCodes && integratedOptimization.errorCodes.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('⚠️ Some analyses are unavailable');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      integratedOptimization.errorCodes.forEach(code => {
        const msg = errorMessages[code] || code;
        lines.push(`   • ${msg}`);
      });
      lines.push('   💡 Displaying available results only');
      lines.push('');
    }
    
    // Grok由来のデータがあるかチェック（sourcesベース）
    const hasGrok = !!integratedOptimization.sources?.grok && !integratedOptimization.sources.grok.error;
    
    // X Algorithm Optimization Insights (from Grok analysis) - sourcesベースで表示判定
    if (hasGrok && opt.content && (opt.content.questionCTA || opt.engagementBoosters || opt.viralPotential !== undefined)) {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('📱 X Post Optimization (Available Range)');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      
      if (opt.content.questionCTA) {
        lines.push(`💡 Engagement Strategy: ${opt.content.questionCTA}`);
      }
      
      if (opt.engagementBoosters && opt.engagementBoosters.length > 0) {
        lines.push(`🚀 Engagement Boosters: ${opt.engagementBoosters.slice(0, 3).join(', ')}`);
      }
      
      // バイラル可能性を強調表示（重要情報）- 区切り線は1回のみ
      if (opt.viralPotential !== null && opt.viralPotential !== undefined) {
        const viralScore = Math.round(opt.viralPotential);
        const viralEmoji = viralScore >= 70 ? '🔥' : viralScore >= 50 ? '⚡' : '💡';
        const viralLabel = viralScore >= 70 ? '[HIGH]' : viralScore >= 50 ? '[MEDIUM]' : '[LOW]';
        lines.push(`   ${viralEmoji} ${viralLabel} Viral Potential Score: ${viralScore}/100`);
        if (opt.viralFactors && opt.viralFactors.length > 0) {
          lines.push(`   📊 Key Factors: ${opt.viralFactors.slice(0, 2).join(', ')}`);
        }
      }
      
      if (opt.timing && opt.timing.length > 0) {
        lines.push(`⏰ Optimal Posting Times: ${opt.timing.slice(0, 2).join(', ')}`);
      }
      
      lines.push('');
    }
    
    // Gemini由来のデータがあるかチェック（sourcesベース）
    const hasGemini = !!integratedOptimization.sources?.gemini && !integratedOptimization.sources.gemini.error;
    
    // Deep Psychological Insights (from Gemini analysis) - 重要情報として強調表示（sourcesベースで表示判定）
    if (hasGemini && opt.psychologicalInsights) {
      const psyInsights = opt.psychologicalInsights;
      
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('🧠 [IMPORTANT] Deep Psychological Insights');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      
      if (psyInsights.currentState && psyInsights.currentState !== 'NEUTRAL') {
        const stateEmoji = psyInsights.currentState === 'FOMO' ? '😰' :
                           psyInsights.currentState === 'FEAR' ? '😨' :
                           psyInsights.currentState === 'GREED' ? '😍' :
                           psyInsights.currentState === 'PANIC' ? '😱' :
                           psyInsights.currentState === 'EUPHORIA' ? '😄' :
                           psyInsights.currentState === 'CONFUSION' ? '🤔' : '😐';
        lines.push(`💚 Psychological State: ${stateEmoji} ${psyInsights.currentState}`);
      }
      
      if (psyInsights.mentalBlocks && psyInsights.mentalBlocks.length > 0) {
        lines.push(`🚧 Mental Blocks: ${psyInsights.mentalBlocks.slice(0, 2).join(', ')}`);
      }
      
      // ブレークスルーインサイトを強調表示（区切り線はセクション開始のみ）
      if (psyInsights.breakthroughInsights && psyInsights.breakthroughInsights.length > 0) {
        lines.push(`   💡 [IMPORTANT] Breakthrough Insights:`);
        psyInsights.breakthroughInsights.slice(0, 2).forEach(insight => {
          lines.push(`   🔥 ${insight}`);
        });
      }
      
      if (psyInsights.personalizedCoaching && psyInsights.personalizedCoaching.trim()) {
        const coachingLimit = 300;
        let coachingDisplay = psyInsights.personalizedCoaching;
        if (coachingDisplay.length > coachingLimit) {
          coachingDisplay = coachingDisplay.slice(0, coachingLimit) + '…';
        }
        lines.push(`💊 Personalized Coaching:`);
        lines.push(`"${coachingDisplay}"`);
      }
      
      lines.push('');
    }
  }
  
  // Grok X解析結果（Xセンチメント分析）- 統合最適化がない場合のフォールバック
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    const grokXLimit = 600;
    let grokXDisplay = grokXAnalysis;
    if (grokXAnalysis.length > grokXLimit) {
      // 文の終わりで切るようにする（最後の文の終わりを探す）
      const truncated = grokXAnalysis.slice(0, grokXLimit);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?'),
        truncated.lastIndexOf('\n')
      );
      // 文の終わりが見つかった場合、その位置で切る
      if (lastSentenceEnd > grokXLimit * 0.7) {
        grokXDisplay = truncated.slice(0, lastSentenceEnd + 1) + '…';
      } else {
        // 文の終わりが見つからない場合、単純に切る
        grokXDisplay = truncated + '…';
      }
    }
    lines.push(`📱 X Sentiment Analysis: ${grokXDisplay}`);
    lines.push('');
  }
  
  // Dr. Grokの心理的サポート（メンタルコーチとして、具体的な心理的アドバイスを含む）- 統合最適化がない場合のフォールバック
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
    
    // 具体的な心理的アドバイスを追加
    if (psychologicalSupport.psychologicalAdvice) {
      lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
    }
    
    lines.push('');
    
    // Dr. Grokの「Mental Note」を独立した枠として強調表示
    lines.push('');
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Your brain\'s dopamine system is firing intensely right now. This is the trap. Take 3 deep breaths. The urge to chase is not insight—it\'s chemistry. Wait for the pullback.';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = 'Fear is protecting you, but it can also paralyze you. The market isn\'t collapsing—this is normal volatility. Check the data, not your emotions.';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = 'Greed is dopamine overload. Your brain wants more, but the market is telling you to wait. This euphoria is a trap. Protect your capital first.';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = 'Panic is your amygdala hijacking your prefrontal cortex. Stop. Breathe. The data shows this is temporary. Don\'t make decisions in panic mode.';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'Boredom tolerance is a more powerful weapon than leverage. Today, have the courage to close the screen. This "neutral" sentiment may be masking trap conditions.';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = 'Euphoria is the market\'s way of making you forget risk. When everyone is celebrating, that\'s when traps are set. Stay disciplined.';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = 'Confusion is your brain asking for clarity. Don\'t force a trade. When in doubt, wait. The market will reveal itself when it\'s ready.';
    } else {
      mentalNote = 'Patience is not weakness—it\'s strategic strength. The best traders know when not to trade.';
    }
    
    if (mentalNote) {
      lines.push(`💊 Dr. Grok's Mental Note:`);
      lines.push(`"${mentalNote}"`);
    }
  } else if (!integratedOptimization || !integratedOptimization.integrated) {
    // フォールバック: データが取得できない場合でも価値のあるメッセージを提供
    lines.push('💚 Psychological State: 😐 NEUTRAL (Risk: 💡 LOW)');
    lines.push('');
    lines.push('   💡 Market conditions are relatively stable. Maintain discipline');
    lines.push('');
    lines.push('💊 Dr. Grok\'s Mental Note:');
    lines.push('"Patience is not weakness—it\'s strategic strength. The best traders know when not to trade."');
  }
  
  lines.push('');

  // COO最適化: FOMO強化（有料版の価値を明確化）
  // GPT評価に基づく改善: より具体的な利点と価値を強調
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 THIS IS WHY YOU PAID FOR THIS REPORT');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('While free users see only the score, YOU get:');
  lines.push('');
  lines.push('🎯 Real-Time Action Signals:');
  lines.push('✅ AVOID-LONG / AVOID-SHORT / STANDBY alerts (instant notifications)');
  lines.push('✅ Exit Map guidance (know exactly when to exit)');
  lines.push('✅ NO TRADE alerts (avoid losses before they happen)');
  lines.push('');
  lines.push('📊 Deep Intelligence Analysis:');
  lines.push('✅ Complete on-chain analysis (CryptoQuant data, all indicators)');
  lines.push('✅ AI-powered trap pattern detection (24/7 monitoring)');
  lines.push('✅ Real-time X sentiment analysis (predict market emotions)');
  lines.push('');
  lines.push('💊 Full Psychological Support:');
  lines.push('✅ Dr. Grok\'s mental coaching (overcome FOMO, FEAR, GREED)');
  lines.push('✅ Personalized mental training guidance');
  lines.push('✅ Psychological state diagnosis & block resolution');
  lines.push('');
  lines.push('🛡️ One missed signal = Lost capital. This is why you paid for this report.');
  lines.push('');

  // ===== 基本市場データ（補足情報として後半に配置） =====
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);
  lines.push(''); // 空白行を追加して視覚的な区切りを作る

  // Phase 2: trapScore表示（EN市場専用）- 視覚的に強調（絵文字と空白行で強調）
  // 優先順位: trapDetection.trapScore > trapScoreパラメータ > trapRisk.trapRiskScore
  let displayTrapScore = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore >= 0) {
    displayTrapScore = trapDetection.trapScore;
  } else if (trapScore != null && trapScore >= 0) {
    displayTrapScore = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore >= 0) {
    displayTrapScore = trapRisk.trapRiskScore;
  }
  
  // Trap Scoreを表示（0以上の場合）
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 HIGH RISK' : displayTrapScore >= 40 ? '⚠️ MODERATE' : '✅ LOW';
    // 太字は使わず、絵文字と空白行で視覚的に強調
    const trapScoreLine = `🎯 Trap Score: ${trapScoreRounded}/100 ${trapScoreEmoji}`;
    lines.push(trapScoreLine);
    lines.push(''); // Trap Scoreの後に空白行を追加して視覚的に強調
  }

  // Whale Ratio情報（EN市場専用）- Trap Scoreがnullでも表示
  // PR #14: whaleFlows の構造が { whaleRatio, isHighPressure, interpretation } に変更
  // 重要: whaleFlowsが存在し、whaleRatioがnullでない場合に表示
  if (whaleFlows && whaleFlows.whaleRatio != null) {
    // whaleRatioは0-1の範囲の数値として返される（deepMetrics.js参照）
    // パーセンテージに変換（0.56 -> 56%）
    const whaleRatioValue = typeof whaleFlows.whaleRatio === 'number' 
      ? whaleFlows.whaleRatio * 100 
      : parseFloat(whaleFlows.whaleRatio) * 100 || 0;
    const isHighPressure = whaleFlows.isHighPressure === true || whaleRatioValue >= 80;
    const whaleLine = `🐋 Whale Ratio: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(High Pressure)' : '(Normal)'}`;
    lines.push(whaleLine);
  } else if (whaleFlows) {
    // デバッグ用: whaleFlowsは存在するがwhaleRatioがnullの場合
    console.warn('[Regular EN] whaleFlows exists but whaleRatio is null:', whaleFlows);
  }

  // Liquidations情報（EN市場専用）- Trap Scoreがnullでも表示
  // PR #14: liquidations の構造が { longLiquidations, shortLiquidations, totalLiquidations } に変更
  const totalLiquidations = typeof liquidations === 'number' 
    ? liquidations 
    : (liquidations?.totalLiquidations ?? 0);
  if (totalLiquidations > 0) {
    if (typeof liquidations === 'object' && liquidations.longLiquidations != null && liquidations.shortLiquidations != null) {
      const liqLine = `💥 24h Liquidations: ${formatUsd(totalLiquidations)} (Long: ${formatUsd(liquidations.longLiquidations)}, Short: ${formatUsd(liquidations.shortLiquidations)})`;
      lines.push(liqLine);
    } else {
      const liqLine = `💥 24h Liquidations: ${formatUsd(totalLiquidations)}`;
      lines.push(liqLine);
    }
  }

  lines.push(trapLine);
  
  // Phase1-Product: Trap Riskスコア表示
  if (trapRisk && trapRisk.trapRiskScore != null) {
    const riskEmoji = trapRisk.riskLevel === 'CRITICAL' ? '🚨' : 
                      trapRisk.riskLevel === 'HIGH' ? '⚠️' : 
                      trapRisk.riskLevel === 'MEDIUM' ? '⚡' : '✅';
    const trapRiskLine = `${riskEmoji} Trap Risk Score: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
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
    const noTradeLine = `${noTradeEmoji} NO TRADE Alert (${noTradeAlert.confidence} confidence, Risk Score: ${noTradeAlert.riskScore}/100)`;
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
  
  lines.push('');
  
  // Phase1-Product: Exit Map表示（簡略化：最大8行）
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
