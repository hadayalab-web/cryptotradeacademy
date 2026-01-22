// services/x/client.js
// X (Twitter) API v2 クライアント - OAuth 1.0a User Context認証

const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const { Blob } = require('buffer');

// OAuth 1.0a認証情報
const X_API_CONSUMER_KEY = process.env.X_API_CONSUMER_KEY;
const X_API_CONSUMER_KEY_SECRET = process.env.X_API_CONSUMER_KEY_SECRET;
const X_API_ACCESS_TOKEN = process.env.X_API_ACCESS_TOKEN;
const X_API_ACCESS_TOKEN_SECRET = process.env.X_API_ACCESS_TOKEN_SECRET;
const X_API_BASE_URL = process.env.X_API_BASE_URL || 'https://api.twitter.com/2';
const X_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';

// OAuth 1.0aインスタンス
const oauth = OAuth({
  consumer: {
    key: X_API_CONSUMER_KEY,
    secret: X_API_CONSUMER_KEY_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(baseString, key) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  },
});

/**
 * レート制限エラーかどうかを判定
 * @param {Error} error - エラーオブジェクト
 * @returns {boolean} レート制限エラーの場合true
 */
function isRateLimitError(error) {
  if (!error) return false;
  const statusMatch = error.message?.match(/X API Error: (\d+)/);
  const status = statusMatch ? parseInt(statusMatch[1]) : null;
  return status === 429 || error.message?.includes('rate limit') || error.message?.includes('Rate limit');
}

/**
 * X APIリクエストを実行（OAuth 1.0a User Context認証、リトライ対応）
 * @param {string} endpoint - APIエンドポイント
 * @param {Object} options - リクエストオプション
 * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns {Promise<Object>} APIレスポンス
 */
async function xApiRequest(endpoint, options = {}, maxRetries = 3) {
  if (!X_API_CONSUMER_KEY || !X_API_CONSUMER_KEY_SECRET || !X_API_ACCESS_TOKEN || !X_API_ACCESS_TOKEN_SECRET) {
    throw new Error('X_API_CONSUMER_KEY, X_API_CONSUMER_KEY_SECRET, X_API_ACCESS_TOKEN, and X_API_ACCESS_TOKEN_SECRET are required for OAuth 1.0a User Context authentication.');
  }

  const url = `${X_API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  
  // OAuth 1.0a認証ヘッダーを生成
  const token = {
    key: X_API_ACCESS_TOKEN,
    secret: X_API_ACCESS_TOKEN_SECRET,
  };

  const requestData = {
    url,
    method,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const headers = {
    ...authHeader,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // リトライロジック（指数バックオフ）
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText };
        }
        
        const error = new Error(`X API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        
        // レート制限エラー（429）の場合、リトライ
        if (response.status === 429 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ: 1s, 2s, 4s
          console.warn(`[X API] Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }

      return await response.json();
    } catch (error) {
      // レート制限エラーの場合、リトライ
      if (isRateLimitError(error) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ: 1s, 2s, 4s
        console.warn(`[X API] Rate limit error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 最後の試行またはレート制限以外のエラーの場合
      if (attempt === maxRetries) {
        console.error('[X API] Request failed after retries:', error.message);
        throw error;
      }
      
      // その他のエラーは即座にスロー
      console.error('[X API] Request failed:', error.message);
      throw error;
    }
  }
}

/**
 * 画像をアップロード (v1.1 APIを使用)
 * @param {Buffer} mediaBuffer - 画像データのバッファ
 * @returns {Promise<string>} media_id_string
 */
async function uploadMedia(mediaBuffer) {
  if (!mediaBuffer) {
    throw new Error('Media buffer is required');
  }

  const url = X_UPLOAD_URL;
  const method = 'POST';

  const token = {
    key: X_API_ACCESS_TOKEN,
    secret: X_API_ACCESS_TOKEN_SECRET,
  };

  // Multipart/form-data用のOAuth署名（パラメータは含めない）
  const requestData = {
    url,
    method,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  // FormDataの作成
  const formData = new FormData();
  formData.append('media', new Blob([mediaBuffer]), 'image.png');

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...authHeader,
        // Content-Typeはfetchが自動設定する（boundaryを含むため）
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Media Upload Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.media_id_string;
  } catch (error) {
    console.error('[X API] Media upload failed:', error.message);
    throw error;
  }
}

