// services/x/textSanitizer.js
// 引用リポストの本文を「2行＋空行＋URL」に強制整形するレイヤー
// Trap Defence OS 投稿生成の sanitize レイヤー（意図した尺で100%固定）

/**
 * 引用リポスト本文を2行に強制し、不可視文字・改行乱れを除去
 * @param {string} body - 生の本文（Grok生成・キャッシュ・CORE_PHRASES）
 * @returns {string} 最大2行の本文（末尾改行なし）
 */
function sanitizeQuoteBody(body) {
  if (body == null || typeof body !== "string") return "";

  return body
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // 不可視文字削除
    .replace(/\r\n/g, "\n") // 改行コード統一
    .replace(/\n{2,}/g, "\n") // 連続改行を1つに
    .replace(/[ \t]+$/gm, "") // 行末スペース削除
    .trim() // 前後の空白削除
    .split("\n")
    .slice(0, 2) // 2行に強制
    .join("\n");
}

/**
 * URL（YouTube等）から不可視文字を除去
 * @param {string} url - 生のURL
 * @returns {string} トリム・不可視文字除去済みURL
 */
function sanitizeUrl(url) {
  if (url == null || typeof url !== "string") return "";
  return url
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, ""); // 不可視文字削除
}

/**
 * 投稿文を「2行＋空行＋URL」の固定構造で組み立て（buildQuoteForYouTubeOgp の前段に使用）
 * @param {string} body - 本文（sanitizeQuoteBody 済み推奨）
 * @param {string} url - URL（sanitizeUrl 済み推奨）
 * @returns {string} 最終投稿文
 */
function buildFinalPostText(body, url) {
  const cleanBody = sanitizeQuoteBody(body);
  const cleanUrl = sanitizeUrl(url);
  if (!cleanBody && !cleanUrl) return "";
  if (!cleanUrl) return cleanBody;
  if (!cleanBody) return cleanUrl;
  return `${cleanBody}\n\n${cleanUrl}`;
}

module.exports = {
  sanitizeQuoteBody,
  sanitizeUrl,
  buildFinalPostText
};
