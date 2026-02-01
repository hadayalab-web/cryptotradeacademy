// services/x/influencer-optimizer.js
// インフルエンサー最適化エンジン
// 目的: エンゲージメント率が高いインフルエンサーを優先してインプレッションを最大化

const { kv } = require('../../utils/kv');

/**
 * インフルエンサーのエンゲージメント統計を取得
 * @param {string} username - インフルエンサーのusername
 * @returns {Promise<Object>} エンゲージメント統計
 */
async function getInfluencerStats(username) {
  if (!kv) return null;
  try {
    const key = `influencer:stats:${username}`;
    const stats = await kv.get(key);
    return stats || {
      username,
      totalImpressions: 0,
      totalEngagements: 0,
      totalPosts: 0,
      avgImpressions: 0,
      avgEngagementRate: 0,
      lastPostedAt: null,
      conversions: 0,
    };
  } catch (error) {
    console.warn(`[Influencer Optimizer] Failed to get stats for ${username}:`, error.message);
    return null;
  }
}

/**
 * インフルエンサーの統計を更新
 * @param {string} username - インフルエンサーのusername
 * @param {Object} postMetrics - 投稿メトリクス
 */
async function updateInfluencerStats(username, postMetrics) {
  if (!kv) return;
  try {
    const stats = await getInfluencerStats(username);
    if (!stats) return;
    
    // 統計を更新
    stats.totalImpressions += postMetrics.impressions || 0;
    stats.totalEngagements += postMetrics.engagements || 0;
    stats.totalPosts += 1;
    stats.avgImpressions = Math.round(stats.totalImpressions / stats.totalPosts);
    stats.avgEngagementRate = stats.totalImpressions > 0 
      ? (stats.totalEngagements / stats.totalImpressions) * 100 
      : 0;
    stats.lastPostedAt = new Date().toISOString();
    
    // KVに保存
    const key = `influencer:stats:${username}`;
    await kv.set(key, stats, { ex: 86400 * 90 }); // 90日間保持
    
    console.log(`[Influencer Optimizer] ✅ Updated stats for ${username}:`, {
      avgImpressions: stats.avgImpressions,
      avgEngagementRate: stats.avgEngagementRate.toFixed(2) + '%',
    });
  } catch (error) {
    console.error(`[Influencer Optimizer] Failed to update stats for ${username}:`, error.message);
  }
}

/**
 * 全インフルエンサーをエンゲージメント率でランキング
 * @param {Array<string>} influencerList - インフルエンサーリスト
 * @returns {Promise<Array<Object>>} ランキング済みリスト
 */
async function rankInfluencers(influencerList) {
  const rankedList = [];
  
  for (const username of influencerList) {
    const stats = await getInfluencerStats(username);
    if (stats) {
      // スコア計算（エンゲージメント率 × 平均インプレッション）
      const score = stats.avgEngagementRate * Math.log10(stats.avgImpressions + 1);
      rankedList.push({
        username,
        score,
        stats,
      });
    } else {
      // 統計がない場合はデフォルトスコア（新規インフルエンサー）
      rankedList.push({
        username,
        score: 0,
        stats: null,
      });
    }
  }
  
  // スコア降順でソート
  rankedList.sort((a, b) => b.score - a.score);
  
  return rankedList;
}

/**
 * 最適なインフルエンサーを選択
 * @param {Array<string>} influencerList - インフルエンサーリスト
 * @param {Object} options - オプション
 * @returns {Promise<string>} 選択されたインフルエンサーのusername
 */
async function selectOptimalInfluencer(influencerList, options = {}) {
  const {
    excludeRecent = true, // 最近投稿したインフルエンサーを除外
    recentHours = 6, // 過去N時間以内の投稿を「最近」とみなす
    diversityBonus = true, // 多様性ボーナス（同じインフルエンサーに偏らない）
  } = options;
  
  // ランキングを取得
  const rankedList = await rankInfluencers(influencerList);
  
  // フィルタリング
  const now = Date.now();
  const recentThreshold = now - (recentHours * 60 * 60 * 1000);
  
  let candidates = rankedList;
  
  if (excludeRecent) {
    candidates = rankedList.filter(item => {
      if (!item.stats || !item.stats.lastPostedAt) return true;
      const lastPosted = new Date(item.stats.lastPostedAt).getTime();
      return lastPosted < recentThreshold;
    });
    
    // フィルタリング後に候補が0の場合、全体から選択
    if (candidates.length === 0) {
      console.warn('[Influencer Optimizer] ⚠️ No candidates after filtering, using all influencers');
      candidates = rankedList;
    }
  }
  
  // 多様性ボーナス: 上位30%からランダム選択（完全に上位だけ選ぶと偏る）
  if (diversityBonus && candidates.length > 3) {
    const topCount = Math.ceil(candidates.length * 0.3);
    const topCandidates = candidates.slice(0, topCount);
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    return topCandidates[randomIndex].username;
  }
  
  // デフォルト: 最上位を選択
  return candidates[0].username;
}

/**
 * インフルエンサーリストから最適な順序を生成
 * @param {Array<string>} influencerList - インフルエンサーリスト
 * @param {number} count - 選択する数
 * @returns {Promise<Array<string>>} 最適化されたインフルエンサーリスト
 */
async function generateOptimalSequence(influencerList, count = 10) {
  const sequence = [];
  const usedSet = new Set();
  
  while (sequence.length < count && sequence.length < influencerList.length) {
    // 使用済みを除外
    const availableList = influencerList.filter(username => !usedSet.has(username));
    if (availableList.length === 0) break;
    
    // 最適なインフルエンサーを選択
    const selected = await selectOptimalInfluencer(availableList, {
      excludeRecent: true,
      recentHours: 6,
      diversityBonus: true,
    });
    
    sequence.push(selected);
    usedSet.add(selected);
  }
  
  return sequence;
}

/**
 * インフルエンサーパフォーマンスレポートを生成
 * @param {Array<string>} influencerList - インフルエンサーリスト
 * @param {number} topN - 上位N件を表示
 * @returns {Promise<Object>} レポート
 */
async function generatePerformanceReport(influencerList, topN = 20) {
  const rankedList = await rankInfluencers(influencerList);
  
  const report = {
    totalInfluencers: rankedList.length,
    topPerformers: rankedList.slice(0, topN).map((item, index) => ({
      rank: index + 1,
      username: item.username,
      score: item.score.toFixed(2),
      avgImpressions: item.stats?.avgImpressions || 0,
      avgEngagementRate: item.stats?.avgEngagementRate?.toFixed(2) + '%' || 'N/A',
      totalPosts: item.stats?.totalPosts || 0,
      conversions: item.stats?.conversions || 0,
    })),
    bottomPerformers: rankedList.slice(-10).reverse().map((item, index) => ({
      rank: rankedList.length - index,
      username: item.username,
      score: item.score.toFixed(2),
      avgImpressions: item.stats?.avgImpressions || 0,
      avgEngagementRate: item.stats?.avgEngagementRate?.toFixed(2) + '%' || 'N/A',
      totalPosts: item.stats?.totalPosts || 0,
    })),
    summary: {
      avgScore: (rankedList.reduce((sum, item) => sum + item.score, 0) / rankedList.length).toFixed(2),
      topScore: rankedList[0]?.score.toFixed(2) || 0,
      medianScore: rankedList[Math.floor(rankedList.length / 2)]?.score.toFixed(2) || 0,
    },
  };
  
  return report;
}

module.exports = {
  getInfluencerStats,
  updateInfluencerStats,
  rankInfluencers,
  selectOptimalInfluencer,
  generateOptimalSequence,
  generatePerformanceReport,
};
