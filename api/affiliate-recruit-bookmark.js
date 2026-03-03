/**
 * アフィリエイター発見 → 該当投稿をブックマークに追加
 *
 * 候補条件（運用指示）:
 * 1. アフィリエイターとして活動中（検索クエリで発見）
 * 2. 案件を募集中（open to collab / DM for business 等を除外しない）
 * 3. フォロワー100人以上
 *
 * 使い方:
 * - ?lang=rotate または Cron で呼び出し（lang なし）… 15分枠から言語を自動選択し1言語のみ実行（15分ごと1言語ローテ、15分間に3回転想定）
 * - ?lang=en | es | pt | ar | ja | ko … 指定言語のみ
 * - ?lang=all … 6言語を順に検索し、条件を満たす投稿をブックマーク（合計 cap まで）
 * 認証: CRON_SECRET または ?dryRun=1 でブックマークせず検索結果のみ返す。
 * 制限: X API ブックマーク 50/15分。
 */
require("../utils/suppressKnownWarnings");
const { fetchOneSearchPage } = require("../services/td/affiliateRecruitSearch");
const { createBookmark } = require("../services/x/client");
const {
  EN_SEARCH_WINDOW_MINUTES,
  REGION_SEARCH_WINDOW_MINUTES,
  AFFILIATE_RECRUIT_MIN_FOLLOWERS
} = require("../config/affiliateRecruitConfig");

// 上限はXの制限（50/15分）のみ。環境変数で上書き可。
const BOOKMARK_CAP_PER_RUN = Math.min(50, Math.max(1, Number(process.env.AFFILIATE_BOOKMARK_CAP_PER_RUN || 50)));
const BOOKMARK_DELAY_MS = Math.max(500, Number(process.env.AFFILIATE_BOOKMARK_DELAY_MS || 2000));
const LANGS_6 = ["en", "es", "pt", "ar", "ja", "ko"];

/** 現在の UTC の 15分枠に対応する言語（15分ごと1言語ローテ）。 */
function getLangFor15MinSlot(now = new Date()) {
  const hour = now.getUTCHours();
  const min = now.getUTCMinutes();
  const slotIndex = (hour * 4 + Math.floor(min / 15)) % LANGS_6.length;
  return LANGS_6[slotIndex];
}

function getWindowMinutes(lang) {
  return lang === "en" ? EN_SEARCH_WINDOW_MINUTES : REGION_SEARCH_WINDOW_MINUTES;
}

function filterByMinFollowers(posts, usersById, minFollowers) {
  if (!minFollowers || minFollowers <= 0) return posts;
  return posts.filter((p) => {
    const u = usersById[p?.author_id];
    const followers = Number(u?.public_metrics?.followers_count) || 0;
    return followers >= minFollowers;
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dryRun = req.query?.dryRun === "1" || req.body?.dryRun === true;
  const auth =
    (process.env.CRON_SECRET && req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`) ||
    req.query?.secret === process.env.CRON_SECRET;

  const langParam = String(req.query?.lang || req.body?.lang || "").trim().toLowerCase();
  const useRotate = langParam === "rotate" || langParam === "";
  const useAllLangs = langParam === "all";
  const langs = useRotate
    ? [getLangFor15MinSlot(new Date())]
    : useAllLangs
      ? LANGS_6
      : [["en", "ar", "es", "pt", "ja", "ko"].includes(langParam) ? langParam : "en"];

  if (!auth && !dryRun) {
    return res.status(401).json({
      ok: false,
      reason: "unauthorized",
      message: "CRON_SECRET required, or use dryRun=1 to only fetch search results"
    });
  }

  const minFollowers = Math.max(0, Number(AFFILIATE_RECRUIT_MIN_FOLLOWERS ?? 100));
  const allResults = [];
  const perLang = [];

  try {
    for (const lang of langs) {
      const windowMinutes = getWindowMinutes(lang);
      const pageResult = await fetchOneSearchPage(lang, {
        maxResults: 100,
        windowMinutes,
        nextToken: undefined
      });

      if (pageResult?.fatal402) {
        perLang.push({ lang, ok: false, reason: "search_402" });
        continue;
      }

      const posts = Array.isArray(pageResult?.data) ? pageResult.data : [];
      const usersById = {};
      for (const u of pageResult?.includes?.users || []) {
        if (u?.id) usersById[u.id] = u;
      }
      const credible = filterByMinFollowers(posts, usersById, minFollowers);
      const tweetIds = [...new Set(credible.map((p) => p?.id).filter(Boolean))];
      const toAdd = tweetIds.slice(0, Math.max(0, BOOKMARK_CAP_PER_RUN - allResults.length));
      perLang.push({
        lang,
        postsFound: posts.length,
        credibleCount: credible.length,
        minFollowers: minFollowers || null,
        wouldBookmark: toAdd.length
      });

      if (dryRun) continue;

      for (const tid of toAdd) {
        if (allResults.length >= BOOKMARK_CAP_PER_RUN) break;
        if (allResults.length > 0) await new Promise((r) => setTimeout(r, BOOKMARK_DELAY_MS));
        const r = await createBookmark(tid);
        allResults.push({ lang, tweet_id: tid, ok: r.ok, error: r.error || null });
        if (!r.ok && (r.error || "").includes("429")) {
          console.warn("[affiliate-recruit-bookmark] rate limit (429), stopping");
          break;
        }
      }
      if (allResults.length >= BOOKMARK_CAP_PER_RUN) break;
    }

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        langs: useAllLangs ? LANGS_6 : langs,
        minFollowers: minFollowers || null,
        perLang,
        wouldBookmarkTotal: perLang.reduce((s, p) => s + (p.wouldBookmark || 0), 0),
        capPerRun: BOOKMARK_CAP_PER_RUN
      });
    }

    const bookmarked = allResults.filter((r) => r.ok).length;
    const failed = allResults.filter((r) => !r.ok).length;
    console.log("[affiliate-recruit-bookmark] done", {
      langs: useAllLangs ? "all" : langs,
      bookmarked,
      failed,
      total: allResults.length,
      minFollowers: minFollowers || null
    });

    return res.status(200).json({
      ok: true,
      langs: useAllLangs ? LANGS_6 : langs,
      minFollowers: minFollowers || null,
      bookmarked,
      failed,
      capPerRun: BOOKMARK_CAP_PER_RUN,
      perLang,
      results: allResults
    });
  } catch (e) {
    console.error("[affiliate-recruit-bookmark] error:", e?.message);
    return res.status(500).json({
      ok: false,
      reason: "error",
      error: e?.message || "Unknown error"
    });
  }
};
