// services/x/contentOptimizer.js
// GrokのXアルゴリズム最適化 × Geminiの心理最適化でファネルと投稿を最適化
// ペルソナ決め打ち: CVR・LTV 最大化のため personaStrategy を統合戦略に注入

const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getPersonaPromptContext } = require("../config/personaStrategy");

// Vercel KV（キャッシュ用）
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[X Content Optimizer] @vercel/kv not available:", error.message);
}

const XAI_API_KEY = process.env.XAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

// 本番で変更する場合は環境変数で上書き
const GROK_MODEL = process.env.GROK_MODEL_X_LIVE || process.env.GROK_MODEL_HIGH_RES || "grok-4-1-fast-reasoning";
const GEMINI_MODEL = process.env.GEMINI_CONTENT_OPTIMIZER_MODEL || "gemini-3-flash-preview";

// P0 FIX: 環境変数がない場合でもエラーを出さないように遅延初期化
let grokClient = null;
let geminiClient = null;

try {
  if (XAI_API_KEY) {
    grokClient = new OpenAI({
      apiKey: XAI_API_KEY,
      baseURL: XAI_BASE_URL
    });
  } else {
    console.warn("[X Content Optimizer] XAI_API_KEY not set, Grok client will not be available");
  }
} catch (error) {
  console.warn("[X Content Optimizer] Failed to initialize Grok client:", error.message);
}

try {
  if (GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  } else {
    console.warn(
      "[X Content Optimizer] GEMINI_API_KEY not set, Gemini client will not be available"
    );
  }
} catch (error) {
  console.warn("[X Content Optimizer] Failed to initialize Gemini client:", error.message);
}

/**
 * GrokでXアルゴリズム分析を実行（最上位モデル）
 * @param {Object} options - オプション
 * @param {Object} options.currentMetrics - 現在のメトリクス（インプレッション、エンゲージメント等）
 * @param {Object} options.marketData - 市場データ
 * @param {Object} options.xSentiment - Xセンチメントデータ
 * @param {string} options.lang - 言語コード
 * @returns {Promise<Object>} Xアルゴリズム分析結果
 */
