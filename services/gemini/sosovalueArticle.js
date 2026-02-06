// services/gemini/sosovalueArticle.js
// Gemini役割: 「次のアクションを指示してくれる記事」を書く（SoSoValue風・トレーダー向け）

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_SOSOVALUE_MODEL =
  process.env.GEMINI_SOSOVALUE_MODEL || process.env.GEMINI_MODEL || "gemini-3-flash-preview";

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

  const prompt = `あなたはSoSoValueやOdailyのような暗号通貨メディアのアナリストです。
役割: **「次のアクションを指示してくれる記事」**を書くこと。読んだトレーダーが「今、何をすべきか」がはっきり分かるようにしてください。

以下のオンチェーンデータに基づき、記事（400〜800文字程度）を作成してください。
${dataSummary}

必須要件:
- 見出し1行 + 本文2〜4段落。
- **推奨アクションを明示する**: 「今すべきこと」「避けるべきこと」「注目すべき水準」のいずれかまたは複数を、具体的に1〜3文で書く。
- データ（価格・ネットフロー・MPI・Trap Scoreなど）を織り交ぜ、その根拠を示してからアクションを指示する。
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
