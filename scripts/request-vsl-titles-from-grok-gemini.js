#!/usr/bin/env node
/**
 * VSL タイトル案を Grok (grok-4-1-fast-reasoning) と Gemini (gemini-3.1-pro-preview) に依頼する。
 * - VSL1: 無料版オプトイン用 (Minimal Opt-in)
 * - VSL2: クーポンで有料版アップセル用 (Minimal Coupon → Regular)
 *
 * 実行: node scripts/request-vsl-titles-from-grok-gemini.js
 * 環境変数: XAI_API_KEY, GEMINI_API_KEY（.env から読み込み）
 */

const path = require("path");
const fs = require("fs");

const DEFAULT_ENV_PATH = path.join(__dirname, "..", ".env");
const envPath = process.env.ENV_PATH || process.env.ENV_FILE || DEFAULT_ENV_PATH;
const loaded = require("dotenv").config({ path: envPath });
if (!loaded || loaded.error) {
  require("dotenv").config({ path: DEFAULT_ENV_PATH });
}

const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GROK_MODEL = "grok-4-1-fast-reasoning";
const GEMINI_MODEL = "gemini-3.1-pro-preview";

// VSL1: Minimal Opt-in（無料版オプトイン）スクリプト本文（SRTから抜粋）
const VSL1_SCRIPT = `
Two men started trading Bitcoin on the exact same day. One spent 12 hours a day staring at candles, chasing every green pump. Last night, a single whale trap liquidated his entire life savings. The other man, he enjoyed dinner with his family, slept soundly, and woke up to a $5,000 profit. The difference wasn't luck. It was the system. One was the hunter, the other was the defender. Most traders fail because they play the whales game. They buy when they're told to buy, but the whales are setting traps and you are the prey. Trap defense BTC changes the game by visualizing the invisible. Our engine spots institutional manipulation before it hits your P&L. We give you the ultimate trading skill, the discipline to stay safe until the odds are in your favor. It's high-resolution defense for a high stakes market. And today you can equip yourself for zero cost. Join the Defenders Academy now and get the minimum edition of the trap score for free. No credit card, no fluff, just the raw truth of the market. Stop being the prey, become the defender. Click below to start the bot and claim your free access.
`.trim();

// VSL2: Minimal Coupon（クーポンで有料版アップセル）スクリプト本文
const VSL2_SCRIPT = `
You've had the minimum edition in your hands for the last 48 hours. You've seen the trap score. You felt what it's like to have a shield. But while you're watching the score, the whales are already evolving. The minimum edition shows you the door, but the full protocol shows you the entire room. Right now, institutional algorithms are layering fake signals to trigger your FOMO. When the trap snaps, a minimum shield might not be enough. You need the full visual intelligence suite. Four AI engines, Grok, GPT, Gemini, and CryptoQuant working in sync. Real-time whale tracking, sentiment filters, 3-second decision-making. This isn't just trading, it's an unfair advantage. To celebrate our new defenders, we are opening the protocol campaign. For the next 50 people only, you can unlock everything at 50% off. That's full institutional protection for less than a dollar a day. But once those 50 spots are taken, this link expires and the price doubles. Don't leave your capital to chance. Upgrade your defense protocol. Use code DEFEND50 at checkout right now. Welcome to the full academy. Let's win together.
`.trim();

const GROK_PROMPT = `You are a YouTube title and conversion copy expert for crypto/BTC trading products.

We need YouTube video titles (English) for two VSLs. Output exactly two sections: "VSL1" and "VSL2". For each, propose 3–5 title options that are:
- Under 60 characters (YouTube best practice)
- CVR-focused: clear benefit or hook, optional urgency
- On-brand: product is "Trap Defence BTC" / "Defenders Academy"

---

**VSL1 — Free opt-in (Minimal Version).** Goal: get viewer to sign up for free trap score.
Script summary: Two traders, same day — one liquidated by a whale trap, one made $5K. "Hunter vs defender." Trap Defence visualizes the invisible, spots manipulation. Join Defenders Academy, get minimum edition trap score FREE. "Stop being the prey, become the defender."

Propose 3–5 YouTube title options for VSL1. Output format:
VSL1:
1. Title here
2. Title here
...

---

**VSL2 — Coupon upsell to paid (Regular Briefing).** Goal: get Minimal users to upgrade with code DEFEND50 (50% off, next 50 only).
Script summary: You've had Minimal 48h. "Minimum shows the door, full protocol shows the entire room." 4 AI engines, real-time. Protocol campaign: next 50 people, 50% off. Full protection for less than a dollar a day. Code DEFEND50 at checkout. Link expires when 50 spots are taken.

Propose 3–5 YouTube title options for VSL2. Output format:
VSL2:
1. Title here
2. Title here
...`;

