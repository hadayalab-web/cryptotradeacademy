// services/x/postTracker.js
// X投稿ID追跡機能（すべての投稿タイプで投稿IDをKVに保存）
// CRITICAL FIX: エラーハンドリングとバリデーションを強化

// Vercel KV（投稿履歴追跡用）
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[X Post Tracker] @vercel/kv not available:", error.message);
}

/**
 * パラメータをバリデーション
 * @param {string} tweetId - ツイートID
 * @param {string} postType - 投稿タイプ
 * @param {string} lang - 言語コード
 * @throws {Error} バリデーションエラー
 */
function validatePostData(tweetId, postType, lang) {
  if (!tweetId || typeof tweetId !== "string" || tweetId.trim() === "") {
    throw new Error(`CRITICAL: Invalid tweetId: ${tweetId}`);
  }

  const validPostTypes = ["quote_repost", "free_report", "minimal_version"];
  if (!postType || !validPostTypes.includes(postType)) {
    throw new Error(
      `CRITICAL: Invalid postType: ${postType}. Must be one of: ${validPostTypes.join(", ")}`
    );
  }

  if (!lang || typeof lang !== "string" || lang.trim() === "") {
    throw new Error(`CRITICAL: Invalid lang: ${lang}`);
  }
}

/**
 * KV接続をテスト
 * @throws {Error} KV接続エラー
 */
async function testKvConnection() {
  if (!kv) {
    throw new Error("CRITICAL: KV not available");
  }

  try {
    // 接続テスト（小さなデータを読み書き）
    const testKey = "x:test:connection";
    await kv.set(testKey, { test: true }, { ex: 10 });
    const testData = await kv.get(testKey);
    if (!testData || testData.test !== true) {
      throw new Error("KV connection test failed: data mismatch");
    }
    await kv.del(testKey);
  } catch (error) {
    throw new Error(`CRITICAL: KV connection test failed: ${error.message}`);
  }
}

/**
 * 投稿IDをKVに保存
 * @param {string} tweetId - ツイートID
 * @param {string} postType - 投稿タイプ（'quote_repost', 'free_report', 'minimal_version'）
 * @param {string} lang - 言語コード
 * @param {Object} metadata - 追加メタデータ（オプション）
 * @returns {Promise<boolean>} 保存に成功した場合true、失敗した場合false
 * @throws {Error} 致命的なエラーの場合
 */
async function savePostId(tweetId, postType, lang, metadata = {}) {
  // CRITICAL FIX: バリデーションを最初に実行
  validatePostData(tweetId, postType, lang);

  // CRITICAL FIX: KV接続をテスト
  try {
    await testKvConnection();
  } catch (error) {
    // KV接続エラーは致命的
    console.error("[X Post Tracker] ❌ CRITICAL KV connection error:", error.message);
    throw error;
  }

  try {
    const dateString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const key = `x:posts:${dateString}`;

    // 既存の投稿リストを取得
    let existing = await kv.get(key);

    // 数値の場合は空配列に変換して保存し直す（投稿カウントと競合している可能性がある）
    // 投稿カウントは`x:posts_count:${dateString}`に移動したため、ここに数値がある場合は古いデータ
    if (typeof existing === "number") {
      console.warn(
        `[X Post Tracker] Key ${key} contains a number (${existing}) instead of array. This is likely old post count data. Clearing and converting to array.`
      );
      existing = [];
      // すぐに空配列を保存して、数値を上書き
      await kv.set(key, existing, { ex: 86400 * 30 });
    }

    // 配列でない場合は空配列に変換
    if (!Array.isArray(existing)) {
      existing = [];
    }

    // 重複チェック（同じtweetIdが既に存在する場合はスキップ）
    const existingTweetId = existing.find((p) => p.tweetId === tweetId);
    if (existingTweetId) {
      console.log(`[X Post Tracker] Post ID ${tweetId} already exists, skipping duplicate save`);
      return true; // 既に存在する場合は成功として扱う
    }

    // 新しい投稿を追加
    const postData = {
      tweetId,
      postType, // 'quote_repost', 'free_report', 'minimal_version'
      lang,
      postedAt: new Date().toISOString(),
      ...metadata
    };

    existing.push(postData);

    // KVに保存（30日間保持）
    await kv.set(key, existing, { ex: 86400 * 30 });

    console.log(
      `[X Post Tracker] ✅ Post ID saved: ${tweetId} (${postType}, ${lang}) - Total posts for ${dateString}: ${existing.length}`
    );
    return true;
  } catch (error) {
    // CRITICAL FIX: エラーを致命的として扱う
    console.error("[X Post Tracker] ❌ CRITICAL: Failed to save post ID:", error.message);
    console.error("[X Post Tracker] Error stack:", error.stack);
    throw new Error(`CRITICAL: Failed to save post ID ${tweetId}: ${error.message}`);
  }
}

/**
 * 指定日の投稿IDリストを取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Array>} 投稿IDリスト
 */
async function getPostsForDate(dateString) {
  if (!kv) {
    return [];
  }

  try {
    const key = `x:posts:${dateString}`;
    const data = await kv.get(key);

    // 数値の場合は空配列を返す（投稿カウントと競合している可能性がある）
    if (typeof data === "number") {
      console.warn(
        `[X Post Tracker] Key ${key} contains a number (${data}) instead of array. This may be a post count. Returning empty array.`
      );
      return [];
    }

    // 配列の場合はそのまま返す
    if (Array.isArray(data)) {
      return data;
    }

    // その他の場合は空配列を返す
    return [];
  } catch (error) {
    console.warn("[X Post Tracker] Failed to get posts for date:", error.message);
    return [];
  }
}

/**
 * 過去N日間の投稿IDリストを取得
 * @param {number} days - 日数
 * @returns {Promise<Array>} 投稿IDリスト
 */
async function getPostsForLastNDays(days = 7) {
  if (!kv) {
    return [];
  }

  try {
    const posts = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
      const dayPosts = await getPostsForDate(dateString);
      posts.push(...dayPosts);
    }

    return posts;
  } catch (error) {
    console.warn("[X Post Tracker] Failed to get posts for last N days:", error.message);
    return [];
  }
}

/**
 * 指定タイプの投稿IDリストを取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {string} postType - 投稿タイプ（'quote_repost', 'free_report', 'minimal_version'）
 * @returns {Promise<Array>} 投稿IDリスト
 */
async function getPostsByType(dateString, postType) {
  const posts = await getPostsForDate(dateString);
  return posts.filter((post) => post.postType === postType);
}

module.exports = {
  savePostId,
  getPostsForDate,
  getPostsForLastNDays,
  getPostsByType
};