async function analyzeXAlgorithmWithGrok(options = {}) {
  const { currentMetrics = {}, marketData = {}, xSentiment = {}, lang = "en" } = options;

  if (!XAI_API_KEY || !grokClient) {
    console.warn(
      "[X Content Optimizer] XAI_API_KEY not set or Grok client not initialized, skipping Grok analysis"
    );
    return null;
  }

  const prompt = `あなたはX（Twitter）アルゴリズムの専門家です。2026年のXアルゴリズムの最新動向を分析し、エンゲージメント率とコンバージョン率を最大化するための戦略を提供してください。

## 現在の状況
- インプレッション: ${currentMetrics.impressions || "N/A"}
- エンゲージメント: ${currentMetrics.engagements || "N/A"}
- エンゲージメント率: ${currentMetrics.engagementRate ? `${(currentMetrics.engagementRate * 100).toFixed(3)}%` : "N/A"}
- 市場データ: ${JSON.stringify(marketData)}
- 市場センチメント: ${JSON.stringify(xSentiment)}
- 言語: ${lang}

## 分析依頼事項

1. **Xアルゴリズムの最新動向（2026年）**
   - エンゲージメント率に影響する主要な要素
   - アルゴリズムが評価する投稿の特徴
   - タイミング、フォーマット、コンテンツタイプの最適化
   - ファネル最適化（Telegramオプトイン、Whopコンバージョン）

2. **エンゲージメント率とCVRの根本原因分析**
   - インプレッションは高いがエンゲージメントが低い理由
   - 投稿内容、タイミング、フォーマットの問題点
   - CTA（Call to Action）の問題点
   - ファネルの問題点

3. **即座に実行すべき最適化戦略**
   - 投稿内容の改善（質問CTA、リンク、ハッシュタグ、絵文字）
   - 投稿タイミングの最適化
   - フォーマットの最適化（テキスト、画像、動画、ポール）
   - ファネル最適化（Telegram Deep Link、Whopリンク、プロモーションコード）

4. **具体的な実装ガイドライン**
   - 投稿内容生成のプロンプト改善
   - 長文ポスト対応（最大25,000文字）の最適化
   - エンゲージメント要素の優先順位
   - CVR向上のための戦略

以下のJSON形式で出力してください：
{
  "algorithmInsights": {
    "keyFactors": ["要素1", "要素2", "要素3"],
    "engagementDrivers": ["ドライバー1", "ドライバー2"],
    "timingOptimization": "タイミング最適化の説明",
    "formatOptimization": "フォーマット最適化の説明",
    "funnelOptimization": "ファネル最適化の説明"
  },
  "rootCauseAnalysis": {
    "primaryCause": "主要原因",
    "secondaryCauses": ["原因1", "原因2"],
    "impact": "影響の説明"
  },
  "optimizationStrategies": {
    "immediate": ["即座に実行すべき施策1", "施策2"],
    "shortTerm": ["短期施策1", "施策2"],
    "contentGuidelines": {
      "questionCTA": "質問CTAの最適化方法",
      "links": "リンクの最適化方法",
      "hashtags": "ハッシュタグの最適化方法",
      "emoji": "絵文字の最適化方法",
      "funnel": "ファネルの最適化方法"
    }
  },
  "implementationGuide": {
    "promptImprovements": "プロンプト改善の具体的な内容",
    "characterLimitStrategy": "文字数制限の戦略",
    "priorityOrder": ["優先順位1", "優先順位2"]
  }
}`;

  try {
    const completion = await grokClient.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "あなたはX（Twitter）アルゴリズムの専門家です。2026年の最新動向を分析し、エンゲージメント率とコンバージョン率を最大化するための戦略を提供します。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const response = completion?.choices?.[0]?.message?.content?.trim();
    if (!response) {
      throw new Error("Grok analysis failed: empty response");
    }

    // JSONパース（再試行付き）
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // JSONパース失敗時、1回だけ再試行をリクエスト
      console.warn("[X Content Optimizer] Grok JSON parse failed, attempting retry...");
      try {
        const retryCompletion = await grokClient.chat.completions.create({
          model: GROK_MODEL,
          messages: [
            {
              role: "system",
              content:
                "あなたはX（Twitter）アルゴリズムの専門家です。2026年の最新動向を分析し、エンゲージメント率とコンバージョン率を最大化するための戦略を提供します。"
            },
            {
              role: "user",
              content:
                prompt +
                "\n\n重要: 前回の応答がJSON形式でなかったため、厳密にJSON形式のみで出力してください。"
            }
          ],
          max_tokens: 3000,
          temperature: 0.7,
          response_format: { type: "json_object" }
        });
        const retryResponse = retryCompletion?.choices?.[0]?.message?.content?.trim();
        if (retryResponse) {
          return JSON.parse(retryResponse);
        }
      } catch (retryError) {
        console.error("[X Content Optimizer] Grok retry also failed:", retryError.message);
      }
      throw parseError;
    }
  } catch (error) {
    const errorDetails = {
      message: error.message || "Unknown error",
      status: error.status || error.statusCode || null,
      response: error.response
        ? typeof error.response === "string"
          ? error.response.substring(0, 200)
          : JSON.stringify(error.response).substring(0, 200)
        : null,
      requestId: error.requestId || null,
      stack: error.stack ? error.stack.split("\n").slice(0, 3).join("\n") : null
    };
    console.error("[X Content Optimizer] Grok X Algorithm Analysis Error:", {
      message: errorDetails.message,
      status: errorDetails.status,
      response: errorDetails.response,
      requestId: errorDetails.requestId,
      stack: errorDetails.stack
    });
    return null;
  }
}

/**
 * Geminiで心理分析を実行（最上位モデル）
 * @param {Object} options - オプション
 * @param {Object} options.currentMetrics - 現在のメトリクス
 * @param {Object} options.marketData - 市場データ
 * @param {Object} options.xSentiment - Xセンチメントデータ
 * @param {string} options.lang - 言語コード
 * @returns {Promise<Object>} 心理分析結果
 */
