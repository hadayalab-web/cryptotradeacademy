// services/x/discoverAndStockFromTargets.js
// リスト検索: Crypto公式リスト + Grok (grok-4-1-fast-reasoning) + Gemini (gemini-3-pro-preview) で実行し、
// X API で実在を確認できたもののみ KV 在庫にストックする。

const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SECONDARY_TARGETS } = require("../../config/quoteRepostTargets");
const { getOfficialCryptoUsernames } = require("../../config/officialCryptoXAccounts");
const { getUserByUsername, xApiRequest } = require("./client");
const { getInfluencersFromStock, saveInfluencersToStock } = require("./influencerStock");

const GROK_MODEL = process.env.GROK_MODEL_LIST_SEARCH || "grok-4-1-fast-reasoning";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-preview";
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/** カテゴリ一覧をプロンプト用の1行テキストに整形 */
function targetsToPromptHint() {
  const lines = [];
  Object.entries(SECONDARY_TARGETS).forEach(([category, items]) => {
    lines.push(`${category}: ${items.join(", ")}`);
  });
  return lines.join("\n");
}

/**
 * Grok (grok-4-1-fast-reasoning) でリスト検索
 * @param {string} lang - 言語コード
 * @param {number} maxResults - 最大件数
 * @returns {Promise<string[]>} usernames（@なし）
 */
async function fetchUsernamesWithGrok(lang, maxResults = 25) {
  if (!XAI_API_KEY) {
    console.warn("[DiscoverFromTargets] XAI_API_KEY not set, skipping Grok");
    return [];
  }
  const hint = targetsToPromptHint();
  const openai = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  const prompt = `You are an expert at finding X (Twitter) accounts for crypto/BTC content.
Target categories (prioritize accounts that match these):
${hint}

Task: List exactly ${maxResults} real X usernames of accounts that post about BTC/crypto and match the above categories. Language of their content: ${lang}.
Return ONLY a JSON object. No markdown, no code fences. Key: "usernames". Value: array of strings, each username without @.
Example: {"usernames": ["elonmusk","APompliano","saylor"]}`;

  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: "You return ONLY valid JSON. No markdown, no code fences. Key \"usernames\", value array of X usernames without @." },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.2
    });
    const text = completion?.choices?.[0]?.message?.content?.trim() || "";
    return parseUsernamesFromJson(text, maxResults);
  } catch (e) {
    console.error("[DiscoverFromTargets] Grok list search failed:", e.message);
    return [];
  }
}

/**
 * Gemini (gemini-3-pro-preview) でリスト検索
 * @param {string} lang - 言語コード
 * @param {number} maxResults - 最大件数
 * @returns {Promise<string[]>} usernames（@なし）
 */
async function fetchUsernamesWithGemini(lang, maxResults = 25) {
  if (!GEMINI_API_KEY) {
    console.warn("[DiscoverFromTargets] GEMINI_API_KEY not set, skipping Gemini");
    return [];
  }
  const hint = targetsToPromptHint();
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = `Target categories for X (Twitter) accounts:
${hint}

List exactly ${maxResults} real X usernames of accounts that post about BTC/crypto and match these categories. Content language: ${lang}.
Return ONLY a JSON object. No markdown, no code fences. Key: "usernames". Value: array of strings, each username without @.
Example: {"usernames": ["elonmusk","APompliano","saylor"]}`;

  try {
    const result = await model.generateContent(prompt);
    const text = (result.response && result.response.text()) || "";
    return parseUsernamesFromJson(text, maxResults);
  } catch (e) {
    console.error("[DiscoverFromTargets] Gemini list search failed:", e.message);
    return [];
  }
}

