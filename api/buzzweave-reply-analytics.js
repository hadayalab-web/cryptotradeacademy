/**
 * リプライ投稿の集計 API — 過去24時間と過去1週間をそれぞれ分析
 * GET /api/buzzweave-reply-analytics
 * 認証: CRON_SECRET 未設定時は不要。設定時は Bearer または cron_secret クエリ
 */
require("../utils/suppressKnownWarnings");
const { getBuzzweaveReplyAnalytics } = require("../utils/supabase");

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const querySecret = req.query?.cron_secret;
  const authOk = !cronSecret || authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
  if (!authOk) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const now = Date.now();
    const since24h = new Date(now - MS_24H).toISOString();
    const since7d = new Date(now - MS_7D).toISOString();

    const [last24h, last7d] = await Promise.all([
      getBuzzweaveReplyAnalytics(since24h),
      getBuzzweaveReplyAnalytics(since7d)
    ]);

    return res.status(200).json({
      ok: true,
      last24h: {
        since: since24h,
        posts: last24h.posts,
        impressions: last24h.impressions,
        likes: last24h.likes,
        retweets: last24h.retweets,
        quotes: last24h.quotes,
        replies: last24h.replies,
        clicks: last24h.clicks,
        subs: last24h.subs,
        byLang: last24h.byLang
      },
      last7d: {
        since: since7d,
        posts: last7d.posts,
        impressions: last7d.impressions,
        likes: last7d.likes,
        retweets: last7d.retweets,
        quotes: last7d.quotes,
        replies: last7d.replies,
        clicks: last7d.clicks,
        subs: last7d.subs,
        byLang: last7d.byLang
      },
      ts: new Date().toISOString()
    });
  } catch (e) {
    console.error("[buzzweave-reply-analytics] error:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
