// services/lead-discovery/priorityQueue.js
// ドンピシャリード優先キューシステム

const { enqueue, dequeue, complete, fail, getQueueSize } = require('../../utils/queue');

const QUEUE_NAME = 'lead-discovery';

/**
 * リード優先度レベル
 */
const PRIORITY_LEVELS = {
  PERFECT_MATCH: 1,    // ドンピシャリード（スコア0.8以上）
  HIGH: 2,             // 高優先度（損失キーワード含む）
  MEDIUM: 3,           // 中優先度
  LOW: 4,              // 低優先度
};

/**
 * リードをキューに追加（優先度付き）
 * @param {Object} lead - リード情報
 * @param {number} priority - 優先度（1-4、1が最高）
 * @returns {Promise<string>} ジョブID
 */
async function enqueueLead(lead, priority = PRIORITY_LEVELS.MEDIUM) {
  if (!lead) {
    throw new Error('Lead is required');
  }
  
  // 優先度を決定（リード情報から自動判定）
  if (lead.isPerfectMatch) {
    priority = PRIORITY_LEVELS.PERFECT_MATCH;
  } else if (lead.priority === 'high') {
    priority = PRIORITY_LEVELS.HIGH;
  } else if (lead.priority === 'medium') {
    priority = PRIORITY_LEVELS.MEDIUM;
  } else {
    priority = PRIORITY_LEVELS.LOW;
  }
  
  // ジョブデータ
  const jobData = {
    lead,
    priority,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: 3,
  };
  
  // キューに追加（優先度付き）
  const jobId = await enqueue(QUEUE_NAME, jobData, {
    priority,
    delay: 0, // 即座に処理
  });
  
  return jobId;
}

/**
 * キューからリードを取得（優先度順）
 * @returns {Promise<Object|null>} リード情報またはnull
 */
async function dequeueLead() {
  // 優先度順に取得（1→2→3→4）
  for (const level of Object.values(PRIORITY_LEVELS)) {
    const job = await dequeue(QUEUE_NAME, { priority: level });
    if (job) {
      return {
        jobId: job.id,
        lead: job.data.lead,
        priority: job.data.priority,
        attempts: job.data.attempts,
      };
    }
  }
  
  return null;
}

/**
 * リード処理を完了
 * @param {string} jobId - ジョブID
 * @returns {Promise<void>}
 */
async function completeLead(jobId) {
  await complete(QUEUE_NAME, jobId);
}

/**
 * リード処理を失敗として記録
 * @param {string} jobId - ジョブID
 * @param {Error} error - エラー
 * @returns {Promise<void>}
 */
async function failLead(jobId, error) {
  await fail(QUEUE_NAME, jobId, error.message);
}

/**
 * キューサイズを取得
 * @returns {Promise<Object>} 優先度別のキューサイズ
 */
async function getQueueStats() {
  const totalSize = await getQueueSize(QUEUE_NAME);
  
  // 優先度別のサイズを取得（実際の実装では、Vercel KVから優先度別に取得）
  return {
    total: totalSize,
    perfectMatch: 0, // TODO: 優先度別に取得
    high: 0,
    medium: 0,
    low: 0,
  };
}

/**
 * ドンピシャリードの数を取得
 * @returns {Promise<number>} ドンピシャリードの数
 */
async function getPerfectMatchCount() {
  const stats = await getQueueStats();
  return stats.perfectMatch;
}

module.exports = {
  PRIORITY_LEVELS,
  enqueueLead,
  dequeueLead,
  completeLead,
  failLead,
  getQueueStats,
  getPerfectMatchCount,
};
