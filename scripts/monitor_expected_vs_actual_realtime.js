/**
 * リアルタイム期待値モニタリング
 * 「Cursor/Composer 1病」対策: 期待値と実際の値をリアルタイムで比較
 * 
 * 使用方法:
 *   node scripts/monitor_expected_vs_actual_realtime.js
 * 
 * 環境変数:
 *   - VERCEL_KV_REST_API_URL
 *   - VERCEL_KV_REST_API_TOKEN
 *   - X_API_KEY
 *   - X_API_SECRET
 */

const { kv } = require('../utils/kv');
const { getDailyPostCount } = require('../services/x/optimization');

// 期待値（Grok補正版）
const EXPECTED_METRICS = {
  totalPosts: 18,
  totalImpressions: 675000,
  totalEngagements: 77625,
  totalMinimalOptins: 14715,
  totalWhopTraffic: 28998,
  totalRegularConversions: 2001.5,
};

// 許容誤差（%）
const TOLERANCE_THRESHOLDS = {
  impressions: 15.0,
  engagements: 20.0,
  conversions: 25.0,
  optins: 20.0,
  whopTraffic: 20.0,
};

/**
 * 実際のメトリクスを取得
 */
async function getActualMetrics(dateString) {
  // 1. 投稿数を取得
  const dailyPostCount = await getDailyPostCount(dateString);
  
  // 2. X APIから実際のインプレッション数を取得（TODO: 実装が必要）
  // 3. Whop APIから実際のトラフィック数を取得（TODO: 実装が必要）
  // 4. Telegram Bot APIから実際のオプトイン数を取得（TODO: 実装が必要）
  
  return {
    totalPosts: dailyPostCount || 0,
    totalImpressions: 0, // TODO: X APIから取得
    totalEngagements: 0, // TODO: X APIから取得
    totalMinimalOptins: 0, // TODO: Telegram Bot APIから取得
    totalWhopTraffic: 0, // TODO: Whop APIから取得
    totalRegularConversions: 0, // TODO: Whop APIから取得
  };
}

/**
 * 期待値と実際の値の差異を計算
 */
function calculateVariance(expected, actual, metricName = '') {
  if (expected === 0) {
    return {
      variance: 0,
      variancePct: 0,
      status: 'N/A',
    };
  }
  
  const variance = actual - expected;
  const variancePct = (variance / expected) * 100;
  
  const threshold = TOLERANCE_THRESHOLDS[metricName] || 20.0;
  
  let status;
  if (Math.abs(variancePct) <= threshold) {
    status = '✅ OK';
  } else if (variancePct < -threshold) {
    status = '🔴 大幅に未達';
  } else {
    status = '🟢 大幅に超過';
  }
  
  return {
    variance,
    variancePct,
    status,
    threshold,
  };
}

/**
 * 差異の根本原因を分析
 */
function analyzeRootCauses(expected, actual, varianceData, metricName) {
  const causes = [];
  
  if (varianceData.status === '🔴 大幅に未達') {
    if (metricName === 'impressions') {
      causes.push({
        type: 'impressions_low',
        possibleReasons: [
          'Cron Jobsの実行失敗',
          'インフルエンサーのパフォーマンス低下',
          'X APIのレート制限',
          '市場状況の変化',
        ],
      });
    } else if (metricName === 'conversions') {
      causes.push({
        type: 'conversions_low',
        possibleReasons: [
          'UTMパラメータの設定ミス',
          'Whopトラフィックの減少',
          'コンテンツ品質の問題',
          '市場センチメントの変化',
        ],
      });
    }
  }
  
  return causes;
}

/**
 * アラートを送信（TODO: 実装が必要）
 */
async function sendAlert(alert) {
  console.error('🚨 ALERT:', JSON.stringify(alert, null, 2));
  // TODO: Slack/Discord/Email等に送信
}

/**
 * メイン処理
 */
async function monitorExpectedVsActual() {
  const dateString = new Date().toISOString().split('T')[0];
  
  console.log(`📊 期待値モニタリング開始: ${dateString}`);
  console.log('='.repeat(80));
  
  // 実際のメトリクスを取得
  const actualMetrics = await getActualMetrics(dateString);
  
  // 各メトリクスを比較
  const metricsToCheck = [
    { key: 'totalImpressions', name: 'impressions' },
    { key: 'totalEngagements', name: 'engagements' },
    { key: 'totalMinimalOptins', name: 'optins' },
    { key: 'totalWhopTraffic', name: 'whopTraffic' },
    { key: 'totalRegularConversions', name: 'conversions' },
  ];
  
  const alerts = [];
  
  for (const { key, name } of metricsToCheck) {
    const expected = EXPECTED_METRICS[key];
    const actual = actualMetrics[key];
    const varianceData = calculateVariance(expected, actual, name);
    
    console.log(`\n📈 ${key}:`);
    console.log(`   期待値: ${expected.toLocaleString()}`);
    console.log(`   実際の値: ${actual.toLocaleString()}`);
    console.log(`   差異: ${varianceData.variance.toLocaleString()} (${varianceData.variancePct >= 0 ? '+' : ''}${varianceData.variancePct.toFixed(1)}%)`);
    console.log(`   ステータス: ${varianceData.status}`);
    
    // 許容誤差を超えている場合、アラートを生成
    if (varianceData.status !== '✅ OK') {
      const causes = analyzeRootCauses(expected, actual, varianceData, name);
      
      alerts.push({
        metric: key,
        expected,
        actual,
        variance: varianceData.variance,
        variancePct: varianceData.variancePct,
        status: varianceData.status,
        causes,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // アラートを送信
  if (alerts.length > 0) {
    console.log('\n🚨 アラート:');
    for (const alert of alerts) {
      await sendAlert(alert);
    }
  } else {
    console.log('\n✅ すべてのメトリクスが期待値の範囲内です');
  }
  
  console.log('\n' + '='.repeat(80));
}

// 実行
if (require.main === module) {
  monitorExpectedVsActual()
    .then(() => {
      console.log('✅ モニタリング完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = {
  monitorExpectedVsActual,
  getActualMetrics,
  calculateVariance,
};
