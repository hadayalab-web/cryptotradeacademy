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
 * X APIリクエストを実行（OAuth 1.0a User Context認証）
 * @param {string} endpoint - APIエンドポイント
 * @param {Object} options - リクエストオプション
 * @returns {Promise<Object>} APIレスポンス
 */
async function xApiRequest(endpoint, options = {}) {
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
      throw new Error(`X API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[X API] Request failed:', error.message);
    throw error;
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
 * Xにツイートを投稿
 * @param {string} text - ツイート本文（最大280文字）
 * @param {string[]} mediaIds - 添付するメディアIDの配列 (オプション)
 * @returns {Promise<Object>} 投稿結果 {id, text}
 */
async function postTweet(text, mediaIds = []) {
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

  try {
    const response = await xApiRequest('/tweets', {
      method: 'POST',
      body,
    });

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

module.exports = {
  xApiRequest,
  postTweet,
  uploadMedia,
  getUserByUsername,
  getMe,
};
