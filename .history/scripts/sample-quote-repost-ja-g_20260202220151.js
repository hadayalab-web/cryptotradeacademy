// scripts/sample-quote-repost-ja-g.js
// 日本語 引用リポスト バリアントG を1件生成（Geminiフック + GPT-5-mini反論、同じCQデータ）

try {
  require("dotenv").config();
} catch (_) {}

const { getQuoteRepostGeminiStructureParts } = require("../config/quoteRepostTemplatesIntegrated");
const { CORE_PHRASES } = require("../config/personaStrategy");
const { generatePsychologyHook } = require("../services/gemini/quoteRepostCopy");
const { generateQuoteRepostObjection } = require("../services/gpt/client");

const lang = "ja";
const reportData = {
  trapScore: 32,
  priceUsd: 96800,
  change24h: -0.8,
  exchangeNetflow: "-800 BTC",
  whaleRatio: "0.82",
  sentiment: "cautious"
};

async function main() {
  const parts = getQuoteRepostGeminiStructureParts(lang, {
    influencerUsername: "sample_ja"
  });

  console.log("Gemini (フック) 呼び出し中...");
  let hookText = await generatePsychologyHook({ lang, reportData });
  if (!hookText) hookText = CORE_PHRASES.state.ja;
  console.log("OK\n");

  console.log("GPT-5-mini (反論) 呼び出し中...");
  let objectionText = await generateQuoteRepostObjection({ lang, reportData });
  if (!objectionText) objectionText = parts.objectionFixed;
  console.log("OK\n");

  const full = [
    parts.headline,
    hookText,
    parts.minimalBlock,
    parts.regularBlock,
    objectionText,
    parts.promoBlock
  ].join("\n\n");

  console.log("========== 日本語 X投稿（バリアントG） ==========\n");
  console.log(full);
  console.log("\n========== 文字数: " + full.length + " ==========");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
