#!/usr/bin/env node
/**
 * アフィリエイターが実際に使っているキーワードを X 検索から抽出する。
 * シードクエリ（確実な「アフィリ案件募集」系）で検索し、投稿テキストの単語頻度を集計。
 * 出力を SEARCH_KEYWORDS_BY_LANG の候補として利用できる。
 *
 * 実行: node scripts/discover-affiliate-keywords.js
 * 言語指定: node scripts/discover-affiliate-keywords.js ja en
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { searchPostsRecent } = require("../services/x/client");

// シード: アフィリ案件・募集を示す確実な語（各言語）
const SEED_QUERIES_BY_LANG = {
  en: ["affiliate program", "looking for affiliates", "affiliate recruitment"],
  ja: ["アフィリエイター募集", "アフィリ案件", "アフィリエイト募集"],
  es: ["programa de afiliados", "buscamos afiliados", "afiliados"],
  pt: ["programa de afiliados", "afiliados", "parceiros"],
  ko: ["제휴 프로그램", "제휴마케팅", "제휴사 모집"],
  ar: ["برنامج الإحالة", "شركاء", "إحالة"]
};

// 除外する語（ストップワード）
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these",
  "those", "it", "its", "i", "you", "he", "she", "we", "they", "my", "your", "our", "their",
  "rt", "amp", "https", "http", "com", "t co",
  "の", "に", "は", "を", "た", "が", "で", "し", "れ", "さ", "ある", "いる", "なる", "する",
  "el", "la", "los", "las", "de", "en", "que", "y", "a", "por", "con", "para", "es", "un"
]);

function extractWords(text) {
  if (!text || typeof text !== "string") return [];
  const normalized = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/@\w+/g, " ")
    .replace(/#(\w+)/g, " $1 ") // ハッシュタグは語として保持
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase();
  return normalized.split(/\s+/).filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/#(\w+)/g) || [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

async function searchWithSeed(lang, seed, maxResults = 50) {
  const query = `"${seed}" lang:${lang} -is:retweet -is:reply`;
  // end_time は30秒以上前である必要あり。秒単位で指定。
  const endTime = new Date(Date.now() - 60 * 1000);
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 直近24時間
  const toSecondGranularity = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  try {
    const res = await searchPostsRecent(query, {
      maxResults,
      startTime: toSecondGranularity(startTime),
      endTime: toSecondGranularity(endTime),
      sortOrder: "recency"
    });
    return res?.data || [];
  } catch (e) {
    console.warn(`[${lang}] search error for "${seed}":`, e?.message?.slice(0, 100));
    return [];
  }
}

async function discoverForLang(lang, options = {}) {
  const seeds = SEED_QUERIES_BY_LANG[lang] || SEED_QUERIES_BY_LANG.en;
  const maxPerSeed = options.maxPerSeed || 30;
  const topN = options.topN || 40;

  const allPosts = [];
  for (const seed of seeds) {
    const posts = await searchWithSeed(lang, seed, maxPerSeed);
    allPosts.push(...posts);
    await new Promise((r) => setTimeout(r, 500)); // レート制限対策
  }

  const wordCounts = {};
  const hashtagCounts = {};
  for (const post of allPosts) {
    const text = post?.text || "";
    for (const w of extractWords(text)) wordCounts[w] = (wordCounts[w] || 0) + 1;
    for (const h of extractHashtags(text)) hashtagCounts[h] = (hashtagCounts[h] || 0) + 1;
  }

  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w, c]) => ({ word: w, count: c }));

  const sortedHashtags = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([h, c]) => ({ tag: h, count: c }));

  return {
    lang,
    postsFound: allPosts.length,
    topWords: sortedWords,
    topHashtags: sortedHashtags,
    sampleTexts: allPosts.slice(0, 5).map((p) => (p?.text || "").slice(0, 120))
  };
}

async function main() {
  const langs = process.argv.slice(2).map((s) => s.toLowerCase());
  const targetLangs = langs.length > 0 ? langs : Object.keys(SEED_QUERIES_BY_LANG);

  console.log("--- アフィリエイター発見用キーワード調査 ---\n");
  console.log("シードクエリ（確実な募集系）で検索し、実際に使われている語を抽出\n");

  for (const lang of targetLangs) {
    const result = await discoverForLang(lang);
    console.log(`\n## ${lang} (posts: ${result.postsFound})`);
    console.log("【高頻度ワード】");
    console.log(result.topWords.map((x) => `${x.word}(${x.count})`).join(", "));
    console.log("\n【ハッシュタグ】");
    console.log(result.topHashtags.map((x) => `#${x.tag}(${x.count})`).join(", "));
    if (result.sampleTexts.some((t) => t)) {
      console.log("\n【投稿サンプル】");
      result.sampleTexts.forEach((t, i) => t && console.log(`  ${i + 1}. ${t}...`));
    }
  }

  console.log("\n--- 完了。上記の高頻度ワードを affiliateRecruitSearch.js の SEARCH_KEYWORDS_BY_LANG に反映検討 ---");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
