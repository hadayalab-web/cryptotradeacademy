// services/x/influencerPerformance.js
// インフルエンサー別パフォーマンス分析（Webhookデータ活用）
// GPT-5.2-2025-12-11設計に基づく実装

// P0-4修正: 並列度制限用のp-limit（ES Moduleのため動的import、使用時に取得）
let pLimitResolved = null;
const pLimitFallback = () => {
  let chain = Promise.resolve();
  return (fn) => {
    chain = chain.then(fn, fn);
    return chain;
  };
};
async function getPLimit() {
  if (pLimitResolved !== null) return pLimitResolved;
  try {
    const m = await import("p-limit");
    pLimitResolved = m.default || m;
    return pLimitResolved;
  } catch (error) {
    console.warn("[InfluencerPerformance] p-limit not available:", error.message);
    pLimitResolved = pLimitFallback;
    return pLimitResolved;
  }
}

let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[InfluencerPerformance] @vercel/kv not available:", error.message);
}

// P0-5修正: production環境ではKV必須（fail-fast）
if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  if (!kv) {
    throw new Error(
      "[InfluencerPerformance] CRITICAL: @vercel/kv is required in production but not available"
    );
  }
}

const TWEET_ENG_TTL = 86400 * 45; // 45日
const MAP_TTL = 86400 * 45; // 45日
const PERF_DAY_TTL = 86400 * 180; // 180日
const PERF_ROLL_TTL = 86400 * 30; // 30日

/**
 * usernameを正規化（P0-3修正: バリデーション追加）
 * @param {string} username - インフルエンサーのユーザー名
 * @returns {string|null} 正規化されたusername、無効な場合はnull
 */
function normalizeUsername(username) {
  if (!username || typeof username !== "string") {
    return null;
  }
  const u = username.replace(/^@/, "").trim().toLowerCase();
  // Xのusername制約: 1-15文字、英数字とアンダースコアのみ
  if (u.length === 0 || u.length > 15 || !/^[a-z0-9_]+$/.test(u)) {
    return null;
  }
  return u;
}

/**
 * windowDaysを検証（P0-3修正: バリデーション追加）
 * @param {number} windowDays - ウィンドウ日数
 * @throws {Error} 無効な値の場合
 */
function assertWindowDays(windowDays) {
  if (![7, 30].includes(windowDays)) {
    throw new Error(`Invalid windowDays: ${windowDays}. Must be 7 or 30.`);
  }
}

/**
 * 日次パフォーマンスキーを生成
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @returns {string} KVキー
 */
function dayKey(dateString, lang, username) {
  const l = (lang || "unknown").toLowerCase();
  const u = normalizeUsername(username);
  if (!u) {
    throw new Error(`Invalid username for dayKey: ${username}`);
  }
  return `x:perf:influencer:day:${dateString}:${l}:${u}`;
}

/**
 * Rollingパフォーマンスキーを生成
 * @param {string} window - ウィンドウ（"7d" | "30d"）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @returns {string} KVキー
 */
function rollKey(window, lang, username) {
  const l = (lang || "unknown").toLowerCase();
  const u = normalizeUsername(username);
  if (!u) {
    throw new Error(`Invalid username for rollKey: ${username}`);
  }
  return `x:perf:influencer:roll:${window}:${l}:${u}`;
}

/**
 * tweetIdを検証（P1修正: 入力値検証）
 * @param {string} tweetId - ツイートID
 * @returns {boolean} 有効な場合true
 */
function validateTweetId(tweetId) {
  if (!tweetId || typeof tweetId !== "string") {
    return false;
  }
  // XのtweetIdは数値文字列（5-30桁程度）
  return /^\d{5,30}$/.test(tweetId);
}

/**
 * dateStringを検証（P1修正: 入力値検証）
 * @param {string} dateString - 日付文字列
 * @returns {boolean} 有効な場合true
 */
