// 無料ミニマム版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/ja/minimal.ja.js
// Trap Score表示のみ（詳細分析なし）

/**
 * Trap Scoreの説明を取得
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Scoreを計算中です。しばらくしてから再度ご確認ください。';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Scoreを計算中です。しばらくしてから再度ご確認ください。';
  }

  if (score >= 70) {
    return '⚠️ 高リスク: 市場トラップの可能性が高いシグナルが検出されました。極度の注意が必要です。';
  } else if (score >= 50) {
    return '⚡ 中リスク: 一部のトラップ指標が検出されました。警戒を怠らないでください。';
  } else if (score >= 30) {
    return '✅ 低リスク: トラップ指標は最小限です。市場状況は比較的安全に見えます。';
  } else {
    return '✅ 非常に低リスク: トラップ指標はほとんど検出されていません。市場状況は安全に見えます。';
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
 * @param {string} options.lang - 言語コード（デフォルト: 'ja'）
 * @returns {string} Telegramメッセージ文字列
 */
function formatMinimalBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  lang = 'ja',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 BTC価格: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 BTC価格: 取得中...';

  return `🌤️ Trap Defense BTC - 無料ミニマムレポート
📅 ${ts}

🎯 本日のTrap Score
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100

${scoreDescription}

${priceLine}

━━━━━━━━━━━━━━━━━━━━
🔒 詳細を知りたいですか？

このTrap Scoreの背後にある詳細分析には以下が含まれます：
• なぜAVOID_LONGまたはAVOID_SHORTなのか？
• 詳細なオンチェーンデータ分析
• メンタルトレーニングガイダンス
• Dr. Grokの心理的サポート

🚀 フルアクセスにアップグレード
月額$69から • いつでもキャンセル可能

━━━━━━━━━━━━━━━━━━━━
これは無料のミニマムレポートです。詳細分析とトラップアラートについては、Trap Defense BTCにアップグレードしてください。

教育目的のみ。金融アドバイスではありません。`.trim();
}

module.exports = { formatMinimalBriefing };
