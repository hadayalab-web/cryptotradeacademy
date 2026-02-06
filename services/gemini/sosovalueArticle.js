// services/gemini/sosovalueArticle.js
// Gemini: CQの最新データと過去の類似データを比較し「過去はこんな相場になった」SoSoValue風の記事を作成

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_SOSOVALUE_MODEL =
  process.env.GEMINI_SOSOVALUE_MODEL || process.env.GEMINI_MODEL || "gemini-3-flash-preview";

/**
 * CQ最新データ（と任意で過去比較メモ）からSoSoValue風の短い記事を1本生成
 * @param {Object} options - { cqData: { priceUsd, change24h, inflow, mpi, trapScore?, ... }, pastSummary?: string, lang?: string }
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

  const prompt = `あなたはSoSoValueやOdailyのような暗号通貨ニュースメディアのアナリストです。
以下のオンチェーンデータに基づき、「過去はこんな相場になった」または「現在のCQから読み取れる示唆」を簡潔なSoSoValue風の記事（400〜800文字程度）にまとめてください。
${dataSummary}

要件:
- 見出し1行 + 本文2〜4段落。データを織り交ぜ、トレーダーが役に立つ示唆を1つ含める。
- URL・ハッシュタグは出さない。
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
