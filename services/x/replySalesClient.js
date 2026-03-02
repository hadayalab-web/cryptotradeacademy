/**
 * Xリプライ直販 送信クライアント
 */

const { replyToTweet, isRateLimitError } = require("./client");

function classifyReplySendError(errorMessage) {
  const message = String(errorMessage || "").toLowerCase();
  const statusMatch = message.match(/x api error:\s*(\d+)/i);
  const status = statusMatch ? Number(statusMatch[1]) : null;

  if (status === 403) {
    if (
      message.includes("reply to this conversation is not allowed") ||
      message.includes("have not been mentioned or otherwise engaged")
    ) {
      return { status, type: "reply_not_allowed_by_conversation", retryable: false };
    }
    if (message.includes("deleted or not visible")) {
      return { status, type: "target_not_visible", retryable: false };
    }
    return { status, type: "forbidden", retryable: false };
  }
  if (status === 404) {
    return { status, type: "target_not_found", retryable: false };
  }
  if (status === 400) {
    return { status, type: "bad_request", retryable: false };
  }
  if (status === 429) {
    return { status, type: "rate_limit", retryable: true };
  }
  if ([500, 502, 503, 504].includes(status)) {
    return { status, type: "server_error", retryable: true };
  }
  return {
    status,
    type: isRateLimitError({ message }) ? "rate_limit" : "unknown",
    retryable: isRateLimitError({ message })
  };
}

/**
 * 指定ツイートへ営業リプライを送信
 * @param {{ tweetId: string, text: string }} payload
 * @returns {Promise<{ok:boolean, replyId?:string, error?:string, classified?:{status?:number,type:string,retryable:boolean}}>}
 */
async function sendSalesReply(payload) {
  const tweetId = String(payload?.tweetId || "").trim();
  const text = String(payload?.text || "").trim();
  if (!tweetId) return { ok: false, error: "tweetId is required" };
  if (!text) return { ok: false, error: "text is required" };

  try {
    const result = await replyToTweet(text, tweetId);
    return {
      ok: true,
      replyId: result?.id || null
    };
  } catch (error) {
    const message = error?.message || "reply send failed";
    return {
      ok: false,
      error: message,
      classified: classifyReplySendError(message)
    };
  }
}

module.exports = {
  sendSalesReply,
  classifyReplySendError
};
