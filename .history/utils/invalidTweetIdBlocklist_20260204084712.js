// utils/invalidTweetIdBlocklist.js
// Tweet not found（削除/非公開）で失敗したtweetIdをKVに記録し、次回以降スキップする

let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch {
  // KV未使用時は無効
}

const BLOCKLIST_KEY_PREFIX = "x:invalid_tweet_ids:";
const BLOCKLIST_TTL = 86400 * 7; // 7日間保持

/**
 * 無効なtweetIdをブロックリストに追加
 * @param {string} lang - 言語コード
 * @param {string} tweetId - ツイートID
 */
async function addInvalidTweetId(lang, tweetId) {
  if (!kv || !tweetId) return;
  try {
    const key = `${BLOCKLIST_KEY_PREFIX}${lang}`;
    const existing = (await kv.get(key)) || [];
    const idStr = String(tweetId).trim();
    if (!existing.includes(idStr)) {
      const updated = [...existing, idStr];
      await kv.set(key, updated, { ex: BLOCKLIST_TTL });
      console.log(`[InvalidTweetId] Added ${idStr} to blocklist for ${lang}`);
    }
  } catch (err) {
    console.warn("[InvalidTweetId] Failed to add to blocklist:", err.message);
  }
}

/**
 * 言語別の無効tweetIdセットを取得
 * @param {string} lang - 言語コード
 * @returns {Promise<Set<string>>}
 */
async function getInvalidTweetIds(lang) {
  if (!kv) return new Set();
  try {
    const key = `${BLOCKLIST_KEY_PREFIX}${lang}`;
    const list = (await kv.get(key)) || [];
    return new Set(list.map(String));
  } catch {
    return new Set();
  }
}

/**
 * インフルエンサーリストから無効tweetIdを除外
 * @param {Array} influencers - インフルエンサー配列
 * @param {string} lang - 言語コード
 * @returns {Promise<Array>}
 */
async function filterInvalidTweetIds(influencers, lang) {
  if (!Array.isArray(influencers) || influencers.length === 0) return influencers;
  const blocklist = await getInvalidTweetIds(lang);
  if (blocklist.size === 0) return influencers;
  const filtered = influencers.filter((inf) => !blocklist.has(String(inf.tweetId || "").trim()));
  if (filtered.length < influencers.length) {
    console.log(
      `[InvalidTweetId] Filtered ${influencers.length - filtered.length} influencers with invalid tweetIds for ${lang}`
    );
  }
  return filtered;
}

module.exports = {
  addInvalidTweetId,
  getInvalidTweetIds,
  filterInvalidTweetIds
};
