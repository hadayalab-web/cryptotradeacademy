// scripts/experiment-grok-plus-xapi-one-influencer.js
// 正しい役割分担の実験: Grok で username リスト → X API で user id → tweets 取得 → 実在 tweetId 1件
//
// 使い方: node scripts/experiment-grok-plus-xapi-one-influencer.js
//
// 前提: .env に XAI_API_KEY（Grok）、X API 認証（OAuth 1.0a: X_API_CONSUMER_KEY 等）が設定されていること

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const MODEL = process.env.GROK_MODEL_X_LIVE || 'grok-4-1-fast-reasoning';

function checkEnv() {
  const grok = !!XAI_API_KEY;
  const x = !!(
    process.env.X_API_CONSUMER_KEY &&
    process.env.X_API_CONSUMER_KEY_SECRET &&
    process.env.X_API_ACCESS_TOKEN &&
    process.env.X_API_ACCESS_TOKEN_SECRET
  );
  console.log('');
  console.log('=== 環境変数 ===');
  console.log('  XAI_API_KEY (Grok):', grok ? '✅ 設定済み' : '❌ 未設定');
  console.log('  X API (OAuth 1.0a):', x ? '✅ 設定済み' : '❌ 未設定');
  if (!grok || !x) {
    console.error('');
    console.error('❌ .env に XAI_API_KEY と X API 認証（X_API_CONSUMER_KEY, X_API_CONSUMER_KEY_SECRET, X_API_ACCESS_TOKEN, X_API_ACCESS_TOKEN_SECRET）を設定してください。');
    process.exit(1);
  }
  console.log('');
}

async function grokGetUsernames() {
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You return ONLY valid JSON. No markdown, no code fences. List real, known X (Twitter) usernames of English-language crypto/BTC influencers (e.g. @APompliano, @VitalikButerin, @cz_binance). Return a JSON object with key "usernames" and value an array of 3–5 strings, each without @ (e.g. ["APompliano","VitalikButerin"]).',
      },
      {
        role: 'user',
        content: 'List 3–5 real English crypto/BTC influencer usernames on X. Return JSON: {"usernames": ["name1","name2",...]}',
      },
    ],
    max_tokens: 500,
    temperature: 0.2,
  });
  const text = completion?.choices?.[0]?.message?.content?.trim() || '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/"usernames"\s*:\s*\[[^\]]+\]/);
    if (match) obj = JSON.parse('{' + match[0] + '}');
    else throw new Error('Grok returned invalid JSON: ' + text.slice(0, 200));
  }
  const list = obj.usernames || obj;
  return Array.isArray(list) ? list.map(u => String(u).replace(/^@/, '').trim()).filter(Boolean) : [];
}

async function xApiGetUserTweets(userId) {
  const { xApiRequest } = require('../services/x/client');
  const response = await xApiRequest(`/users/${userId}/tweets`, {
    method: 'GET',
    params: {
      max_results: 10,
      'tweet.fields': 'id,text,created_at,public_metrics',
      exclude: 'replies',
    },
  });
  if (!response || !response.data) throw new Error('No tweets data');
  return response.data;
}

async function main() {
  checkEnv();

  console.log('=== Step 1: Grok で username リスト（3–5件） ===');
  const usernames = await grokGetUsernames();
  if (!usernames.length) {
    console.error('❌ Grok が username を返しませんでした');
    process.exit(1);
  }
  console.log('  usernames:', usernames);
  const username = usernames[0];
  console.log('  採用（1件目）:', username);
  console.log('');

  console.log('=== Step 2: X API で username → user id ===');
  const { getUserByUsername } = require('../services/x/client');
  let user;
  try {
    user = await getUserByUsername(username);
  } catch (e) {
    console.error('  ❌ getUserByUsername 失敗:', e.message);
    process.exit(1);
  }
  const userId = user?.id;
  if (!userId) {
    console.error('  ❌ user.id がありません');
    process.exit(1);
  }
  console.log('  user_id:', userId);
  console.log('');

  console.log('=== Step 3: X API で user の直近ツイート取得 ===');
  let tweets;
  try {
    tweets = await xApiGetUserTweets(userId);
  } catch (e) {
    console.error('  ❌ getUserTweets 失敗:', e.message);
    process.exit(1);
  }
  const list = Array.isArray(tweets) ? tweets : (tweets && tweets.length !== undefined ? tweets : []);
  if (!list.length) {
    console.error('  ❌ ツイートが0件でした');
    process.exit(1);
  }
  const tweet = list[0];
  const tweetId = tweet.id;
  const tweetText = (tweet.text || '').slice(0, 200);
  const pm = tweet.public_metrics || {};
  console.log('  取得件数:', list.length);
  console.log('  1件目 tweetId:', tweetId);
  console.log('  1件目 text:', tweetText + (tweet.text && tweet.text.length > 200 ? '...' : ''));
  console.log('  public_metrics:', pm);
  console.log('');

  const one = {
    username,
    tweetId,
    tweetText,
    lang: 'en',
    engagementRate: 0,
    followerCount: user?.public_metrics?.followers_count || 0,
    recentImpressions: 0,
    public_metrics: pm,
  };

  console.log('=== 結果: 1件（Grok + X API） ===');
  console.log(JSON.stringify(one, null, 2));
  console.log('');

  const outPath = path.join(__dirname, '..', 'docs', 'experiment-grok-xapi-one-result.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(one, null, 2), 'utf-8');
  console.log('✅ 保存: ' + outPath);
  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
