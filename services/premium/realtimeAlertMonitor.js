// services/premium/realtimeAlertMonitor.js
// Premium Tier向けリアルタイムアラート監視サービス

const { checkAlertConditions, sendRealtimeAlert } = require('./realtimeAlert');
const { getFearAndGreedIndex, getFundingRate, getOpenInterest } = require('../trapScore/enhanced');

/**
 * Premium Tierユーザーのアラート設定を取得
 */
async function getUserAlertSettings(userId) {
  // 実際の実装では、データベースから取得
  // const settings = await db.userAlertSettings.findOne({ userId });
  
  // デフォルト設定
  return {
    userId,
    priceChangeAlert: {
      enabled: true,
      threshold: 3, // 3%以上の変動
    },
    trapScoreAlert: {
      enabled: true,
      threshold: 7, // Trap Score 7以上
    },
    exchangeNetflowAlert: {
      enabled: true,
      threshold: 100, // 100 BTC以上
    },
    mpiAlert: {
      enabled: true,
      threshold: 1.5, // MPI 1.5以上
    },
    fearGreedAlert: {
      enabled: true,
      threshold: 75, // Extreme Greed/Fear
    },
    fundingRateAlert: {
      enabled: true,
      threshold: 0.05, // 0.05%以上
    },
  };
}

/**
 * 市場データを監視してアラートを送信
 */
async function monitorAndAlert(userId, userEmail, currentMarketData) {
  try {
    // ユーザーのアラート設定を取得
    const userSettings = await getUserAlertSettings(userId);

    // 追加指標を取得
    const fearGreedIndex = await getFearAndGreedIndex();
    const fundingRate = await getFundingRate();
    const openInterest = await getOpenInterest();

    // 拡張された市場データ
    const extendedMarketData = {
      ...currentMarketData,
      fearGreedIndex: fearGreedIndex?.value,
      fundingRate: fundingRate?.rate,
      openInterest: openInterest?.value,
    };

    // アラート条件をチェック
    const alerts = checkAlertConditions(extendedMarketData, userSettings);

    // Fear & Greed Indexアラート
    if (userSettings.fearGreedAlert?.enabled && fearGreedIndex) {
      if (fearGreedIndex.value >= userSettings.fearGreedAlert.threshold || 
          fearGreedIndex.value <= (100 - userSettings.fearGreedAlert.threshold)) {
        alerts.push({
          type: 'fear_greed',
          data: {
            threshold: userSettings.fearGreedAlert.threshold,
            currentValue: fearGreedIndex.value,
            classification: fearGreedIndex.classification,
            direction: fearGreedIndex.value >= 75 ? 'extreme_greed' : 'extreme_fear',
          },
        });
      }
    }

    // Funding Rateアラート
    if (userSettings.fundingRateAlert?.enabled && fundingRate) {
      if (Math.abs(fundingRate.rate) >= userSettings.fundingRateAlert.threshold) {
        alerts.push({
          type: 'funding_rate',
          data: {
            threshold: userSettings.fundingRateAlert.threshold,
            currentRate: fundingRate.rate,
            direction: fundingRate.rate > 0 ? 'positive' : 'negative',
            markPrice: fundingRate.markPrice,
          },
        });
      }
    }

    // アラートを送信
    for (const alert of alerts) {
      await sendRealtimeAlert(userEmail, alert.type, alert.data);
    }

    return {
      checked: true,
      alertsSent: alerts.length,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`[RealtimeAlertMonitor] Error monitoring user ${userId}:`, error);
    throw error;
  }
}

/**
 * すべてのPremium Tierユーザーを監視
 */
async function monitorAllPremiumUsers(premiumUsers, currentMarketData) {
  const results = [];

  for (const user of premiumUsers) {
    try {
      const result = await monitorAndAlert(user.id, user.email, currentMarketData);
      results.push({
        userId: user.id,
        success: true,
        ...result,
      });
    } catch (error) {
      results.push({
        userId: user.id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  getUserAlertSettings,
  monitorAndAlert,
  monitorAllPremiumUsers,
};
