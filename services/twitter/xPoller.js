// services/twitter/xPoller.js
const { analyzeMarket } = require('../grok/client');

async function pollXSentiment() {
  const query = '(whale OR dump OR accumulation OR from:whale_alert OR from:saylor) ($BTC OR Bitcoin) min_faves:50 lang:en since:5m';
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=public_metrics`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
  });

  if (!res.ok) {
    console.error('✗ X API error:', await res.text());
    return null;
  }

  const data = await res.json();
  const postsRaw = data.data || [];

  const posts = postsRaw.map(t => ({
    text: t.text,
    likes: t.public_metrics?.like_count || 0,
    rts: t.public_metrics?.retweet_count || 0,
  }));

  if (!posts.length) {
    return {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
      summary: 'No recent BTC posts.',
    };
  }

  const sentiment = await analyzeMarket(posts);

  return {
    whaleBias: sentiment.whaleBias,
    retailFomo: sentiment.retailFomo,
  };
}

module.exports = { pollXSentiment };