/**
 * Xにツイートを投稿（リトライ対応）
 * @param {string} text - ツイート本文（最大280文字）
 * @param {string[]} mediaIds - 添付するメディアIDの配列 (オプション)
 * @param {Object} pollOptions - ポールオプション (オプション) {options: [{text, position}], duration_minutes: number}
 * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns {Promise<Object>} 投稿結果 {id, text}
 */
async function postTweet(text, mediaIds = [], pollOptions = null, maxRetries = 3) {
  if (!text || text.trim().length === 0) {
    throw new Error('Tweet text is required');
  }

  // X API v2の文字数制限は280文字
  if (text.length > 280) {
    console.warn(`[X API] Tweet text exceeds 280 characters (${text.length}), truncating...`);
    text = text.substring(0, 277) + '...';
  }

  const body = {
    text: text.trim(),
  };

  if (mediaIds && mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds
    };
  }

  // ポールオプションを追加（Grok推奨: エンゲージメント強化）
  if (pollOptions && pollOptions.options && Array.isArray(pollOptions.options)) {
    body.poll = {
      options: pollOptions.options.map(opt => ({
        label: opt.text,
        position: opt.position || 0,
      })),
      duration_minutes: pollOptions.duration_minutes || 1440, // デフォルト24時間
    };
  }

  try {
    const response = await xApiRequest('/tweets', {
      method: 'POST',
      body,
    }, maxRetries);

    console.log(`[X API] Tweet posted successfully: ${response.data?.id}`);
    return {
      id: response.data?.id,
      text: response.data?.text,
    };
  } catch (error) {
    console.error('[X API] Failed to post tweet:', error.message);
    throw error;
  }
}

/**
 * ユーザー情報を取得
 * @param {string} username - Xのユーザー名（@なし）
 * @returns {Promise<Object>} ユーザー情報
 * */
async function getUserByUsername(username) {
  try {
    const response = await xApiRequest(`/users/by/username/${username}`);
    return response.data;
  } catch (error) {
    console.error(`[X API] Failed to get user ${username}:`, error.message);
    throw error;
  }
}

/**
 * 自分のアカウント情報を取得
 * @returns {Promise<Object>} アカウント情報
 */
async function getMe() {
  try {
    const response = await xApiRequest('/users/me');
    return response.data;
  } catch (error) {
    console.error('[X API] Failed to get me:', error.message);
    throw error;
  }
}

/**
 * ツイートを検索（X API v2）
 * @param {string} query - 検索クエリ（Twitter検索構文）
 * @param {Object} options - 検索オプション
 * @param {number} options.maxResults - 最大結果数（10-100、デフォルト: 10）
 * @param {string} options.startTime - 開始時刻（ISO 8601形式、例: "2023-01-01T00:00:00Z"）
 * @param {string} options.endTime - 終了時刻（ISO 8601形式）
 * @param {string} options.sinceId - このID以降のツイートを取得
 * @param {string} options.untilId - このID以前のツイートを取得
 * @param {string} options.nextToken - ページネーショントークン
 * @param {string} options.sortOrder - ソート順（"relevancy" | "recency"、デフォルト: "relevancy"）
 * @returns {Promise<Object>} 検索結果 {data, meta}
 */
async function searchTweets(query, options = {}) {
  if (!query || query.trim().length === 0) {
    throw new Error('Search query is required');
  }

  const {
    maxResults = 10,
    startTime,
    endTime,
    sinceId,
    untilId,
    nextToken,
    sortOrder = 'relevancy',
  } = options;

  // クエリパラメータを構築
  const params = new URLSearchParams({
    query: query.trim(),
    max_results: Math.min(Math.max(10, maxResults), 100).toString(),
    'tweet.fields': 'id,text,author_id,created_at,public_metrics,lang',
    'user.fields': 'id,name,username,public_metrics',
    'expansions': 'author_id',
    sort_order: sortOrder,
  });

  if (startTime) params.append('start_time', startTime);
  if (endTime) params.append('end_time', endTime);
  if (sinceId) params.append('since_id', sinceId);
  if (untilId) params.append('until_id', untilId);
  if (nextToken) params.append('next_token', nextToken);

  try {
    const response = await xApiRequest(`/tweets/search/recent?${params.toString()}`);
    return {
      data: response.data || [],
      includes: response.includes || {},
      meta: response.meta || {},
    };
  } catch (error) {
    console.error('[X API] Failed to search tweets:', error.message);
    throw error;
  }
}

