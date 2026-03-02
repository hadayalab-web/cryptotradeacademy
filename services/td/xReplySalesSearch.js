/**
 * Xリプライ直販用 検索サービス
 * strict優先、必要時のみbalancedを使用
 */

const { searchPostsRecent } = require("../x/client");
const { getReplySearchQuery, normalizeReplyLang } = require("../../config/xReplySalesStrategy");
const {
  X_REPLY_MAX_RESULTS_PER_PAGE,
  X_REPLY_SEARCH_WINDOW_MINUTES,
  X_REPLY_LOW_HIT_BALANCED_THRESHOLD,
  X_REPLY_BALANCED_FALLBACK_ENABLED
} = require("../../config/xReplySalesConfig");

const REPLY_SALES_USER_FIELDS = "id,name,username,public_metrics,description,created_at";

async function runSearchQuery(query, options = {}) {
  const now = Date.now();
  const windowMinutes = Math.max(
    15,
    Number(options.windowMinutes || X_REPLY_SEARCH_WINDOW_MINUTES)
  );
  const endTime = new Date(now - 30 * 1000);
  const startTime = new Date(now - windowMinutes * 60 * 1000);
  const maxResults = Math.min(
    100,
    Math.max(10, Number(options.maxResults || X_REPLY_MAX_RESULTS_PER_PAGE))
  );

  const response = await searchPostsRecent(query, {
    maxResults,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    sortOrder: options.sortOrder || "recency",
    nextToken: options.nextToken || undefined,
    userFields: options.userFields || REPLY_SALES_USER_FIELDS
  });

  return {
    data: Array.isArray(response?.data) ? response.data : [],
    includes: { users: response?.includes?.users || [] },
    nextToken: response?.meta?.next_token || null
  };
}

/**
 * 1ページ取得（strict→必要時balancedフォールバック）
 * @param {string} lang
 * @param {{ nextToken?: string, maxResults?: number, windowMinutes?: number }} [options]
 * @returns {Promise<{data: object[], includes:{users:object[]}, nextToken?: string, queryMode: "strict"|"balanced", strictHits:number, balancedHits:number}>}
 */
async function fetchOneReplySearchPage(lang, options = {}) {
  const normalizedLang = normalizeReplyLang(lang);
  const strictQuery = getReplySearchQuery(normalizedLang, "strict");
  const balancedQuery = getReplySearchQuery(normalizedLang, "balanced");

  try {
    const strict = await runSearchQuery(strictQuery, options);
    const strictHits = strict.data.length;

    if (
      X_REPLY_BALANCED_FALLBACK_ENABLED &&
      !options.nextToken &&
      strictHits <= X_REPLY_LOW_HIT_BALANCED_THRESHOLD &&
      !strict.nextToken &&
      balancedQuery &&
      balancedQuery !== strictQuery
    ) {
      const balanced = await runSearchQuery(balancedQuery, {
        ...options,
        nextToken: undefined
      });
      const balancedHits = balanced.data.length;
      if (balancedHits > 0 || balanced.nextToken) {
        const mergedTweets = new Map();
        const mergedUsers = new Map();
        for (const row of [...strict.data, ...balanced.data]) {
          if (row?.id && !mergedTweets.has(row.id)) mergedTweets.set(row.id, row);
        }
        for (const user of [...(strict.includes?.users || []), ...(balanced.includes?.users || [])]) {
          if (user?.id && !mergedUsers.has(user.id)) mergedUsers.set(user.id, user);
        }
        const nextToken = balanced.nextToken || strict.nextToken || null;
        return {
          data: Array.from(mergedTweets.values()),
          includes: { users: Array.from(mergedUsers.values()) },
          ...(nextToken ? { nextToken } : {}),
          queryMode: "balanced",
          strictHits,
          balancedHits
        };
      }
    }

    return {
      data: strict.data,
      includes: strict.includes,
      ...(strict.nextToken ? { nextToken: strict.nextToken } : {}),
      queryMode: "strict",
      strictHits,
      balancedHits: 0
    };
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("402")) {
      return {
        data: [],
        includes: { users: [] },
        queryMode: "strict",
        strictHits: 0,
        balancedHits: 0,
        fatal402: true
      };
    }
    throw error;
  }
}

module.exports = {
  fetchOneReplySearchPage,
  runSearchQuery,
  REPLY_SALES_USER_FIELDS
};
