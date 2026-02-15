/**
 * Trap Defence OS: 実測データ収集 — metrics fetcher
 * Cron 5分ごとに実行。tweet_queue から未処理を取得し、
 * X API /2/tweets/:id で public_metrics を取得して tweet_metrics に保存
 */
require("../utils/suppressKnownWarnings");

const { getTweetMetrics } = require("../services/x/metrics");
const {
  fetchUnprocessedQueue,
  markQueueProcessed,
  insertTweetMetrics,
  updateChainRaidPostKpiWithMetrics
} = require("../utils/supabase");

/** Vidalytics API（stub: 将来実装） */
async function fetchVidalyticsMetrics(/* tweetId, vidLinkId */) {
  return { clicks: null, unique: null, watchTime: null, completion: null };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const runId = `mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[MetricsFetcher] Start ${runId}`);

  const { rows } = await fetchUnprocessedQueue(50);
  if (!rows || rows.length === 0) {
    console.log(`[MetricsFetcher] No unprocessed queue`);
    return res.status(200).json({ ok: true, processed: 0, runId });
  }

  let processed = 0;
  const errors = [];

  for (const row of rows) {
    const { id, tweet_id, lang, vid_link_kind } = row;
    try {
      const metrics = await getTweetMetrics(tweet_id, true, { maxRetries: 2 });
      const pm = metrics?.publicMetrics || {};
      const impressionCount =
        metrics?.nonPublicMetrics?.impression_count ??
        metrics?.organicMetrics?.impression_count ??
        null;

      const vid = await fetchVidalyticsMetrics(tweet_id, vid_link_kind);

      const { error } = await insertTweetMetrics({
        tweet_id,
        lang,
        created_at: metrics?.createdAt || null,
        impressions: impressionCount,
        likes: pm.like_count ?? null,
        retweets: pm.retweet_count ?? null,
        quotes: pm.quote_count ?? null,
        replies: pm.reply_count ?? null,
        vid_link_kind,
        vid_clicks: vid.clicks,
        vid_unique: vid.unique,
        vid_watch_time: vid.watchTime,
        vid_completion: vid.completion
      });

      if (error) throw new Error(error);
      await markQueueProcessed(id);
      processed++;
      await updateChainRaidPostKpiWithMetrics(tweet_id, {
        impressions: impressionCount ?? null,
        link_clicks: vid.clicks ?? null,
        replies: pm.reply_count ?? null,
        reposts: pm.retweet_count ?? null
      });
      console.log(`[MetricsFetcher] ✅ ${tweet_id} impressions=${impressionCount}`);
    } catch (e) {
      console.warn(`[MetricsFetcher] ⚠️ ${tweet_id}: ${e.message}`);
      errors.push({ tweet_id, error: e.message });
      // 削除済み/非公開ツイートは processed にして再試行しない
      if (e.message?.includes("not found") || e.message?.includes("deleted")) {
        await markQueueProcessed(id);
      }
    }
  }

  console.log(`[MetricsFetcher] Done ${runId} processed=${processed}`);
  return res.status(200).json({
    ok: true,
    processed,
    total: rows.length,
    errors: errors.length > 0 ? errors : undefined,
    runId
  });
};
