#!/usr/bin/env node
/**
 * 6言語圏（EN/ES/PT/AR/KO/JA）で X 検索を実行し、
 * 直近窓内の「投稿数」と「ユニークアカウント数」を集計する。
 * アフィリエイター候補の相対的なプール規模の事前調査用。
 *
 * 前提: X_API_BEARER_TOKEN が設定されていること。
 * 参照: docs/AFFILIATE_SCOUT_6LANG_MARKET_SIZING.md
 *
 * 実行: node scripts/survey-affiliate-pool-by-lang.js
 * 言語指定: node scripts/survey-affiliate-pool-by-lang.js ja
 *         node scripts/survey-affiliate-pool-by-lang.js en ja ko
 */

const { loadEnv } = require("../utils/loadEnv");
loadEnv();

const { fetchCandidatesFromSearch } = require("../services/td/affiliateRecruitSearch");
const AFFILIATE_SCOUT_LANGS = ["en", "es", "pt", "ar", "ko", "ja"];

const WINDOW_MINUTES = Math.max(10, parseInt(process.env.SURVEY_WINDOW_MINUTES || "30", 10));
const MAX_RESULTS = Math.min(100, Math.max(20, parseInt(process.env.SURVEY_MAX_RESULTS || "50", 10)));
const PAGES_PER_BUCKET = Math.max(1, parseInt(process.env.SURVEY_PAGES_PER_BUCKET || "2", 10));

const langsToRun = process.argv.slice(2).map((s) => s.toLowerCase().trim()).filter((s) => AFFILIATE_SCOUT_LANGS.includes(s));
const surveyLangs = langsToRun.length > 0 ? langsToRun : AFFILIATE_SCOUT_LANGS;

async function runSurvey() {
  console.log("--- アフィリエイター候補プール調査（X 検索サンプル） ---\n");
  console.log(`言語: ${surveyLangs.join(", ")}`);
  console.log(`窓: 直近 ${WINDOW_MINUTES} 分 | maxResults=${MAX_RESULTS} | pagesPerBucket=${PAGES_PER_BUCKET}\n`);

  const results = [];

  for (const lang of surveyLangs) {
    try {
      const searchResult = await fetchCandidatesFromSearch(lang, {
        windowMinutes: WINDOW_MINUTES,
        maxResults: MAX_RESULTS,
        pagesPerBucket: PAGES_PER_BUCKET,
        sortOrder: "recency",
      });

      if (searchResult.fatal402) {
        console.warn(`[${lang}] X API 402 - スキップ`);
        results.push({ lang, posts: 0, unique_authors: 0, error: "402" });
        continue;
      }

      const data = searchResult.data || [];
      const authorIds = new Set(data.map((p) => p.author_id).filter(Boolean));
      const uniqueAuthors = authorIds.size;

      results.push({
        lang,
        posts: data.length,
        unique_authors: uniqueAuthors,
        window_minutes: searchResult.windowMinutesUsed ?? WINDOW_MINUTES,
      });

      console.log(`  ${lang}: posts=${data.length}, unique_authors=${uniqueAuthors}`);
    } catch (e) {
      console.warn(`  ${lang}: error`, e?.message || e);
      results.push({ lang, posts: 0, unique_authors: 0, error: String(e?.message || e) });
    }
  }

  console.log("\n--- サマリー ---");
  const totalPosts = results.reduce((s, r) => s + (r.posts || 0), 0);
  const totalAuthors = results.reduce((s, r) => s + (r.unique_authors || 0), 0);
  console.log(`合計 投稿数: ${totalPosts}`);
  console.log(`合計 ユニークアカウント数: ${totalAuthors}`);

  const byLang = results.reduce((acc, r) => {
    acc[r.lang] = { posts: r.posts || 0, unique_authors: r.unique_authors || 0 };
    return acc;
  }, {});
  console.log("\nJSON（コピー用）:");
  console.log(JSON.stringify(byLang, null, 2));

  return results;
}

runSurvey().catch((e) => {
  console.error(e);
  process.exit(1);
});