function parseUsernamesFromJson(text, maxResults) {
  const cleaned = text
    .replace(/```json?\n?/gi, "")
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
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, maxResults)
    .map((u) => String(u).replace(/^@/, "").trim())
    .filter(Boolean);
}

/**
 * 1ユーザーを X API で検証し、直近ツイート1件を取得。ストック用オブジェクトを返す。
 * @param {string} username - @なし
 * @param {string} lang - 言語コード
 * @returns {Promise<Object|null>} { username, tweetId, tweetText, engagementRate, followerCount, recentImpressions, lang } または null
 */
async function verifyAndBuildInfluencer(username, lang) {
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
    const metrics = first?.public_metrics || {};
    const likeCount = Number(metrics.like_count) || 0;
    const retweetCount = Number(metrics.retweet_count) || 0;
    const replyCount = Number(metrics.reply_count) || 0;
    const impressionCount = Number(metrics.impression_count) || 0;
    const engagements = likeCount + retweetCount + replyCount;
    const engagementRate = impressionCount > 0 ? engagements / impressionCount : 0.05;
    const followerCount = Number(user?.public_metrics?.followers_count) || 0;
    const recentImpressions = impressionCount > 0 ? impressionCount : 50000;

    return {
      username: user.username || username,
      tweetId: String(first.id),
      tweetText: first.text || "",
      engagementRate: Math.min(1, engagementRate),
      followerCount,
      recentImpressions,
      lang: (lang || "en").toLowerCase()
    };
  } catch (e) {
    return null;
  }
}

function uniqueUsernames(arr) {
  const seen = new Set();
  return arr.filter((u) => {
    const key = (u && String(u)).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Crypto関連X公式アカウントリストを取得（config から）
 * @returns {string[]} ユーザー名（@なし）
 */
function getOfficialCryptoAccountList() {
  return getOfficialCryptoUsernames();
}

/**
 * リスト検索（公式リスト + Grok + Gemini）→ X API で実在確認 → KV にストック（既存在庫とマージ）
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @param {number} options.maxPerModel - 各モデルから取得する最大件数（デフォルト: 25）
 * @param {boolean} options.mergeWithExisting - 既存ストックとマージするか（デフォルト: true）
 * @param {boolean} options.includeOfficial - Crypto公式アカウントリストを含めるか（デフォルト: true）
 * @returns {Promise<{ success: boolean, verified: number, saved: number, officialVerified?: number, errors?: string }>}
 */
async function discoverAndStockFromTargets(lang, options = {}) {
  const targetLang = (lang || "en").toLowerCase();
  const maxPerModel = options.maxPerModel ?? 25;
  const mergeWithExisting = options.mergeWithExisting !== false;
  const includeOfficial = options.includeOfficial !== false;

  console.log(`[DiscoverFromTargets] Starting list search (official=${includeOfficial}, Grok + Gemini) for ${targetLang}, maxPerModel=${maxPerModel}`);

  const officialList = includeOfficial ? getOfficialCryptoAccountList() : [];
  if (officialList.length > 0) {
    console.log(`[DiscoverFromTargets] Official crypto X accounts: ${officialList.length}`);
  }

  const [grokList, geminiList] = await Promise.all([
    fetchUsernamesWithGrok(targetLang, maxPerModel),
    fetchUsernamesWithGemini(targetLang, maxPerModel)
  ]);

  const allUsernames = uniqueUsernames([...officialList, ...grokList, ...geminiList]);
  console.log(`[DiscoverFromTargets] Official: ${officialList.length}, Grok: ${grokList.length}, Gemini: ${geminiList.length}, unique: ${allUsernames.length}`);

  const officialSet = new Set(officialList.map((u) => String(u).toLowerCase()));
  const verified = [];
  let officialVerified = 0;
  for (const username of allUsernames) {
    const inf = await verifyAndBuildInfluencer(username, targetLang);
    if (inf) {
      const isOfficial = officialSet.has((username || "").toLowerCase());
      verified.push({ ...inf, source: isOfficial ? "official" : "discovered" });
      if (isOfficial) officialVerified++;
    }
  }
  console.log(`[DiscoverFromTargets] X API verified: ${verified.length}/${allUsernames.length} (official: ${officialVerified})`);

  if (verified.length === 0) {
    return { success: true, verified: 0, saved: 0, officialVerified: 0 };
  }

  let toSave = verified;
  if (mergeWithExisting) {
    const existing = await getInfluencersFromStock(targetLang);
    const existingUsernames = new Set((existing || []).map((e) => (e.username || "").toLowerCase()));
    const newOnly = verified.filter((v) => !existingUsernames.has((v.username || "").toLowerCase()));
    const existingWithSource = (existing || []).map((e) => ({ ...e, source: e.source || "legacy" }));
    toSave = [...existingWithSource, ...newOnly];
    console.log(`[DiscoverFromTargets] Merged: existing ${(existing || []).length}, new ${newOnly.length}, total to save: ${toSave.length}`);
  }
  // 公式を先頭にソート（official → discovered → legacy）
  const sourceOrder = { official: 0, discovered: 1, legacy: 2 };
  toSave.sort((a, b) => (sourceOrder[a.source] ?? 2) - (sourceOrder[b.source] ?? 2));

  const saved = await saveInfluencersToStock(targetLang, toSave);
  return {
    success: !!saved,
    verified: verified.length,
    saved: saved ? toSave.length : 0,
    officialVerified
  };
}

module.exports = {
  discoverAndStockFromTargets,
  getOfficialCryptoAccountList,
  fetchUsernamesWithGrok,
  fetchUsernamesWithGemini,
  verifyAndBuildInfluencer
};
