// scripts/ask-gemini-influencer-list-capability.js
// Gemini に問う: 何かリスト（例: インフルエンサー username）を引っ張ってこれるか？
// 使い方: node scripts/ask-gemini-influencer-list-capability.js

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// 開発用: gemini-3-flash-preview (https://ai.google.dev/gemini-api/docs/models?hl=ja#gemini-3-pro)
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function main() {
  console.log("");
  console.log("=== Gemini に問う: リスト抽出の可否 ===");
  console.log(`モデル: ${MODEL}`);
  console.log("");

  const prompt = `You are being consulted by a team that runs quote-reposts on X (Twitter) to drive traffic to a crypto/BTC product. They need **lists of real X (Twitter) usernames** of crypto/BTC influencers, **by language** (en, es, pt-br, ar, ja, ko). They do NOT need tweet IDs — only usernames. They will verify usernames via X API themselves (username → user ID → recent tweets → pick real tweet IDs).

**Your task:**

1. **Can you pull or extract such a list?**  
   Can you output a list of real, notable crypto/BTC influencer usernames on X (e.g. @APompliano, @VitalikButerin — without the @) for a given language? If yes, in what format (JSON array, plain list)? If your knowledge is cut off at a date, say so and still say whether you can list **well-known** usernames from public knowledge up to that date.

2. **How many can you realistically list per language?**  
   Give a rough estimate per language: en, es, pt-br, ar, ja, ko. Are some languages much harder (fewer well-known influencers)?

3. **If you can list usernames, give a short example now.**  
   Return a JSON object with key "usernames" and value an array of 5–10 English-language crypto/BTC influencer usernames (strings, no @). Example: {"usernames": ["APompliano", "VitalikButerin", "cz_binance", ...]}. If you cannot guarantee real usernames, say so and omit or mark the example as "illustrative only".

4. **Any other list you could pull that would help this use case?**  
   E.g. trending hashtags, best posting times by region, or other structured data that would help quote-repost strategy.

Answer in a clear, structured way. Use sections: CAN_YOU_PULL_LIST, HOW_MANY_PER_LANGUAGE, EXAMPLE_JSON (if any), OTHER_LISTS.`;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    const response = result.response;
    if (!response || !response.text) {
      console.error("❌ Empty or no text in Gemini response");
      process.exit(1);
    }
    const text = response.text();

    console.log("--- Gemini の回答 ---");
    console.log(text);
    console.log("");
    console.log("--- 以上 ---");

    const outDir = path.join(__dirname, "..", "docs");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outPath = path.join(outDir, `gemini-influencer-list-capability-${timestamp}.md`);
    const md = `# Gemini に問う: リスト抽出の可否\n\n**実行日時**: ${new Date().toISOString()}\n**モデル**: ${MODEL}\n\n---\n\n## 質問\n\n- 何かリスト（例: インフルエンサー username を言語別に）を引っ張ってこれるか？\n- 言語別にどれくらい現実的に列挙できるか？\n- 可能なら短い例（JSON）を返してほしい。\n- 他にこのユースケースに役立つリスト（ハッシュタグ・投稿時間など）を出せるか？\n\n---\n\n## Gemini の回答\n\n${text}\n`;
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, md, "utf-8");
    console.log(`\n✅ 回答を保存: ${outPath}`);
  } catch (err) {
    console.error("❌ Gemini API error:", err.message);
    if (err.response) console.error(err.response);
    process.exit(1);
  }
}

main();
