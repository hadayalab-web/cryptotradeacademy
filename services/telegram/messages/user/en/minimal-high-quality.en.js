// 無料ハイクオリティ版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/en/minimal-high-quality.en.js
// Trap Score + 簡易分析 + 簡易Dr. Grokコメント + Mental Note

/**
 * Trap Scoreの説明を取得
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score is being calculated. Please check back later.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score is being calculated. Please check back later.';
  }

  if (score >= 70) {
    return '⚠️ HIGH TRAP RISK: Strong signals indicate potential market traps. Exercise extreme caution';
  } else if (score >= 50) {
    return '⚡ MODERATE TRAP RISK: Some trap indicators detected. Stay vigilant';
  } else if (score >= 30) {
    return '✅ LOW TRAP RISK: Minimal trap indicators. Market conditions appear relatively safe';
  } else {
    return '✅ VERY LOW TRAP RISK: Very few trap indicators detected. Market conditions appear safe';
  }
}

/**
 * What to Avoid（回避行動）を生成
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  if (!trapScore || trapScore < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Trap Dataから回避行動を抽出
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('Avoid LONG positions — High trap risk detected');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Avoid SHORT positions — High trap risk detected');
      }
    }
  }

  // デフォルトの回避行動
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('Avoid entering new positions — Strong trap signals detected');
      avoidItems.push('Wait for clearer market signals before trading');
    } else if (trapScore >= 50) {
      avoidItems.push('Exercise caution — Some trap indicators present');
      avoidItems.push('Consider waiting for better entry opportunities');
    }
  }

  return avoidItems;
}

/**
 * Evidence（根拠）を生成
 */
