// services/x/client.js
// X (Twitter) API v2 クライアント - OAuth 1.0a User Context認証

const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
const { Blob } = require("buffer");

// OAuth 1.0a認証情報
const X_API_CONSUMER_KEY = process.env.X_API_CONSUMER_KEY;
const X_API_CONSUMER_KEY_SECRET = process.env.X_API_CONSUMER_KEY_SECRET;
const X_API_ACCESS_TOKEN = process.env.X_API_ACCESS_TOKEN;
const X_API_ACCESS_TOKEN_SECRET = process.env.X_API_ACCESS_TOKEN_SECRET;
// P1 FIX: X_API_BASE_URLのデフォルトをapi.twitter.comに変更（互換性向上）
const X_API_BASE_URL = process.env.X_API_BASE_URL || "https://api.twitter.com/2";
const X_UPLOAD_URL = "https://upload.x.com/1.1/media/upload.json";

// OAuth 1.0aインスタンス
const oauth = OAuth({
  consumer: {
    key: X_API_CONSUMER_KEY,
    secret: X_API_CONSUMER_KEY_SECRET
  },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return crypto.createHmac("sha1", key).update(baseString).digest("base64");
  }
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
  return (
    status === 429 || error.message?.includes("rate limit") || error.message?.includes("Rate limit")
  );
}

/**
 * X APIリクエストを実行（OAuth 1.0a User Context認証、リトライ対応）
 * @param {string} endpoint - APIエンドポイント
 * @param {Object} options - リクエストオプション
 * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns {Promise<Object>} APIレスポンス
 */
