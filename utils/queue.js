// utils/queue.js
// Vercel KVベースの簡易キューシステム
// Grok CSO+CFO推奨: BullMQで配信キュー実装（レート制限対応）
// 注: Vercel環境ではRedisが直接使えないため、Vercel KVベースの簡易キューを実装

const { kv } = require('@vercel/kv');

const QUEUE_PREFIX = 'queue:vsl';
const PROCESSING_PREFIX = 'queue:processing';
const MAX_RETRIES = 3;
const PROCESSING_TIMEOUT = 300000; // 5分

/**
 * キューにジョブを追加
 * @param {string} queueName - キュー名（例: 'vsl1-post', 'vsl2-send'）
 * @param {Object} jobData - ジョブデータ
 * @param {Object} options - オプション
 * @param {number} options.priority - 優先度（高いほど優先、デフォルト: 0）
 * @param {number} options.delay - 遅延時間（ミリ秒、デフォルト: 0）
 * @returns {Promise<string>} ジョブID
 */
async function enqueue(queueName, jobData, options = {}) {
  const { priority = 0, delay = 0 } = options;
  const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const job = {
    id: jobId,
    queue: queueName,
    data: jobData,
    priority,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxRetries: MAX_RETRIES,
    status: 'pending',
  };

  try {
    if (!kv) {
      console.warn('[Queue] KV not available, job not queued');
      return jobId;
    }

    const queueKey = `${QUEUE_PREFIX}:${queueName}`;
    
    if (delay > 0) {
      // 遅延キュー: スコア付きセットを使用
      const executeAt = Date.now() + delay;
      await kv.zadd(`${queueKey}:delayed`, executeAt, JSON.stringify(job));
    } else {
      // 通常キュー: リストを使用（優先度付き）
      if (priority > 0) {
        // 優先度が高い場合は先頭に追加
        await kv.lpush(`${queueKey}:high`, JSON.stringify(job));
      } else {
        await kv.rpush(`${queueKey}:normal`, JSON.stringify(job));
      }
    }

    console.log(`[Queue] Job enqueued: ${jobId} (queue: ${queueName}, priority: ${priority})`);
    return jobId;
  } catch (error) {
    console.error(`[Queue] Failed to enqueue job: ${error.message}`);
    throw error;
  }
}

/**
 * キューからジョブを取得（FIFO、優先度考慮）
 * @param {string} queueName - キュー名
 * @returns {Promise<Object|null>} ジョブデータ（キューが空の場合はnull）
 */
async function dequeue(queueName) {
  try {
    if (!kv) {
      console.warn('[Queue] KV not available, cannot dequeue');
      return null;
    }

    const queueKey = `${QUEUE_PREFIX}:${queueName}`;
    
    // 1. 遅延キューから実行可能なジョブを取得
    const delayedKey = `${queueKey}:delayed`;
    const now = Date.now();
    const readyJobs = await kv.zrangebyscore(delayedKey, 0, now, { limit: { offset: 0, count: 1 } });
    
    if (readyJobs && readyJobs.length > 0) {
      const jobStr = readyJobs[0];
      await kv.zrem(delayedKey, jobStr);
      const job = JSON.parse(jobStr);
      await markAsProcessing(queueName, job.id);
      return job;
    }
    
    // 2. 優先度キューから取得
    const highPriorityJob = await kv.lpop(`${queueKey}:high`);
    if (highPriorityJob) {
      const job = JSON.parse(highPriorityJob);
      await markAsProcessing(queueName, job.id);
      return job;
    }
    
    // 3. 通常キューから取得
    const normalJob = await kv.lpop(`${queueKey}:normal`);
    if (normalJob) {
      const job = JSON.parse(normalJob);
      await markAsProcessing(queueName, job.id);
      return job;
    }
    
    return null;
  } catch (error) {
    console.error(`[Queue] Failed to dequeue job: ${error.message}`);
    return null;
  }
}

/**
 * ジョブを処理中としてマーク
 */