function generateEvidence(trapData = null, marketData = null) {
  const evidenceItems = [];

  // Trap Dataから根拠を抽出
  if (trapData) {
    if (trapData.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
      const netflow = trapData.exchangeNetflow; // BTC単位
      const absValue = Math.abs(netflow);
      if (netflow < 0) {
        // 流出の場合：ポジティブなシグナルとして表現
        evidenceItems.push(`Exchange Netflow: ${absValue.toFixed(0)} BTC (outflow) — Holders are keeping assets`);
      } else if (netflow > 0) {
        // 流入の場合：注意喚起として表現
        evidenceItems.push(`Exchange Netflow: +${absValue.toFixed(0)} BTC (inflow) — Potential selling pressure`);
      } else {
        evidenceItems.push(`Exchange Netflow: Balanced`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`Whale Ratio: ${whaleRatio.toFixed(0)}% — High selling pressure detected`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`Whale Ratio: ${whaleRatio.toFixed(0)}% — Moderately high selling pressure`);
      } else {
        evidenceItems.push(`Whale Ratio: ${whaleRatio.toFixed(0)}% — Normal range (whale activity is stable)`);
      }
    }
  }

  // Market Dataから根拠を抽出
  if (marketData) {
    if (marketData.mpi !== undefined && marketData.mpi !== null) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`Miner Position Index: ${mpi.toFixed(2)} — Miners are selling (caution needed)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`Miner Position Index: ${mpi.toFixed(2)} — Miners are holding (positive signal)`);
      } else {
        evidenceItems.push(`Miner Position Index: ${mpi.toFixed(2)} — Normal range`);
      }
    }
  }

  // デフォルトの根拠（データがない場合）
  if (evidenceItems.length === 0) {
    evidenceItems.push('On-chain data analysis indicates trap risk');
  }

  return evidenceItems.slice(0, 2); // 最大2つまで
}

/**
 * 簡易的なDr. Grokコメントを生成
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  if (!trapScore || trapScore < 30) {
    // Trap Scoreが低い場合：低リスクでも価値を提供（重複表現を削減）
    const lowRiskMessages = [
      '"Patience is strategic strength. Monitor conditions and act when clarity emerges."',
      '"Low risk now, but markets always change. Stay prepared and alert."',
      '"Defense is not weakness. Quality opportunities require both low risk and clear direction."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"FOMO is high right now. Don\'t let greed override your defense strategy. Wait. This is the most dangerous time."');
  } else if (trapScore >= 50) {
    comments.push('"Stay disciplined. The market is testing your patience. Defense first. Wait for clear signals."');
  } else {
    comments.push('"Good discipline. Keep waiting for clear opportunities. Low risk doesn\'t mean let your guard down."');
  }

  // Sentiment Dataから追加コメント
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"Market sentiment is emotional. This is when traps occur. Stay calm."');
    } else if (sentimentData.sentiment === 'FEAR') {
      comments.push('"Fear is natural. But data-driven decisions protect you."');
    }
  }

  return comments[0] || null;
}

/**
 * Mental Noteを生成
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"Protecting capital is priority #1. Not losing is more important than winning."',
    '"Most market movements are noise. React only to clear, high-quality signals."',
    '"Discipline is the foundation. Quality setups require both low risk and clear direction."',
    '"Defense is the highest form of attack. Protecting capital is where everything begins."',
    '"Patience pays. The best opportunities come when risk is low and direction is clear."',
    '"Stay alert, stay prepared. Markets reward those who wait for quality setups."',
  ];
  
  // 戦略的インサイトで「プロトレーダーは待つ時間を最優先」を使った場合は、メンタルノートでは別のメッセージを選ぶ
  let availableNotes = allMentalNotes;
  if (avoidProTraderMessage) {
    availableNotes = availableNotes.filter(note => !note.includes('professional traders'));
  }
  
  // Dr. Grokのコメントと重複するメッセージを避ける
  if (drGrokComment) {
    // 「70% of the time」を含むコメントの場合は、メンタルノートでも同じフレーズを避ける
    if (drGrokComment.includes('70% of the time') || drGrokComment.includes('70%')) {
      availableNotes = availableNotes.filter(note => !note.includes('70% of the time') && !note.includes('70%'));
    }
    // 「Defense is not weakness」を含むコメントの場合は、メンタルノートでも同じフレーズを避ける
    if (drGrokComment.includes('Defense is not weakness')) {
      availableNotes = availableNotes.filter(note => !note.includes('Defense is not weakness'));
    }
  }
  
  // 利用可能なメッセージがない場合は、すべてから選ぶ
  if (availableNotes.length === 0) {
    availableNotes = allMentalNotes;
  }
  
  const selectedNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
  return selectedNote;
}

/**
 * 無料ハイクオリティ版のTelegramメッセージを生成
 * Trap Score + 簡易分析 + 簡易Dr. Grokコメント + Mental Note
 * 
 * @param {Object} options - メッセージ生成オプション
 * @param {Date} options.now - 現在時刻
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - BTC価格（USD）
 * @param {number|null} options.change24h - 24時間変動率（%）
 * @param {Object} options.trapData - Trap Data（オプション）
 * @param {Object} options.marketData - Market Data（オプション）
 * @param {Object} options.sentimentData - Sentiment Data（オプション）
 * @param {string} options.lang - 言語コード（デフォルト: 'en'）
 * @returns {string} Telegramメッセージ文字列
 */
function formatMinimalHighQualityBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'en',
  score = null, // Market Score (optional, can also be in marketData.score)
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 BTC Price: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 BTC Price: Fetching...';

  const whatToAvoid = generateWhatToAvoid(trapScore, trapData);
  const evidence = generateEvidence(trapData, marketData);
  const drGrokComment = generateDrGrokComment(trapScore, sentimentData);
  
  // 戦略的インサイトで「プロトレーダーは待つ時間を最優先」を使う可能性がある場合は、メンタルノートで避ける
  const trapScoreRounded = trapScore !== null ? Math.round(trapScore) : null;
  const useProTraderMessageInInsight = trapScoreRounded !== null && trapScoreRounded < 50 && trapScoreRounded >= 0;
  const mentalNote = generateMentalNote(trapScore, useProTraderMessageInInsight, drGrokComment);

  let message = `🌤️ Trap Defence BTC - Free Report
🚨 BREAKING: TRAP DEFENCE BRIEFING
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 問題の提示セクション（Trap Scoreに基づいて問題を提示）
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    
    if (trapScoreRounded >= 70) {
      message += `\n\n🚨 The market is showing strong trap signals. Despite what price charts might suggest, on-chain data reveals hidden risks`;
      message += `\n💡 Multiple divergences and anomalies indicate potential market traps. Entering now could expose you to significant risk`;
    } else if (trapScoreRounded >= 50) {
      message += `\n\n⚡ The market is showing moderate trap indicators. Some divergences suggest caution`;
      message += `\n💡 Trap signals are present. Rushing into trades now could lead to losses`;
    } else {
      message += `\n\n✅ Market conditions appear relatively safe, but trap patterns can emerge quickly`;
      message += `\n💡 Even in low-risk conditions, patience is strategic strength`;
    }
  } else if (trapScore !== null && trapScore < 30) {
    // 低リスク時でも簡潔な市場状況を提示
    message += `\n\n💡 Current market conditions are relatively stable, but it's important to always remain vigilant`;
  }

  // Step 2: 証拠（Evidence）セクション
  // 低リスク時でも証拠セクションを常に表示（価値提供のため）
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 Data-Backed Reasons
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
          message += `\n• Miners' Position Index (MPI): ${mpi.toFixed(2)} — Miners are selling (caution needed)`;
        } else if (mpi < 0.5) {
          message += `\n• Miners' Position Index (MPI): ${mpi.toFixed(2)} — Miners are holding (positive signal)`;
        } else {
          message += `\n• Miners' Position Index (MPI): ${mpi.toFixed(2)} — Normal range`;
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
      message += `\n• Sentiment: ${sentimentEmoji} ${sentiment}`;
    }
    
    // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】EvidenceとMental Noteを連動
    // 低リスク時でも説明を追加（価値提供のため）
    if (trapScore !== null) {
      const trapScoreRounded = Math.round(trapScore);
      const marketScore = score ?? marketData?.score ?? null;
      const marketScoreRounded = marketScore !== null ? Math.round(marketScore) : null;
      const isBullish = marketScoreRounded !== null && marketScoreRounded >= 50;
      const isLowTrapRisk = trapScoreRounded < 30;
      
      message += `\n\n💡 Strategic Insights`;
      if (trapScoreRounded >= 70) {
        message += `\n  🚨 Trap Score ${trapScoreRounded}/100: Strong signals indicate potential market traps`;
        message += `\n  🛡️ Strategic preparation is not weakness—it's victory preparation. Exercise extreme caution`;
      } else if (trapScoreRounded >= 50) {
        message += `\n  ⚡ Trap Score ${trapScoreRounded}/100: Moderate trap indicators detected`;
        message += `\n  🛡️ Exercise caution. Monitor market conditions closely before taking action`;
      } else {
        // 低リスク時：市場状況に応じたメッセージ
        if (isLowTrapRisk && isBullish) {
          // 低リスクかつ強気：より積極的なメッセージ
          message += `\n  ✅ Trap Score ${trapScoreRounded}/100: Low trap risk detected`;
          message += `\n  📈 Market conditions appear favorable (Score: ${marketScoreRounded}/100). Monitor for clear entry opportunities`;
          message += `\n  💡 Low risk + bullish momentum = favorable conditions. Stay alert for quality setups`;
        } else if (isLowTrapRisk) {
          // 低リスクだが中立/弱気：標準的な防御メッセージ
          message += `\n  ✅ Trap Score ${trapScoreRounded}/100: Currently low trap risk`;
          message += `\n  🛡️ Market conditions are stable. Maintain discipline and wait for high-quality opportunities`;
          message += `\n  💡 Patience pays. Quality setups require both low risk and clear market direction`;
        } else {
          // フォールバック（scoreが取得できない場合）
          message += `\n  ✅ Trap Score ${trapScoreRounded}/100: Currently low trap risk, but markets always change`;
          message += `\n  🛡️ Maintain discipline. Monitor conditions and wait for clear signals`;
        }
      }
    }
  }

  // Step 3: 解決策（What to Avoid）
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 What to Avoid
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Step 4: 成功する結末（Dr. Grok Comment + Mental Note）
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grok's Quick Insight
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

  // CTA（アップセル最適化：開発資金確保のため緊迫感のあるCTA）
  // VSL2とWhopリンクは別途配信されるため、定期配信のMinimal Briefingには含めない
  // GPT評価に基づく改善: より具体的な利点提示に変更
  
  // Trap Scoreに基づいてCTAのメッセージを動的に変更（234行目で既に宣言済みのtrapScoreRoundedを再利用）
  let ctaHeadline = '';
  let ctaUrgency = '';
  
  if (trapScoreRounded !== null && trapScoreRounded >= 50) {
    // 中リスク以上: 緊急性を強調
    ctaHeadline = '🚨 Upgrade Now: Get Real-Time Trap Alerts Before You Lose Capital';
    ctaUrgency = '⚠️ Right now, trap signals are detected. Free users only see the score—YOU need the full defense system to protect your capital.';
  } else {
    // 低リスク: 価値提案を強調
    ctaHeadline = '🚀 Upgrade Now: Get Detailed Trade Signals & Real-Time Alerts';
    ctaUrgency = '💡 Low risk now, but markets change fast. Upgrade to get instant alerts when traps form.';
  }
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
${ctaHeadline}

${ctaUrgency}

✨ What Full Members Get (That You're Missing):

🎯 Real-Time Trap Alerts
• AVOID-LONG / AVOID-SHORT / STANDBY signals (instant notifications)
• Exit Map guidance (know exactly when to exit)
• NO TRADE alerts (avoid losses before they happen)

📊 Complete Intelligence Report
• Full on-chain analysis (all indicators in real-time)
• AI-powered market insights & trap detection (24/7 monitoring)
• Real-time X sentiment analysis (predict market emotions)

💊 Full Dr. Grok Psychological Support
• Mental block resolution (overcome FOMO, FEAR, GREED)
• Personalized mental training guidance
• Psychological state diagnosis

💎 All of this is designed to protect your capital

📊 Free vs Full Version
• Free: Trap Score only (directional hint)
• Full: All data + Real-time alerts (specific action plan)

🛡️ One missed signal can determine whether you protect or lose your capital

🎯 Upgrade now and get the complete defense system

━━━━━━━━━━━━━━━━━━━━
This is a free report. For detailed analysis and trap alerts, upgrade to Trap Defence BTC

For educational purposes only. Not financial advice`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
