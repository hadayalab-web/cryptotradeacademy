// services/x/realTimeOptimizer.js
// リアルタイム最適化機能（メトリクスに基づく動的調整）

const { getDailyEngagementMetrics } = require('../api/x-engagement-metrics');
const { getABTestResults, getOptimalVariant } = require('./abTesting');

/**
 * リアルタイム最適化設定を取得
 * @param {string} lang - 言語コード
 * @returns {Promise<Object>} 最適化設定
 */
async function getRealTimeOptimization(lang = 'en') {
  try {
    // 過去7日のメトリクスを取得
    const dateString = new Date().toISOString().split('T')[0];
    const metrics = await getDailyEngagementMetrics(dateString);
    
    // A/Bテスト結果から最適なバリアントを取得
    const optimalContentFormat = await getOptimalVariant('content_format') || 'thread_with_video';
    const optimalHashtagStrategy = await getOptimalVariant('hashtag_strategy') || 'trending';
    
    // エンゲージメント率に基づく動的調整
    const avgEngagementRate = metrics?.avgEngagementRate || 0;
    const avgClickRate = metrics?.avgClickRate || 0;
    
    // エンゲージメント率が低い場合は動画比率を増やす
    let videoRatio = 0.5; // デフォルト50%
    if (avgEngagementRate < 0.5) {
      videoRatio = 0.7; // 70%に増加
    } else if (avgEngagementRate > 2.0) {
      videoRatio = 0.3; // 30%に減少（コスト最適化）
    }
    
    // クリック率が低い場合はCTAを強化
    let ctaIntensity = 'normal';
    if (avgClickRate < 3.0) {
      ctaIntensity = 'high'; // 高強度CTA
    } else if (avgClickRate > 8.0) {
      ctaIntensity = 'low'; // 低強度CTA（過度なCTAを避ける）
    }
    
    return {
      lang,
      optimalContentFormat,
      optimalHashtagStrategy,
      videoRatio,
      ctaIntensity,
      avgEngagementRate,
      avgClickRate,
      optimizedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[Real-time Optimizer] Failed to get optimization:', error.message);
    // デフォルト設定を返す
    return {
      lang,
      optimalContentFormat: 'thread_with_video',
      optimalHashtagStrategy: 'trending',
      videoRatio: 0.5,
      ctaIntensity: 'normal',
      avgEngagementRate: 0,
      avgClickRate: 0,
      optimizedAt: new Date().toISOString(),
    };
  }
}

/**
 * コンテンツ形式を最適化（リアルタイムメトリクスに基づく）
 * @param {string} lang - 言語コード
 * @param {number} sequence - シーケンス番号
 * @returns {Promise<string>} 最適化されたコンテンツ形式
 */
async function getOptimizedContentFormat(lang, sequence = 0) {
  try {
    const optimization = await getRealTimeOptimization(lang);
    const videoRatio = optimization.videoRatio || 0.5;
    
    // 動画比率に基づいてコンテンツ形式を決定
    const random = Math.random();
    if (random < videoRatio) {
      return 'thread_with_video';
    } else if (random < videoRatio + 0.3) {
      return 'thread_with_poll';
    } else if (random < videoRatio + 0.3 + 0.15) {
      return 'thread_with_image';
    } else {
      return 'text_only';
    }
  } catch (error) {
    console.warn('[Real-time Optimizer] Failed to get optimized content format:', error.message);
    // フォールバック: デフォルトのコンテンツ形式決定ロジック
    const { getContentFormat } = require('./optimization');
    return getContentFormat(sequence);
  }
}

/**
 * CTA強度を最適化（リアルタイムメトリクスに基づく）
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} 最適化されたCTA
 */
async function getOptimizedCTA(lang) {
  try {
    const optimization = await getRealTimeOptimization(lang);
    const ctaIntensity = optimization.ctaIntensity || 'normal';
    
    const { generateEngagementCTA } = require('./optimization');
    const baseCTA = generateEngagementCTA(lang);
    
    // CTA強度に基づいて調整
    if (ctaIntensity === 'high') {
      // 高強度: 絵文字と緊急語を追加
      return `🚨 ${baseCTA} 🚨`;
    } else if (ctaIntensity === 'low') {
      // 低強度: シンプルなCTA
      return baseCTA.replace(/🚀|💥|⚡|🔥/g, '').trim();
    }
    
    return baseCTA;
  } catch (error) {
    console.warn('[Real-time Optimizer] Failed to get optimized CTA:', error.message);
    // フォールバック: デフォルトのCTA生成
    const { generateEngagementCTA } = require('./optimization');
    return generateEngagementCTA(lang);
  }
}

module.exports = {
  getRealTimeOptimization,
  getOptimizedContentFormat,
  getOptimizedCTA,
};
