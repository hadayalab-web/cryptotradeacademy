// services/data/sales.js
// データ販売機能の実装

const DATA_PRICING = {
  monthly: 99, // $99/月
  yearly: 990, // $990/年（16%割引）
  oneTime: {
    '1month': 29, // 過去1ヶ月: $29
    '3months': 79, // 過去3ヶ月: $79
    '6months': 149, // 過去6ヶ月: $149
    '1year': 249, // 過去1年: $249
  },
};

/**
 * 過去データを取得
 */
async function getHistoricalData(userId, userTier, dateRange, filters = {}) {
  // Premium Tier以上のみアクセス可能
  if (userTier !== 'premium' && userTier !== 'enterprise') {
    throw new Error('Historical data access requires Premium Tier or higher');
  }

  // 実際の実装では、データベースから過去データを取得
  // const data = await db.articles.find({
  //   createdAt: { $gte: dateRange.start, $lte: dateRange.end },
  //   ...filters,
  // });

  // 仮の実装
  return {
    articles: [],
    onchainData: [],
    trapScores: [],
    dateRange,
    totalRecords: 0,
  };
}

/**
 * データエクスポート（CSV/JSON）
 */
async function exportHistoricalData(userId, userTier, format = 'json', dateRange) {
  const data = await getHistoricalData(userId, userTier, dateRange);

  if (format === 'csv') {
    return convertToCSV(data);
  } else if (format === 'json') {
    return JSON.stringify(data, null, 2);
  } else {
    throw new Error('Unsupported format. Use "csv" or "json"');
  }
}

/**
 * CSVに変換
 */
function convertToCSV(data) {
  // CSV変換ロジック
  const headers = ['Date', 'Price', 'Trap Score', 'Exchange Netflow', 'MPI'];
  const rows = data.articles.map(article => [
    article.date,
    article.price,
    article.trapScore,
    article.exchangeNetflow,
    article.mpi,
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * データ購入を処理
 */
async function purchaseDataAccess(userId, planType, paymentMethod) {
  // 実際の実装では、決済処理を実行
  // const payment = await processPayment({
  //   userId,
  //   amount: DATA_PRICING[planType],
  //   paymentMethod,
  // });

  // データアクセス権限を付与
  // await db.userDataAccess.insert({
  //   userId,
  //   planType,
  //   startDate: new Date(),
  //   endDate: calculateEndDate(planType),
  //   paymentId: payment.id,
  // });

  return {
    success: true,
    planType,
    accessGranted: true,
    expiresAt: calculateEndDate(planType),
  };
}

/**
 * 終了日を計算
 */
function calculateEndDate(planType) {
  const now = new Date();
  
  if (planType === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else if (planType === 'yearly') {
    now.setFullYear(now.getFullYear() + 1);
  } else if (planType.startsWith('oneTime_')) {
    // ワンタイム購入の場合は期限なし
    return null;
  }

  return now.toISOString();
}

/**
 * データアクセス権限をチェック
 */
async function checkDataAccess(userId, userTier) {
  // Premium Tier以上は自動的にアクセス可能
  if (userTier === 'premium' || userTier === 'enterprise') {
    return {
      hasAccess: true,
      planType: 'included',
      expiresAt: null,
    };
  }

  // 実際の実装では、データベースから購入履歴を確認
  // const purchase = await db.userDataAccess.findOne({
  //   userId,
  //   expiresAt: { $gte: new Date() },
  // });

  // 仮の実装
  return {
    hasAccess: false,
    planType: null,
    expiresAt: null,
  };
}

module.exports = {
  DATA_PRICING,
  getHistoricalData,
  exportHistoricalData,
  purchaseDataAccess,
  checkDataAccess,
};
