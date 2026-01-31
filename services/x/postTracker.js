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
// P0 FIX: KV接続テストを起動時/一定間隔で実行（毎回実行しない）
let kvConnectionTested = false;
let kvConnectionTestTime = 0;
const KV_TEST_INTERVAL = 5 * 60 * 1000; // 5分間隔

async function savePostId(tweetId, postType, lang, metadata = {}) {
  // CRITICAL FIX: バリデーションを最初に実行
  validatePostData(tweetId, postType, lang);

  // P0 FIX: KV接続テストを一定間隔で実行（毎回実行しない）
  const now = Date.now();
  if (!kvConnectionTested || (now - kvConnectionTestTime) > KV_TEST_INTERVAL) {
    try {
      await testKvConnection();
      kvConnectionTested = true;
      kvConnectionTestTime = now;
    } catch (error) {
      // P0 FIX: KV接続エラーは警告に落として継続（投稿成功と分離）
      console.warn("[X Post Tracker] ⚠️ KV connection test failed (non-fatal):", error.message);
      // KVが利用できない場合は、投稿は成功したがトラッキングできない状態
      // 投稿自体は成功しているため、エラーをスローしない
      if (!kv) {
        console.warn("[X Post Tracker] ⚠️ KV not available, skipping post tracking (post may have succeeded)");
        return false; // トラッキング失敗を返すが、投稿は成功している可能性がある
      }
    }
  }

  try {
    const dateString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD;
    
    // P1 FIX: tweetId単位の一意キー方式で競合を回避（原子的操作に近づける）
    // キー形式: x:post:<tweetId>:<dateString> で一意性を確保
    const uniqueKey = `x:post:${tweetId}:${dateString}`;
    
    // 重複チェック: 既に存在する場合はスキップ
    const existingPost = await kv.get(uniqueKey);
    if (existingPost) {
      console.log(`[X Post Tracker] Post ID ${tweetId} already exists (key: ${uniqueKey}), skipping duplicate save`);
      return true; // 既に存在する場合は成功として扱う
    }

    // 新しい投稿データ
    const postData = {
      tweetId,
      postType, // 'quote_repost', 'free_report', 'minimal_version'
      lang,
      postedAt: new Date().toISOString(),
      ...metadata
    };

    // P1 FIX: 一意キーで保存（競合を回避）
    await kv.set(uniqueKey, postData, { ex: 86400 * 30 }); // 30日間保持
    
    // 日次リストにも追加（後方互換性のため、ただし競合のリスクあり）
    // 注意: この部分は競合の可能性があるが、重複チェックは一意キーで行うため影響は限定的
    // P0 FIX: existingListを関数スコープで宣言（ブロック外で参照するため）
    const listKey = `x:posts:${dateString}`;
    let existingList = null;
    try {
      existingList = await kv.get(listKey) || [];
      if (!Array.isArray(existingList)) {
        existingList = [];
      }
      // 重複チェック（念のため）
      if (!existingList.find((p) => p.tweetId === tweetId)) {
        existingList.push(postData);
        await kv.set(listKey, existingList, { ex: 86400 * 30 });
      }
    } catch (listError) {
      // リスト更新失敗は警告のみ（一意キーは保存済み）
      console.warn(`[X Post Tracker] ⚠️ Failed to update daily list (non-fatal):`, listError.message);
      // エラー時は空配列として扱う
      existingList = existingList || [];
    }

    // P0 FIX: ログ出力を修正（スコープ外変数参照を修正）
    const totalCount = Array.isArray(existingList) ? existingList.length : 0;
    console.log(
      `[X Post Tracker] ✅ Post ID saved: ${tweetId} (${postType}, ${lang}) - Total posts for ${dateString}: ${totalCount}`
    );
    return true;
  } catch (error) {
    // P0 FIX: KV保存失敗は警告に落として継続（投稿成功と分離）
    console.warn("[X Post Tracker] ⚠️ Failed to save post ID (non-fatal):", {
      tweetId,
      postType,
      lang,
      error: error.message,
      note: "Post may have succeeded, but tracking failed. Will retry later."
    });
    // エラーをスローしない（投稿は成功している可能性がある）
    return false; // トラッキング失敗を返す
  }
}

/**
 * 指定日の投稿IDリストを取得
 * P1 FIX: 一意キー方式とリスト方式の両方から取得（後方互換性）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<Array>} 投稿IDリスト
 */
async function getPostsForDate(dateString) {
  if (!kv) {
    return [];
  }

  try {
    // P1 FIX: まずリストから取得（後方互換性）
    const listKey = `x:posts:${dateString}`;
    let data = await kv.get(listKey);

    // 数値の場合は空配列を返す（投稿カウントと競合している可能性がある）
    if (typeof data === "number") {
      console.warn(
        `[X Post Tracker] Key ${listKey} contains a number (${data}) instead of array. This may be a post count. Returning empty array.`
      );
      return [];
    }

    // 配列の場合はそのまま返す
    if (Array.isArray(data)) {
      return data;
    }

    // リストが空の場合は、一意キーから復元を試みる（オプション、パフォーマンス考慮でスキップ可能）
    // 注意: 一意キーから全件取得するのはコストが高いため、通常はリスト方式に依存
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

/**
 * 直近15分間の投稿数を取得（100/15min レート制限用）
 * @returns {Promise<number>} 直近15分の投稿数
 */
async function getPostCountInLast15Min() {
  if (!kv) {
    return 0;
  }

  try {
    const now = Date.now();
    const nowDate = new Date(now);
    const cutoff = new Date(now - 15 * 60 * 1000).toISOString();
    const today = nowDate.toISOString().split("T")[0];
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dateStrings = [today];
    // 0:00–0:14 UTC は直近15分が前日を含むため昨日分も取得
    if (nowDate.getUTCHours() === 0 && nowDate.getUTCMinutes() < 15) {
      dateStrings.push(yesterday);
    }
    let count = 0;
    for (const dateString of dateStrings) {
      const posts = await getPostsForDate(dateString);
      if (!Array.isArray(posts)) continue;
      for (const post of posts) {
        const postedAt = post && post.postedAt ? String(post.postedAt) : "";
        if (postedAt && postedAt >= cutoff) count += 1;
      }
    }
    return count;
  } catch (error) {
    console.warn("[X Post Tracker] Failed to get post count in last 15 min:", error.message);
    return 0;
  }
}

module.exports = {
  savePostId,
  getPostsForDate,
  getPostsForLastNDays,
  getPostsByType,
  getPostCountInLast15Min
};
