// scripts/sample-quote-repost-en-g.js
// EN 引用リポスト バリアントG: gemini-3-flash-preview で深層心理フック・反論処理を生成してはめる

try {
  require("dotenv").config();
} catch (_) {}

const { getQuoteRepostGeminiStructureParts } = require("../config/quoteRepostTemplatesIntegrated");
const { CORE_PHRASES } = require("../config/personaStrategy");
const {
  generatePsychologyHook,
  generateObjectionHandling
} = require("../services/gemini/quoteRepostCopy");

const lang = "en";
const objectionFallback =
  "This intel only works in real time. Whether you have it or not decides tradeable edge vs pure gamble.";

async function main() {
  const parts = getQuoteRepostGeminiStructureParts(lang, {
    influencerUsername: "sample_influencer"
  });

  console.log("Calling Gemini (gemini-3-flash-preview) for psychology hook...");
  let hookText = await generatePsychologyHook({ lang });
  if (!hookText) hookText = CORE_PHRASES.state.en;
  console.log("Hook OK.\n");

  console.log("Calling Gemini (gemini-3-flash-preview) for objection handling...");
  let objectionText = await generateObjectionHandling({ lang });
  if (!objectionText) objectionText = objectionFallback;
  console.log("Objection OK.\n");

  const full = [
    parts.headline,
    hookText,
    parts.minimalBlock,
    parts.regularBlock,
    objectionText,
    parts.promoBlock
  ].join("\n\n");

  console.log("=== EN Quote Repost (Variant G) — Gemini generated ===\n");
  console.log(full);
  console.log("\n=== Character count ===");
  console.log(full.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