function validateDateString(dateString) {
  if (!dateString || typeof dateString !== "string") {
    return false;
  }
  // YYYY-MM-DD形式
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

/**
 * Tweetエンゲージメントキーを生成
 * @param {string} tweetId - ツイートID
 * @returns {string} KVキー
 */
function tweetEngKey(tweetId) {
  if (!validateTweetId(tweetId)) {
    throw new Error(`Invalid tweetId: ${tweetId}`);
  }
  return `x:eng:tweet:${tweetId}`;
}

/**
 * Tweet→インフルエンサーマッピングキーを生成
 * @param {string} tweetId - ツイートID
 * @returns {string} KVキー
 */
function tweetMapKey(tweetId) {
  // P1修正: tweetIdのバリデーション
  if (!validateTweetId(tweetId)) {
    throw new Error(`Invalid tweetId for tweetMapKey: ${tweetId}`);
  }
  return `x:post:influencer:${tweetId}`;
}

/**
 * Webhook増分をtweet単位で保存（速報）
 * P0修正: メタとカウンタを完全分離して不整合を防止
 * - カウンタキー（x:eng:tweet:{tweetId}:{field}）をSoT（Source of Truth）に
 * - メタキー（x:eng:tweet:{tweetId}:meta）はメタ情報のみ保持
 * - 厳密な重複排除はしない（確定値は日次X APIで上書きする設計）
 * @param {string} tweetId - ツイートID
 * @param {string} type - イベントタイプ（"like" | "retweet" | "reply"）
 * @param {Object} meta - メタデータ（lang, postType, influencerUsername）
 * @returns {Promise<boolean>} 保存成功時true
 */
async function incrementTweetEngagement(tweetId, type, meta = {}) {
  if (!kv) {
    return false;
  }

  // P1修正: tweetIdのバリデーション
  if (!validateTweetId(tweetId)) {
    console.warn(`[InfluencerPerformance] ⚠️ Invalid tweetId: ${tweetId}, skipping`);
    return false;
  }

  // P0-1修正: イベントタイプのバリデーション
  const FIELD_MAP = {
    like: "likes",
    retweet: "retweets",
    reply: "replies"
  };
  const field = FIELD_MAP[type];
  if (!field) {
    console.warn(`[InfluencerPerformance] ⚠️ Unknown event type: ${type}, skipping`);
    return false;
  }

  try {
    const baseKey = tweetEngKey(tweetId);
    const counterKey = `${baseKey}:${field}`; // カウンタ用の別キー（SoT）
    const metaKey = `${baseKey}:meta`; // メタ情報用の別キー
    const now = new Date().toISOString();

    // P0修正: 原子インクリメント（カウンタキーをSoTに）
    const newCount = await kv.incr(counterKey);
    await kv.set(counterKey, String(newCount), { ex: TWEET_ENG_TTL });

    // P0修正: lastEventAtを別キーに分離してKV書込過多を防止
    const lastEventAtKey = `${baseKey}:lastEventAt`;
    await kv.set(lastEventAtKey, now, { ex: TWEET_ENG_TTL });

    // P0修正: メタ情報は初回のみ、または補完が必要な場合のみ更新（競合を減らす）
    // SET NX相当の動作: 既存なら取得、なければ作成
    let metaData = await kv.get(metaKey);
    const isNewMeta = !metaData;

    if (isNewMeta) {
      // 初回のみメタ情報を作成
      metaData = {
        tweetId,
        lang: meta.lang || null,
        postType: meta.postType || null,
        influencerUsername: meta.influencerUsername
          ? normalizeUsername(meta.influencerUsername)
          : null,
        firstSeenAt: now,
        lastEventAt: now
      };
      await kv.set(metaKey, metaData, { ex: TWEET_ENG_TTL });
    } else {
      // 既存メタ情報の補完（後勝ちで更新、ただしlastEventAtは別キーで管理）
      let updated = false;
      if (meta.lang && !metaData.lang) {
        metaData.lang = meta.lang;
        updated = true;
      }
      if (meta.postType && !metaData.postType) {
        metaData.postType = meta.postType;
        updated = true;
      }
      if (meta.influencerUsername && !metaData.influencerUsername) {
        const normalizedUsername = normalizeUsername(meta.influencerUsername);
        if (normalizedUsername) {
          metaData.influencerUsername = normalizedUsername;
          updated = true;
        }
      }
      // P0修正: メタ補完が必要な場合のみset（KV書込過多を防止）
      if (updated) {
        // lastEventAtは別キーで管理しているため、metaには含めない
        await kv.set(metaKey, metaData, { ex: TWEET_ENG_TTL });
      }
      // TTL整合性のため、メタキーのTTLも延長（Vercel KV は expire がないため set で ex を付与）
      await kv.set(metaKey, metaData, { ex: TWEET_ENG_TTL });
    }

    // デバッグログは削減（高頻度Webhookでログ爆発を防止）
    if (process.env.DEBUG_WEBHOOK === "true") {
      console.log(
        `[InfluencerPerformance] ✅ Incremented ${type} for tweet ${tweetId} (count: ${newCount})`
      );
    }
    return true;
  } catch (error) {
    console.warn(`[InfluencerPerformance] ⚠️ Failed to increment tweet engagement:`, error.message);
    return false;
  }
}

/**
 * Webhook増分カウンタ値を取得（P0修正: カウンタキーから直接取得）
 * @param {string} tweetId - ツイートID
 * @returns {Promise<Object|null>} {likes, retweets, replies, meta} またはnull
 */
async function getTweetEngagement(tweetId) {
  if (!kv) {
    return null;
  }

  if (!validateTweetId(tweetId)) {
    return null;
  }

  try {
    const baseKey = tweetEngKey(tweetId);
    const metaKey = `${baseKey}:meta`;
    const lastEventAtKey = `${baseKey}:lastEventAt`;

    // P0修正: カウンタキーから値を取得（SoT）
    // Promise解決後にフォールバックを適用
    const [likesRaw, retweetsRaw, repliesRaw, meta, lastEventAt] = await Promise.all([
      kv.get(`${baseKey}:likes`),
      kv.get(`${baseKey}:retweets`),
      kv.get(`${baseKey}:replies`),
      kv.get(metaKey),
      kv.get(lastEventAtKey)
    ]);

    // P0修正: 返却のマージ順を固定（metaを先に展開してからtweetId/webhookで上書き）
    // lastEventAtは別キーから取得した値を使用
    return {
      ...(meta || {}),
      tweetId,
      lastEventAt: lastEventAt || meta?.lastEventAt || meta?.firstSeenAt || null,
      webhook: {
        likes: Number(likesRaw ?? 0),
        retweets: Number(retweetsRaw ?? 0),
        replies: Number(repliesRaw ?? 0)
      }
    };
  } catch (error) {
    console.warn(`[InfluencerPerformance] ⚠️ Failed to get tweet engagement:`, error.message);
    return null;
  }
}

/**
 * tweetId→influencer マッピング保存（P1推奨実装）
 * @param {string} tweetId - ツイートID
 * @param {Object} mapping - マッピングデータ（username, influencerUsername, lang, postType, postedAt）
 * @returns {Promise<boolean>} 保存成功時true
 */
async function setInfluencerMapping(tweetId, mapping) {
  if (!kv) {
    return false;
  }

  // P1修正: tweetIdのバリデーション
  if (!validateTweetId(tweetId)) {
    console.warn(`[InfluencerPerformance] ⚠️ Invalid tweetId for setInfluencerMapping: ${tweetId}`);
    return false;
  }

  try {
    const key = tweetMapKey(tweetId);

    // マッピングデータを正規化して保存
    const payload = {
      username: mapping.username ? normalizeUsername(mapping.username) : null,
      influencerUsername: mapping.influencerUsername
        ? normalizeUsername(mapping.influencerUsername)
        : mapping.username
          ? normalizeUsername(mapping.username)
          : null,
      lang: mapping.lang || null,
      postType: mapping.postType || null,
      postedAt: mapping.postedAt || new Date().toISOString()
    };

    // MAP_TTL（45日）で保存
    await kv.set(key, payload, { ex: MAP_TTL });

    if (process.env.DEBUG_WEBHOOK === "true") {
      console.log(
        `[InfluencerPerformance] ✅ Saved influencer mapping for tweet ${tweetId}:`,
        payload
      );
    }
    return true;
  } catch (error) {
    console.warn(`[InfluencerPerformance] ⚠️ Failed to set influencer mapping:`, error.message);
    return false;
  }
}

/**
 * tweetId→influencer マッピング取得
 * @param {string} tweetId - ツイートID
 * @returns {Promise<Object|null>} マッピングデータまたはnull
 */
async function getInfluencerMapping(tweetId) {
  if (!kv) {
    return null;
  }

  // P1修正: tweetIdのバリデーション
  if (!validateTweetId(tweetId)) {
    return null;
  }

  try {
    const mapping = await kv.get(tweetMapKey(tweetId));
    return mapping || null;
  } catch (error) {
    console.warn(`[InfluencerPerformance] ⚠️ Failed to get influencer mapping:`, error.message);
    return null;
  }
}

/**
 * 日次：tweet確定メトリクス（impressions含む）をinfluencer日次集計へ反映
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {Array<Object>} posts - 投稿データ配列（{tweetId, lang, postType, postedAt}）
 * @param {Function} metricsFetcher - メトリクス取得関数（tweetId）=> Promise<{impressions, engagements, replies, retweets, likes, quoteTweets}>
 * @returns {Promise<Object>} 集計結果 {influencers: number}
 */
async function buildInfluencerDailyPerformance(dateString, posts, metricsFetcher) {
  // P1修正: 入力検証
  if (!kv) {
    return { influencers: 0 };
  }

  if (!validateDateString(dateString)) {
    throw new Error(`Invalid dateString: ${dateString}. Must be YYYY-MM-DD format.`);
  }

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return { influencers: 0 };
  }

  if (typeof metricsFetcher !== "function") {
    throw new Error("metricsFetcher must be a function");
  }

  // P0修正: postsの重複を排除（同一tweetIdの二重加算を防止）
  const uniquePosts = Array.from(
    new Map(
      posts
        .filter((p) => p?.tweetId && validateTweetId(String(p.tweetId)))
        .map((p) => [String(p.tweetId), { ...p, tweetId: String(p.tweetId) }])
    ).values()
  );

  if (uniquePosts.length !== posts.length) {
    console.warn(
      `[InfluencerPerformance] ⚠️ Removed ${posts.length - uniquePosts.length} duplicate/invalid posts`
    );
  }

  // P0-4修正: 並列度制限付きで処理（X APIレート制限に合わせて10並列）
  const pLimit = await getPLimit();
  const limit = pLimit(10);
  const agg = new Map(); // key: `${lang}:${username}`

  // P1修正: 失敗理由別カウンタ（観測性向上）
  // P0修正: errorCountsをprocessPostの外で定義して、クロージャで共有
  const errorCounts = {
    noMapping: 0,
    invalidUsername: 0,
    missingImpressions: 0,
    invalidMetrics: 0,
    fetchError: 0
  };

  // 個別投稿処理関数（並列化用）
  async function processPost(post) {
    const tweetId = post.tweetId;
    if (!tweetId) return null;

    try {
      const mapping = await getInfluencerMapping(tweetId);

      // P0修正: マッピングフィールド名の両対応（influencerUsername/username）
      const influencer = mapping?.influencerUsername || mapping?.username;
      if (!influencer) {
        errorCounts.noMapping++; // P0修正: エラーカウントを追加
        try {
          // SETに追加（重複自動排除）。Vercel KV は expire 非対応のため TTL なし
          const queueKey = "x:queue:missing-influencer-map";
          await kv.sadd(queueKey, tweetId);
        } catch (queueError) {
          // キュー追加失敗は警告のみ（処理は継続）
        }
        return null;
      }

      // P0-3修正: usernameのバリデーション
      const username = normalizeUsername(influencer);
      if (!username) {
        errorCounts.invalidUsername++; // P0修正: エラーカウントを追加
        return null;
      }
      const lang = mapping.lang || post.lang || "unknown";
      const m = await metricsFetcher(tweetId);

      // impressionsが取れない/0は除外（再取得対象）
      if (!m || !m.impressions || m.impressions <= 0) {
        errorCounts.missingImpressions++;
        // P1修正: impressions欠損を再取得キューへ追加
        try {
          const retryQueueKey = "x:queue:missing-impressions";
          await kv.sadd(retryQueueKey, tweetId);
          // Vercel KV は expire 非対応のため Set キーに TTL なし
        } catch (retryQueueError) {
          // キュー追加失敗は警告のみ
        }
        return null;
      }

      // P1修正: 数値検証（NaN防止）
      const impressions = Number(m.impressions);
      const engagements =
        Number(m.engagements) ||
        (Number(m.likes) || 0) +
          (Number(m.retweets) || 0) +
          (Number(m.replies) || 0) +
          (Number(m.quoteTweets) || 0);

      if (!Number.isFinite(impressions) || !Number.isFinite(engagements) || impressions <= 0) {
        errorCounts.invalidMetrics++;
        return null;
      }

      return {
        lang,
        username,
        impressions,
        engagements,
        tweetId,
        engagementRate: engagements / impressions
      };
    } catch (error) {
      // P1修正: エラー理由を記録（観測性向上）
      errorCounts.fetchError++; // P0修正: エラーカウントを追加
      if (process.env.DEBUG_WEBHOOK === "true") {
        console.warn(`[InfluencerPerformance] ⚠️ Error processing post ${tweetId}:`, error.message);
      }
      return null;
    }
  }

  // P0-4修正: 並列度制限付きで全投稿を処理
  const results = await Promise.allSettled(
    uniquePosts.map((post) => limit(() => processPost(post)))
  );

  // 結果を集約
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const { lang, username, impressions, engagements, tweetId, engagementRate } = result.value;
      const key = `${lang}:${username}`;
      const cur = agg.get(key) || {
        date: dateString,
        lang,
        influencerUsername: username,
        totalPosts: 0,
        totalImpressions: 0,
        totalEngagements: 0,
        bestPost: { tweetId: null, engagementRate: null }
      };

      cur.totalPosts += 1;
      cur.totalImpressions += impressions;
      cur.totalEngagements += engagements;

      if (cur.bestPost.engagementRate === null || engagementRate > cur.bestPost.engagementRate) {
        cur.bestPost = { tweetId, engagementRate };
      }

      agg.set(key, cur);
    }
  }

  // KVへ保存（avgER算出）
  let savedCount = 0;
  for (const cur of agg.values()) {
    try {
      cur.avgEngagementRate =
        cur.totalImpressions > 0 ? cur.totalEngagements / cur.totalImpressions : null;
      const key = dayKey(dateString, cur.lang, cur.influencerUsername);
      await kv.set(key, cur, { ex: PERF_DAY_TTL });
      savedCount++;
    } catch (error) {
      console.warn(
        `[InfluencerPerformance] ⚠️ Failed to save daily performance for ${cur.influencerUsername}:`,
        error.message
      );
    }
  }

  // P1修正: 失敗理由別カウンタを出力（観測性向上）
  // P0修正: Promise.allSettledのrejectedも集計
  const rejectedCount = results.filter((r) => r.status === "rejected").length;
  const totalProcessed = uniquePosts.length;
  // P0修正: 成功/失敗の定義を明確化（投稿単位とインフルエンサー単位を分離）
  const successPosts = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failedPosts = totalProcessed - successPosts;
  const successInfluencers = agg.size;

  // P0修正: rejectedのエラーもfetchErrorにカウント
  if (rejectedCount > 0) {
    errorCounts.fetchError += rejectedCount;
  }

  // P1推奨実装: 構造化ログ（JSON形式）
  const logData = {
    event: "daily_performance_built",
    date: dateString,
    metrics: {
      totalProcessed,
      successPosts,
      failedPosts,
      successInfluencers,
      rejectedCount,
      savedCount
    },
    errors: errorCounts,
    timestamp: new Date().toISOString()
  };

  console.log(
    `[InfluencerPerformance] ✅ Built daily performance for ${dateString}:`,
    JSON.stringify(logData, null, 2)
  );

  return { influencers: savedCount };
}

