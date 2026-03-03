/**
 * アフィリエイター発見 → 該当投稿をブックマークに追加
 *
 * 仕様（唯一の定義）: docs/AFFILIATE_RECRUIT_BOOKMARK_SPEC.md
 * 対象3条件: (1) 現在活動中のアフィリエイト (2) 案件募集中は除外 (3) 100人以上フォロワー。それ以外は集めない。
 *
 * パイプライン: 検索 → author_id 重複排除 → リツイート除外 → minFollowers フィルタ → 先頭 cap 件をブックマーク。
 * リスト取得は直販のノウハウに合わせる: nextToken ループ、ページ間遅延、402 で打ち切り。
 * 認証: CRON_SECRET または ?dryRun=1。ブックマークは X_API_OAUTH2_USER_ACCESS_TOKEN 必須。
 */
require("../utils/suppressKnownWarnings");
const { fetchOneSearchPage } = require("../services/td/affiliateRecruitSearch");
const { createBookmark, getOAuth2UserId } = require("../services/x/client");
const {
  EN_SEARCH_WINDOW_MINUTES,
  REGION_SEARCH_WINDOW_MINUTES,
  AFFILIATE_RECRUIT_MIN_FOLLOWERS
} = require("../config/affiliateRecruitConfig");

/** 1 run あたりのブックマーク上限。ブックマークは $0.005/件。コスト主因は検索の投稿/ユーザー読み取り。env で 1〜50 の範囲で上書き可。 */
const BOOKMARK_CAP_PER_RUN = Math.min(50, Math.max(1, Number(process.env.AFFILIATE_BOOKMARK_CAP_PER_RUN || 30)));
const BOOKMARK_DELAY_MS = Math.max(500, Number(process.env.AFFILIATE_BOOKMARK_DELAY_MS || 2000));
/** 1言語あたりの検索ページ数。API コスト抑制のため既定 2（2頁で十分候補が取れる）。env で上書き可。 */
const LIST_PAGES_PER_LANG = Math.max(1, Number(process.env.AFFILIATE_BOOKMARK_LIST_PAGES || 2));
/** 検索ページ間遅延（ms）。直販 X_REPLY_SEARCH_DELAY_MS に倣う。 */
const SEARCH_DELAY_MS = Math.max(0, Number(process.env.AFFILIATE_BOOKMARK_SEARCH_DELAY_MS || 2000));
const LANGS_6 = ["en", "es", "pt", "ar", "ja", "ko"];

/** 現在の UTC の 1 時間枠に対応する言語（1 時間ごとに 6 言語ローテ: en→es→pt→ar→ja→ko→en…）。 */
function getLangForHourSlot(now = new Date()) {
  const slotIndex = now.getUTCHours() % LANGS_6.length;
  return LANGS_6[slotIndex];
}

function getWindowMinutes(lang) {
  return lang === "en" ? EN_SEARCH_WINDOW_MINUTES : REGION_SEARCH_WINDOW_MINUTES;
}

