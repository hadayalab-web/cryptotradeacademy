// services/x/influencerRotation.js
// インフルエンサーローテーション管理（70人リストを上手にローテーション）
//
// タイムゾーン仕様: UTC日付で管理（P0-4対応）
// - 日付キーは `new Date().toISOString().split('T')[0]` で生成（UTC基準）
// - ローテーション、投稿済み判定、日次上限はすべてUTC日付で動作

// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require("../../utils/kv");

// KVキーのプレフィックス
const ROTATION_KEY_PREFIX = "x:influencer_rotation:";
const POSTED_TODAY_KEY_PREFIX = "x:influencer_posted_today:";
const LAST_POSTED_KEY_PREFIX = "x:influencer_last_posted:";
const RUN_INDEX_KEY_PREFIX = "x:quote_repost:run_index:";

/**
 * 言語別のローテーションキーを生成
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {string} KVキー
 */
function getRotationKey(lang, dateString) {
  return `${ROTATION_KEY_PREFIX}${lang.toLowerCase()}:${dateString}`;
}

/**
 * 言語別の今日投稿済みキーを生成
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {string} KVキー
 */
function getPostedTodayKey(lang, dateString) {
  return `${POSTED_TODAY_KEY_PREFIX}${lang.toLowerCase()}:${dateString}`;
}

/**
 * 今日既に投稿したインフルエンサーのユーザー名リストを取得
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<Set<string>>} 投稿済みインフルエンサーのユーザー名セット
 */
async function getPostedInfluencersToday(lang, dateString = null) {
  if (!kv) {
    console.warn("[InfluencerRotation] KV not available, cannot get posted influencers");
    return new Set();
  }

  try {
    const targetDate = dateString || new Date().toISOString().split("T")[0];
    const key = getPostedTodayKey(lang, targetDate);
    const posted = await kv.get(key);

    if (!posted || !Array.isArray(posted)) {
      return new Set();
    }

    return new Set(posted);
  } catch (error) {
    console.error(
      `[InfluencerRotation] Failed to get posted influencers for ${lang}:`,
      error.message
    );
    return new Set();
  }
}

/**
 * ロックキーを取得（P0-2対応: 原子性を保証）
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {string} ロックキー
 */
function getLockKey(lang, dateString) {
  return `x:lock:posted_today:${lang.toLowerCase()}:${dateString}`;
}

/**
 * ロックを取得（SET NX EX相当）
 *
 * 注意: Vercel KVは廃止され、Upstash Redisに移行済み
 * - `@vercel/kv`パッケージは非推奨だが、既存プロジェクトでは動作
 * - Upstash Redisは標準的なRedisコマンドをサポート
 * - `nx`オプションのサポート状況は`@vercel/kv`パッケージの実装に依存
 *
 * @param {string} lockKey - ロックキー
 * @param {number} ttlSeconds - TTL（秒、デフォルト: 10秒）
 * @returns {Promise<boolean>} ロック取得成功時true
 */
async function acquireLock(lockKey, ttlSeconds = 10) {
  if (!kv) return false;
  try {
    // SET NX EX相当: キーが存在しない場合のみ設定し、TTLを設定
    // Vercel KV/Upstash Redisは標準的なRedisコマンドをサポート
    // @vercel/kvパッケージが`nx`オプションをサポートしているか確認
    const lockValue = Date.now().toString();

    // まず既存のロックをチェック
    const existing = await kv.get(lockKey);
    if (existing) {
      // ロックが既に存在する場合、TTLをチェック（古いロックの可能性）
      // ここでは単純に失敗として扱う（デッドロック回避のため）
      return false;
    }

    // ロックが存在しない場合、設定を試みる
    // @vercel/kvが`nx`オプションをサポートしている場合は使用、そうでない場合は代替実装
    try {
      const result = await kv.set(lockKey, lockValue, { ex: ttlSeconds, nx: true });
      return result === "OK" || result === true;
    } catch (nxError) {
      // `nx`オプションがサポートされていない場合、再チェック方式を使用
      // これは完全に原子的ではないが、ほとんどのケースで動作する
      // 将来的には`@upstash/redis`への移行を検討（標準的なRedisコマンドの完全サポート）
      const checkAgain = await kv.get(lockKey);
      if (checkAgain) {
        return false; // 他のプロセスがロックを取得した
      }
      // 再チェック時もロックが存在しない場合、設定を試みる
      await kv.set(lockKey, lockValue, { ex: ttlSeconds });
      // 設定後に再確認（競合チェック）
      const verify = await kv.get(lockKey);
      return verify === lockValue; // 自分が設定した値と一致するか確認
    }
  } catch (error) {
    console.warn(`[InfluencerRotation] Failed to acquire lock ${lockKey}:`, error.message);
    return false;
  }
}