/**
 * rolling更新（7d/30d）
 * - P0では「直近N日分のdayキーを読み直して再集計」方式（実装容易）
 * @param {number} windowDays - ウィンドウ日数（7 or 30）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @param {string} endDateString - 終了日（YYYY-MM-DD）
 * @returns {Promise<Object>} rollingパフォーマンスデータ
 */
async function rebuildInfluencerRolling(windowDays, lang, username, endDateString) {
  if (!kv) {
    return null;
  }

  // P0-3修正: windowDaysとusernameのバリデーション
  try {
    assertWindowDays(windowDays);
    if (!validateDateString(endDateString)) {
      throw new Error(`Invalid endDateString: ${endDateString}`);
    }
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      throw new Error(`Invalid username: ${username}`);
    }
    // endDateStringを含む過去N日
    const end = new Date(`${endDateString}T00:00:00.000Z`);
    let totalPosts = 0,
      totalImpressions = 0,
      totalEngagements = 0;
    let best = { tweetId: null, engagementRate: null };

    // P1修正: usernameシャドーイング解消（ループ外で一度だけ正規化）
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(end);
      d.setUTCDate(end.getUTCDate() - i);
      const ds = d.toISOString().slice(0, 10);

      const day = await kv.get(dayKey(ds, lang, normalizedUsername));
      if (!day) continue;

      totalPosts += day.totalPosts || 0;
      totalImpressions += day.totalImpressions || 0;
      totalEngagements += day.totalEngagements || 0;

      const b = day.bestPost;
      if (
        b?.engagementRate != null &&
        (best.engagementRate == null || b.engagementRate > best.engagementRate)
      ) {
        best = b;
      }
    }

    const avgEngagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : null;

    const payload = {
      windowDays,
      lang,
      influencerUsername: normalizedUsername, // 正規化済み
      endDate: endDateString,
      totalPosts,
      totalImpressions,
      totalEngagements,
      avgEngagementRate,
      bestPost: best,
      updatedAt: new Date().toISOString()
    };

    const key = rollKey(`${windowDays}d`, lang, normalizedUsername);
    await kv.set(key, payload, { ex: PERF_ROLL_TTL });

    console.log(
      `[InfluencerPerformance] ✅ Rebuilt rolling ${windowDays}d for @${username} (${lang}): ER=${avgEngagementRate?.toFixed(4) || "N/A"}`
    );

    return payload;
  } catch (error) {
    console.warn(`[InfluencerPerformance] ⚠️ Failed to rebuild rolling:`, error.message);
    return null;
  }
}

