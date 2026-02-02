// scripts/sample-quote-repost-en-g.js
// EN 引用リポスト バリアントG: 市況データを渡して Gemini でフック、チラ見せ＋リンク説明＋反論定型＋CTA

try {
  require("dotenv").config();
} catch (_) {}

const { getQuoteRepostGeminiStructureParts } = require("../config/quoteRepostTemplatesIntegrated");
const { CORE_PHRASES } = require("../config/personaStrategy");
const { generatePsychologyHook } = require("../services/gemini/quoteRepostCopy");
const { generateQuoteRepostObjection } = require("../services/gpt/client");

const lang = "en";
const reportData = {
  trapScore: 28,
  priceUsd: 97200,
  change24h: -1.2,
  exchangeNetflow: "-1.2k BTC",
  whaleRatio: "0.85",
  sentiment: "cautious"
};

async function main() {
  const parts = getQuoteRepostGeminiStructureParts(lang, {
    influencerUsername: "sample_influencer"
  });

  console.log("Calling Gemini (gemini-3-flash-preview) for psychology hook (with CQ data)...");
  let hookText = await generatePsychologyHook({ lang, reportData });
  if (!hookText) hookText = CORE_PHRASES.state.en;
  console.log("Hook OK.\n");

  console.log(
    "Calling GPT-5-mini (gpt-5-mini-2025-08-07) for objection handling (same CQ data)..."
  );
  let objectionText = await generateQuoteRepostObjection({ lang, reportData });
  if (!objectionText) objectionText = parts.objectionFixed;
  console.log("Objection OK.\n");

  const full = [
    parts.headline,
    hookText,
    parts.minimalBlock,
    parts.regularBlock,
    objectionText,
    parts.promoBlock
  ].join("\n\n");

  console.log(
    "=== EN Quote Repost (Variant G) — Gemini hook + GPT-5-mini objection (same CQ) ===\n"
  );
  console.log(full);
  console.log("\n=== Character count ===");
  console.log(full.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
