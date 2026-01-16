// 無料ミニマム版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/en/minimal.en.js
// Trap Score表示のみ（詳細分析なし）

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
 * 無料ミニマム版のTelegramメッセージを生成
 * Trap Score表示のみ（詳細分析なし）
 * 
 * @param {Object} options - メッセージ生成オプション
 * @param {Date} options.now - 現在時刻
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - BTC価格（USD）
 * @param {number|null} options.change24h - 24時間変動率（%）
 * @param {string} options.lang - 言語コード（デフォルト: 'en'）
 * @returns {string} Telegramメッセージ文字列
 */
function formatMinimalBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  lang = 'en',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 BTC Price: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 BTC Price: Fetching...';

  return `🌤️ Trap Defense BTC - Free Minimal Report
📅 ${ts}

🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100

${scoreDescription}

${priceLine}

━━━━━━━━━━━━━━━━━━━━
🔒 Want to Know Why?

The detailed analysis behind this Trap Score, including:
• Why AVOID_LONG or AVOID_SHORT?
• Detailed on-chain data analysis
• Mental training guidance
• Dr. Grok's psychological support

🚀 Upgrade to Full Access
Starting at $69/month • Cancel anytime

━━━━━━━━━━━━━━━━━━━━
This is a free minimal report. For detailed analysis and trap alerts, upgrade to Trap Defense BTC.

For educational purposes only. Not financial advice.`.trim();
}

module.exports = { formatMinimalBriefing };