const GEMINI_PROMPT = `You are a YouTube title and conversion copy expert for crypto/BTC trading products.

We need YouTube video titles (English) for two VSLs. Output exactly two sections: "VSL1" and "VSL2". For each, propose 3–5 title options that are:
- Under 60 characters (YouTube best practice)
- CVR-focused: clear benefit or hook, optional urgency
- On-brand: product is "Trap Defence BTC" / "Defenders Academy"

---

**VSL1 — Free opt-in (Minimal Version).** Goal: get viewer to sign up for free trap score.
Script summary: Two traders, same day — one liquidated by a whale trap, one made $5K. "Hunter vs defender." Trap Defence visualizes the invisible, spots manipulation. Join Defenders Academy, get minimum edition trap score FREE. "Stop being the prey, become the defender."

Propose 3–5 YouTube title options for VSL1. Output format:
VSL1:
1. Title here
2. Title here
...

---

**VSL2 — Coupon upsell to paid (Regular Briefing).** Goal: get Minimal users to upgrade with code DEFEND50 (50% off, next 50 only).
Script summary: You've had Minimal 48h. "Minimum shows the door, full protocol shows the entire room." 4 AI engines, real-time. Protocol campaign: next 50 people, 50% off. Full protection for less than a dollar a day. Code DEFEND50 at checkout. Link expires when 50 spots are taken.

Propose 3–5 YouTube title options for VSL2. Output format:
VSL2:
1. Title here
2. Title here
...`;

async function askGrok() {
  if (!XAI_API_KEY) return { success: false, error: "XAI_API_KEY is not set", model: GROK_MODEL };
  const client = new OpenAI({ apiKey: XAI_API_KEY, baseURL: XAI_BASE_URL });
  try {
    const res = await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a YouTube title and conversion copy expert. Output only the requested sections (VSL1 and VSL2) with numbered title options in English."
        },
        { role: "user", content: GROK_PROMPT }
      ],
      temperature: 0.6,
      max_tokens: 1500
    });
    const text = res.choices?.[0]?.message?.content?.trim() || "";
    return { success: true, analysis: text, model: GROK_MODEL };
  } catch (err) {
    return { success: false, error: err.message || String(err), model: GROK_MODEL };
  }
}

async function askGemini() {
  if (!GEMINI_API_KEY)
    return { success: false, error: "GEMINI_API_KEY is not set", model: GEMINI_MODEL };
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.6, maxOutputTokens: 1500 }
  });
  try {
    const result = await model.generateContent(GEMINI_PROMPT);
    const response = result.response;
    const text = response ? response.text() : "";
    return { success: true, analysis: text.trim(), model: GEMINI_MODEL };
  } catch (err) {
    return { success: false, error: err.message || String(err), model: GEMINI_MODEL };
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  console.log("📺 VSL タイトル案を Grok と Gemini に依頼します...\n");
  console.log("Grok model:", GROK_MODEL);
  console.log("Gemini model:", GEMINI_MODEL);
  console.log("XAI_API_KEY:", XAI_API_KEY ? `${XAI_API_KEY.slice(0, 8)}...` : "not set");
  console.log("GEMINI_API_KEY:", GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : "not set\n");

  const [grokResult, geminiResult] = await Promise.all([askGrok(), askGemini()]);

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  ensureDir(outDir);
  const outFile = path.join(outDir, `VSL_TITLES_GROK_GEMINI_${dateStr}.md`);

  let md = `# VSL タイトル案 — Grok & Gemini\n\n`;
  md += `**生成日時**: ${now.toISOString()}\n\n`;
  md += `- **VSL1**: 無料版オプトイン (Minimal Opt-in)\n`;
  md += `- **VSL2**: クーポンで有料版アップセル (DEFEND50)\n\n`;
  md += `---\n\n`;

  md += `## Grok (${GROK_MODEL})\n\n`;
  if (grokResult.success) {
    md += grokResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${grokResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n`;
  md += `## Gemini (${GEMINI_MODEL})\n\n`;
  if (geminiResult.success) {
    md += geminiResult.analysis + "\n\n";
  } else {
    md += `\`\`\`\nError: ${geminiResult.error}\n\`\`\`\n\n`;
  }

  md += `---\n\n*scripts/request-vsl-titles-from-grok-gemini.js で生成*\n`;

  fs.writeFileSync(outFile, md, "utf8");
  console.log("✅ 結果を保存しました:", outFile);
  console.log("\n--- Grok ---");
  console.log(grokResult.success ? grokResult.analysis : grokResult.error);
  console.log("\n--- Gemini ---");
  console.log(geminiResult.success ? geminiResult.analysis : geminiResult.error);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
