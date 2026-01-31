// services/x/snippetFromBriefing.js
// 既に生成した高品質コンテンツ（Regular/Minimal/Emergency）を切り取ってX用1ツイートにし、インプレッション・エンゲージメントを取る

const { postTweet } = require("./client");

const MAX_TWEET_LENGTH = 280;
const RESERVED_FOR_HASHTAGS = 40; // " #BTC #TrapDefence" など
const MAX_BODY = MAX_TWEET_LENGTH - RESERVED_FOR_HASHTAGS;

/**
 * 既存ブリーフィングコンテンツからX用1ツイート本文を組み立てる（新規AI呼び出しなし）
 * @param {Object} opts
 * @param {string|null} opts.grokText - Grok の一言（Why now / 推論の1行など）
 * @param {string|null} opts.geminiText - Gemini の一言（心理の罠＋1アクションなど）
 * @param {string} opts.source - 'regular' | 'minimal' | 'emergency'
 * @returns {string} 280文字以内のツイート本文（ハッシュタグ含む）
 */
function buildSnippetFromBriefing({ grokText = null, geminiText = null, source = "minimal" } = {}) {
  const grok = typeof grokText === "string" ? grokText.trim() : "";
  const gemini = typeof geminiText === "string" ? geminiText.trim() : "";

  let body = "";
  if (grok && gemini) {
    body = `${grok}\n\n${gemini}`;
  } else if (grok) {
    body = grok;
  } else if (gemini) {
    body = gemini;
  } else {
    return "";
  }

  // 1行目だけ使う（長い場合）
  const firstLine = body.split("\n")[0].trim();
  if (firstLine.length <= MAX_BODY) {
    body = body.length <= MAX_BODY ? body : firstLine;
  } else {
    body = firstLine.slice(0, MAX_BODY - 3) + "...";
  }

  if (body.length > MAX_BODY) {
    body = body.slice(0, MAX_BODY - 3) + "...";
  }

  const hashtags = " #BTC #TrapDefence";
  const prefix = source === "emergency" ? "🚨 " : source === "regular" ? "📊 " : "🔔 ";
  const text = (prefix + body + hashtags).trim();
  return text.length <= MAX_TWEET_LENGTH ? text : text.slice(0, MAX_TWEET_LENGTH - 3) + "...";
}

/**
 * スニペットを組み立ててXに1ツイート投稿する（cron から配信後に呼ぶ想定）
 * @param {Object} snippet - { grokText, geminiText, source }
 * @returns {Promise<{ id?: string, text?: string }|null>} 投稿結果 or null
 */
async function postSnippetToX(snippet) {
  if (!snippet || (!snippet.grokText && !snippet.geminiText)) {
    return null;
  }

  const text = buildSnippetFromBriefing({
    grokText: snippet.grokText || null,
    geminiText: snippet.geminiText || null,
    source: snippet.source || "minimal",
  });

  if (!text) {
    return null;
  }

  try {
    const result = await postTweet(text);
    console.log("[X Snippet] Posted from briefing:", result?.id);
    return result;
  } catch (e) {
    console.warn("[X Snippet] Post failed:", e?.message || e);
    return null;
  }
}

module.exports = {
  buildSnippetFromBriefing,
  postSnippetToX,
};
