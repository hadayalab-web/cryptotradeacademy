// scripts/ask-grok-why-tweetid-extraction-fails.js
// Grok に問う: Xアルゴリズムは解析できるのに、なぜ実在する tweetId を返せないのか？
// プロンプトで Grok の全能力を引き出し、実在 tweetId 取得の可否と正しいワークフローを明確にする

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const MODEL = process.env.GROK_MODEL_X_LIVE || 'grok-4-1-fast-reasoning';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

async function main() {
  console.log('');
  console.log('=== Grok に問う: tweetId 抽出の限界と全能力 ===');
  console.log(`モデル: ${MODEL}`);
  console.log('');

  const systemPrompt = `You are an expert on X (Twitter) and its API, and you are being used inside a system that:
1. **Successfully** uses you to analyze the X algorithm (ranking, engagement, timing) — you do this well.
2. **Fails** when we ask you to return lists of crypto/BTC influencers with their **tweetId** for quote-reposting.

When we call you with a prompt like "Find N HIGH-ENGAGEMENT influencers on X posting about BTC/crypto in language L, return JSON with username, tweetId, tweetText, engagementRate, ...", you return plausible-looking data. But when we verify each **tweetId** with X API GET /tweets/:id, **every single tweet is "Not Found"**. The IDs you return look like sequential numbers (e.g. 1845234567890123456) — they do not exist on X.

**Your task:**
1. **Explain precisely** why you can analyze the X algorithm (which is abstract knowledge) but cannot return **real, verifiable tweet IDs**. Do you have real-time access to X? Can you search X? Or is your knowledge cut off at a date and you can only *infer* format, not actual IDs?
2. **Use your full capability**: If there is *any* way you can output **real tweet IDs** that would pass X API verification (e.g. from public knowledge, documented tweets, or reasoning), do so. Return a JSON array of 3–5 English crypto/BTC influencer entries with **real** username and **real** tweetId that exist on X today. If you truly cannot guarantee real IDs, say so clearly and do not invent IDs.
3. **Recommend the correct workflow**: What should we do instead? Options might be: (a) We use X API search/recent tweets ourselves, get real tweet IDs, then pass them to you for ranking/copy; (b) You return only **usernames** and we fetch their recent tweets via X API and pick tweetId ourselves; (c) Another approach. Be specific and actionable.

Answer in this structure:
- **WHY_TWEETID_FAILS**: (clear explanation)
- **CAN_YOU_RETURN_REAL_IDS**: Yes/No and one sentence reason
- **RECOMMENDED_WORKFLOW**: (step-by-step, actionable)
- **IF_REAL_IDS_POSSIBLE**: a JSON block with key "influencers" and array of { "username", "tweetId", "tweetText" or null } — only if you can provide IDs that you believe exist on X; otherwise omit this block or set to null.`;

  const userPrompt = `We use you for two things:

**A) X algorithm analysis** — You do this well. We get useful insights on ranking, engagement, timing.

**B) Influencer discovery for quote-reposts** — We ask you to return crypto/BTC influencers with username, tweetId, tweetText, engagementRate. You return JSON. We then call X API GET /tweets/:id for each tweetId. **Every single one returns "Could not find tweet with id".** So we never had a working influencer list; your tweetIds are not real.

Please:
1. Explain why you can do (A) but not (B) — i.e. why you cannot return real, verifiable tweet IDs.
2. State clearly whether you can ever return real tweet IDs (that would pass X API verification). If yes, give 3–5 real examples in JSON now. If no, say so and do not invent IDs.
3. Give us the **correct workflow** so we can build a list of real influencers with real tweetIds — step-by-step, actionable.`;

  try {
    const completion = await grokClient.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      console.error('❌ Empty response from Grok');
      process.exit(1);
    }

    console.log('--- Grok の回答 ---');
    console.log(text);
    console.log('');
    console.log('--- 以上 ---');

    const outDir = path.join(__dirname, '..', 'docs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outPath = path.join(outDir, `grok-why-tweetid-fails-${timestamp}.md`);
    const md = `# Grok への質問: なぜ tweetId を抽出できないのか\n\n**実行日時**: ${new Date().toISOString()}\n**モデル**: ${MODEL}\n\n---\n\n## 質問\n\n- Xアルゴリズムは解析できるのに、実在する tweetId を返せない理由は何か。\n- 実在する tweetId を返す能力はあるか。あるなら例を、ないなら正しいワークフローを提示せよ。\n\n---\n\n## Grok の回答\n\n${text}\n`;
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, md, 'utf-8');
    console.log(`\n✅ 回答を保存: ${outPath}`);
  } catch (err) {
    console.error('❌ Grok API error:', err.message);
    if (err.response) console.error(err.response);
    process.exit(1);
  }
}

main();
