// scripts/generate-premium-content.js
// Premium Tier向けコンテンツ生成スクリプト

const { generateSosovalueNews } = require("./generate-sosovalue-news");
const { improveArticleWithGrokFeedback } = require("./improve-article-with-grok-feedback");
const { generateXStrategyWithGrok } = require("./generate-x-strategy-with-grok");
const {
  uploadDailyContentToThinkific,
  uploadWeeklyContentToThinkific
} = require("./upload-to-thinkific");

/**
 * Premium Tier向け週次サマリーレポートを生成
 */
async function generateWeeklySummaryReport(onchainData, weeklyArticles) {
  // 過去1週間の記事をまとめて分析
  const summaryPrompt = `あなたは暗号通貨市場分析の専門家です。

過去1週間のTrap Defence BTC分析記事をまとめて、週次サマリーレポートを生成してください。

## 過去1週間の記事
${weeklyArticles.map((article, index) => `### ${index + 1}日目\n${article.substring(0, 500)}...`).join("\n\n")}

## 現在の市場データ
- BTC価格: $${onchainData.current.price.toLocaleString()}
- Trap Score: ${onchainData.current.trapScore || "N/A"}/10
- Exchange Netflow: ${onchainData.current.exchangeNetflow?.toFixed(2) || "N/A"} BTC
- MPI: ${onchainData.current.mpi?.toFixed(2) || "N/A"}

## レポート要件
以下の構成で、Premium Tier会員向けの詳細な週次サマリーレポートを生成してください：

1. **週間市場サマリー**（300-400文字）
   - 過去1週間の主要な市場動向
   - Trap Scoreの推移
   - 重要なイベント

2. **トレンド分析**（400-500文字）
   - オンチェーンデータの傾向
   - 過去データとの比較
   - 類似パターンの分析

3. **リスク評価**（300-400文字）
   - 現在のリスクレベル
   - 潜在的なトラップ
   - 推奨アクション

4. **来週の展望**（300-400文字）
   - 予測される市場動向
   - 注意すべきポイント
   - Premium Tier会員への推奨事項

日本語で、プロフェッショナルで詳細なレポートを生成してください。`;

  // Gemini APIを呼び出してレポート生成
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: summaryPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000
        }
      })
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "レポートが生成できませんでした。";
}

/**
 * Premium Tier向けカスタム分析リクエストを処理
 */
async function processCustomAnalysisRequest(userQuery, onchainData) {
  const customPrompt = `あなたは暗号通貨市場分析の専門家です。

Premium Tier会員からのカスタム分析リクエストに応じて、詳細な分析を提供してください。

## ユーザーリクエスト
${userQuery}

## 現在の市場データ
- BTC価格: $${onchainData.current.price.toLocaleString()}
- Trap Score: ${onchainData.current.trapScore || "N/A"}/10
- Exchange Netflow: ${onchainData.current.exchangeNetflow?.toFixed(2) || "N/A"} BTC
- MPI: ${onchainData.current.mpi?.toFixed(2) || "N/A"}

## 分析要件
ユーザーのリクエストに基づいて、以下の点を含む詳細な分析を提供してください：

1. **リクエストへの直接回答**
2. **関連するオンチェーンデータの分析**
3. **過去データとの比較**
4. **リスク評価**
5. **推奨アクション**

日本語で、プロフェッショナルで詳細な分析を生成してください。`;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: customPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000
        }
      })
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "分析が生成できませんでした。";
}

/**
 * Premium Tier向けコンテンツ生成のメイン処理
 */
async function generatePremiumContent(options = {}) {
  const {
    includeWeeklySummary = false,
    customAnalysisRequest = null,
    uploadToThinkific = false
  } = options;

  console.log("💎 Premium Tier向けコンテンツ生成を開始...\n");

  try {
    // 1. 通常の記事生成（Regular Briefingと同じ）
    console.log("📝 通常記事を生成中...");
    const articleResult = await generateSosovalueNews();
    const article = articleResult.article;
    const onchainData = articleResult.onchainData;

    // 2. Grokで改善
    console.log("🤖 Grokで記事を改善中...");
    const improvedResult = await improveArticleWithGrokFeedback(article, onchainData);
    const finalArticle = improvedResult.improvedArticle;

    // 3. 週次サマリー生成（オプション）
    let weeklySummary = null;
    if (includeWeeklySummary) {
      console.log("📊 週次サマリーレポートを生成中...");
      // 過去1週間の記事を取得（実際の実装ではデータベースから取得）
      const weeklyArticles = [finalArticle]; // 仮のデータ
      weeklySummary = await generateWeeklySummaryReport(onchainData, weeklyArticles);
    }

    // 4. カスタム分析リクエスト処理（オプション）
    let customAnalysis = null;
    if (customAnalysisRequest) {
      console.log("🔍 カスタム分析を生成中...");
      customAnalysis = await processCustomAnalysisRequest(customAnalysisRequest, onchainData);
    }

    // 5. Thinkificにアップロード（オプション）
    if (uploadToThinkific) {
      console.log("📤 Thinkificにアップロード中...");
      await uploadDailyContentToThinkific(finalArticle);

      if (weeklySummary) {
        await uploadWeeklyContentToThinkific(weeklySummary, "週次サマリーレポート");
      }
    }

    return {
      article: finalArticle,
      weeklySummary,
      customAnalysis,
      onchainData
    };
  } catch (error) {
    console.error("❌ Premium Tierコンテンツ生成エラー:", error);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log("🚀 Premium Tierコンテンツ生成スクリプト\n");
  console.log("=".repeat(80));

  try {
    const result = await generatePremiumContent({
      includeWeeklySummary: true,
      uploadToThinkific: false // Thinkific APIキーが設定されている場合のみtrue
    });

    console.log("\n" + "=".repeat(80));
    console.log("✅ Premium Tierコンテンツ生成完了");
    console.log("=".repeat(80) + "\n");

    if (result.weeklySummary) {
      console.log("📊 週次サマリーレポート:");
      console.log(result.weeklySummary.substring(0, 500) + "...\n");
    }
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  generatePremiumContent,
  generateWeeklySummaryReport,
  processCustomAnalysisRequest
};