async function analyzePsychologyWithGemini(options = {}) {
  const { currentMetrics = {}, marketData = {}, xSentiment = {}, lang = "en" } = options;

  if (!GEMINI_API_KEY) {
    console.warn("[X Content Optimizer] GEMINI_API_KEY not set, skipping Gemini analysis");
    return null;
  }

  if (!GEMINI_API_KEY || !geminiClient) {
    console.warn(
      "[X Content Optimizer] GEMINI_API_KEY not set or Gemini client not initialized, skipping Gemini analysis"
    );
    return null;
  }

  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `あなたは高エンゲージメント率と高CVR（コンバージョン率）を実現する心理戦略の専門家です。X（Twitter）でのエンゲージメント率とCVRを最大化するための心理的アルゴリズムを分析してください。

## 現在の状況
- インプレッション: ${currentMetrics.impressions || "N/A"}
- エンゲージメント: ${currentMetrics.engagements || "N/A"}
- エンゲージメント率: ${currentMetrics.engagementRate ? `${(currentMetrics.engagementRate * 100).toFixed(3)}%` : "N/A"}
- 市場データ: ${JSON.stringify(marketData)}
- 市場センチメント: ${JSON.stringify(xSentiment)}
- 言語: ${lang}

## 分析依頼事項

1. **高エンゲージメント率の心理的アルゴリズム**
   - エンゲージメントを引き出す心理的トリガー
   - 質問CTA、リンク、ハッシュタグの心理的最適配置
   - 感情的なインパクトを最大化する方法
   - 認知バイアスの活用方法（FOMO、損失回避、社会的証明等）

2. **高CVR（コンバージョン率）の心理的アルゴリズム**
   - Telegramオプトインを最大化する心理的戦略
   - Whopコンバージョンを最大化する心理的戦略
   - コンバージョンファネルの心理的最適化
   - 行動喚起（CTA）の心理的設計

3. **エンゲージメント率0.003%の心理的根本原因分析**
   - コンテンツの心理的問題点
   - CTAの心理的問題点
   - フォーマットの心理的問題点
   - ファネルの心理的問題点

4. **具体的な心理的実装ガイドライン**
   - 投稿内容生成の心理的最適化
   - エンゲージメント要素の心理的優先順位
   - CVR向上のための心理的戦略
   - 言語別の心理的アプローチ

以下のJSON形式で出力してください：
{
  "psychologicalAlgorithm": {
    "keyTriggers": ["心理的トリガー1", "心理的トリガー2", "心理的トリガー3"],
    "contentStructure": "心理的コンテンツ構造の説明",
    "psychologicalTriggers": ["トリガー1", "トリガー2"],
    "optimalFormat": "心理的最適なフォーマット",
    "cognitiveBiases": ["認知バイアス1", "認知バイアス2"]
  },
  "cvrPsychologicalAlgorithm": {
    "telegramOptIn": {
      "strategy": "Telegramオプトインの心理的戦略",
      "ctaOptimization": "CTAの心理的最適化",
      "funnelOptimization": "ファネルの心理的最適化",
      "psychologicalTriggers": ["心理的トリガー1", "心理的トリガー2"]
    },
    "whopConversion": {
      "strategy": "Whopコンバージョンの心理的戦略",
      "linkPlacement": "リンク配置の心理的最適化",
      "promoOptimization": "プロモーションの心理的最適化",
      "psychologicalTriggers": ["心理的トリガー1", "心理的トリガー2"]
    }
  },
  "rootCauseAnalysis": {
    "psychologicalIssues": ["心理的問題1", "心理的問題2"],
    "cvrIssues": ["CVR問題1", "CVR問題2"],
    "recommendations": ["推奨事項1", "推奨事項2"]
  },
  "implementationGuide": {
    "contentOptimization": "コンテンツの心理的最適化の具体的な内容",
    "ctaStrategy": "CTAの心理的戦略",
    "priorityOrder": ["優先順位1", "優先順位2"],
    "languageSpecific": {
      "${lang}": "言語別の心理的アプローチ"
    }
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSONを抽出（```json で囲まれている場合）
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // より厳密なJSON抽出（最初の{から最後の}まで）
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonMatch = [null, text.substring(firstBrace, lastBrace + 1)];
      }
    }
    const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

    // JSONパース（再試行付き）
    try {
      return JSON.parse(jsonText);
    } catch (parseError) {
      // JSONパース失敗時、1回だけ再試行をリクエスト
      console.warn("[X Content Optimizer] Gemini JSON parse failed, attempting retry...");
      try {
        const retryResult = await model.generateContent(
          prompt +
            "\n\n重要: 前回の応答がJSON形式でなかったため、厳密にJSON形式のみで出力してください。"
        );
        const retryResponse = retryResult.response;
        const retryText = retryResponse.text();
        const retryJsonMatch =
          retryText.match(/```json\s*([\s\S]*?)\s*```/) || retryText.match(/\{[\s\S]*\}/);
        const retryJsonText = retryJsonMatch ? retryJsonMatch[1] || retryJsonMatch[0] : retryText;
        if (retryJsonText) {
          return JSON.parse(retryJsonText);
        }
      } catch (retryError) {
        console.error("[X Content Optimizer] Gemini retry also failed:", retryError.message);
      }
      throw parseError;
    }
  } catch (error) {
    const errorDetails = {
      message: error.message || "Unknown error",
      status: error.status || error.statusCode || null,
      response: error.response
        ? typeof error.response === "string"
          ? error.response.substring(0, 200)
          : JSON.stringify(error.response).substring(0, 200)
        : null,
      stack: error.stack ? error.stack.split("\n").slice(0, 3).join("\n") : null
    };
    console.error("[X Content Optimizer] Gemini Psychological Analysis Error:", {
      message: errorDetails.message,
      status: errorDetails.status,
      response: errorDetails.response,
      stack: errorDetails.stack
    });
    return null;
  }
}

