// services/gemini/sosovalueArticle.js
// Gemini役割: 「次のアクションを指示してくれる記事」を書く（SoSoValue風・トレーダー向け）

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_SOSOVALUE_MODEL =
  process.env.GEMINI_SOSOVALUE_MODEL || process.env.GEMINI_MODEL || "gemini-3-pro-preview";

/**
 * 次のアクションを指示する記事を1本生成（Gemini役割: 記事で「何をすべきか」を明示）
 * @param {Object} options - { cqData, pastSummary?, lang? }
 * @returns {Promise<string|null>}
 */
async function generateSosovalueStyleArticle(options = {}) {
  const { cqData = {}, pastSummary = null, lang = "ja" } = options;
  if (!GEMINI_API_KEY) {
    console.warn("[Gemini SoSoValue] GEMINI_API_KEY not set");
    return null;
  }

  const priceUsd = cqData.priceUsd ?? cqData.price ?? 0;
  const change24h = cqData.change24h ?? 0;
  const inflow = cqData.inflow ?? cqData.exchangeNetflow ?? null;
  const mpi = cqData.mpi ?? null;
  const trapScore = cqData.trapScore ?? null;

  const dataSummary = `
## 現在のオンチェーンデータ（CryptoQuant）
- BTC価格: $${Number(priceUsd).toLocaleString()}
- 24h変動: ${Number(change24h).toFixed(2)}%
- 取引所ネットフロー（流入/流出）: ${inflow != null ? inflow : "N/A"}
- マイナーポジションインデックス(MPI): ${mpi != null ? mpi : "N/A"}
${trapScore != null ? `- Trap Score: ${trapScore}/100` : ""}
${pastSummary ? `\n## 過去類似データ\n${pastSummary}` : ""}
`;

  const langNote =
    lang === "ja"
      ? "日本語で出力してください。"
      : lang === "en"
        ? "Output in English."
        : "Output in the same language as the user.";

  const prompt = `You are the Trap Defence Macro Engine. Your role: Analyze CQ on-chain data and produce **Macro Engine output** (macro pressure, volatility drivers, liquidity regime, external risks).

Output structure (include these sections):
1. **Macro pressure**: External pressure on BTC (ETF flows, institutional, global risk sentiment).
2. **Volatility drivers**: Key factors driving near-term volatility (netflow, MPI, funding).
3. **Liquidity regime**: Current liquidity conditions (supply/demand, exchange flows).
4. **External risks**: Headlines, regulatory, or macro shocks that could affect price.
5. **Action guidance**: What traders should watch or avoid (1-2 sentences).

Data:
${dataSummary}

Requirements:
- 400-800 words. Headline 1 line + body 2-4 paragraphs.
- Data-driven. No URL or hashtags. No trading advice—structural analysis only.
${langNote}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_SOSOVALUE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1200
        }
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    return text;
  } catch (e) {
    console.warn("[Gemini SoSoValue] generate failed:", e.message);
    return null;
  }
}

module.exports = {
  generateSosovalueStyleArticle
};