/** リツイートを除外（X API はリツイートをブックマーク不可のため） */
function filterOutRetweets(posts) {
  return posts.filter((p) => {
    const refs = p?.referenced_tweets;
    if (!Array.isArray(refs)) return true;
    return !refs.some((r) => String(r?.type || "").toLowerCase() === "retweeted");
  });
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
    ? [getLangForHourSlot(new Date())]
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
  const hasOAuth2UserToken = !!process.env.X_API_OAUTH2_USER_ACCESS_TOKEN;
  const allResults = [];
  const perLang = [];
  /** 1 run で 1 回だけ取得（言語ループの外で保持し /users/me の重複呼び出しを防止） */
  let oauth2UserId = null;

  console.log("[affiliate-recruit-bookmark] run (spec: AFFILIATE_RECRUIT_BOOKMARK_SPEC)", {
    langs,
    minFollowers,
    capPerRun: BOOKMARK_CAP_PER_RUN,
    dryRun: !!dryRun
  });

  try {
    for (const lang of langs) {
      const windowMinutes = getWindowMinutes(lang);
      let allRows = [];
      const usersById = {};
      let nextToken = null;
      let pagesFetched = 0;
      let had402 = false;
      const maxRounds = LIST_PAGES_PER_LANG;

      console.log("[affiliate-recruit-bookmark][list] search start", {
        lang,
        maxRounds,
        windowMinutes
      });

      for (let round = 0; round < maxRounds; round += 1) {
        if (round > 0 && SEARCH_DELAY_MS > 0) {
          await new Promise((r) => setTimeout(r, SEARCH_DELAY_MS));
        }
        if (nextToken === null && pagesFetched > 0) break;

        try {
          const pageResult = await fetchOneSearchPage(lang, {
            maxResults: 100,
            windowMinutes,
            nextToken: nextToken || undefined
          });

          if (pageResult?.fatal402) {
            console.log("[affiliate-recruit-bookmark][list] early exit (search_402)", { lang, rounds: pagesFetched });
            perLang.push({ lang, ok: false, reason: "search_402", pagesFetched });
            had402 = true;
            break;
          }

          const rows = Array.isArray(pageResult?.data) ? pageResult.data : [];
          allRows.push(...rows);
          for (const u of pageResult?.includes?.users || []) {
            if (u?.id) usersById[u.id] = u;
          }
          nextToken = pageResult?.nextToken ?? null;
          pagesFetched += 1;
        } catch (err) {
          const errMsg = String(err?.message || "");
          if (errMsg.includes("402")) {
            perLang.push({ lang, ok: false, reason: "search_402", pagesFetched });
            had402 = true;
            break;
          }
          console.warn("[affiliate-recruit-bookmark][list] fetch failed, stopping pages for this lang", {
            lang,
            round,
            error: err?.message
          });
          break;
        }
      }

      if (had402) continue;

      console.log("[affiliate-recruit-bookmark][list] search done", {
        lang,
        rounds: pagesFetched,
        maxRounds,
        rawRows: allRows.length
      });

      // 同一 author_id は先頭1件のみ残す（直販と同じ重複排除）
      const seenAuthorIds = new Set();
      const rowsDeduped = [];
      for (const row of allRows) {
        const aid = String(row?.author_id || "").trim();
        if (!aid || seenAuthorIds.has(aid)) continue;
        seenAuthorIds.add(aid);
        rowsDeduped.push(row);
      }
      if (rowsDeduped.length < allRows.length) {
        console.log("[affiliate-recruit-bookmark][list] deduped by author_id", {
          lang,
          before: allRows.length,
          after: rowsDeduped.length
        });
      }
      allRows = rowsDeduped;

      const nonRetweets = filterOutRetweets(allRows);
      if (nonRetweets.length < allRows.length) {
        console.log("[affiliate-recruit-bookmark][list] excluded retweets (not bookmarkable)", {
          lang,
          before: allRows.length,
          after: nonRetweets.length
        });
      }
      const credible = filterByMinFollowers(nonRetweets, usersById, minFollowers);
      const tweetIds = [...new Set(credible.map((p) => p?.id).filter(Boolean))];
      const toAdd = tweetIds.slice(0, Math.max(0, BOOKMARK_CAP_PER_RUN - allResults.length));
      const textById = new Map(credible.map((p) => [p?.id, (p?.text || "").slice(0, 120)]));
      perLang.push({
        lang,
        pagesFetched,
        rawRows: allRows.length,
        credibleCount: credible.length,
        minFollowers: minFollowers || null,
        wouldBookmark: toAdd.length
      });

      if (dryRun) continue;
      if (!hasOAuth2UserToken) continue;

      for (const tid of toAdd) {
        if (allResults.length >= BOOKMARK_CAP_PER_RUN) break;
        if (allResults.length > 0) await new Promise((r) => setTimeout(r, BOOKMARK_DELAY_MS));
        if (!oauth2UserId) oauth2UserId = await getOAuth2UserId();
        if (!oauth2UserId) {
          console.warn("[affiliate-recruit-bookmark] getOAuth2UserId failed, skipping remaining bookmarks");
          break;
        }
        const r = await createBookmark(tid, oauth2UserId);
        const preview = textById.get(tid);
        if (preview) console.log("[affiliate-recruit-bookmark] bookmark", { tweet_id: tid, textPreview: preview });
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
    if (!hasOAuth2UserToken) {
      console.log("[affiliate-recruit-bookmark] done (bookmark skipped: X_API_OAUTH2_USER_ACCESS_TOKEN not set)", {
        langs: useAllLangs ? "all" : langs,
        perLang
      });
    } else {
      console.log("[affiliate-recruit-bookmark] done", {
        langs: useAllLangs ? "all" : langs,
        bookmarked,
        failed,
        total: allResults.length,
        minFollowers: minFollowers || null
      });
    }

    const payload = {
      ok: true,
      langs: useAllLangs ? LANGS_6 : langs,
      minFollowers: minFollowers || null,
      bookmarked,
      failed,
      capPerRun: BOOKMARK_CAP_PER_RUN,
      perLang,
      results: allResults
    };
    if (!hasOAuth2UserToken) {
      payload.skippedBookmarkReason =
        "X_API_OAUTH2_USER_ACCESS_TOKEN not set. Run scripts/x-oauth2-get-user-token.js and add the token to Vercel.";
    }
    return res.status(200).json(payload);
  } catch (e) {
    console.error("[affiliate-recruit-bookmark] error:", e?.message);
    return res.status(500).json({
      ok: false,
      reason: "error",
      error: e?.message || "Unknown error"
    });
  }
};