/**
 * GrokとGeminiの分析結果を統合して最適化戦略を生成
 * @param {Object} options - オプション
 * @param {Object} options.currentMetrics - 現在のメトリクス
 * @param {Object} options.marketData - 市場データ
 * @param {Object} options.xSentiment - Xセンチメントデータ
 * @param {string} options.lang - 言語コード
 * @returns {Promise<Object>} 統合最適化戦略
 */
async function optimizeContentAndFunnel(options = {}) {
  const { currentMetrics = {}, marketData = {}, xSentiment = {}, lang = "en" } = options;

  console.log("[X Content Optimizer] 🔄 GrokとGeminiの分析を統合中...");

  try {
    // GrokとGeminiを並列実行（Promise.allSettledでエラー耐性を確保）
    console.log("[X Content Optimizer] 1️⃣ GrokとGeminiの分析を並列実行中...");
    const [grokResult, geminiResult] = await Promise.allSettled([
      analyzeXAlgorithmWithGrok({
        currentMetrics,
        marketData,
        xSentiment,
        lang
      }),
      analyzePsychologyWithGemini({
        currentMetrics,
        marketData,
        xSentiment,
        lang
      })
    ]);

    const grokAnalysis = grokResult.status === "fulfilled" ? grokResult.value : null;
    const geminiAnalysis = geminiResult.status === "fulfilled" ? geminiResult.value : null;

    if (grokResult.status === "rejected") {
      console.warn(
        "[X Content Optimizer] ⚠️ Grok analysis failed:",
        grokResult.reason?.message || grokResult.reason
      );
    }
    if (geminiResult.status === "rejected") {
      console.warn(
        "[X Content Optimizer] ⚠️ Gemini analysis failed:",
        geminiResult.reason?.message || geminiResult.reason
      );
    }

    // 両方失敗した場合はnullを返す（呼び出し側でフォールバック）
    if (!grokAnalysis && !geminiAnalysis) {
      console.warn("[X Content Optimizer] ⚠️ Both Grok and Gemini analyses failed, returning null");
      return null;
    }

    // 3. 統合結果を生成
    console.log("[X Content Optimizer] 3️⃣ 統合結果を生成中...");
    const integratedStrategy = {
      timestamp: new Date().toISOString(),
      grokAnalysis,
      geminiAnalysis,
      optimization: {
        content: {
          questionCTA:
            grokAnalysis?.optimizationStrategies?.contentGuidelines?.questionCTA ||
            geminiAnalysis?.psychologicalAlgorithm?.keyTriggers?.[0] ||
            "質問CTAを投稿の最後に配置し、明確な行動喚起を含める",
          links:
            grokAnalysis?.optimizationStrategies?.contentGuidelines?.links ||
            geminiAnalysis?.cvrPsychologicalAlgorithm?.whopConversion?.linkPlacement ||
            "リンクを質問CTAの前に配置し、プロモーションコードを含める",
          hashtags:
            grokAnalysis?.optimizationStrategies?.contentGuidelines?.hashtags ||
            "トレンドハッシュタグ1つ + ニッチハッシュタグ2-3つ",
          emoji:
            grokAnalysis?.optimizationStrategies?.contentGuidelines?.emoji ||
            geminiAnalysis?.psychologicalAlgorithm?.optimalFormat ||
            "絵文字は2-3個、感情的なインパクトを最大化",
          psychologicalTriggers:
            geminiAnalysis?.psychologicalAlgorithm?.psychologicalTriggers || [],
          cognitiveBiases: geminiAnalysis?.psychologicalAlgorithm?.cognitiveBiases || []
        },
        timing:
          grokAnalysis?.algorithmInsights?.timingOptimization ||
          "ピーク時間（UTC 0,1,20,21）に投稿",
        format:
          grokAnalysis?.algorithmInsights?.formatOptimization ||
          geminiAnalysis?.psychologicalAlgorithm?.optimalFormat ||
          "テキスト + 質問CTA + リンク + ハッシュタグ",
        funnel: {
          telegramOptIn:
            geminiAnalysis?.cvrPsychologicalAlgorithm?.telegramOptIn?.strategy ||
            grokAnalysis?.algorithmInsights?.funnelOptimization ||
            "Telegram Deep Linkを明確に表示し、無料価値を強調",
          whopConversion:
            geminiAnalysis?.cvrPsychologicalAlgorithm?.whopConversion?.strategy ||
            "Whopリンクを優先的に配置し、プロモーションコード（DEFEND50）を含める",
          psychologicalTriggers: [
            ...(geminiAnalysis?.cvrPsychologicalAlgorithm?.telegramOptIn?.psychologicalTriggers ||
              []),
            ...(geminiAnalysis?.cvrPsychologicalAlgorithm?.whopConversion?.psychologicalTriggers ||
              [])
          ]
        },
        persona: getPersonaPromptContext(),
        priorityOrder: [
          ...(grokAnalysis?.implementationGuide?.priorityOrder || []),
          ...(geminiAnalysis?.implementationGuide?.priorityOrder || [])
        ]
      }
    };

    console.log("[X Content Optimizer] ✅ 統合完了");

    // キャッシュに保存（15分TTL）
    if (kv) {
      try {
        const cacheKey = generateCacheKey(currentMetrics, marketData, xSentiment, lang);
        await kv.setex(cacheKey, 900, integratedStrategy); // 900秒 = 15分
        console.log("[X Content Optimizer] 💾 Cached:", cacheKey);
      } catch (error) {
        console.warn("[X Content Optimizer] Cache save failed:", error.message);
      }
    }

    return integratedStrategy;
  } catch (error) {
    const errorDetails = {
      message: error.message || "Unknown error",
      stack: error.stack ? error.stack.split("\n").slice(0, 5).join("\n") : null
    };
    console.error("[X Content Optimizer] ❌ 統合エラー:", {
      message: errorDetails.message,
      stack: errorDetails.stack
    });
    // エラー時はnullを返してフォールバックを許可
    return null;
  }
}

module.exports = {
  analyzeXAlgorithmWithGrok,
  analyzePsychologyWithGemini,
  optimizeContentAndFunnel
};
