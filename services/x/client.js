// services/x/client.js
// X (Twitter) API v2 クライアント - OAuth 1.0a User Context認証
//
// 【OS 原則】X への write は postTweet（スタンドアロン投稿）を基本とする。
// 例外として、直販リプライ運用に必要な replyToTweet のみ許可する。DM はアフィリスカウト用に別実装。

const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
const { Blob } = require("buffer");
const { recordRateLimit } = require("./rateLimitTracker");

// OAuth 1.0a認証情報
const X_API_CONSUMER_KEY = process.env.X_API_CONSUMER_KEY;
const X_API_CONSUMER_KEY_SECRET = process.env.X_API_CONSUMER_KEY_SECRET;
const X_API_ACCESS_TOKEN = process.env.X_API_ACCESS_TOKEN;
const X_API_ACCESS_TOKEN_SECRET = process.env.X_API_ACCESS_TOKEN_SECRET;
const X_API_BEARER_TOKEN = process.env.X_API_BEARER_TOKEN;
/** OAuth 2.0 User Context アクセストークン（PKCE取得）。ブックマーク API は OAuth 2.0 必須のため、未設定だと 403。 */
const X_API_OAUTH2_USER_ACCESS_TOKEN = process.env.X_API_OAUTH2_USER_ACCESS_TOKEN;
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
  const isDebugMode = process.env.X_API_DEBUG === "true" || process.env.NODE_ENV !== "production";
  if (isDebugMode) {
    console.log("[X API] 🔵 xApiRequest called:", {
      endpoint,
      method: options.method || "GET",
      hasConsumerKey: !!X_API_CONSUMER_KEY,
      hasConsumerSecret: !!X_API_CONSUMER_KEY_SECRET,
      hasAccessToken: !!X_API_ACCESS_TOKEN,
      hasAccessTokenSecret: !!X_API_ACCESS_TOKEN_SECRET,
      timestamp: new Date().toISOString()
    });
  } else {
    console.log("[X API] 🔵 xApiRequest called:", {
      endpoint,
      method: options.method || "GET",
      timestamp: new Date().toISOString()
    });
  }

  if (
    !X_API_CONSUMER_KEY ||
    !X_API_CONSUMER_KEY_SECRET ||
    !X_API_ACCESS_TOKEN ||
    !X_API_ACCESS_TOKEN_SECRET
  ) {
    console.error("[X API] ❌ Missing credentials:", {
      hasConsumerKey: !!X_API_CONSUMER_KEY,
      hasConsumerSecret: !!X_API_CONSUMER_KEY_SECRET,
      hasAccessToken: !!X_API_ACCESS_TOKEN,
      hasAccessTokenSecret: !!X_API_ACCESS_TOKEN_SECRET
    });
    throw new Error(
      "X_API_CONSUMER_KEY, X_API_CONSUMER_KEY_SECRET, X_API_ACCESS_TOKEN, and X_API_ACCESS_TOKEN_SECRET are required for OAuth 1.0a User Context authentication."
    );
  }

  // P0 FIX: OAuth 1.0a署名にクエリパラメータを含める
  // endpointに?が含まれる場合は禁止（options.paramsに統一）
  if (endpoint.includes("?")) {
    throw new Error(
      `Endpoint must not contain query string. Use options.params instead: ${endpoint}`
    );
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
      console.warn(
        `[X API] Request timeout after ${timeoutMs}ms (attempt ${attempt + 1}): ${endpoint}`
      );
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

        // 403: 想定内パターンは短くログし、それ以外のみ error で詳細出力
        const detailStr = (errorData?.detail && String(errorData.detail)) || "";
        const isTargetUnavailable =
          response.status === 403 &&
          (detailStr.includes("deleted or not visible") || detailStr.includes("deleted") && detailStr.includes("not visible"));
        const isReplyConversationNotAllowed =
          response.status === 403 &&
          (detailStr.includes("Reply to this conversation is not allowed") ||
            detailStr.includes("have not been mentioned or otherwise engaged"));
        const isDmNotAllowed =
          response.status === 403 && detailStr.includes("permission to DM");
        if (isTargetUnavailable) {
          console.warn(`[X API] Reply skipped (403): target tweet deleted or not visible.`, {
            endpoint,
            method,
            detail: errorData.detail
          });
        } else if (isReplyConversationNotAllowed) {
          console.warn(`[X API] Reply blocked (403).`, {
            endpoint,
            method,
            detail: errorData.detail,
            hint: "If target reply_settings was 'everyone', check: app has Read and Write, access token was regenerated after enabling it."
          });
        } else if (isDmNotAllowed) {
          console.warn(`[X API] DM 403: recipient not open to DMs (${endpoint})`);
        } else if (response.status === 401 || response.status === 403) {
          console.error(`[X API] ❌ Authentication/Authorization Error (${response.status}):`, {
            endpoint,
            method,
            errorData,
            url,
            possibleCauses: [
              "OAuth signature mismatch",
              "Invalid access token",
              "Expired credentials",
              "Invalid consumer key/secret"
            ],
            note: "This may indicate OAuth signature verification failure on X API side"
          });
        }

        const error = new Error(`X API Error: ${response.status} - ${JSON.stringify(errorData)}`);

        // P1 FIX: HTTPステータスベースでリトライ（429, 5xxをリトライ対象）
        const retryableStatuses = [429, 500, 502, 503, 504];
        if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
          let delay;

          if (response.status === 429) {
            // 🔒 レート制限情報をKVに記録（429エラー時）
            try {
              const endpointKey = `${method} ${endpoint}`;
              const headers = {};
              for (const [key, value] of response.headers.entries()) {
                if (key.toLowerCase().startsWith("x-rate-limit")) {
                  headers[key.toLowerCase()] = value;
                }
              }
              await recordRateLimit(endpointKey, "user", headers);
            } catch (rateLimitError) {
              console.warn(`[X API] ⚠️ Failed to record rate limit (429):`, rateLimitError.message);
            }

            // レート制限ヘッダーを確認（X-RateLimit-Reset）
            const resetHeader =
              response.headers.get("x-rate-limit-reset") ||
              response.headers.get("X-RateLimit-Reset");
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
            const retryAfter =
              response.headers.get("retry-after") || response.headers.get("Retry-After");
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

      // P0 FIX: response.okがtrueでも、X API v2のerrorsフィールドが含まれている場合はエラーとして扱う
      const responseData = await response.json();

      // X API v2のエラーレスポンス形式: { errors: [{ code, message }] または { detail, title, resource_type }] }
      if (
        responseData.errors &&
        Array.isArray(responseData.errors) &&
        responseData.errors.length > 0
      ) {
        const first = responseData.errors[0];
        const isTweetNotFound =
          first.resource_type === "tweet" &&
          (first.title === "Not Found Error" || (first.type && /resource-not-found/i.test(first.type)));

        if (isTweetNotFound) {
          console.warn(
            `[X API] ⚠️ Tweet not found: ${first.resource_id || endpoint} (deleted or private).`
          );
        } else {
          console.error(
            `[X API] ❌ Response contains errors field (but status was ${response.status}):`,
            {
              endpoint,
              method,
              errors: responseData.errors,
              fullResponse: responseData,
              url
            }
          );
        }

        const errorMessages = responseData.errors
          .map((e) => e.detail || e.message || `${e.code}: ${e.message}`)
          .join(", ");
        throw new Error(
          `X API Response Errors: ${errorMessages || "unknown"} - ${JSON.stringify(responseData)}`
        );
      }

      // 🔒 レート制限情報をKVに記録（レスポンス成功時）
      try {
        const endpointKey = `${method} ${endpoint}`;
        const headers = {};
        // レスポンスヘッダーからレート制限情報を取得
        for (const [key, value] of response.headers.entries()) {
          if (key.toLowerCase().startsWith("x-rate-limit")) {
            headers[key.toLowerCase()] = value;
          }
        }
        await recordRateLimit(endpointKey, "user", headers);
      } catch (rateLimitError) {
        // レート制限記録の失敗は警告のみ（APIリクエスト自体は成功）
        console.warn(`[X API] ⚠️ Failed to record rate limit:`, rateLimitError.message);
      }

      return responseData;
    } catch (error) {
      // P1 FIX: リトライ対象を拡大（429以外もリトライ）
      const isRetryableError =
        isRateLimitError(error) ||
        error.name === "AbortError" ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("ETIMEDOUT") ||
        error.message?.includes("network") ||
        error.message?.includes("timeout");

      if (isRetryableError && attempt < maxRetries) {
        // タイムアウトIDをクリア（リトライ前に）
        clearTimeout(timeoutId);
        const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ: 1s, 2s, 4s
        console.warn(
          `[X API] Retryable error (${error.name || "unknown"}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // タイムアウトIDをクリア（エラー時）
      clearTimeout(timeoutId);

      // 最後の試行またはリトライ不可エラーの場合
      const isDmPermissionError = error?.message && String(error.message).includes("permission to DM");
      if (attempt === maxRetries) {
        if (!isDmPermissionError) console.error("[X API] Request failed after retries:", error.message);
        throw error;
      }

      // その他のエラーは即座にスロー（DM 403 は上で既に短くログ済み）
      if (!isDmPermissionError) console.error("[X API] Request failed:", error.message);
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
  if (typeof FormData === "undefined") {
    throw new Error("FormData is not available. Please ensure Node.js 18+ runtime.");
  }

  // P1 FIX: タイムアウト設定（AbortController）
  const timeoutMs = 60000; // メディアアップロードは60秒
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
    console.warn("[X API] Media upload timeout after 60s");
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

/** Xプレミアム運用時も適用される X API のハード上限 */
const X_LONG_POST_MAX_LENGTH = 25000;

function assertWithinLongPostLimit(text, label) {
  if (typeof text !== "string") return;
  if (text.length <= X_LONG_POST_MAX_LENGTH) return;
  throw new Error(
    `[X API] ${label} length ${text.length} exceeds hard limit ${X_LONG_POST_MAX_LENGTH}. ` +
      "X Premium removes 140/280 constraints, but API hard cap still applies."
  );
}

/**
 * Xにツイートを投稿（リトライ対応）
 * @param {string} text - ツイート本文（プレミアム時は最大25,000文字の長文ポスト対応）
 * @param {string[]} mediaIds - 添付するメディアIDの配列 (オプション)
 * @param {Object} pollOptions - ポールオプション (オプション) {options: [{text, position}], duration_minutes: number}
 * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns {Promise<Object>} 投稿結果 {id, text}
 */
async function postTweet(text, mediaIds = [], pollOptions = null, maxRetries = 3) {
  if (!text || text.trim().length === 0) {
    throw new Error("Tweet text is required");
  }

  // X Premium: 140/280 制限は無効。ローカルで勝手に切り詰めず、APIハード上限のみ検証
  assertWithinLongPostLimit(text, "Tweet text");

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
 * 指定ツイートにリプライを投稿
 * @param {string} text - リプライ本文
 * @param {string} inReplyToTweetId - 返信先ツイートID
 * @param {{ mediaIds?: string[] }} [options] - 追加オプション
 * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
 * @returns {Promise<{id?: string, text?: string}>}
 */
async function replyToTweet(text, inReplyToTweetId, options = {}, maxRetries = 3) {
  if (!text || text.trim().length === 0) {
    throw new Error("Reply text is required");
  }
  const targetTweetId = String(inReplyToTweetId || "").trim();
  if (!targetTweetId) {
    throw new Error("inReplyToTweetId is required");
  }

  assertWithinLongPostLimit(text, "Reply text");

  const body = {
    text: text.trim(),
    reply: {
      in_reply_to_tweet_id: targetTweetId
    }
  };

  const mediaIds = Array.isArray(options?.mediaIds) ? options.mediaIds.filter(Boolean) : [];
  if (mediaIds.length > 0) {
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

    return {
      id: response?.data?.id,
      text: response?.data?.text
    };
  } catch (error) {
    console.error("[X API] Failed to post reply:", {
      targetTweetId,
      message: error?.message || "unknown"
    });
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
 * ユーザーの直近ツイートを取得（OAuth 1.0a）
 * @param {string} userId - X API ユーザーID
 * @param {Object} options - オプション
 * @param {number} options.maxResults - 最大件数（1-100、デフォルト: 5）
 * @returns {Promise<Object>} { data: tweets[], includes }
 */
async function getUserTweets(userId, options = {}) {
  const maxResults = Math.min(Math.max(1, options.maxResults || 5), 100);
  const response = await xApiRequest(`/users/${userId}/tweets`, {
    method: "GET",
    params: {
      max_results: String(maxResults),
      "tweet.fields": "id,text,created_at,public_metrics,lang",
      exclude: "replies"
    }
  });
  return { data: response?.data || [], includes: response?.includes || {} };
}

/**
 * Search recent Posts（X API v2）
 * BuzzWeave Engine 用 — Bearer 認証（Search API は Bearer 必須のプランが多い）
 * xApiRequest で OAuth が 401 の場合のフォールバックとして Bearer を使用
 * @param {string} query - 検索クエリ（X検索構文）
 * @param {Object} options - 検索オプション
 * @param {number} options.maxResults - 最大結果数（10-100、デフォルト: 50）
 * @param {string} options.startTime - 開始時刻（ISO 8601形式）
 * @param {string} options.endTime - 終了時刻（ISO 8601形式）
 * @param {string} options.sortOrder - ソート順（"relevancy" | "recency"）
 * @param {string} options.nextToken - ページネーション用トークン
 * @returns {Promise<Object>} 検索結果 {data, includes, meta}
 */
async function searchPostsRecent(query, options = {}) {
  if (!query || query.trim().length === 0) {
    throw new Error("Search query is required");
  }
  const maxResults = Math.min(Math.max(10, options.maxResults || 50), 100);
  const userFields = options.userFields || "id,name,username";
  const params = new URLSearchParams({
    query: query.trim(),
    max_results: String(maxResults),
    "tweet.fields": "id,text,author_id,created_at,public_metrics,lang",
    expansions: "author_id",
    "user.fields": userFields,
    sort_order: options.sortOrder || "relevancy"
  });
  if (options.startTime) params.set("start_time", options.startTime);
  if (options.endTime) params.set("end_time", options.endTime);
  if (options.nextToken) params.set("next_token", options.nextToken);

  const bearer = process.env.X_API_BEARER_TOKEN;
  if (bearer) {
    const url = `${X_API_BASE_URL}/tweets/search/recent?${params.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const text = await res.text();
      let err;
      try {
        err = JSON.parse(text);
      } catch {
        err = { detail: text };
      }
      throw new Error(`X API Error: ${res.status} - ${JSON.stringify(err)}`);
    }
    const json = await res.json();
    try {
      const { recordRateLimit } = require("./rateLimitTracker");
      const headers = {};
      for (const [k, v] of res.headers.entries()) {
        if (k.toLowerCase().startsWith("x-rate-limit")) headers[k.toLowerCase()] = v;
      }
      await recordRateLimit("GET /2/tweets/search/recent", "user", headers);
    } catch (e) {
      /* ignore */
    }
    return {
      data: json.data || [],
      includes: json.includes || {},
      meta: json.meta || {}
    };
  }

  const response = await xApiRequest("/tweets/search/recent", {
    method: "GET",
    params: Object.fromEntries(params)
  });
  return {
    data: response?.data || [],
    includes: response?.includes || {},
    meta: response?.meta || {}
  };
}

/**
 * ツイートを検索（X API v2）
 * Bearer 専用 — OAuth 分岐なし。401 ならプラン制限 or Token 無効。
 * @param {string} query - 検索クエリ（Twitter検索構文）
 * @param {Object} options - 検索オプション
 * @param {number} options.maxResults - 最大結果数（10-100、デフォルト: 30）
 * @param {string} options.startTime - 開始時刻（ISO 8601形式）
 * @param {string} options.endTime - 終了時刻（ISO 8601形式）
 * @param {string} options.sinceId - このID以降のツイートを取得
 * @param {string} options.untilId - このID以前のツイートを取得
 * @param {string} options.nextToken - ページネーショントークン
 * @param {string} options.sortOrder - ソート順（"relevancy" | "recency"）
 * @returns {Promise<Object>} 検索結果 {data, includes, meta}
 */
async function searchTweets(query, options = {}) {
  if (!query || query.trim().length === 0) {
    throw new Error("Search query is required");
  }
  if (!X_API_BEARER_TOKEN) {
    throw new Error(
      "X_API_BEARER_TOKEN is required for Search API. Set it in Vercel env vars."
    );
  }

  const {
    maxResults = 30,
    startTime,
    endTime,
    sinceId,
    untilId,
    nextToken,
    sortOrder = "relevancy"
  } = options;

  const params = new URLSearchParams({
    query: query.trim(),
    max_results: String(Math.min(Math.max(10, maxResults), 100)),
    "tweet.fields": "id,text,author_id,created_at,public_metrics,lang",
    "user.fields": "id,name,username,public_metrics",
    expansions: "author_id",
    sort_order: sortOrder
  });
  if (startTime) params.set("start_time", startTime);
  if (endTime) params.set("end_time", endTime);
  if (sinceId) params.set("since_id", sinceId);
  if (untilId) params.set("until_id", untilId);
  if (nextToken) params.set("next_token", nextToken);

  const url = `${X_API_BASE_URL}/tweets/search/recent?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${X_API_BEARER_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`X API Error: ${res.status} - ${errorText}`);
  }

  const json = await res.json();
  return {
    data: json.data || [],
    includes: json.includes || {},
    meta: json.meta || {}
  };
}

/**
 * 400/403/404 など、そのツイートに対する投稿が不能なエラーか
 */
function isFatalTweetError(error) {
  if (!error) return false;
  const m = error.message?.match(/X API Error: (\d+)/);
  const status = m ? parseInt(m[1], 10) : null;
  return [400, 403, 404].includes(status);
}

/**
 * 500/502/503/504 など、リトライ可能なサーバーエラーか
 */
function isRetryableError(error) {
  if (!error) return false;
  const m = error.message?.match(/X API Error: (\d+)/);
  const status = m ? parseInt(m[1], 10) : null;
  return [500, 502, 503, 504].includes(status);
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

/**
 * 指定ツイートをいいね（OAuth User Context）
 * 制限: 50/15分/ユーザー
 * @param {string} tweetId - いいねするツイートのID
 * @returns {Promise<{ok: boolean, liked?: boolean, error?: string}>}
 */
async function likeTweet(tweetId, options = {}) {
  const tid = String(tweetId || "").trim();
  if (!tid) return { ok: false, error: "tweet_id is required" };
  try {
    const sourceId = options.sourceId || (await getMe())?.id;
    if (!sourceId) return { ok: false, error: "Could not get authenticated user id" };
    const response = await xApiRequest(`/users/${sourceId}/likes`, {
      method: "POST",
      body: { tweet_id: tid }
    });
    return {
      ok: true,
      liked: response?.data?.liked === true
    };
  } catch (error) {
    const msg = error?.message || "";
    if (msg.includes("403") || msg.includes("429") || msg.includes("Forbidden")) {
      return { ok: false, error: msg };
    }
    throw error;
  }
}

/**
 * 指定ユーザーをフォロー（OAuth User Context）
 * 制限: 400/ユーザー/日・1000/アプリ/日
 * @param {string} targetUserId - フォローするユーザーのID
 * @returns {Promise<{ok: boolean, following?: boolean, pending_follow?: boolean, error?: string}>}
 */
async function followUser(targetUserId, options = {}) {
  const tid = String(targetUserId || "").trim();
  if (!tid) return { ok: false, error: "target_user_id is required" };
  try {
    const sourceId = options.sourceId || (await getMe())?.id;
    if (!sourceId) return { ok: false, error: "Could not get authenticated user id" };
    const response = await xApiRequest(`/users/${sourceId}/following`, {
      method: "POST",
      body: { target_user_id: tid }
    });
    return {
      ok: true,
      following: response?.data?.following === true,
      pending_follow: response?.data?.pending_follow === true
    };
  } catch (error) {
    const msg = error?.message || "";
    if (msg.includes("403") || msg.includes("Forbidden")) {
      return { ok: false, error: msg };
    }
    throw error;
  }
}

/**
 * 指定ユーザーのフォローを解除
 * 制限: 50/15分/ユーザー・500/アプリ/日
 * @param {string} targetUserId - フォロー解除するユーザーのID
 * @returns {Promise<{ok: boolean, following?: boolean, error?: string}>}
 */
async function unfollowUser(targetUserId) {
  const tid = String(targetUserId || "").trim();
  if (!tid) return { ok: false, error: "target_user_id is required" };
  try {
    const me = await getMe();
    const sourceId = me?.id;
    if (!sourceId) return { ok: false, error: "Could not get authenticated user id" };
    const response = await xApiRequest(`/users/${sourceId}/following/${tid}`, {
      method: "DELETE"
    });
    return {
      ok: true,
      following: response?.data?.following === false
    };
  } catch (error) {
    const msg = error?.message || "";
    if (msg.includes("403") || msg.includes("Forbidden")) {
      return { ok: false, error: msg };
    }
    throw error;
  }
}

/**
 * OAuth 2.0 User Context で X API を呼ぶ（ブックマーク等の OAuth 2.0 必須エンドポイント用）
 * 要: X_API_OAUTH2_USER_ACCESS_TOKEN（PKCE で取得したユーザーアクセストークン）
 */
async function xApiRequestOAuth2User(endpoint, options = {}) {
  if (!X_API_OAUTH2_USER_ACCESS_TOKEN) {
    throw new Error(
      "X_API_OAUTH2_USER_ACCESS_TOKEN is required for this endpoint (OAuth 2.0 User Context). Get it via OAuth 2.0 PKCE flow with scopes bookmark.read, bookmark.write, users.read, tweet.read."
    );
  }
  const url = `${X_API_BASE_URL}${endpoint}`;
  const method = options.method || "GET";
  const headers = {
    Authorization: `Bearer ${X_API_OAUTH2_USER_ACCESS_TOKEN}`,
    "Content-Type": "application/json"
  };
  const fetchOptions = { method, headers };
  if (method !== "GET" && options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.detail || data?.title || `X API Error: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * 指定投稿をブックマークに追加（認証ユーザーのブックマーク一覧に入れる）
 * 制限: 50 リクエスト/15分/ユーザー（X API）。$0.005/リクエスト。
 * 認証: ブックマーク API は OAuth 2.0 User Context のみ対応。X_API_OAUTH2_USER_ACCESS_TOKEN を設定すること。
 * @param {string} tweetId - ブックマークする投稿のID
 * @returns {Promise<{ok: boolean, bookmarked?: boolean, error?: string}>}
 */
async function createBookmark(tweetId) {
  const tid = String(tweetId || "").trim();
  if (!tid) return { ok: false, error: "tweet_id is required" };
  if (!X_API_OAUTH2_USER_ACCESS_TOKEN) {
    console.error(
      "[X API] Bookmarks need X_API_OAUTH2_USER_ACCESS_TOKEN. Run: node scripts/x-oauth2-get-user-token.js then add the token to Vercel env."
    );
    return {
      ok: false,
      error:
        "X_API_OAUTH2_USER_ACCESS_TOKEN required. Run scripts/x-oauth2-get-user-token.js and set the token in Vercel."
    };
  }
  try {
    const me = await xApiRequestOAuth2User("/users/me");
    const userId = me?.data?.id || me?.id;
    if (!userId) return { ok: false, error: "Could not get user id with OAuth 2.0" };
    const response = await xApiRequestOAuth2User(`/users/${userId}/bookmarks`, {
      method: "POST",
      body: { tweet_id: tid }
    });
    return {
      ok: true,
      bookmarked: response?.data?.bookmarked === true
    };
  } catch (error) {
    const msg = error?.message || "";
    if (msg.includes("403") || msg.includes("401") || msg.includes("Forbidden") || msg.includes("Unauthorized")) {
      return { ok: false, error: msg };
    }
    throw error;
  }
}

module.exports = {
  xApiRequest,
  postTweet,
  replyToTweet,
  likeTweet,
  followUser,
  unfollowUser,
  createBookmark,
  uploadMedia,
  uploadVideo,
  getUserByUsername,
  getUserTweets,
  getMe,
  searchPostsRecent,
  searchTweets,
  getTrends,
  isRateLimitError,
  isFatalTweetError,
  isRetryableError,
  checkXApiCredits
};
