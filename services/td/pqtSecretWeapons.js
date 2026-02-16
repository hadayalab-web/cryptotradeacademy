/**
 * Grok Secret Weapons のフォーマット適用（config/grokSecretWeapons.json 準拠）
 * - Link on new line（リンクの後にテキストなし、15% click lift）
 * - No final period（CTA 末尾の 。!? を削除）
 * - 字数制限なし（X Premium 想定。旧 89-99 chars は廃止）
 * - Mirror vocab: 引用元から 2-3 語を抽出
 */

const STOPWORDS_EN = new Set(["the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "in", "on", "at", "for", "with", "this", "that", "it", "be", "have", "has", "if", "or", "as", "by", "from", "https", "http", "rt"]);
const STOPWORDS_JA = new Set(["の", "に", "は", "を", "た", "が", "で", "と", "し", "れ", "さ", "ある", "いる", "も", "する", "から", "な", "こと", "として", "い", "や", "れる", "など", "なった", "ない", "その", "あれ", "それ"]);
const MAX_MIRROR_WORDS = 3;
const MIN_WORD_LEN = 2;

/**
 * 引用文から 2-3 語を抽出（Mirror vocab: semantic match で relevance 向上）
 * @param {string} quotedText
 * @param {string} [lang]
 * @returns {string} "word1 word2" or ""
 */
function extractMirrorWords(quotedText, lang = "en") {
  if (!quotedText || typeof quotedText !== "string") return "";
  const stop = lang === "ja" ? STOPWORDS_JA : STOPWORDS_EN;
  const normalized = quotedText.replace(/\s+/g, " ").trim();
  const tokens = lang === "ja"
    ? normalized.split(/(?=[\s\u3000])|(?<=[\s\u3000])/).filter(Boolean).filter((t) => t.trim().length >= MIN_WORD_LEN && !stop.has(t.trim()))
    : normalized.split(/\s+/).filter((w) => w.length >= MIN_WORD_LEN && !stop.has(w.toLowerCase()));
  const words = [];
  for (const w of tokens) {
    const clean = w.replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/gi, "").trim();
    if (clean.length >= MIN_WORD_LEN && words.length < MAX_MIRROR_WORDS) words.push(clean);
    if (words.length >= MAX_MIRROR_WORDS) break;
  }
  return words.slice(0, MAX_MIRROR_WORDS).join(" ").trim();
}

/**
 * ビルド済み PQT 本文に Secret Weapons フォーマットを適用
 * - リンクを最後の行に単独で置く（その後にテキストなし）
 * - リンク直前の行の末尾 . ! ? を削除
 * - 字数制限なし（X Premium）
 * @param {string} text - テンプレ出力（… → ${link} を含む）
 * @param {string} link
 * @returns {string}
 */
function applySecretWeaponsFormat(text, link) {
  if (!text || !link) return text;
  const linkStr = String(link).trim();
  if (!text.includes(linkStr)) return text;
  let body = text.split(linkStr)[0].replace(/\s*→\s*$/, "").trim();
  const lastLineIdx = body.lastIndexOf("\n");
  const lastLine = lastLineIdx >= 0 ? body.slice(lastLineIdx + 1) : body;
  const trimmed = lastLine.replace(/[.!?。．！？]+$/, "").trim();
  body = lastLineIdx >= 0 ? body.slice(0, lastLineIdx + 1) + trimmed : trimmed;
  return body + "\n\n" + linkStr;
}

module.exports = {
  extractMirrorWords,
  applySecretWeaponsFormat
};
