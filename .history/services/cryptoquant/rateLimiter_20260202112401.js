// services/cryptoquant/rateLimiter.js
// Phase 3: 分散レート制限（トークンバケット/固定窓）
// Step 2-3: KV不調時のレート制限フォールバック強化（ローカル最小制限）

const { kv } = require("@vercel/kv");

// Professionalプラン: 20 req/min
// Premiumプラン: より高いレート制限
const CRYPTOQUANT_PLAN = process.env.CRYPTOQUANT_PLAN || "professional";
const RATE_LIMIT_PER_MINUTE =
  CRYPTOQUANT_PLAN === "premium" || CRYPTOQUANT_PLAN === "enterprise" ? 60 : 20;

// Step 2-3: ローカル最小制限（KV不調時のフォールバック）
// Professional: 10 req/min, Premium: 30 req/min（分散レート制限の50%）
const LOCAL_MIN_RATE_LIMIT_PER_MINUTE =
  CRYPTOQUANT_PLAN === "premium" || CRYPTOQUANT_PLAN === "enterprise" ? 30 : 10;

// レート制限キー
const RATE_LIMIT_KEY = "cq:rate_limit:bucket";
const RATE_LIMIT_WINDOW_KEY = "cq:rate_limit:window";

// Step 2-3: ローカルレート制限（KV不調時のフォールバック）
// メモリベースのローカルカウンター（プロセス単位）
// P0修正: setIntervalを廃止し、lazy cleanup方式に変更（Serverless適合）
const localRateLimitCounters = new Map(); // windowStart -> count
const MAX_CLEANUP_THRESHOLD = 10; // カウンターが10個以上になったらクリーンアップ

/**
 * Step 2-3: ローカルレート制限チェック（KV不調時のフォールバック）
 * P0修正: lazy cleanup方式（Serverless適合）
 * @param {number} windowStart - ウィンドウ開始時刻（ミリ秒）
 * @returns {boolean} リクエスト可能な場合 true
 */
function checkLocalRateLimit(windowStart) {
  // Lazy cleanup: カウンターが多くなったら古いものを削除
  if (localRateLimitCounters.size >= MAX_CLEANUP_THRESHOLD) {
    const now = Date.now();
    const currentWindow = Math.floor(now / 60000) * 60000;
    for (const [window, count] of localRateLimitCounters.entries()) {
      if (window < currentWindow - 120000) {
        // 2分以上古いカウンターを削除
        localRateLimitCounters.delete(window);
      }
    }
  }

  const currentCount = localRateLimitCounters.get(windowStart) || 0;

  if (currentCount >= LOCAL_MIN_RATE_LIMIT_PER_MINUTE) {
    console.warn(
      `[Rate Limit] Local rate limit exceeded: ${currentCount}/${LOCAL_MIN_RATE_LIMIT_PER_MINUTE} requests per minute (KV unavailable)`
    );
    return false;
  }

  // リクエスト数をインクリメント
  localRateLimitCounters.set(windowStart, currentCount + 1);
  return true;
}

/**
 * トークンバケット方式のレート制限チェック
 * Step 2-3: KV不調時はローカル最小制限にフォールバック
 * @returns {Promise<boolean>} リクエスト可能な場合 true
 */
async function checkTokenBucket() {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1分単位のウィンドウ

  try {
    if (!kv) {
      // KVが利用不可の場合はローカル最小制限にフォールバック
      console.warn("[Rate Limit] KV unavailable, using local minimum rate limit");
      return checkLocalRateLimit(windowStart);
    }

    const windowKey = `${RATE_LIMIT_WINDOW_KEY}:${windowStart}`;

    // 現在のウィンドウのリクエスト数を取得
    const currentCount = (await kv.get(windowKey)) || 0;

    if (currentCount >= RATE_LIMIT_PER_MINUTE) {
      // レート制限超過
      console.warn(
        `[Rate Limit] Exceeded limit: ${currentCount}/${RATE_LIMIT_PER_MINUTE} requests per minute`
      );
      return false;
    }

    // リクエスト数をインクリメント（TTL: 2分で自動削除）
    await kv.incr(windowKey);
    await kv.expire(windowKey, 120); // 2分後に自動削除

    return true;
  } catch (error) {
    console.warn(
      "[Rate Limit] Error checking rate limit, falling back to local minimum:",
      error.message
    );
    // Step 2-3: エラー時はローカル最小制限にフォールバック（スキップではなく）
    return checkLocalRateLimit(windowStart);
  }
}

/**
 * 固定窓方式のレート制限チェック（代替実装）
 * Step 2-3: KV不調時はローカル最小制限にフォールバック
 * @returns {Promise<boolean>} リクエスト可能な場合 true
 */
async function checkFixedWindow() {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1分単位のウィンドウ

  try {
    if (!kv) {
      // KVが利用不可の場合はローカル最小制限にフォールバック
      return checkLocalRateLimit(windowStart);
    }

    const windowKey = `${RATE_LIMIT_WINDOW_KEY}:${windowStart}`;

    // 現在のウィンドウのリクエスト数を取得
    const currentCount = (await kv.get(windowKey)) || 0;

    if (currentCount >= RATE_LIMIT_PER_MINUTE) {
      return false;
    }

    // リクエスト数をインクリメント
    await kv.incr(windowKey);
    await kv.expire(windowKey, 120); // 2分後に自動削除

    return true;
  } catch (error) {
    console.warn(
      "[Rate Limit] Error checking fixed window, falling back to local minimum:",
      error.message
    );
    // Step 2-3: エラー時はローカル最小制限にフォールバック
    return checkLocalRateLimit(windowStart);
  }
}

/**
 * レート制限を待機（指数バックオフ）
 * @param {number} maxWaitMs - 最大待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
async function waitForRateLimit(maxWaitMs = 60000) {
  const startTime = Date.now();
  let waitTime = 1000; // 初期待機時間: 1秒

  while (Date.now() - startTime < maxWaitMs) {
    const canProceed = await checkTokenBucket();
    if (canProceed) {
      return;
    }

    // 指数バックオフで待機
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    waitTime = Math.min(waitTime * 2, 10000); // 最大10秒まで
  }

  throw new Error("Rate limit wait timeout");
}

module.exports = {
  checkTokenBucket,
  checkFixedWindow,
  waitForRateLimit,
  RATE_LIMIT_PER_MINUTE
};
