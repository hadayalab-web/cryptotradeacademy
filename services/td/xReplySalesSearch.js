/**
 * Xリプライ直販用 検索サービス
 * strict / balanced / broad は呼び出し側で「キャップ未達まで」ループし、指定モードで1ページずつ取得
 */

const { searchPostsRecent } = require("../x/client");
const { getReplySearchQuery, getReplySearchQueryBroad, getReplySearchQueryUnified, normalizeReplyLang } = require("../../config/xReplySalesStrategy");
const {
  X_REPLY_MAX_RESULTS_PER_PAGE,
  X_REPLY_SEARCH_WINDOW_MINUTES
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
 * 指定モードで1ページ取得。キャップ未達まで最大 X_REPLY_LIST_PAGES ページ取得するのは呼び出し側のループで実施
 * @param {string} lang
 * @param {"strict"|"balanced"|"broad"} mode
 * @param {{ nextToken?: string, maxResults?: number, windowMinutes?: number }} [options]
 * @returns {Promise<{data: object[], includes:{users:object[]}, nextToken?: string, queryMode: string}>}
 */
async function fetchOnePageByMode(lang, mode, options = {}) {
  const normalizedLang = normalizeReplyLang(lang);
  let query = null;
  if (mode === "unified" || mode === "broad") {
    query = (mode === "unified" ? getReplySearchQueryUnified(normalizedLang) : getReplySearchQueryBroad(normalizedLang)) || getReplySearchQueryBroad(normalizedLang);
  } else {
    query = getReplySearchQuery(normalizedLang, mode === "balanced" ? "balanced" : "strict");
  }
  if (!query) {
    return { data: [], includes: { users: [] }, queryMode: mode };
  }
  try {
    const result = await runSearchQuery(query, options);
    return {
      data: result.data,
      includes: result.includes,
      ...(result.nextToken ? { nextToken: result.nextToken } : {}),
      queryMode: mode
    };
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("402")) {
      return { data: [], includes: { users: [] }, queryMode: mode, fatal402: true };
    }
    throw error;
  }
}

/**
 * strict で1ページ取得。balanced/broad は呼び出し側でキャップ未達時に fetchOnePageByMode で取得
 * @param {string} lang
 * @param {{ nextToken?: string, maxResults?: number, windowMinutes?: number }} [options]
 * @returns {Promise<{data: object[], includes:{users:object[]}, nextToken?: string, queryMode: "strict", strictHits:number, balancedHits:number}>}
 */
async function fetchOneReplySearchPage(lang, options = {}) {
  const normalizedLang = normalizeReplyLang(lang);
  const strictQuery = getReplySearchQuery(normalizedLang, "strict");

  try {
    const strict = await runSearchQuery(strictQuery, options);
    const strictHits = strict.data.length;
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
  fetchOnePageByMode,
  runSearchQuery,
  REPLY_SALES_USER_FIELDS
};
