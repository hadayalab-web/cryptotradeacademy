// scripts/sample-quote-repost-en-g.js
// EN 引用リポスト バリアントG のサンプル出力（Gemini部分はフォールバック文言で表示）

const { getQuoteRepostGeminiStructureParts } = require("../config/quoteRepostTemplatesIntegrated");
const { CORE_PHRASES } = require("../config/personaStrategy");

const lang = "en";
const parts = getQuoteRepostGeminiStructureParts(lang, { influencerUsername: "sample_influencer" });

const hookFallback = CORE_PHRASES.state.en;
const objectionFallback =
  "This intel only works in real time. Whether you have it or not decides tradeable edge vs pure gamble.";

const full = [
  parts.headline,
  hookFallback,
  parts.minimalBlock,
  parts.regularBlock,
  objectionFallback,
  parts.promoBlock
].join("\n\n");

console.log("=== EN Quote Repost (Variant G) Sample ===\n");
console.log(full);
console.log("\n=== Character count ===");
console.log(full.length);