async function markAsProcessing(queueName, jobId) {
  try {
    if (!kv) return;
    
    const processingKey = `${PROCESSING_PREFIX}:${queueName}:${jobId}`;
    await kv.set(processingKey, new Date().toISOString(), { ex: Math.floor(PROCESSING_TIMEOUT / 1000) });
  } catch (error) {
    console.warn(`[Queue] Failed to mark as processing: ${error.message}`);
  }
}

/**
 * ジョブの処理を完了
 * @param {string} queueName - キュー名
 * @param {string} jobId - ジョブID
 */
async function complete(queueName, jobId) {
  try {
    if (!kv) return;
    
    const processingKey = `${PROCESSING_PREFIX}:${queueName}:${jobId}`;
    await kv.del(processingKey);
    console.log(`[Queue] Job completed: ${jobId}`);
  } catch (error) {
    console.warn(`[Queue] Failed to complete job: ${error.message}`);
  }
}

/**
 * ジョブの処理を失敗としてマーク（リトライ可能）
 * @param {string} queueName - キュー名
 * @param {string} jobId - ジョブID
 * @param {Error} error - エラー
 * @returns {Promise<boolean>} リトライ可能かどうか
 */
async function fail(queueName, jobId, error) {
  try {
    if (!kv) return false;
    
    const processingKey = `${PROCESSING_PREFIX}:${queueName}:${jobId}`;
    const jobData = await kv.get(processingKey);
    
    if (!jobData) {
      // ジョブデータが見つからない場合はリトライ不可
      return false;
    }
    
    const job = typeof jobData === 'string' ? JSON.parse(jobData) : jobData;
    job.attempts = (job.attempts || 0) + 1;
    job.lastError = error.message;
    job.lastFailedAt = new Date().toISOString();
    
    await kv.del(processingKey);
    
    // 最大リトライ回数に達していない場合は再キューイング
    if (job.attempts < job.maxRetries) {
      const queueKey = `${QUEUE_PREFIX}:${queueName}`;
      // 指数バックオフ: 2^attempts秒待機
      const delay = Math.pow(2, job.attempts) * 1000;
      await kv.zadd(`${queueKey}:delayed`, Date.now() + delay, JSON.stringify(job));
      console.log(`[Queue] Job requeued for retry: ${jobId} (attempt ${job.attempts}/${job.maxRetries}, delay: ${delay}ms)`);
      return true;
    } else {
      console.error(`[Queue] Job failed after max retries: ${jobId}`);
      return false;
    }
  } catch (err) {
    console.error(`[Queue] Failed to handle job failure: ${err.message}`);
    return false;
  }
}

/**
 * キューのサイズを取得
 * @param {string} queueName - キュー名
 * @returns {Promise<Object>} キューサイズ情報
 */
async function getQueueSize(queueName) {
  try {
    if (!kv) {
      return { high: 0, normal: 0, delayed: 0, processing: 0 };
    }

    const queueKey = `${QUEUE_PREFIX}:${queueName}`;
    const highSize = await kv.llen(`${queueKey}:high`) || 0;
    const normalSize = await kv.llen(`${queueKey}:normal`) || 0;
    const delayedSize = await kv.zcard(`${queueKey}:delayed`) || 0;
    
    // 処理中のジョブ数を取得（簡易実装）
    const processingPattern = `${PROCESSING_PREFIX}:${queueName}:*`;
    // 注: KVではパターンマッチができないため、簡易実装
    const processingSize = 0; // 実際の実装では別の方法が必要
    
    return {
      high: highSize,
      normal: normalSize,
      delayed: delayedSize,
      processing: processingSize,
      total: highSize + normalSize + delayedSize + processingSize,
    };
  } catch (error) {
    console.error(`[Queue] Failed to get queue size: ${error.message}`);
    return { high: 0, normal: 0, delayed: 0, processing: 0, total: 0 };
  }
}

module.exports = {
  enqueue,
  dequeue,
  complete,
  fail,
  getQueueSize,
};
