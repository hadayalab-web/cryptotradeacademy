// scripts/compare-gemini-grok-xapi-verification.js
// Gemini 10件 + Grok 10件 を X API で検証し、単独 vs 併用の最適解を比較する
// 使い方: node scripts/compare-gemini-grok-xapi-verification.js
//
// 前提: .env に GEMINI_API_KEY, XAI_API_KEY, X API 認証が設定されていること

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const GROK_MODEL = process.env.GROK_MODEL_X_LIVE || 'grok-4-1-fast-reasoning';

const { getUserByUsername, xApiRequest } = require('../services/x/client');

function checkEnv() {
  const hasGemini = !!GEMINI_API_KEY;
  const hasGrok = !!XAI_API_KEY;
  const hasX = !!(
    process.env.X_API_CONSUMER_KEY &&
    process.env.X_API_CONSUMER_KEY_SECRET &&
    process.env.X_API_ACCESS_TOKEN &&
    process.env.X_API_ACCESS_TOKEN_SECRET
  );
  console.log('');
  console.log('=== 環境変数 ===');
  console.log('  GEMINI_API_KEY:', hasGemini ? '✅' : '❌');
  console.log('  XAI_API_KEY (Grok):', hasGrok ? '✅' : '❌');
  console.log('  X API (OAuth 1.0a):', hasX ? '✅' : '❌');
  if (!hasGemini || !hasGrok || !hasX) {
    console.error('❌ 上記のいずれかが未設定です');
    process.exit(1);
  }
  console.log('');
}

/** Gemini から 10 件の username を取得（en） */
async function fetchGeminiUsernames() {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `Return ONLY a JSON object. No markdown, no code fences, no explanation.
Key: "usernames". Value: array of exactly 10 real X (Twitter) usernames of English-language crypto/BTC influencers (e.g. APompliano, VitalikButerin, cz_binance). Each string without @.
Example: {"usernames": ["APompliano","VitalikButerin","cz_binance","saylor","aantonop","ErikVoorhees","cobie","DocumentingBTC","100trillionUSD","Loomdart"]}`;
  const result = await model.generateContent(prompt);
  const text = (result.response && result.response.text()) || '';
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/"usernames"\s*:\s*\[[^\]]+\]/);
    if (match) obj = JSON.parse('{' + match[0] + '}');
    else throw new Error('Gemini invalid JSON: ' + text.slice(0, 200));
  }
  const list = obj.usernames || obj;
  return Array.isArray(list)
    ? list.slice(0, 10).map((u) => String(u).replace(/^@/, '').trim()).filter(Boolean)
    : [];
}

