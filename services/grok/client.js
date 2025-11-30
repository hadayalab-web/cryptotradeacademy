const OpenAI = require('openai');

// Grok (xAI) API Configuration
const GROK_API_KEY = process.env.GROK_API_KEY;
const BASE_URL = 'https://api.x.ai/v1'; // xAI official endpoint

if (!GROK_API_KEY) {
    console.warn("⚠️ GROK_API_KEY is not set in environment variables.");
}

const openai = new OpenAI({
    apiKey: GROK_API_KEY,
    baseURL: BASE_URL
});

/**
 * Analyze market data using Grok
 * @param {string} marketData - JSON string of market metrics
 * @returns {Promise<string>} - AI analysis result
 */
async function analyzeMarket(marketData) {
    try {
        const completion = await openai.chat.completions.create({
            model: "grok-4-1-fast-reasoning", // or appropriate model version
            messages: [
                {
                    role: "system",
                    content: "You are an expert crypto analyst. Analyze the provided market data (On-chain, Exchange Flow, Sentiment) and determine if it's a BUY, SELL, or HOLD signal. Be concise and data-driven."
                },
                {
                    role: "user",
                    content: `Analyze this data:\n${marketData}`
                }
            ]
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("❌ Grok Analysis Error:", error);
        return "Analysis failed due to API error.";
    }
}

module.exports = { analyzeMarket };