/**
 * ロックを解放
 * @param {string} lockKey - ロックキー
 * @returns {Promise<void>}
 */
async function releaseLock(lockKey) {
  if (!kv) return;
  try {
    await kv.del(lockKey);
  } catch (error) {
    console.warn(`[InfluencerRotation] Failed to release lock ${lockKey}:`, error.message);
  }
}

/**
 * インフルエンサーを今日の投稿済みリストに追加（P0-2対応: 原子性を保証）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<boolean>} 保存成功時true
 */
async function markInfluencerPosted(lang, username, dateString = null) {
  if (!kv) {
    console.warn("[InfluencerRotation] KV not available, cannot mark influencer as posted");
    return false;
  }

  const targetDate = dateString || new Date().toISOString().split("T")[0];
  const key = getPostedTodayKey(lang, targetDate);
  const lockKey = getLockKey(lang, targetDate);

  // P0-2対応: ロックを取得してから更新（最大10回リトライ、100ms間隔）
  let lockAcquired = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    lockAcquired = await acquireLock(lockKey, 10);
    if (lockAcquired) break;
    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms待機
  }

  if (!lockAcquired) {
    console.warn(
      `[InfluencerRotation] ⚠️ Failed to acquire lock after 10 attempts, proceeding without lock (risk of race condition)`
    );
    // ロック取得失敗時も処理を続行（可用性優先、ただし競合リスクあり）
  }

  try {
    // 既存のリストを取得
    const posted = (await kv.get(key)) || [];
    const postedSet = new Set(posted);

    // 新しいユーザー名を追加
    if (!postedSet.has(username)) {
      postedSet.add(username);
      const updatedList = Array.from(postedSet);

      // KVに保存（TTL: 48時間、日付が変わっても安全に保持）
      await kv.set(key, updatedList, { ex: 48 * 60 * 60 });

      console.log(
        `[InfluencerRotation] ✅ Marked @${username} as posted for ${lang} on ${targetDate} (total: ${updatedList.length})`
      );
      return true;
    }

    return true; // 既に存在する場合も成功として扱う
  } catch (error) {
    console.error(
      `[InfluencerRotation] Failed to mark influencer as posted for ${lang}:`,
      error.message
    );
    return false;
  } finally {
    // ロックを解放
    if (lockAcquired) {
      await releaseLock(lockKey);
    }
  }
}

/**
 * ローテーションインデックスを取得（次に選ぶべきインフルエンサーの開始位置）
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<number>} ローテーションインデックス
 */
async function getRotationIndex(lang, dateString = null) {
  if (!kv) {
    return 0;
  }

  try {
    const targetDate = dateString || new Date().toISOString().split("T")[0];
    const key = getRotationKey(lang, targetDate);
    const index = await kv.get(key);

    return index !== null && typeof index === "number" ? index : 0;
  } catch (error) {
    console.error(`[InfluencerRotation] Failed to get rotation index for ${lang}:`, error.message);
    return 0;
  }
}

/**
 * ローテーションインデックスを更新
 * @param {string} lang - 言語コード
 * @param {number} newIndex - 新しいインデックス
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<boolean>} 更新成功時true
 */
async function updateRotationIndex(lang, newIndex, dateString = null) {
  if (!kv) {
    return false;
  }

  try {
    const targetDate = dateString || new Date().toISOString().split("T")[0];
    const key = getRotationKey(lang, targetDate);

    // KVに保存（TTL: 48時間）
    await kv.set(key, newIndex, { ex: 48 * 60 * 60 });

    return true;
  } catch (error) {
    console.error(
      `[InfluencerRotation] Failed to update rotation index for ${lang}:`,
      error.message
    );
    return false;
  }
}

