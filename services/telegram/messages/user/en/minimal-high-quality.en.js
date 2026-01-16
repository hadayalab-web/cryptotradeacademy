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
    return '⚠️ HIGH TRAP RISK: Strong signals indicate potential market traps. Exercise extreme caution.';
  } else if (score >= 50) {
    return '⚡ MODERATE TRAP RISK: Some trap indicators detected. Stay vigilant.';
  } else if (score >= 30) {
    return '✅ LOW TRAP RISK: Minimal trap indicators. Market conditions appear relatively safe.';
  } else {
    return '✅ VERY LOW TRAP RISK: Very few trap indicators detected. Market conditions appear safe.';
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
        avoidItems.push('Avoid LONG positions - High trap risk detected');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Avoid SHORT positions - High trap risk detected');
      }
    }
  }

  // デフォルトの回避行動
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('Avoid entering new positions - Strong trap signals detected');
      avoidItems.push('Wait for clearer market signals before trading');
    } else if (trapScore >= 50) {
      avoidItems.push('Exercise caution - Some trap indicators present');
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
    if (trapData.exchangeNetflow !== undefined) {
      const netflow = trapData.exchangeNetflow;
      const sign = netflow >= 0 ? '+' : '';
      const absValue = Math.abs(netflow);
      const unit = absValue >= 1_000_000_000 ? 'B' : absValue >= 1_000_000 ? 'M' : 'K';
      const value = absValue >= 1_000_000_000 ? (absValue / 1_000_000_000).toFixed(1) :
                     absValue >= 1_000_000 ? (absValue / 1_000_000).toFixed(1) :
                     (absValue / 1_000).toFixed(1);
      evidenceItems.push(`Exchange Netflow: ${sign}$${value}${unit} (${netflow >= 0 ? 'inflow' : 'major outflow'})`);
    }

    if (trapData.whaleRatio !== undefined) {
      const whaleRatio = trapData.whaleRatio * 100;
      evidenceItems.push(`Whale Ratio: ${whaleRatio.toFixed(0)}% (${whaleRatio >= 80 ? 'high selling pressure' : 'normal'})`);
    }
  }

  // Market Dataから根拠を抽出
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`Miner Position Index: ${mpi.toFixed(2)} (miners selling)`);
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
  if (!trapScore || trapScore < 30) {
    return null;
  }

  const comments = [];

  if (trapScore >= 70) {
    comments.push('"FOMO is high right now. Don\'t let greed override your defense strategy. Wait."');
  } else if (trapScore >= 50) {
    comments.push('"Stay disciplined. The market is testing your patience. Defense first."');
  } else {
    comments.push('"Good discipline. Keep waiting for clear opportunities."');
  }

  // Sentiment Dataから追加コメント
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"Market sentiment is emotional. This is when traps occur. Stay calm."');
    }
  }

  return comments[0] || null;
}

/**
 * Mental Noteを生成
 */
function generateMentalNote() {
  return '"70% of the time, do nothing. Defense until clear advantage emerges."';
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
  const mentalNote = generateMentalNote();

  // 【改善1: ニュース番組形式の追加】Openingセクションを追加
  let message = `🌤️ Trap Defense BTC - Free Report
🚨 [BREAKING: TRAP DEFENCE BRIEFING]
📺 【Opening】Market Intelligence Briefing
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 【改善1: ストーリー構造の追加】問題の提示セクションを追加
  // Step 1: 問題の提示（Trap Scoreに基づいて問題を提示）
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📖 【Market Story】The Problem
━━━━━━━━━━━━━━━━━━━━`;
    
    if (trapScoreRounded >= 70) {
      message += `\n🚨 The market is showing strong trap signals. Despite what price charts might suggest, on-chain data reveals hidden risks.`;
      message += `\n💡 The Problem: Multiple divergences and anomalies indicate potential market traps. Entering now could expose you to significant risk.`;
    } else if (trapScoreRounded >= 50) {
      message += `\n⚡ The market is showing moderate trap indicators. Some divergences suggest caution.`;
      message += `\n💡 The Problem: Trap signals are present. Rushing into trades now could lead to losses.`;
    } else {
      message += `\n✅ Market conditions appear relatively safe, but trap patterns can emerge quickly.`;
      message += `\n💡 The Problem: Even in low-risk conditions, patience is strategic strength.`;
    }
  }

  // Step 2: 証拠（Evidence）セクション
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 【Evidence】Why Wait? Data-Backed Reasons
[PROVED BY ON-CHAIN DATA]
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】EvidenceとMental Noteを連動
    if (trapScore !== null && trapScore >= 30) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 Why Wait? (Evidence-Based)`;
      if (trapScoreRounded >= 70) {
        message += `\n   🚨 Trap Score ${trapScoreRounded}/100: Strong signals indicate potential market traps.`;
        message += `\n   🛡️ Strategic preparation is not weakness—it's victory preparation. 70% of the time, prepare for victory.`;
      } else if (trapScoreRounded >= 50) {
        message += `\n   ⚡ Trap Score ${trapScoreRounded}/100: Moderate trap indicators detected.`;
        message += `\n   🛡️ Defense first. Wait for clearer market signals.`;
      } else {
        message += `\n   ✅ Trap Score ${trapScoreRounded}/100: Low trap risk, but remain vigilant.`;
        message += `\n   🛡️ Even in low-risk conditions, strategic preparation is victory preparation.`;
      }
    }
  }

  // Step 3: 解決策（What to Avoid）
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 【Solution】What to Avoid
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Step 4: 成功する結末（Dr. Grok Comment + Mental Note）
  // 【改善1: ニュース番組形式の追加】コメンテーターセクション
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 【Commentator】Dr. Grok's Quick Insight
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // 【改善1: ストーリー構造の追加】成功する結末（Mental Note）
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ 【Success Ending】Mental Note
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }
  
  // 【改善1: ニュース番組形式の追加】Closingセクションを追加
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
📺 【Closing】Stay tuned for the next episode
━━━━━━━━━━━━━━━━━━━━`;

  // CTA（アップセル最適化：開発資金確保のため緊迫感のあるCTA + YouTube VSL）
  // WhopリンクとVSLリンクを環境変数から取得
  const whopUpgradeLink = process.env.WHOP_UPGRADE_LINK || process.env.WHOP_PRODUCT_LINK_EN || 'https://whop.com/trap-defense-btc';
  // VSL2: バックエンド（有料版コンバージョン用）
  const vslLink = process.env.VSL2_YOUTUBE_LINK || process.env.VSL_YOUTUBE_LINK || '';
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 Unlock Full Intelligence Report

You're seeing a glimpse. Full members get:

✨ Complete Intelligence Report
• Full on-chain analysis (all indicators)
• AI-powered market insights & trap detection
• Real-time alerts: AVOID_LONG / AVOID_SHORT / STANDBY
• Exit Map & Mental Training guidance
• Full Dr. Grok psychological support
• Real-time X sentiment analysis

💡 Why Upgrade?
The difference between protecting capital and losing it is often just one missed trap signal.`;

  // YouTube VSLリンクを追加（Telegramが自動的にサムネイル付きで表示）
  if (vslLink) {
    message += `\n\n🎬 Watch Our Story (2 min):
${vslLink}`;
  }

  message += `\n\n🎯 Upgrade to Full Access
→ Upgrade now: ${whopUpgradeLink}
$69/month • Cancel anytime

━━━━━━━━━━━━━━━━━━━━
This is a free report. For detailed analysis and trap alerts, upgrade to Trap Defense BTC.

For educational purposes only. Not financial advice.`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
