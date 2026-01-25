// services/x/postTracker.js
// X投稿ID追跡機能（すべての投稿タイプで投稿IDをKVに保存）

// Vercel KV（投稿履歴追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[X Post Tracker] @vercel/kv not available:', error.message);
}

/**
 * 投稿IDをKVに保存
 * @param {string} tweetId - ツイートID
 * @param {string} postType - 投稿タイプ（'quote_repost', 'free_report', 'minimal_version'）
 * @param {string} lang - 言語コード
 * @param {Object} metadata - 追加メタデータ（オプション）
 * @returns {Promise<void>}
 */
async function savePostId(tweetId, postType, lang, metadata = {}) {
  if (!kv) {
    console.warn('[X Post Tracker] KV not available, skipping post ID save');
    return;
  }
  
  if (!tweetId || !postType || !lang) {
    console.warn('[X Post Tracker] Missing required parameters:', { tweetId, postType, lang });
    return;
  }
  
  try {
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `x:posts:${dateString}`;
    
    // 既存の投稿リストを取得
    let existing = await kv.get(key);
    
    // 数値の場合は空配列に変換して保存し直す（投稿カウントと競合している可能性がある）
    // 投稿カウントは`x:posts_count:${dateString}`に移動したため、ここに数値がある場合は古いデータ
    if (typeof existing === 'number') {
      console.warn(`[X Post Tracker] Key ${key} contains a number (${existing}) instead of array. This is likely old post count data. Clearing and converting to array.`);
      existing = [];
      // すぐに空配列を保存して、数値を上書き
      await kv.set(key, existing, { ex: 86400 * 30 });
    }
    
    // 配列でない場合は空配列に変換
    if (!Array.isArray(existing)) {
      existing = [];
    }
    
    // 重複チェック（同じtweetIdが既に存在する場合はスキップ）
    const existingTweetId = existing.find(p => p.tweetId === tweetId);
    if (existingTweetId) {
      console.log(`[X Post Tracker] Post ID ${tweetId} already exists, skipping duplicate save`);
      return;
    }
    
    // 新しい投稿を追加
    const postData = {
      tweetId,
      postType, // 'quote_repost', 'free_report', 'minimal_version'
      lang,
      postedAt: new Date().toISOString(),
      ...metadata,
    };
    
    existing.push(postData);
    
    // KVに保存（30日間保持）
    await kv.set(key, existing, { ex: 86400 * 30 });
    
    console.log(`[X Post Tracker] ✅ Post ID saved: ${tweetId} (${postType}, ${lang}) - Total posts for ${dateString}: ${existing.length}`);
  } catch (error) {
    console.error('[X Post Tracker] ❌ Failed to save post ID:', error.message);
    console.error('[X Post Tracker] Error stack:', error.stack);
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
    if (typeof data === 'number') {
      console.warn(`[X Post Tracker] Key ${key} contains a number (${data}) instead of array. This may be a post count. Returning empty array.`);
      return [];
    }
    
    // 配列の場合はそのまま返す
    if (Array.isArray(data)) {
      return data;
    }
    
    // その他の場合は空配列を返す
    return [];
  } catch (error) {
    console.warn('[X Post Tracker] Failed to get posts for date:', error.message);
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
      const dateString = date.toISOString().split('T')[0];
      const dayPosts = await getPostsForDate(dateString);
      posts.push(...dayPosts);
    }
    
    return posts;
  } catch (error) {
    console.warn('[X Post Tracker] Failed to get posts for last N days:', error.message);
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
  return posts.filter(post => post.postType === postType);
}

module.exports = {
  savePostId,
  getPostsForDate,
  getPostsForLastNDays,
  getPostsByType,
};