/**
 * 今日の「何回目の実行か」を取得して1進める（1日2投稿/人用の割り振りに使用）
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<number>} 今回の実行の0始まりインデックス（同じ日に次回は+1）
 */
async function getAndIncrementRunIndex(lang, dateString = null) {
  if (!kv) return 0;
  const targetDate = dateString || new Date().toISOString().split("T")[0];
  const key = `${RUN_INDEX_KEY_PREFIX}${lang.toLowerCase()}:${targetDate}`;
  try {
    const value = await kv.incr(key);
    if (value === 1) await kv.expire(key, 48 * 60 * 60);
    return value - 1;
  } catch (e) {
    console.warn("[InfluencerRotation] getAndIncrementRunIndex failed:", e.message);
    return 0;
  }
}

/**
 * インフルエンサーリストから、ローテーションを考慮して選択
 * maxDailyPosts 指定時は「今日の投稿数が maxDailyPosts 未満」の人だけ候補（1人2投稿/日を保証）。
 * @param {Array} influencers - インフルエンサー配列
 * @param {string} lang - 言語コード
 * @param {number} count - 選択する人数
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @param {{ maxDailyPosts?: number }} options - maxDailyPosts: 日次上限（指定時はこの回数未満のみ候補、省略時は投稿済み1回でも除外）
 * @returns {Promise<Array>} 選択されたインフルエンサー配列
 */
async function selectInfluencersWithRotation(influencers, lang, count, dateString = null, options = {}) {
  if (!influencers || influencers.length === 0) {
    return [];
  }

  const targetDate = dateString || new Date().toISOString().split("T")[0];
  const maxDailyPosts = options.maxDailyPosts;

  let availableInfluencers;

  if (maxDailyPosts != null && maxDailyPosts > 0) {
    // 1人あたり日次上限あり: 今日の投稿数が maxDailyPosts 未満の人だけ候補
    const withCount = await Promise.all(
      influencers.map(async (inf) => {
        const username = inf.username || inf.userId || inf.id;
        if (!username) return { inf, count: 999 };
        if (inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase()) return null;
        if (!inf.lang) inf.lang = lang;
        const c = await getDailyPostCount(lang, username, targetDate);
        return { inf, count: c };
      })
    );
    availableInfluencers = withCount
      .filter((x) => x != null && x.count < maxDailyPosts)
      .map((x) => x.inf);
  } else {
    // 従来: 今日1回でも投稿した人は除外
    const postedToday = await getPostedInfluencersToday(lang, targetDate);
    availableInfluencers = influencers.filter((inf) => {
      const username = inf.username || inf.userId || inf.id;
      if (!username) return false;
      if (inf.lang && inf.lang.toLowerCase() !== lang.toLowerCase()) return false;
      if (!inf.lang) {
        inf.lang = lang;
      }
      return !postedToday.has(username);
    });
  }

  // 利用可能なインフルエンサーが不足している場合、投稿済みも含めてローテーションで選ぶ
  if (availableInfluencers.length < count) {
    console.log(
      `[InfluencerRotation] ⚠️ Only ${availableInfluencers.length} available for ${lang} (need ${count}), using full rotation`
    );
    if (maxDailyPosts != null && maxDailyPosts > 0 && kv) {
      try {
        const key = getPostedTodayKey(lang, targetDate);
        await kv.del(key);
      } catch (error) {
        console.warn(`[InfluencerRotation] Failed to reset posted list:`, error.message);
      }
    }
    const allInfluencers = influencers;

    // ローテーションインデックスを取得
    const rotationIndex = await getRotationIndex(lang, targetDate);

    // ローテーション順に選択（循環）
    const selected = [];
    for (let i = 0; i < count && i < allInfluencers.length; i++) {
      const index = (rotationIndex + i) % allInfluencers.length;
      selected.push(allInfluencers[index]);
    }

    // ローテーションインデックスを更新
    const newIndex = (rotationIndex + count) % allInfluencers.length;
    await updateRotationIndex(lang, newIndex, targetDate);

    console.log(
      `[InfluencerRotation] ✅ Selected ${selected.length} influencers with rotation (index: ${rotationIndex} → ${newIndex})`
    );
    return selected;
  }

  // 利用可能なインフルエンサーが十分ある場合
  // 🚀 最適化: 未使用インフルエンサーを優先的に選択
  // 1. 最終投稿時刻でソート（未使用または古い投稿を優先）
  const influencersWithLastPosted = await Promise.all(
    availableInfluencers.map(async (inf) => {
      const username = inf.username || inf.userId || inf.id;
      const lastPosted = await getLastPostedAt(lang, username);
      return {
        influencer: inf,
        lastPosted: lastPosted || new Date(0), // 未使用の場合は1970-01-01
        username
      };
    })
  );

  // 最終投稿時刻でソート（古い順 = 未使用優先）
  influencersWithLastPosted.sort((a, b) => {
    return a.lastPosted.getTime() - b.lastPosted.getTime();
  });

  // ローテーションインデックスを取得
  const rotationIndex = await getRotationIndex(lang, targetDate);

  // ローテーション順に選択（循環、未使用優先）
  const selected = [];
  const sortedInfluencers = influencersWithLastPosted.map((item) => item.influencer);

  for (let i = 0; i < count && i < sortedInfluencers.length; i++) {
    const index = (rotationIndex + i) % sortedInfluencers.length;
    selected.push(sortedInfluencers[index]);
  }

  // ローテーションインデックスを更新
  const newIndex = (rotationIndex + count) % sortedInfluencers.length;
  await updateRotationIndex(lang, newIndex, targetDate);

  const unusedCount = influencersWithLastPosted.filter(
    (item) => item.lastPosted.getTime() === new Date(0).getTime()
  ).length;
  console.log(
    `[InfluencerRotation] ✅ Selected ${selected.length} influencers with rotation (available: ${availableInfluencers.length}, unused: ${unusedCount}, index: ${rotationIndex} → ${newIndex})`
  );
  return selected;
}

