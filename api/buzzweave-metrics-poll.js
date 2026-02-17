/**
 * ML-PQT ログ/データ管理（統合）
 * (1) buzzweave_post_log の public_metrics ポーリング (2) MV 更新 + lang_penalty 書き込み
 * Vercel Cron 15分ごと。手動では ?skipRefresh=1 で MV 更新のみスキップ可。
 */
require("../utils/suppressKnownWarnings");
const { fetchBuzzweavePostLogsPendingMetrics, updateBuzzweavePostLogWithMetrics } = require("../utils/supabase");
const { getTweetMetrics } = require("../services/x/metrics");
const { runRefreshChainRaidMv } = require("./refresh-chain-raid-mv");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  const limit = parseInt(req.query?.limit, 10) || 20;
  const minAgeMinutes = parseInt(req.query?.minAgeMinutes, 10) || 5;
  const skipRefresh = req.query?.skipRefresh === "1";
  console.log("[buzzweave-metrics-poll] start limit=" + limit + " minAgeMinutes=" + minAgeMinutes + " skipRefresh=" + skipRefresh);

  try {
    // (1) メトリクスポール
    const { ok, rows } = await fetchBuzzweavePostLogsPendingMetrics(limit, minAgeMinutes);
    let updated = 0;
    const results = [];
    const errors = [];

    if (ok && rows?.length) {
      console.log("[buzzweave-metrics-poll] pending rows=" + rows.length + ", fetching X metrics");
      for (const row of rows) {
        const tweetId = row.our_tweet_id;
        if (!tweetId) continue;
        try {
          const data = await getTweetMetrics(tweetId, true);
          const pm = data?.publicMetrics || {};
          const impressions =
            data?.nonPublicMetrics?.impression_count ??
            data?.organicMetrics?.impression_count ??
            pm.impression_count ??
            null;
          const metrics = {
            impressions: impressions ?? null,
            likes: pm.like_count ?? null,
            retweets: pm.retweet_count ?? null,
            quotes: pm.quote_count ?? null,
            replies: pm.reply_count ?? null
          };
          const update = await updateBuzzweavePostLogWithMetrics(tweetId, metrics);
          if (update.ok) {
            results.push({ tweetId, ...metrics });
            updated++;
          } else {
            errors.push({ tweetId, error: "update failed" });
          }
        } catch (e) {
          errors.push({ tweetId, error: e.message });
        }
      }
      console.log("[buzzweave-metrics-poll] metrics done updated=" + updated + " errors=" + errors.length);
    } else {
      console.log("[buzzweave-metrics-poll] no pending metrics, rows=" + (rows?.length ?? 0));
    }

    // (2) MV 更新 + lang_penalty（skipRefresh でスキップ可）
    let mv = { ok: true, penalty_keys: 0 };
    if (!skipRefresh) {
      mv = await runRefreshChainRaidMv();
    }

    return res.status(200).json({
      ok: true,
      updated,
      results: results.length ? results : undefined,
      errors: errors.length ? errors : undefined,
      mv: mv.ok ? { refreshed: true, penalty_keys: mv.penalty_keys } : { error: mv.error }
    });
  } catch (e) {
    console.error("[buzzweave-metrics-poll] error:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
