// scripts/build-influencer-list-per-lang.js
// 一言語ずつインフルエンサーリストを完成させる（Grok + Gemini 併用 → X API 検証 → シード保存）
//
// 使い方:
//   node scripts/build-influencer-list-per-lang.js --lang en
//   node scripts/build-influencer-list-per-lang.js --lang es --batch 30
//
// 流れ:
//   1. Gemini と Grok から指定言語の crypto/BTC インフルエンサー username を取得（各 --batch 件）
//   2. マージ・重複除去し、既にシードにある username を除外
//   3. 各 username を X API で検証（user 存在 → 直近ツイート取得 → 1件目を tweetId として採用）
//   4. 通過分を data/influencers-seed/influencers-{lang}.json に追記（既存とマージ・重複なし）
//
// KV へ反映するには、その後で:
//   node scripts/rebuild-influencer-list-from-seed.js --lang <lang>
//
// 前提: .env に GEMINI_API_KEY, XAI_API_KEY, X API 認証が設定されていること

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];
const LANG_LABELS = {
  en: "English",
  es: "Spanish",
  "pt-br": "Portuguese (Brazil)",
  ar: "Arabic",
  ja: "Japanese",
  ko: "Korean"
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GROK_MODEL = process.env.GROK_MODEL_X_LIVE || "grok-4-1-fast-reasoning";
const SEED_DIR = path.join(__dirname, "..", "data", "influencers-seed");

const { getUserByUsername, xApiRequest } = require("../services/x/client");

function parseArgs() {
  const args = process.argv.slice(2);
  let lang = null;
  let batch = 25;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lang" && args[i + 1]) {
      lang = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === "--batch" && args[i + 1]) {
      batch = Math.max(10, Math.min(50, parseInt(args[i + 1], 10) || 25));
      i++;
    }
  }
  return { lang, batch };
}

function checkEnv() {
  const hasGemini = !!GEMINI_API_KEY;
  const hasGrok = !!XAI_API_KEY;
  const hasX = !!(
    process.env.X_API_CONSUMER_KEY &&
    process.env.X_API_CONSUMER_KEY_SECRET &&
    process.env.X_API_ACCESS_TOKEN &&
    process.env.X_API_ACCESS_TOKEN_SECRET
  );
  if (!hasGemini || !hasGrok || !hasX) {
    console.error("❌ .env に GEMINI_API_KEY, XAI_API_KEY, X API 認証を設定してください");
    process.exit(1);
  }
}

function loadExistingSeed(lang) {
  const filepath = path.join(SEED_DIR, `influencers-${lang}.json`);
  if (!fs.existsSync(filepath)) {
    return { list: [], usernamesSet: new Set() };
  }
  const raw = fs.readFileSync(filepath, "utf-8");
  let list = [];
  try {
    const data = JSON.parse(raw);
    list = Array.isArray(data) ? data : data.influencers || [];
  } catch (_) {
    list = [];
  }
  const usernamesSet = new Set(
    list
      .filter((e) => e && (e.username || e.handle))
      .map((e) => (e.username || e.handle).trim().replace(/^@/, "").toLowerCase())
  );
  return { list, usernamesSet };
}

