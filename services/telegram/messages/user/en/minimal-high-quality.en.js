// 無料ハイクオリティ版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/en/minimal-high-quality.en.js
// Trap Score + 簡易分析 + 簡易Dr. Grokコメント + Mental Note

/**
 * Trap Scoreのフックラインを取得（ネイティブ調）
 */
function getTrapScoreHook(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score is calculating. Hang tight.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score is calculating. Hang tight.';
  }

  if (score >= 70) {
    return 'Do not trade fast. Protect capital. Defense mode active.';
  } else if (score >= 50) {
    return 'Mixed zone. Wait for confirmation before entering.';
  } else if (score >= 30) {
    return 'Chart looks scary. Data isn\'t screaming "trap."';
  } else {
    return 'Looks scary, data says clean (for now). Don\'t get complacent.';
  }
}

/**
 * What to Avoid（回避行動）を生成
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Trap Dataから回避行動を抽出
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('Avoid LONG positions — Defense mode active');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Avoid SHORT positions — Defense mode active');
      }
    }
  }

  // デフォルトの回避行動（ネイティブ調）
  if (avoidItems.length === 0) {
    if (score >= 70) {
      avoidItems.push('Do not trade fast — Protect capital');
      avoidItems.push('Wait for clearer signals');
    } else if (score >= 50) {
      avoidItems.push('Mixed zone — Wait for confirmation');
      avoidItems.push('Better entry opportunities coming');
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
        // 流出の場合：ネイティブ調な表現
        evidenceItems.push(`Exchange netflow: **${absValue.toFixed(0)} BTC outflow** → coins leaving exchanges (less immediate sell pressure)`);
      } else if (netflow > 0) {
        // 流入の場合：ネイティブ調な表現
        evidenceItems.push(`Exchange netflow: **+${absValue.toFixed(0)} BTC inflow** → potential selling pressure`);
      } else {
        evidenceItems.push(`Exchange netflow: Balanced`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → watch, but not panic`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → moderate pressure`);
      } else {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → normal range`);
      }
    }
  }

  // Market Dataから根拠を抽出
  if (marketData) {
    if (marketData.mpi !== undefined && marketData.mpi !== null) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → miners selling (caution)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → miners holding`);
      } else {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → normal range`);
      }
    }
  }

  // デフォルトの根拠（データがない場合、ネイティブ調）
  if (evidenceItems.length === 0) {
    evidenceItems.push('On-chain data shows mixed signals');
  }

  return evidenceItems.slice(0, 2); // 最大2つまで
}

/**
 * 簡易的なDr. Grokコメントを生成
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  const trapScoreNum = trapScore != null ? Number(trapScore) : null;
  if (trapScoreNum == null || isNaN(trapScoreNum) || trapScoreNum < 30) {
    // Trap Scoreが低い場合：認知的不協和と油断の警告（ネイティブ調）
    const lowRiskMessages = [
      '"Your brain wants to sell just to stop the discomfort of red candles. Don\'t confuse anxiety with reality. The trap isn\'t the dip—it\'s the impulsive exit."',
      '"Chart looks scary. Data isn\'t screaming \'trap.\' Don\'t get complacent—0/100 can flip fast."',
      '"The part nobody talks about: 0/100 can make you complacent. Big traps get built in the quiet."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScoreNum >= 70) {
    comments.push('"Do not trade fast. Protect capital. Defense mode active. This is the most dangerous time."');
  } else if (trapScoreNum >= 50) {
    comments.push('"Mixed zone. Wait for confirmation. Defense first. Don\'t rush."');
  } else {
    comments.push('"Looks scary, data says clean (for now). Don\'t confuse anxiety with market reality."');
  }

  // Sentiment Dataから追加コメント（ネイティブ調）
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"Market feels emotional. This is when traps happen. Cash is a position."');
    } else if (sentimentData.sentiment === 'FEAR' || sentimentData.sentiment === 'Fear') {
      comments.push('"Fear is natural. But don\'t confuse red candles with real risk."');
    }
  }

  return comments[0] || null;
}

/**
 * Mental Noteを生成
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"Cash is a position."',
    '"Don\'t confuse red candles with real risk."',
    '"Patience pays. The best opportunities come when risk is low and direction is clear."',
    '"Defense is the highest form of attack. Protecting capital is where everything begins."',
    '"Most market movements are noise. React only to clear signals."',
    '"Boredom is a position. Capital preservation in progress."',
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
  grokGeminiOptimization = null, // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化結果
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  
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

  // GPT設計書に完全準拠: 4-post thread形式（Telegram用に1メッセージに統合）
  const change24hFormatted = change24h != null ? (change24h >= 0 ? `+${change24h.toFixed(2)}` : change24h.toFixed(2)) : 'N/A';
  const sentimentLabelRaw = sentimentData?.sentiment;
  const sentimentLabel =
    sentimentLabelRaw === 'Extreme Fear' ? 'Extreme Fear' :
    sentimentLabelRaw === 'Extreme Greed' ? 'Extreme Greed' :
    sentimentLabelRaw === 'FEAR' || sentimentLabelRaw === 'Fear' ? 'Fear' :
    sentimentLabelRaw === 'FOMO' ? 'FOMO' :
    sentimentLabelRaw === 'GREED' || sentimentLabelRaw === 'Greed' ? 'Greed' :
    sentimentLabelRaw === 'Neutral' ? 'Neutral' :
    (sentimentLabelRaw && typeof sentimentLabelRaw === 'string') ? sentimentLabelRaw : 'Neutral';
  // trapScoreRoundedは上で既に定義済み
  
  // [1/4] Hook: Fear vs Trap Score contradiction + 1-line reason + gut vs data
  let message = `[1/4] 🚨 Hook
━━━━━━━━━━━━━━━━━━━━`;
  
  if (scoreDisplay === 'N/A') {
    message += `\n🚨 BTC looks ugly (${change24hFormatted}%), sentiment is **${sentimentLabel}**…
…but Trap Score is still printing. Don't front-run it.`;
  } else {
    const trapReasonLine = (trapData?.exchangeNetflow > 0 || marketData?.mpi > 2) 
      ? ` Netflow + MPI + sentiment = Trap Defence reads this as Standby Mode.`
      : ``;
    message += `\n🚨 BTC looks ugly (${change24hFormatted}%), sentiment is **${sentimentLabel}**…
…but Trap Score is **${scoreDisplay}/100** (yes, really).${trapReasonLine}`;
  }
  
  message += `\n\nDon't revenge-trade. Wait for confirmation. Gut vs data—data wins.`;

  // [2/4] Quick reads (Netflow+MPI set interpretation + Trap Defence take)
  message += `\n\n[2/4] 📊 Quick Reads (No Fluff)
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapData?.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
    const netflow = trapData.exchangeNetflow;
    const absValue = Math.abs(netflow);
    if (netflow < 0) {
      message += `\n• Exchange netflow: **${absValue.toFixed(0)} BTC outflow** → coins leaving exchanges`;
    } else if (netflow > 0) {
      message += `\n• Exchange netflow: **+${absValue.toFixed(0)} BTC inflow** → potential selling pressure`;
    }
  }
  
  if (marketData?.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    message += `\n• MPI: **${mpi.toFixed(2)}** → miners aren't rushing to sell`;
  }
  
  message += `\n\nNetflow + MPI together: Trap Defence reads this combo before the candle. Red candles ≠ instant trap.`;

  // [3/4] Psych coaching: short, punchy, Dr. Grok world view
  message += `\n\n[3/4] 🧠 Psych Coaching (Dr. Grok)
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapScoreRounded == null) {
    message += `\nScore calculating. Don't front-run.`;
  } else if (trapScoreRounded < 30) {
    message += `\n${trapScoreRounded}/100 = complacency risk. Big traps build in the quiet. Stay alert.`;
  } else if (trapScoreRounded < 50) {
    message += `\nChart scary, data not screaming trap. Don't let fear click for you.`;
  } else {
    message += `\nDefense mode. Candles loud; risk isn't yet. Standby Mode.`;
  }
  
  // [4/4] Poll + simple CTA (返信負荷を軽減・1分で読める)
  message += `\n\n[4/4] 🗳️ Poll + CTA
━━━━━━━━━━━━━━━━━━━━
Poll: Trap Score ${scoreDisplay === 'N/A' ? '*(calculating)*' : `**${scoreDisplay}/100**`} — what are you doing?
A) Hold  B) Buy dip  C) Sell / de-risk  D) Waiting for confirmation

Want real-time Trap Alerts before the next dump? Reply **TRAP** for the link. One missed alert = lost capital. #BTC #Bitcoin #TrapDefence`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
