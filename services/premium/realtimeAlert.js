// services/premium/realtimeAlert.js
// Premium Tier向けリアルタイムアラートサービス

const { sendResendEmail } = require('../email/resendClient');

/**
 * リアルタイムアラートを送信
 */
async function sendRealtimeAlert(userEmail, alertType, alertData) {
  const alertMessages = {
    price_change: `🚨 価格変動アラート\n\nBTC価格が${alertData.threshold}%${alertData.direction === 'up' ? '上昇' : '下落'}しました。\n現在の価格: $${alertData.currentPrice.toLocaleString()}\n変動率: ${alertData.changePercent.toFixed(2)}%`,
    
    trap_score: `⚠️ Trap Scoreアラート\n\nTrap Scoreが${alertData.threshold}を超えました。\n現在のTrap Score: ${alertData.currentScore}/10\n推奨アクション: ${alertData.recommendedAction}`,
    
    exchange_netflow: `📊 Exchange Netflowアラート\n\nExchange Netflowが${alertData.threshold} BTCを${alertData.direction === 'inflow' ? '超過' : '下回り'}ました。\n現在のNetflow: ${alertData.currentNetflow.toFixed(2)} BTC`,
    
    mpi: `⚡ MPIアラート\n\nMPIが${alertData.threshold}を${alertData.direction === 'above' ? '超過' : '下回り'}ました。\n現在のMPI: ${alertData.currentMpi.toFixed(2)}`,
    
    fear_greed: `😱 Fear & Greed Indexアラート\n\nFear & Greed Indexが${alertData.currentValue}（${alertData.classification}）に達しました。\n${alertData.direction === 'extreme_greed' ? '極度の楽観: 過度なFOMOに注意' : '極度の恐怖: パニック売りの可能性'}`,
    
    funding_rate: `💰 Funding Rateアラート\n\nFunding Rateが${alertData.currentRate > 0 ? '+' : ''}${alertData.currentRate.toFixed(4)}%に達しました。\n現在のマーク価格: $${alertData.markPrice.toLocaleString()}\n${Math.abs(alertData.currentRate) >= 0.05 ? '極端なFunding Rate: 過度なレバレッジが存在' : '高いFunding Rate: 注意が必要'}`,
  };

  const message = alertMessages[alertType] || `アラート: ${alertType}`;

  // Eメールで送信
  await sendResendEmail({
    to: userEmail,
    subject: `Trap Defence BTC Premium - ${alertType}アラート`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b6b;">🚨 リアルタイムアラート</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${message.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
        <p style="color: #666; font-size: 12px;">
          このアラートは、Premium Tier会員向けのリアルタイム通知です。<br>
          設定を変更する場合は、<a href="https://cryptotradeacademy.io/premium/settings">設定ページ</a>にアクセスしてください。
        </p>
      </div>
    `,
  });

  // Telegram通知も送信（実装予定）
  // await sendTelegramNotification(userTelegramId, message);
}

/**
 * アラート条件をチェック
 */
function checkAlertConditions(currentData, userSettings) {
  const alerts = [];

  // 価格変動アラート
  if (userSettings.priceChangeAlert?.enabled) {
    const changePercent = Math.abs(currentData.change24h);
    if (changePercent >= userSettings.priceChangeAlert.threshold) {
      alerts.push({
        type: 'price_change',
        data: {
          threshold: userSettings.priceChangeAlert.threshold,
          direction: currentData.change24h > 0 ? 'up' : 'down',
          currentPrice: currentData.price,
          changePercent: changePercent,
        },
      });
    }
  }

  // Trap Scoreアラート
  if (userSettings.trapScoreAlert?.enabled) {
    if (currentData.trapScore >= userSettings.trapScoreAlert.threshold) {
      alerts.push({
        type: 'trap_score',
        data: {
          threshold: userSettings.trapScoreAlert.threshold,
          currentScore: currentData.trapScore,
          recommendedAction: getRecommendedAction(currentData.trapScore),
        },
      });
    }
  }

  // Exchange Netflowアラート
  if (userSettings.exchangeNetflowAlert?.enabled) {
    const netflow = currentData.exchangeNetflow;
    if (Math.abs(netflow) >= userSettings.exchangeNetflowAlert.threshold) {
      alerts.push({
        type: 'exchange_netflow',
        data: {
          threshold: userSettings.exchangeNetflowAlert.threshold,
          direction: netflow > 0 ? 'inflow' : 'outflow',
          currentNetflow: netflow,
        },
      });
    }
  }

  // MPIアラート
  if (userSettings.mpiAlert?.enabled) {
    const mpi = currentData.mpi;
    if (mpi >= userSettings.mpiAlert.threshold) {
      alerts.push({
        type: 'mpi',
        data: {
          threshold: userSettings.mpiAlert.threshold,
          direction: mpi > 0 ? 'above' : 'below',
          currentMpi: mpi,
        },
      });
    }
  }

  // Fear & Greed Indexアラート（追加指標）
  if (userSettings.fearGreedAlert?.enabled && currentData.fearGreedIndex !== undefined) {
    const fng = currentData.fearGreedIndex;
    if (fng >= userSettings.fearGreedAlert.threshold || fng <= (100 - userSettings.fearGreedAlert.threshold)) {
      alerts.push({
        type: 'fear_greed',
        data: {
          threshold: userSettings.fearGreedAlert.threshold,
          currentValue: fng,
          classification: fng >= 75 ? 'Extreme Greed' : fng <= 25 ? 'Extreme Fear' : 'Neutral',
          direction: fng >= 75 ? 'extreme_greed' : 'extreme_fear',
        },
      });
    }
  }

  // Funding Rateアラート（追加指標）
  if (userSettings.fundingRateAlert?.enabled && currentData.fundingRate !== undefined) {
    const fr = Math.abs(currentData.fundingRate);
    if (fr >= userSettings.fundingRateAlert.threshold) {
      alerts.push({
        type: 'funding_rate',
        data: {
          threshold: userSettings.fundingRateAlert.threshold,
          currentRate: currentData.fundingRate,
          direction: currentData.fundingRate > 0 ? 'positive' : 'negative',
          markPrice: currentData.markPrice || 0,
        },
      });
    }
  }

  return alerts;
}

/**
 * Trap Scoreに基づく推奨アクション
 */
function getRecommendedAction(trapScore) {
  if (trapScore >= 8) {
    return '高リスク: ポジションを縮小または利確を検討';
  } else if (trapScore >= 6) {
    return '中リスク: 注意深く市場を監視';
  } else {
    return '低リスク: 通常通り取引可能';
  }
}

module.exports = {
  sendRealtimeAlert,
  checkAlertConditions,
};
