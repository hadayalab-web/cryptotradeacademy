#!/usr/bin/env node
/**
 * Gemini に「48hフォローアップDM」の文案を依頼するスクリプト
 * - 実行: node scripts/request-followup-messages-from-gemini.js
 * - GEMINI_API_KEY があれば API で取得、なければプロンプトを出力して手動で Gemini に貼る
 */
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PROMPT_FILE = path.join(__dirname, "..", "docs", "prompt-followup-messages-gemini.md");
const OUTPUT_FILE = path.join(__dirname, "..", "docs", "followup-messages-gemini-output.json");

const PROMPT = `You are a copywriter for Trap Defence (trapdefence.io), a crypto/BTC trading psychology product that helps traders avoid emotional traps (FOMO, revenge trading, etc.).

**First message we send (for context)**
We reply or DM users who posted about liquidations/rekt/trading stress. The first message is: short hook (e.g. "Ouch." / "痛い。") + one line of empathy (e.g. "Stop losses getting hunted is exactly how whales accumulate.") + CTA with 50% OFF and 1-day trial link. Example in English:
"@username Ouch. Stop losses getting hunted is exactly how whales accumulate. Stop chasing green candles. See whale traps before they trigger. 50% OFF coupon + 1-day trial for Trap Defence BTC: [link]"
Example in Japanese:
"@username 痛い。典型的なアルゴの流動性刈りですね… もう緑のロウソクを追うのはやめましょう。クジラの罠を先に見る。Trap Defence BTC 50%OFFクーポン + 1日トライアル: [link]"
We send the same structure in 6 languages (en, ja, ko, es, pt, ar).

**Context**
- 48 hours after that first message we send a single follow-up DM. This is the message we need you to write.

**Constraints**
- One short message per language. Fits in one DM (under ~280 chars per message is ideal).
- Tone: friendly, low-pressure, "checking in".
- Invite a reply but do not hard-sell or add links in this message.
- Languages: en, ja, ko, es, pt, ar (Arabic). Use natural, colloquial phrasing for each.

**What we need**
- Sound like a human checking in, not a bot. One short sentence.
- Reference their situation (they got rekt / stressed / confused) so it feels relevant.
- Leave a real hook: a question they can answer, or a tiny opinion that invites "yeah/no" — e.g. "あのあとまたポジション取った？" "Still staring at charts or taking a break?"
- Per language: natural, colloquial, under ~200 chars. 6 languages: en, ja, ko, es, pt, ar.

**Task**
Return a JSON object only, no markdown, no explanation:
\`\`\`json
{"en": "...", "ja": "...", "ko": "...", "es": "...", "pt": "...", "ar": "..."}
\`\`\`
Write one follow-up line per language that actually gets replies.`;

async function callGemini() {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(PROMPT);
  const text = result.response?.text?.() || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("No JSON in response");
}

function main() {
  fs.mkdirSync(path.dirname(PROMPT_FILE), { recursive: true });
  fs.writeFileSync(PROMPT_FILE, PROMPT, "utf8");
  console.log("📄 Prompt written to:", PROMPT_FILE);
  console.log("");

  if (!GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY not set. Copy the prompt below to Gemini, then save the JSON response to:");
    console.log("  ", OUTPUT_FILE);
    console.log("");
    console.log("--- PROMPT (copy below) ---");
    console.log(PROMPT);
    console.log("--- END PROMPT ---");
    return;
  }

  (async () => {
    try {
      console.log("Calling Gemini...");
      const obj = await callGemini();
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(obj, null, 2), "utf8");
      console.log("✅ Response saved to:", OUTPUT_FILE);
      console.log("");
      console.log("Follow-up message by lang (JSON):");
      console.log(JSON.stringify(obj, null, 2));
    } catch (e) {
      console.error("Gemini error:", e.message);
      console.log("");
      console.log("Fallback: copy the prompt from", PROMPT_FILE, "and paste into Gemini, then save the JSON to", OUTPUT_FILE);
    }
  })();
}

main();
