// services/premium/customTrapScore.js
// Premium Tier向けカスタムTrap Score設定

/**
 * カスタムTrap Score設定を保存
 */
async function saveCustomTrapScoreSettings(userId, settings) {
  // 実際の実装では、データベースに保存
  // await db.customTrapScoreSettings.upsert({
  //   userId,
  //   settings,
  //   updatedAt: new Date(),
  // });

  return {
    success: true,
    userId,
    settings,
    savedAt: new Date().toISOString(),
  };
}

/**
 * カスタムTrap Score設定を取得
 */
async function getCustomTrapScoreSettings(userId) {
  // 実際の実装では、データベースから取得
  // const settings = await db.customTrapScoreSettings.findOne({ userId });
  
  // デフォルト設定
  return {
    userId,
    weights: {
      fearGreedIndex: 0.2,
      fundingRate: 0.2,
      openInterest: 0.1,
      exchangeNetflow: 0.3,
      mpi: 0.2,
    },
    thresholds: {
      critical: 8,
      high: 6,
      medium: 4,
      low: 2,
    },
    enabled: true,
  };
}

/**
 * カスタムTrap Scoreを計算
 */
async function calculateCustomTrapScore(userId, marketData) {
  const settings = await getCustomTrapScoreSettings(userId);
  
  if (!settings.enabled) {
    // カスタム設定が無効な場合は、デフォルトのTrap Scoreを返す
    return {
      score: marketData.trapScore || 0,
      isCustom: false,
    };
  }

  // 各指標を取得
  const { getFearAndGreedIndex, getFundingRate, getOpenInterest } = require('../trapScore/enhanced');
  
  const fearGreed = await getFearAndGreedIndex();
  const fundingRate = await getFundingRate();
  const openInterest = await getOpenInterest();

  // 各指標を0-10スケールに正規化
  const normalizedMetrics = {
    fearGreedIndex: fearGreed ? (fearGreed.value >= 75 || fearGreed.value <= 25 ? 8 : fearGreed.value / 10) : 0,
    fundingRate: fundingRate ? Math.min(Math.abs(fundingRate.rate) * 100, 10) : 0,
    openInterest: 0, // Open Interestは比較が必要なため、簡易的に0
    exchangeNetflow: marketData.exchangeNetflow ? Math.min(Math.abs(marketData.exchangeNetflow) / 20, 10) : 0,
    mpi: marketData.mpi ? Math.min(Math.abs(marketData.mpi) * 2, 10) : 0,
  };

  // 重み付け平均を計算
  let customScore = 0;
  for (const [metric, weight] of Object.entries(settings.weights)) {
    customScore += normalizedMetrics[metric] * weight;
  }

  // スコアを0-10の範囲に正規化
  customScore = Math.min(Math.max(customScore, 0), 10);

  return {
    score: customScore,
    isCustom: true,
    weights: settings.weights,
    normalizedMetrics,
    riskLevel: getRiskLevel(customScore, settings.thresholds),
  };
}

/**
 * リスクレベルを判定（カスタム閾値を使用）
 */
function getRiskLevel(score, thresholds) {
  if (score >= thresholds.critical) return 'CRITICAL';
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.medium) return 'MEDIUM';
  if (score >= thresholds.low) return 'LOW';
  return 'MINIMAL';
}

module.exports = {
  saveCustomTrapScoreSettings,
  getCustomTrapScoreSettings,
  calculateCustomTrapScore,
};