function uniqueUsernames(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    const key = (x && String(x)).trim().replace(/^@/, "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Gemini から指定言語の username を batch 件取得 */
async function fetchGeminiUsernames(lang, batch) {
  const label = LANG_LABELS[lang] || lang;
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `Return ONLY a JSON object. No markdown, no code fences, no explanation.
Key: "usernames". Value: array of exactly ${batch} real X (Twitter) usernames of ${label}-language crypto/BTC influencers. Each string without @.
Example format: {"usernames": ["handle1","handle2",...]}`;
  const result = await model.generateContent(prompt);
  const text = (result.response && result.response.text()) || "";
  const cleaned = text
    .replace(/```json?\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/"usernames"\s*:\s*\[[^\]]+\]/);
    if (match) obj = JSON.parse("{" + match[0] + "}");
    else return [];
  }
  const list = obj.usernames || obj;
  return Array.isArray(list)
    ? list
        .slice(0, batch)
        .map((u) => String(u).replace(/^@/, "").trim())
        .filter(Boolean)
    : [];
}

/** Grok から指定言語の username を batch 件取得 */
async function fetchGrokUsernames(lang, batch) {
  const label = LANG_LABELS[lang] || lang;
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  const completion = await client.chat.completions.create({
    model: GROK_MODEL,
    messages: [
      {
        role: "system",
        content: `You return ONLY valid JSON. No markdown, no code fences. Key "usernames", value array of exactly ${batch} real X (Twitter) usernames of ${label}-language crypto/BTC influencers, each without @.`
      },
      {
        role: "user",
        content: `List exactly ${batch} real ${label} crypto/BTC influencer usernames on X. Return JSON: {"usernames": ["name1","name2",...]}`
      }
    ],
    max_tokens: 2000,
    temperature: 0.2
  });
  const text = completion?.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/"usernames"\s*:\s*\[[^\]]+\]/);
    if (match) obj = JSON.parse("{" + match[0] + "}");
    else return [];
  }
  const list = obj.usernames || obj;
  return Array.isArray(list)
    ? list
        .slice(0, batch)
        .map((u) => String(u).replace(/^@/, "").trim())
        .filter(Boolean)
    : [];
}

/** 1 username を X API で検証し、採用可能なら { username, tweetId } を返す */
async function verifyAndGetTweetId(username) {
  try {
    const user = await getUserByUsername(username);
    const userId = user?.id;
    if (!userId) return null;
    const response = await xApiRequest(`/users/${userId}/tweets`, {
      method: "GET",
      params: {
        max_results: 5,
        "tweet.fields": "id,text,created_at,public_metrics",
        exclude: "replies"
      }
    });
    const tweets = response?.data;
    if (!Array.isArray(tweets) || tweets.length === 0) return null;
    const first = tweets[0];
    return { username, tweetId: first.id };
  } catch (_) {
    return null;
  }
}

function saveSeed(lang, existingList, newEntries) {
  const byUsername = new Map();
  for (const e of existingList) {
    const u = (e.username || e.handle || "").trim().replace(/^@/, "");
    if (u) byUsername.set(u.toLowerCase(), { username: u, tweetId: e.tweetId || e.tweet_id });
  }
  for (const e of newEntries) {
    const u = (e.username || "").trim().replace(/^@/, "");
    if (u && e.tweetId) byUsername.set(u.toLowerCase(), { username: u, tweetId: e.tweetId });
  }
  const list = [...byUsername.values()];
  const filepath = path.join(SEED_DIR, `influencers-${lang}.json`);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(list, null, 2), "utf-8");
  return list.length;
}

async function main() {
  const { lang, batch } = parseArgs();
  if (!lang || !LANGS.includes(lang)) {
    console.error(
      "Usage: node scripts/build-influencer-list-per-lang.js --lang <en|es|pt-br|ar|ja|ko> [--batch 25]"
    );
    process.exit(1);
  }
  checkEnv();

  const label = LANG_LABELS[lang];
  console.log("");
  console.log(`=== ${label} (${lang}) インフルエンサーリスト構築 ===`);
  console.log(`  batch: ${batch} 件/ソース (Gemini + Grok)`);
  console.log("");

  const { list: existingList, usernamesSet } = loadExistingSeed(lang);
  console.log(`  既存シード: ${existingList.length} 件`);
  console.log("");

  console.log(`  1. Gemini から ${batch} 件取得...`);
  let geminiList = [];
  try {
    geminiList = await fetchGeminiUsernames(lang, batch);
    console.log(`     → ${geminiList.length} 件`);
  } catch (e) {
    console.error("     ❌", e.message);
  }

  console.log(`  2. Grok から ${batch} 件取得...`);
  let grokList = [];
  try {
    grokList = await fetchGrokUsernames(lang, batch);
    console.log(`     → ${grokList.length} 件`);
  } catch (e) {
    console.error("     ❌", e.message);
  }

  const merged = uniqueUsernames([...geminiList, ...grokList]);
  const candidates = merged.filter((u) => !usernamesSet.has(u.toLowerCase()));
  console.log(`  3. マージ・重複除去: ${merged.length} 件 → 既存除外後 ${candidates.length} 件`);
  console.log("");

  if (candidates.length === 0) {
    console.log("  追加候補がありません。既存シードのままです。");
    console.log(`  KV へ反映: node scripts/rebuild-influencer-list-from-seed.js --lang ${lang}`);
    console.log("");
    return;
  }

  console.log(`  4. X API で検証（${candidates.length} 件）...`);
  const newEntries = [];
  for (let i = 0; i < candidates.length; i++) {
    const u = candidates[i];
    const entry = await verifyAndGetTweetId(u);
    if (entry) newEntries.push(entry);
    process.stdout.write(entry ? "." : "x");
    if (i < candidates.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  console.log("");
  console.log(`     → 採用: ${newEntries.length}/${candidates.length} 件`);
  console.log("");

  const total = saveSeed(lang, existingList, newEntries);
  console.log(`  5. シード保存: data/influencers-seed/influencers-${lang}.json (合計 ${total} 件)`);
  console.log("");
  console.log(`  KV へ反映するには:`);
  console.log(`    node scripts/rebuild-influencer-list-from-seed.js --lang ${lang}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
