/**
 * BuzzWeave 集中投下ログ: public_metrics ポーリング
 * Vercel Cron または手動で呼び出し。metrics_fetched_at が null のログに対して
 * X API から自分の引用リポストの public_metrics を取得し、buzzweave_post_log に紐づけて保存する。
 */
const { fetchBuzzweavePostLogsPendingMetrics, updateBuzzweavePostLogWithMetrics } = require("../utils/supabase");
const { getTweetMetrics } = require("../services/x/metrics");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {
    const limit = parseInt(req.query?.limit, 10) || 20;
    const minAgeMinutes = parseInt(req.query?.minAgeMinutes, 10) || 5;

    const { ok, rows } = await fetchBuzzweavePostLogsPendingMetrics(limit, minAgeMinutes);
    if (!ok || !rows?.length) {
      return res.status(200).json({
        ok: true,
        message: "No pending metrics",
        updated: 0,
        errors: []
      });
    }

    const results = [];
    const errors = [];
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
        } else {
          errors.push({ tweetId, error: "update failed" });
        }
      } catch (e) {
        errors.push({ tweetId, error: e.message });
      }
    }

    return res.status(200).json({
      ok: true,
      updated: results.length,
      results,
      errors: errors.length ? errors : undefined
    });
  } catch (e) {
    console.error("[buzzweave-metrics-poll]", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
