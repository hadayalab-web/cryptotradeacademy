// scripts/ask-grok-list-size-and-discovery.js
// Grok と打ち合わせ: リストはどれくらいあればいいか / どれくらい見つかるか
// 使い方: node scripts/ask-grok-list-size-and-discovery.js

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
  console.log('=== Grok と打ち合わせ: リスト必要数・発見可能数 ===');
  console.log(`モデル: ${MODEL}`);
  console.log('');

  const systemPrompt = `You are an expert on X (Twitter) and crypto/BTC influencer marketing. You are consulted by a team that:

1. **Uses you only for username lists**: You suggest real X usernames of crypto/BTC influencers by language. You do NOT provide tweetIds (we get those via X API ourselves).
2. **Goal**: Quote-repost on high-engagement influencer tweets to drive traffic (like buying ad slots on high-view shows). KPI: ~150+ free-tier signups/day, ~50 paid signups/day. Back-of-envelope: ~64万 impressions/day target, ~128 quote reposts/day if each post gets ~5,000 impressions.
3. **Languages**: We run quote reposts in multiple languages: en, es, pt-br, ar, ja, ko (and may add more). We need influencer lists per language.
4. **Reality**: We verify every username via X API (user exists, then we fetch their recent tweets and pick real tweetIds). So only usernames that actually exist on X count.

Answer in a clear, structured way. Use numbers where you can. If you must estimate, say "estimate" or "roughly".`;

  const userPrompt = `We need to size our influencer list and understand what's discoverable. Please advise:

**A) How large should the list be?**
- Per language: how many influencers (usernames) do we need in the list so that we can sustain ~128 quote reposts per day across all languages, without reusing the same tweet too often? Consider: we pick one tweet per influencer per run, and we have multiple runs per day; we also want variety (not the same 10 people every day).
- Total: if we support 6 languages (en, es, pt-br, ar, ja, ko), what's a reasonable total list size (and per-language breakdown)?

**B) How many can you (Grok) realistically find?**
- For each of these languages, how many **real, notable crypto/BTC influencer usernames** do you think you can list from public knowledge? (We only need usernames; we will verify via X API.) Give a range or estimate per language: en, es, pt-br, ar, ja, ko.
- Are some languages much harder (fewer well-known influencers)? Which languages would you prioritize?

**C) Any recommendation?**
- Should we aim for a minimum list size per language (e.g. at least 50 usernames per language)? Any cap (e.g. max 200 per language to keep quality)?
- How often should we refresh the list (add new influencers, drop inactive ones)?

Reply in a structure we can reuse, e.g.:
- LIST_SIZE_RECOMMENDATION: (per language and total)
- DISCOVERABLE_BY_GROK: (per language, your estimate)
- PRIORITY_LANGUAGES: (order or focus)
- REFRESH_RECOMMENDATION: (how often to update the list)`;

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
    const outPath = path.join(outDir, `grok-list-size-and-discovery-${timestamp}.md`);
    const md = `# Grok と打ち合わせ: リスト必要数・発見可能数\n\n**実行日時**: ${new Date().toISOString()}\n**モデル**: ${MODEL}\n\n---\n\n## 質問\n\n- **A)** リストはどれくらいあればいいか（言語別・合計）。目標: 1日あたり約128件の引用リポスト、約64万インプレッション。\n- **B)** Grok で現実的にどれくらいの username が発見できるか（言語別）。\n- **C)** 言語別の最小/最大件数、リストの更新頻度の推奨。\n\n---\n\n## Grok の回答\n\n${text}\n`;
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