/**
 * ツイートにリプライを投稿
 * @param {string} text - リプライ本文
 * @param {string} inReplyToTweetId - リプライ先のツイートID
 * @param {string[]} mediaIds - 添付するメディアIDの配列 (オプション)
 * @returns {Promise<Object>} 投稿結果 {id, text}
 */
async function replyToTweet(text, inReplyToTweetId, mediaIds = []) {
  if (!text || text.trim().length === 0) {
    throw new Error('Reply text is required');
  }
  if (!inReplyToTweetId) {
    throw new Error('inReplyToTweetId is required');
  }

  // X API v2の文字数制限は280文字
  if (text.length > 280) {
    console.warn(`[X API] Reply text exceeds 280 characters (${text.length}), truncating...`);
    text = text.substring(0, 277) + '...';
  }

  const body = {
    text: text.trim(),
    reply: {
      in_reply_to_tweet_id: inReplyToTweetId,
    },
  };

  if (mediaIds && mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds
    };
  }

  try {
    const response = await xApiRequest('/tweets', {
      method: 'POST',
      body,
    });

    console.log(`[X API] Reply posted successfully: ${response.data?.id}`);
    return {
      id: response.data?.id,
      text: response.data?.text,
    };
  } catch (error) {
    console.error('[X API] Failed to reply to tweet:', error.message);
    throw error;
  }
}

/**
 * ツイートに引用リポストを投稿（リトライ対応）
 * @param {string} text - 引用リポスト本文
 * @param {string} quoteTweetId - 引用するツイートID
 * @param {string[]} mediaIds - 添付するメディアIDの配列 (オプション)
 * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns {Promise<Object>} 投稿結果 {id, text}
 */
async function postQuoteTweet(text, quoteTweetId, mediaIds = [], maxRetries = 3) {
  if (!text || text.trim().length === 0) {
    throw new Error('Quote tweet text is required');
  }
  if (!quoteTweetId) {
    throw new Error('quoteTweetId is required');
  }

  // X API v2の文字数制限は280文字
  if (text.length > 280) {
    console.warn(`[X API] Quote tweet text exceeds 280 characters (${text.length}), truncating...`);
    text = text.substring(0, 277) + '...';
  }

  const body = {
    text: text.trim(),
    quote_tweet_id: quoteTweetId,
  };

  if (mediaIds && mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds
    };
  }

  try {
    const response = await xApiRequest('/tweets', {
      method: 'POST',
      body,
    }, maxRetries);

    console.log(`[X API] Quote tweet posted successfully: ${response.data?.id}`);
    return {
      id: response.data?.id,
      text: response.data?.text,
    };
  } catch (error) {
    console.error('[X API] Failed to post quote tweet:', error.message);
    throw error;
  }
}

/**
 * トレンドを取得（X API v1.1を使用）
 * @param {number} woeid - Where On Earth ID（1 = 全世界、23424856 = 日本など）
 * @returns {Promise<Array>} トレンド情報の配列
 */
async function getTrends(woeid = 1) {
  const X_API_BASE_URL_V1 = process.env.X_API_BASE_URL_V1 || 'https://api.twitter.com/1.1';
  const url = `${X_API_BASE_URL_V1}/trends/place.json`;
  
  const method = 'GET';
  
  const token = {
    key: X_API_ACCESS_TOKEN,
    secret: X_API_ACCESS_TOKEN_SECRET,
  };

  const requestData = {
    url: `${url}?id=${woeid}`,
    method,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const headers = {
    ...authHeader,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`${url}?id=${woeid}`, {
      method,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText };
      }
      throw new Error(`X API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data[0]?.trends || [];
  } catch (error) {
    console.error('[X API] Failed to get trends:', error.message);
    throw error;
  }
}

module.exports = {
  xApiRequest,
  postTweet,
  replyToTweet,
  postQuoteTweet,
  uploadMedia,
  getUserByUsername,
  getMe,
  searchTweets,
  getTrends,
  isRateLimitError,
};