async function xApiRequest(endpoint, options = {}, maxRetries = 3) {
  // P2 FIX: 本番環境では認証情報の存在をログに出さない（情報漏えい対策）
  const isDebugMode = process.env.X_API_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
  if (isDebugMode) {
    console.log('[X API] 🔵 xApiRequest called:', {
      endpoint,
      method: options.method || 'GET',
      hasConsumerKey: !!X_API_CONSUMER_KEY,
      hasConsumerSecret: !!X_API_CONSUMER_KEY_SECRET,
      hasAccessToken: !!X_API_ACCESS_TOKEN,
      hasAccessTokenSecret: !!X_API_ACCESS_TOKEN_SECRET,
      timestamp: new Date().toISOString(),
    });
  } else {
    console.log('[X API] 🔵 xApiRequest called:', {
      endpoint,
      method: options.method || 'GET',
      timestamp: new Date().toISOString(),
    });
  }

  if (
    !X_API_CONSUMER_KEY ||
    !X_API_CONSUMER_KEY_SECRET ||
    !X_API_ACCESS_TOKEN ||
    !X_API_ACCESS_TOKEN_SECRET
  ) {
    console.error('[X API] ❌ Missing credentials:', {
      hasConsumerKey: !!X_API_CONSUMER_KEY,
      hasConsumerSecret: !!X_API_CONSUMER_KEY_SECRET,
      hasAccessToken: !!X_API_ACCESS_TOKEN,
      hasAccessTokenSecret: !!X_API_ACCESS_TOKEN_SECRET,
    });
    throw new Error(
      "X_API_CONSUMER_KEY, X_API_CONSUMER_KEY_SECRET, X_API_ACCESS_TOKEN, and X_API_ACCESS_TOKEN_SECRET are required for OAuth 1.0a User Context authentication."
    );
  }

  // P0 FIX: OAuth 1.0a署名にクエリパラメータを含める
  // endpointに?が含まれる場合は禁止（options.paramsに統一）
  if (endpoint.includes('?')) {
    throw new Error(`Endpoint must not contain query string. Use options.params instead: ${endpoint}`);
  }
  
  const baseUrl = `${X_API_BASE_URL}${endpoint}`;
  const method = options.method || "GET";

  // P0 FIX: 最終的にfetchするURLを先に構築（署名対象URLと一致させる）
  let finalUrl = baseUrl;
  if (method === "GET" && options.params) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const queryString = params.toString();
    if (queryString) {
      finalUrl += "?" + queryString;
    }
  }

  // OAuth 1.0a認証ヘッダーを生成（paramsを含める）
  const token = {
    key: X_API_ACCESS_TOKEN,
    secret: X_API_ACCESS_TOKEN_SECRET
  };

  // P0 FIX: OAuth署名の「署名対象URL」と「実送信URL」を一致させる（GPT-5.2推奨）
  // 最も堅い方式: requestData.urlにfinalUrl（クエリ付き）を渡し、dataはundefinedにする
  // これにより、署名対象と実送信URLが完全に一致し、署名不一致のリスクを排除
  const requestData = {
    url: finalUrl, // クエリ付きの最終URLを使用（署名対象と実送信URLを一致）
    method,
    // dataはundefined（URLのクエリが署名対象となる）
    data: undefined
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  // fetch用のURLは既に構築済み
  const url = finalUrl;

  const headers = {
    ...authHeader,
    "Content-Type": "application/json",
    ...options.headers
  };

  // P0 FIX: タイムアウト設定（各attemptごとにAbortControllerを作成）
  const timeoutMs = 30000; // 30秒

  // リトライロジック（指数バックオフ）
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // P0 FIX: 各attemptごとにAbortControllerとタイマーを作成
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
      console.warn(`[X API] Request timeout after ${timeoutMs}ms (attempt ${attempt + 1}): ${endpoint}`);
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: abortController.signal
      });

      // タイムアウトIDをクリア（成功時）
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText };
        }

        // エラー400の詳細ログ（クレジット不足の可能性を確認）
        if (response.status === 400) {
          console.error(`[X API] Error 400 - Bad Request:`, {
            endpoint,
            method,
            errorData,
            url,
            possibleCauses: [
              "Invalid request parameters",
              "X API credit shortage",
              "Invalid query format",
              "Missing required fields"
            ]
          });

          // クレジット不足の可能性をチェック
          const errorMessage = JSON.stringify(errorData).toLowerCase();
          if (
            errorMessage.includes("credit") ||
            errorMessage.includes("quota") ||
            errorMessage.includes("insufficient")
          ) {
            console.error(
              `[X API] ⚠️ Possible credit shortage detected! Please check X API developer console for credit balance.`
            );
          }
        }

        const error = new Error(`X API Error: ${response.status} - ${JSON.stringify(errorData)}`);

        // P1 FIX: HTTPステータスベースでリトライ（429, 5xxをリトライ対象）
        const retryableStatuses = [429, 500, 502, 503, 504];
        if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
          let delay;
          
          if (response.status === 429) {
            // レート制限ヘッダーを確認（X-RateLimit-Reset）
            const resetHeader =
              response.headers.get("x-rate-limit-reset") || response.headers.get("X-RateLimit-Reset");
            if (resetHeader) {
              // リセット時刻まで待機（最大5分）
              const resetTime = parseInt(resetHeader, 10) * 1000;
              const now = Date.now();
              delay = Math.min(resetTime - now, 5 * 60 * 1000); // 最大5分
              if (delay < 0) delay = Math.pow(2, attempt) * 1000; // フォールバック
            } else {
              delay = Math.pow(2, attempt) * 1000; // 指数バックオフ: 1s, 2s, 4s
            }
            console.warn(
              `[X API] Rate limit hit (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
            );
          } else {
            // 5xxエラーの場合
            const retryAfter = response.headers.get("retry-after") || response.headers.get("Retry-After");
            if (retryAfter) {
              delay = parseInt(retryAfter, 10) * 1000;
            } else {
              delay = Math.pow(2, attempt) * 1000; // 指数バックオフ: 1s, 2s, 4s
            }
            console.warn(
              `[X API] Server error (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
            );
          }
          
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      return await response.json();
    } catch (error) {
      // P1 FIX: リトライ対象を拡大（429以外もリトライ）
      const isRetryableError = 
        isRateLimitError(error) ||
        error.name === 'AbortError' ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout');

      if (isRetryableError && attempt < maxRetries) {
        // タイムアウトIDをクリア（リトライ前に）
        clearTimeout(timeoutId);
        const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ: 1s, 2s, 4s
        console.warn(
          `[X API] Retryable error (${error.name || 'unknown'}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // タイムアウトIDをクリア（エラー時）
      clearTimeout(timeoutId);

      // 最後の試行またはリトライ不可エラーの場合
      if (attempt === maxRetries) {
        console.error("[X API] Request failed after retries:", error.message);
        throw error;
      }

      // その他のエラーは即座にスロー
      console.error("[X API] Request failed:", error.message);
      throw error;
    }
  }
}

/**
 * メディアをアップロード (v1.1 APIを使用)
 * @param {Buffer} mediaBuffer - メディアデータのバッファ
 * @param {Object} options - オプション（mediaType: 'image' | 'video'）
 * @returns {Promise<string>} media_id_string
 */
async function uploadMedia(mediaBuffer, options = {}) {
  if (!mediaBuffer) {
    throw new Error("Media buffer is required");
  }

  const { mediaType = "image" } = options;
  const url = X_UPLOAD_URL;
  const method = "POST";

  const token = {
    key: X_API_ACCESS_TOKEN,
    secret: X_API_ACCESS_TOKEN_SECRET
  };

  // Multipart/form-data用のOAuth署名（パラメータは含めない）
  const requestData = {
    url,
    method
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  // P0 FIX: FormDataの互換性確保（Node 18+では標準で利用可能）
  // Vercel環境ではNode 18+が使用されるため、FormDataは利用可能
  if (typeof FormData === 'undefined') {
    throw new Error('FormData is not available. Please ensure Node.js 18+ runtime.');
  }
  
  // P1 FIX: タイムアウト設定（AbortController）
  const timeoutMs = 60000; // メディアアップロードは60秒
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
    console.warn('[X API] Media upload timeout after 60s');
  }, timeoutMs);
  
  // FormDataの作成
  const formData = new FormData();
  const filename = mediaType === "video" ? "video.mp4" : "image.png";
  const contentType = mediaType === "video" ? "video/mp4" : "image/png";

  formData.append("media", new Blob([mediaBuffer], { type: contentType }), filename);

  // 動画の場合は追加パラメータ
  if (mediaType === "video") {
    formData.append("media_category", "tweet_video");
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...authHeader
        // Content-Typeはfetchが自動設定する（boundaryを含むため）
      },
      body: formData,
      signal: abortController.signal
    });

    // タイムアウトIDをクリア
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Media Upload Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.media_id_string;
  } catch (error) {
    // タイムアウトIDをクリア
    clearTimeout(timeoutId);
    console.error("[X API] Media upload failed:", error.message);
    throw error;
  }
}

/**
 * 動画をアップロード（X API v1.1動画アップロード - 3段階プロセス）
 * Grok推奨: X API v1.1エンドポイント統合
 * @param {Buffer} videoBuffer - 動画バッファ
 * @param {Object} options - オプション（mimeType等）
 * @returns {Promise<string>} media_id_string
 */
async function uploadVideo(videoBuffer, options = {}) {
  if (!videoBuffer) {
    throw new Error("Video buffer is required");
  }

  const { mimeType = "video/mp4" } = options;

  // 注意: X API v1.1の動画アップロードは3段階（INIT, APPEND, FINALIZE）
  // Vercel環境では大きなファイルのアップロードが難しいため、
  // 現在は画像としてアップロード（将来的に外部サービスで動画変換可能）

  // 簡易実装: 画像としてアップロード（動画変換は外部サービスで実装可能）
  console.warn(
    "[X API] Video upload: Using image upload as fallback (video conversion via external service recommended)"
  );
  return uploadMedia(videoBuffer, { mediaType: "image" });

  // 将来的な実装（外部動画変換サービス統合後）:
  // 1. INIT: 動画メタデータを送信
  // 2. APPEND: 動画チャンクを送信（5MB以下）
  // 3. FINALIZE: アップロード完了を通知
  // 4. STATUS: 処理完了を待機
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
    throw new Error("Tweet text is required");
  }

  // X API v2の文字数制限は280文字
  if (text.length > 280) {
    console.warn(`[X API] Tweet text exceeds 280 characters (${text.length}), truncating...`);
    text = text.substring(0, 277) + "...";
  }

  const body = {
    text: text.trim()
  };

  if (mediaIds && mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds
    };
  }

  // ポールオプションを追加（Grok推奨: エンゲージメント強化）
  // X API v2では、ポールオプションは文字列配列として送る必要がある
  if (pollOptions && pollOptions.options && Array.isArray(pollOptions.options)) {
    // オプションがオブジェクト形式の場合は文字列に変換、既に文字列の場合はそのまま使用
    const pollOptionStrings = pollOptions.options.map((opt) => {
      if (typeof opt === "string") {
        return opt;
      } else if (opt && typeof opt === "object" && opt.text) {
        return opt.text;
      } else {
        return String(opt);
      }
    });

    body.poll = {
      options: pollOptionStrings,
      duration_minutes: pollOptions.duration_minutes || 1440 // デフォルト24時間
    };
  }

  try {
    const response = await xApiRequest(
      "/tweets",
      {
        method: "POST",
        body
      },
      maxRetries
    );

    console.log(`[X API] Tweet posted successfully: ${response.data?.id}`);
    return {
      id: response.data?.id,
      text: response.data?.text
    };
  } catch (error) {
    console.error("[X API] Failed to post tweet:", error.message);
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
    const response = await xApiRequest("/users/me");
    return response.data;
  } catch (error) {
    console.error("[X API] Failed to get me:", error.message);
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
    throw new Error("Search query is required");
  }

  const {
    maxResults = 10,
    startTime,
    endTime,
    sinceId,
    untilId,
    nextToken,
    sortOrder = "relevancy"
  } = options;

  // P0 FIX: OAuth署名にクエリを含めるため、paramsをオブジェクトとして渡す
  const paramsObj = {
    query: query.trim(),
    max_results: Math.min(Math.max(10, maxResults), 100).toString(),
    "tweet.fields": "id,text,author_id,created_at,public_metrics,lang",
    "user.fields": "id,name,username,public_metrics",
    expansions: "author_id",
    sort_order: sortOrder
  };

  if (startTime) paramsObj.start_time = startTime;
  if (endTime) paramsObj.end_time = endTime;
  if (sinceId) paramsObj.since_id = sinceId;
  if (untilId) paramsObj.until_id = untilId;
  if (nextToken) paramsObj.next_token = nextToken;

  try {
    // P0 FIX: endpointはパスのみ、クエリはoptions.paramsに統一
    const response = await xApiRequest('/tweets/search/recent', {
      method: 'GET',
      params: paramsObj
    });
    return {
      data: response.data || [],
      includes: response.includes || {},
      meta: response.meta || {}
    };
  } catch (error) {
    console.error("[X API] Failed to search tweets:", error.message);
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
    throw new Error("Reply text is required");
  }
  if (!inReplyToTweetId) {
    throw new Error("inReplyToTweetId is required");
  }

  // X API v2の文字数制限は280文字
  if (text.length > 280) {
    console.warn(`[X API] Reply text exceeds 280 characters (${text.length}), truncating...`);
    text = text.substring(0, 277) + "...";
  }

  // X API v2では、in_reply_to_tweet_idは文字列である必要がある
  const tweetIdString = String(inReplyToTweetId).trim();
  if (!tweetIdString || tweetIdString === "null" || tweetIdString === "undefined") {
    throw new Error(`Invalid inReplyToTweetId: ${inReplyToTweetId}`);
  }

  const body = {
    text: text.trim(),
    reply: {
      in_reply_to_tweet_id: tweetIdString
    }
  };

  if (mediaIds && mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds
    };
  }

  try {
    const response = await xApiRequest("/tweets", {
      method: "POST",
      body
    });

    console.log(`[X API] Reply posted successfully: ${response.data?.id}`);
    return {
      id: response.data?.id,
      text: response.data?.text
    };
  } catch (error) {
    console.error("[X API] Failed to reply to tweet:", error.message);
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
    throw new Error("Quote tweet text is required");
  }
  if (!quoteTweetId) {
    throw new Error("quoteTweetId is required");
  }

  // 重要: 引用リポストは140文字以内に制限（UI上の制限）
  // X API v2では280文字まで受け付けるが、引用リポストのUI表示は140文字程度
  // エンゲージメントを最大化するため、質問CTAとリンクを優先的に保持
  if (text.length > 140) {
    console.warn(`[X API] Quote tweet text exceeds 140 characters (${text.length}), truncating...`);

    // 質問CTAとリンクを保持するため、末尾から削除
    const questionMatch = text.match(/(.*?)(\?[^?]*$)/);
    const linkMatch = text.match(/(https?:\/\/[^\s]+)/);

    if (questionMatch && linkMatch) {
      // 質問CTAとリンクを保持
      const questionPart = questionMatch[2]; // "? Reply!" など
      const linkPart = linkMatch[1]; // URL
      const hashtagPart = text.match(/(#[^\s]+(?:\s+#[^\s]+)*)$/)?.[1] || "";

      // 残りの文字数を計算
      const reservedLength = questionPart.length + linkPart.length + hashtagPart.length + 3; // +3はスペース
      const availableLength = 140 - reservedLength;

      if (availableLength > 20) {
        // フック部分を短縮
        const hookPart = text.substring(0, text.indexOf(linkPart)).trim();
        const shortenedHook =
          hookPart.length > availableLength
            ? hookPart.substring(0, availableLength - 3) + "..."
            : hookPart;

        text = `${shortenedHook} ${linkPart}${questionPart} ${hashtagPart}`.trim();
      } else {
        // 文字数が足りない場合は、リンクと質問CTAを優先
        text = `${linkPart}${questionPart} ${hashtagPart}`.trim();
      }
    } else {
      // フォールバック: 末尾から削除（質問CTAを保持）
      text = text.substring(0, 137) + "...";
    }

    // 最終チェック: 140文字を超えている場合は強制的に切り詰め
    if (text.length > 140) {
      text = text.substring(0, 137) + "...";
    }

    console.log(
      `[X API] Quote tweet text truncated to ${text.length} characters (preserving CTA and links)`
    );
  }

  const body = {
    text: text.trim(),
    quote_tweet_id: quoteTweetId
  };

  if (mediaIds && mediaIds.length > 0) {
    body.media = {
      media_ids: mediaIds
    };
  }

  try {
    const response = await xApiRequest(
      "/tweets",
      {
        method: "POST",
        body
      },
      maxRetries
    );

    // 🔍 重要: レスポンスの検証を強化（空振りを検出）
    if (!response || !response.data) {
      console.error(`[X API] ❌ Invalid response structure:`, {
        response,
        body,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Invalid response structure: ${JSON.stringify(response)}`);
    }

    if (!response.data.id) {
      console.error(`[X API] ❌ Response missing tweet ID:`, {
        response,
        body,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Response missing tweet ID: ${JSON.stringify(response)}`);
    }

    console.log(`[X API] ✅ Quote tweet posted successfully:`, {
      tweetId: response.data.id,
      text: response.data.text,
      timestamp: new Date().toISOString(),
    });
    
    return {
      id: response.data.id,
      text: response.data.text
    };
  } catch (error) {
    console.error("[X API] ❌ Failed to post quote tweet:", {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      body,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * トレンドを取得（X API v1.1を使用）
 * @param {number} woeid - Where On Earth ID（1 = 全世界、23424856 = 日本など）
 * @returns {Promise<Array>} トレンド情報の配列
 */
async function getTrends(woeid = 1) {
  const X_API_BASE_URL_V1 = process.env.X_API_BASE_URL_V1 || "https://api.x.com/1.1";
  const url = `${X_API_BASE_URL_V1}/trends/place.json`;

  const method = "GET";

  const token = {
    key: X_API_ACCESS_TOKEN,
    secret: X_API_ACCESS_TOKEN_SECRET
  };

  const requestData = {
    url: `${url}?id=${woeid}`,
    method
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const headers = {
    ...authHeader,
    "Content-Type": "application/json"
  };

  try {
    const response = await fetch(`${url}?id=${woeid}`, {
      method,
      headers
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
    console.error("[X API] Failed to get trends:", error.message);
    throw error;
  }
}

/**
 * X APIクレジット使用状況の確認（開発者コンソールへの案内）
 * 注意: X APIには直接クレジット残高を取得するAPIエンドポイントがないため、
 * 開発者コンソール（https://developer.twitter.com/en/portal/dashboard）で確認が必要です
 * @returns {Promise<Object>} クレジット確認の案内情報
 */
async function checkXApiCredits() {
  const consoleUrl = "https://developer.twitter.com/en/portal/dashboard";
  console.warn(
    `[X API] ⚠️ クレジット使用状況を確認するには、開発者コンソールにアクセスしてください: ${consoleUrl}`
  );
  console.warn(`[X API] エラー400が発生している場合、クレジット不足の可能性があります。`);
  return {
    message: "X APIクレジット使用状況は開発者コンソールで確認してください",
    consoleUrl,
    note: "エラー400が発生している場合、クレジット不足またはリクエストパラメータの不正が原因の可能性があります"
  };
}

module.exports = {
  xApiRequest,
  postTweet,
  replyToTweet,
  postQuoteTweet,
  uploadMedia,
  uploadVideo,
  getUserByUsername,
  getMe,
  searchTweets,
  getTrends,
  isRateLimitError,
  checkXApiCredits
};