/**
 * 参照：rolling ER取得（無ければnull）
 * @param {number} windowDays - ウィンドウ日数（7 or 30）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @returns {Promise<Object|null>} rollingパフォーマンスデータまたはnull
 */
async function getInfluencerRolling(windowDays, lang, username) {
  if (!kv) {
    return null;
  }

  try {
    assertWindowDays(windowDays);
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      return null;
    }
    const key = rollKey(`${windowDays}d`, lang, normalizedUsername);
    const data = await kv.get(key);
    return data || null;
  } catch (error) {
    console.warn(`[InfluencerPerformance] ⚠️ Failed to get rolling:`, error.message);
    return null;
  }
}

/**
 * 日次パフォーマンスを取得
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {string} lang - 言語コード
 * @param {string} username - インフルエンサーのユーザー名
 * @returns {Promise<Object|null>} 日次パフォーマンスデータまたはnull
 */
async function getInfluencerDailyPerformance(dateString, lang, username) {
  if (!kv) {
    return null;
  }

  try {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      return null;
    }
    const key = dayKey(dateString, lang, normalizedUsername);
    const data = await kv.get(key);
    return data || null;
  } catch (error) {
    console.warn(`[InfluencerPerformance] ⚠️ Failed to get daily performance:`, error.message);
    return null;
  }
}

module.exports = {
  incrementTweetEngagement,
  getTweetEngagement,
  setInfluencerMapping,
  getInfluencerMapping,
  buildInfluencerDailyPerformance,
  rebuildInfluencerRolling,
  getInfluencerRolling,
  getInfluencerDailyPerformance
};