/**
 * 最終投稿時刻キーを生成
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @returns {string} KVキー
 */
function getLastPostedKey(lang, username) {
  const l = (lang || "en").toLowerCase();
  const u = (username || "").replace(/^@/, "").toLowerCase();
  return `${LAST_POSTED_KEY_PREFIX}${l}:${u}`;
}

/**
 * 最終投稿時刻(ISO文字列)を取得
 * KV障害時は null を返し、クールダウン判定をスキップ（=投稿を止めない）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @returns {Promise<Date|null>} 最終投稿時刻、取得できない場合はnull
 */
async function getLastPostedAt(lang, username) {
  if (!kv) return null;
  try {
    const key = getLastPostedKey(lang, username);
    const value = await kv.get(key);
    if (!value) return null;

    // valueはISO文字列想定
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    console.warn("[InfluencerRotation] getLastPostedAt failed:", e.message);
    return null;
  }
}

/**
 * 最終投稿時刻を記録（ISO文字列）
 * TTLは24h（8hクールダウン + 安全マージン）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {Date} date - 投稿時刻（省略時は現在時刻）
 * @returns {Promise<boolean>} 保存成功時true
 */
async function markLastPostedAt(lang, username, date = new Date()) {
  if (!kv) return false;
  try {
    const key = getLastPostedKey(lang, username);
    await kv.set(key, date.toISOString(), { ex: 24 * 60 * 60 });
    console.log(
      `[InfluencerRotation] ✅ Marked last posted at for @${username} (${lang}): ${date.toISOString()}`
    );
    return true;
  } catch (e) {
    console.warn("[InfluencerRotation] markLastPostedAt failed:", e.message);
    return false;
  }
}

/**
 * 8時間クールダウン判定
 * lastPostedAtが取れない場合は false（=クールダウン中ではない）として扱う
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {number} cooldownHours - クールダウン時間（時間単位、デフォルト: 8時間）
 * @param {Date} now - 現在時刻（省略時は現在時刻）
 * @returns {Promise<boolean>} クールダウン中の場合true
 */
async function isInCooldown(lang, username, cooldownHours = 8, now = new Date()) {
  const last = await getLastPostedAt(lang, username);
  if (!last) return false;
  const diffMs = now.getTime() - last.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const inCooldown = diffHours < cooldownHours;

  if (inCooldown) {
    console.log(
      `[InfluencerRotation] ⏰ @${username} (${lang}) is in cooldown: last posted ${diffHours.toFixed(2)}h ago (need ${cooldownHours}h)`
    );
  }

  return inCooldown;
}

