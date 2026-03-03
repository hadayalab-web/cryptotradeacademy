#!/usr/bin/env node
/**
 * アフィリエイトリクルート検索クエリの一覧出力
 * 使い方: node scripts/affiliate-recruit-queries.js
 * 環境: AFFILIATE_RECRUIT_SINGLE_QUERY=1（既定）で 1 言語 1 本＋緩和フォールバック
 */
const { buildSearchQueries } = require("../services/td/affiliateRecruitSearch");

const LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const MAX_CHARS = 512;

console.log("=== アフィリエイトリクルート 検索クエリ一覧 ===\n");

for (const lang of LANGS) {
  const queries = buildSearchQueries(lang);
  console.log(`--- ${lang.toUpperCase()} ---`);
  if (!queries || queries.length === 0) {
    console.log("  (なし)\n");
    continue;
  }
  queries.forEach((q, i) => {
    const label = i === 0 ? "primary" : `fallback${i}`;
    const len = q.length;
    const ok = len <= MAX_CHARS ? "OK" : "OVER";
    console.log(`  [${label}] (${len} chars, ${ok})`);
    console.log(`  ${q}`);
    console.log("");
  });
  console.log("");
}

console.log("--- 補足 ---");
console.log("  primary: リスト取得の先頭で使用。2グループ OR/AND + lang + -is:retweet -is:reply + 除外語");
console.log("  fallback: primary が 0〜2 件のときのみ使用（LOW_HIT_FALLBACK_THRESHOLD）");
console.log("  検索窓: EN は EN_SEARCH_WINDOW_MIN（分）、地域は REGION_SEARCH_WINDOW_MIN（分）で run 側が指定");