/** Grok から 10 件の username を取得（en） */
async function fetchGrokUsernames() {
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  const completion = await client.chat.completions.create({
    model: GROK_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You return ONLY valid JSON. No markdown, no code fences. Key "usernames", value array of exactly 10 real X (Twitter) usernames of English crypto/BTC influencers, each without @ (e.g. ["APompliano","VitalikButerin"]).',
      },
      {
        role: 'user',
        content: 'List exactly 10 real English crypto/BTC influencer usernames on X. Return JSON: {"usernames": ["name1","name2",...,"name10"]}',
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
    else throw new Error('Grok invalid JSON: ' + text.slice(0, 200));
  }
  const list = obj.usernames || obj;
  return Array.isArray(list)
    ? list.slice(0, 10).map((u) => String(u).replace(/^@/, '').trim()).filter(Boolean)
    : [];
}

/** 1 username を X API で検証: user 存在 + 直近ツイート 1 件以上 */
async function verifyUsername(username) {
  try {
    const user = await getUserByUsername(username);
    const userId = user?.id;
    if (!userId) return { ok: false, reason: 'no_user_id' };
    const response = await xApiRequest(`/users/${userId}/tweets`, {
      method: 'GET',
      params: {
        max_results: 5,
        'tweet.fields': 'id,text,created_at,public_metrics',
        exclude: 'replies',
      },
    });
    const tweets = response?.data;
    const hasTweets = Array.isArray(tweets) && tweets.length > 0;
    const firstTweetId = hasTweets ? tweets[0].id : null;
    return { ok: true, userExists: true, hasTweets, firstTweetId, userId };
  } catch (e) {
    return { ok: false, reason: e.message || 'error' };
  }
}

/** 複数 username を検証し、結果サマリを返す */
async function verifyUsernames(usernames, label) {
  const results = [];
  let userExistsCount = 0;
  let hasTweetsCount = 0;
  for (const u of usernames) {
    const r = await verifyUsername(u);
    results.push({ username: u, ...r });
    if (r.userExists) userExistsCount++;
    if (r.hasTweets) hasTweetsCount++;
  }
  return {
    label,
    usernames,
    results,
    total: usernames.length,
    userExistsCount,
    hasTweetsCount,
  };
}

function unique(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    const key = (x && String(x)).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  checkEnv();

  console.log('=== 1. Gemini (gemini-3-pro-preview) で 10 件取得 ===');
  let geminiList = [];
  try {
    geminiList = await fetchGeminiUsernames();
    console.log('  usernames:', geminiList);
  } catch (e) {
    console.error('  ❌', e.message);
    process.exit(1);
  }
  if (geminiList.length === 0) {
    console.error('  ❌ Gemini が 0 件返しました');
    process.exit(1);
  }
  console.log('');

  console.log('=== 2. Grok (grok-4-1-fast-reasoning) で 10 件取得 ===');
  let grokList = [];
  try {
    grokList = await fetchGrokUsernames();
    console.log('  usernames:', grokList);
  } catch (e) {
    console.error('  ❌', e.message);
    process.exit(1);
  }
  if (grokList.length === 0) {
    console.error('  ❌ Grok が 0 件返しました');
    process.exit(1);
  }
  console.log('');

  console.log('=== 3. X API で Gemini 10 件を検証 ===');
  const geminiVerification = await verifyUsernames(geminiList, 'Gemini');
  console.log(`  user 存在: ${geminiVerification.userExistsCount}/${geminiVerification.total}`);
  console.log(`  ツイート1件以上: ${geminiVerification.hasTweetsCount}/${geminiVerification.total}`);
  console.log('');

  console.log('=== 4. X API で Grok 10 件を検証 ===');
  const grokVerification = await verifyUsernames(grokList, 'Grok');
  console.log(`  user 存在: ${grokVerification.userExistsCount}/${grokVerification.total}`);
  console.log(`  ツイート1件以上: ${grokVerification.hasTweetsCount}/${grokVerification.total}`);
  console.log('');

  const combinedRaw = unique([...geminiList, ...grokList]);
  const overlapCount = geminiList.length + grokList.length - combinedRaw.length;
  console.log('=== 5. 併用: 両リストの合併（重複除く） ===');
  console.log(`  Gemini 10 + Grok 10 → 重複 ${overlapCount} 件 → ユニーク ${combinedRaw.length} 件`);
  console.log('  X API で合併リストを検証...');
  const combinedVerification = await verifyUsernames(combinedRaw, 'Combined');
  console.log(`  user 存在: ${combinedVerification.userExistsCount}/${combinedVerification.total}`);
  console.log(`  ツイート1件以上: ${combinedVerification.hasTweetsCount}/${combinedVerification.total}`);
  console.log('');

  const report = {
    runAt: new Date().toISOString(),
    gemini: {
      model: GEMINI_MODEL,
      requested: 10,
      usernames: geminiList,
      userExistsCount: geminiVerification.userExistsCount,
      hasTweetsCount: geminiVerification.hasTweetsCount,
    },
    grok: {
      model: GROK_MODEL,
      requested: 10,
      usernames: grokList,
      userExistsCount: grokVerification.userExistsCount,
      hasTweetsCount: grokVerification.hasTweetsCount,
    },
    combined: {
      uniqueCount: combinedRaw.length,
      overlapCount,
      userExistsCount: combinedVerification.userExistsCount,
      hasTweetsCount: combinedVerification.hasTweetsCount,
    },
    conclusion: null,
  };

  const gUser = geminiVerification.userExistsCount;
  const gTweet = geminiVerification.hasTweetsCount;
  const rUser = grokVerification.userExistsCount;
  const rTweet = grokVerification.hasTweetsCount;
  const cUser = combinedVerification.userExistsCount;
  const cTweet = combinedVerification.hasTweetsCount;

  let conclusion = '';
  if (cTweet > Math.max(gTweet, rTweet)) {
    conclusion =
      '併用が最適: 単独より「ツイート1件以上」の採用数が多く、リスト構築のカバレッジが最大。単独なら ' +
      (gTweet >= rTweet ? 'Gemini' : 'Grok') +
      ' を優先。';
  } else if (gTweet > rTweet) {
    conclusion =
      '単独では Gemini が最適: X API 検証通過（ツイート1件以上）が Gemini の方が多い。併用でも採用数は増えるが、重複が多ければ単独 Gemini で十分な場合あり。';
  } else if (rTweet > gTweet) {
    conclusion =
      '単独では Grok が最適: X API 検証通過が Grok の方が多い。併用でユニーク数が増えれば併用を推奨。';
  } else {
    conclusion =
      'Gemini と Grok で検証通過数は同程度。重複が少なければ併用でユニーク採用数が増えるため併用を推奨。';
  }
  report.conclusion = conclusion;

  console.log('=== 6. 最適解の結論 ===');
  console.log('  ' + conclusion);
  console.log('');
  console.log('  (参考) 単独: Gemini ' + gTweet + '/10 採用, Grok ' + rTweet + '/10 採用');
  console.log('  (参考) 併用: ユニーク ' + combinedRaw.length + ' 件中 ' + cTweet + ' 件採用');
  console.log('');

  const outDir = path.join(__dirname, '..', 'docs');
  const outPath = path.join(outDir, 'compare-gemini-grok-xapi-verification-result.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log('✅ 結果を保存: ' + outPath);

  const mdPath = path.join(outDir, 'compare-gemini-grok-xapi-verification-result.md');
  const md = `# Gemini vs Grok: X API 検証比較（10件ずつ）

**実行日時**: ${report.runAt}

## 結果サマリ

| ソース | 取得数 | user 存在 | ツイート1件以上（採用可能） |
|--------|--------|------------|-----------------------------|
| Gemini (${GEMINI_MODEL}) | 10 | ${gUser}/10 | ${gTweet}/10 |
| Grok (${GROK_MODEL}) | 10 | ${rUser}/10 | ${rTweet}/10 |
| **併用（ユニーク）** | ${combinedRaw.length} | ${cUser}/${combinedRaw.length} | ${cTweet}/${combinedRaw.length} |

- 重複: ${overlapCount} 件（Gemini と Grok の両方に登場）

## 結論

${conclusion}

## 生データ

- \`docs/compare-gemini-grok-xapi-verification-result.json\`
`;
  fs.writeFileSync(mdPath, md, 'utf-8');
  console.log('✅ レポート: ' + mdPath);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
