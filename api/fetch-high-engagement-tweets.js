// api/fetch-high-engagement-tweets.js
// A API: 高エンゲージメント投稿を自動抽出（EN）

const X_API_BEARER_TOKEN = process.env.X_API_BEARER_TOKEN;
const X_API_BASE_URL = process.env.X_API_BASE_URL || "https://api.x.com/2";

module.exports = async function handler(req, res) {
  if (!X_API_BEARER_TOKEN) {
    return res.status(500).json({ error: "X_API_BEARER_TOKEN_NOT_SET" });
  }

  try {
    const query = [
      "lang:en",
      "-is:retweet",
      "-is:reply",
      "(has:images OR has:media)"
    ].join(" ");

    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      query,
      max_results: "100",
      "tweet.fields": "public_metrics,created_at,text",
      start_time: startTime,
      sort_order: "recency"
    });

    const response = await fetch(`${X_API_BASE_URL}/tweets/search/recent?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${X_API_BEARER_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: "FAILED_TO_FETCH", detail: errorText });
    }

    const data = await response.json();
    const tweets = data.data || [];

    const scored = tweets
      .map((t) => {
        const m = t.public_metrics || {};
        const score =
          (m.like_count || 0) * 1 +
          (m.retweet_count || 0) * 2 +
          (m.quote_count || 0) * 2 +
          (m.reply_count || 0) * 0.5;
        return {
          id: t.id,
          score,
          text: t.text,
          metrics: m
        };
      })
      .filter((t) => t.score >= 5000)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const SOURCE_TWEET_IDS = scored.map((t) => t.id);
    const SOURCE_TWEET_PRIORITY = scored.reduce((acc, t) => {
      acc[t.id] = t.score;
      return acc;
    }, {});

    return res.status(200).json({ SOURCE_TWEET_IDS, SOURCE_TWEET_PRIORITY });
  } catch (e) {
    return res.status(500).json({ error: "FAILED_TO_FETCH" });
  }
};