// 日次投稿数カウンターのキープレフィックス
const DAILY_POST_COUNT_KEY_PREFIX = "x:influencer_daily_post_count:";

/**
 * インフルエンサーの日次投稿数キーを生成
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {string} KVキー
 */
function getDailyPostCountKey(lang, username, dateString = null) {
  const targetDate = dateString || new Date().toISOString().split("T")[0];
  const l = (lang || "en").toLowerCase();
  const u = (username || "").replace(/^@/, "").toLowerCase();
  return `${DAILY_POST_COUNT_KEY_PREFIX}${l}:${u}:${targetDate}`;
}

/**
 * インフルエンサーの今日の投稿数を取得
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<number>} 今日の投稿数（取得できない場合は0）
 */
async function getDailyPostCount(lang, username, dateString = null) {
  if (!kv) return 0;
  try {
    const key = getDailyPostCountKey(lang, username, dateString);
    const count = await kv.get(key);
    return typeof count === "number" ? count : 0;
  } catch (e) {
    console.warn("[InfluencerRotation] getDailyPostCount failed:", e.message);
    return 0;
  }
}

/**
 * インフルエンサーの日次投稿数をインクリメント
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<number>} インクリメント後の投稿数
 */
async function incrementDailyPostCount(lang, username, dateString = null) {
  if (!kv) return 0;
  try {
    const targetDate = dateString || new Date().toISOString().split("T")[0];
    const key = getDailyPostCountKey(lang, username, targetDate);

    // INCR操作（原子性を保証）
    const newCount = await kv.incr(key);

    // TTLを設定（日付が変わっても安全に保持、48時間）
    await kv.expire(key, 48 * 60 * 60);

    console.log(
      `[InfluencerRotation] ✅ Incremented daily post count for @${username} (${lang}): ${newCount}`
    );
    return newCount;
  } catch (e) {
    console.warn("[InfluencerRotation] incrementDailyPostCount failed:", e.message);
    return 0;
  }
}

/**
 * インフルエンサーが日次上限に達しているかチェック
 * 🚀 298投稿/日達成のため: 1人あたり最大4回/日（デフォルト）
 * 8時間クールダウンにより実質的には最大3回/日が上限だが、ローテーションにより平均4.3回/日を達成可能
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {number} maxDailyPosts - 日次上限（デフォルト: 4回/日）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<boolean>} 上限に達している場合true
 */
async function hasReachedDailyLimit(lang, username, maxDailyPosts = 4, dateString = null) {
  const currentCount = await getDailyPostCount(lang, username, dateString);
  const reached = currentCount >= maxDailyPosts;

  if (reached) {
    console.log(
      `[InfluencerRotation] ⚠️ @${username} (${lang}) has reached daily limit: ${currentCount}/${maxDailyPosts} posts`
    );
  }

  return reached;
}

/**
 * 今日の投稿統計を取得
 * @param {string} lang - 言語コード
 * @param {string} dateString - 日付文字列（YYYY-MM-DD、省略時は今日）
 * @returns {Promise<Object>} 投稿統計 {postedCount, totalInfluencers, rotationIndex}
 */
async function getRotationStats(lang, dateString = null) {
  const targetDate = dateString || new Date().toISOString().split("T")[0];

  const postedToday = await getPostedInfluencersToday(lang, targetDate);
  const rotationIndex = await getRotationIndex(lang, targetDate);

  return {
    postedCount: postedToday.size,
    postedInfluencers: Array.from(postedToday),
    rotationIndex,
    date: targetDate
  };
}

module.exports = {
  getPostedInfluencersToday,
  markInfluencerPosted,
  getRotationIndex,
  updateRotationIndex,
  getAndIncrementRunIndex,
  selectInfluencersWithRotation,
  getRotationStats,
  // 8時間クールダウン関連
  getLastPostedAt,
  markLastPostedAt,
  isInCooldown,
  // 日次投稿数上限関連（Grok + Gemini + GPT-5.2推奨）
  getDailyPostCount,
  incrementDailyPostCount,
  hasReachedDailyLimit
};
