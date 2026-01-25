// services/openai/algorithmAnalyzer.js
// OpenAI GPTを使用したXアルゴリズム分析（アルゴリズム解析系が得意）

const { getDailyEngagementMetrics } = require('../../api/x-engagement-metrics');
const { getABTestResults, getOptimalVariant } = require('../x/abTesting');
const { analyzeInfluencerPerformance } = require('../x/influencerAnalyzer');

/**
 * OpenAI APIクライアントを初期化
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[OpenAI Algorithm Analyzer] OPENAI_API_KEY not set');
    return null;
  }
  
  // OpenAI API v1を使用（fetchベース）
  return {
    apiKey,
    baseURL: 'https://api.openai.com/v1',
  };
}

/**
 * GPTを使用してXアルゴリズムの動向を分析
 * @param {Object} metricsData - メトリクスデータ
 * @param {Object} abTestData - A/Bテストデータ
 * @param {Object} influencerData - インフルエンサーデータ
 * @returns {Promise<Object>} アルゴリズム分析結果
 */
async function analyzeXAlgorithm(metricsData, abTestData, influencerData) {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }
  
  try {
    // メトリクスデータを要約
    const metricsSummary = {
      avgEngagementRate: metricsData?.avgEngagementRate || 0,
      avgClickRate: metricsData?.avgClickRate || 0,
      totalImpressions: metricsData?.totalImpressions || 0,
      totalEngagements: metricsData?.totalEngagements || 0,
      totalClicks: metricsData?.totalClicks || 0,
      trends: metricsData?.trends || {},
    };
    
    // A/Bテスト結果を要約
    const abTestSummary = Object.keys(abTestData || {}).map(testName => ({
      testName,
      variants: Object.keys(abTestData[testName] || {}).map(variant => ({
        variant,
        ...abTestData[testName][variant],
      })),
    }));
    
    // インフルエンサーデータを要約
    const influencerSummary = (influencerData || []).slice(0, 10).map(inf => ({
      username: inf.username,
      avgEngagementRate: inf.avgEngagementRate,
      avgClickRate: inf.avgClickRate,
      totalImpressions: inf.totalImpressions,
    }));
    
    // GPTに分析を依頼
    const prompt = `あなたはX（旧Twitter）アルゴリズムの専門アナリストです。以下のデータを分析して、Xアルゴリズムの動向と最適化戦略を提案してください。

## メトリクスデータ
- 平均エンゲージメント率: ${metricsSummary.avgEngagementRate.toFixed(2)}%
- 平均クリック率: ${metricsSummary.avgClickRate.toFixed(2)}%
- 総インプレッション: ${metricsSummary.totalImpressions.toLocaleString()}
- 総エンゲージメント: ${metricsSummary.totalEngagements.toLocaleString()}
- 総クリック数: ${metricsSummary.totalClicks.toLocaleString()}

## A/Bテスト結果
${JSON.stringify(abTestSummary, null, 2)}

## インフルエンサー効果（トップ10）
${JSON.stringify(influencerSummary, null, 2)}

## 分析タスク
1. **アルゴリズム動向の分析**: 現在のXアルゴリズムがどのようなコンテンツを優先しているか
2. **エンゲージメントパターンの発見**: どのような投稿形式・タイミング・コンテンツが効果的か
3. **最適化戦略の提案**: インプレッションとエンゲージメントを向上させる具体的な戦略
4. **リスク要因の特定**: アルゴリズム評価を下げる可能性のある要因

## 出力形式
以下のJSON形式で回答してください：
{
  "algorithmTrends": {
    "contentPreference": "動画/画像/テキストの優先度",
    "timingPreference": "最適な投稿タイミング",
    "engagementSignals": "アルゴリズムが重視するエンゲージメントシグナル"
  },
  "optimizationStrategies": [
    {
      "strategy": "戦略名",
      "description": "詳細説明",
      "expectedImpact": "期待される効果",
      "priority": "high/medium/low"
    }
  ],
  "riskFactors": [
    {
      "factor": "リスク要因",
      "description": "説明",
      "mitigation": "対策"
    }
  ],
  "recommendations": [
    "具体的な推奨事項1",
    "具体的な推奨事項2"
  ]
}`;

    const response = await fetch(`${client.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2', // GPT-5.2を使用（Grok推奨: 推論能力・長文脈理解・エージェント機能で優位、CEO推奨と一致）
        messages: [
          {
            role: 'system',
            content: 'あなたはX（旧Twitter）アルゴリズムの専門アナリストです。データを分析して、具体的で実行可能な戦略を提案してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // 分析タスクなので低めの温度（Grok推奨: 0.2-0.3で精度安定）
        response_format: { type: 'json_object' }, // JSON形式で返す
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    const analysisText = data.choices[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('No analysis content in response');
    }
    
    // JSONをパース
    const analysis = JSON.parse(analysisText);
    
    console.log('[OpenAI Algorithm Analyzer] ✅ Analysis completed');
    return analysis;
  } catch (error) {
    console.error('[OpenAI Algorithm Analyzer] Failed to analyze:', error.message);
    return null;
  }
}

/**
 * 過去N日間のデータを収集してアルゴリズム分析を実行
 * @param {number} days - 分析日数（デフォルト: 7）
 * @returns {Promise<Object>} アルゴリズム分析結果
 */
async function performAlgorithmAnalysis(days = 7) {
  try {
    // 過去N日間のメトリクスデータを取得
    const metricsDataByDate = {};
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const metrics = await getDailyEngagementMetrics(dateString);
      if (metrics) {
        metricsDataByDate[dateString] = metrics;
      }
    }
    
    // メトリクスデータを集計
    const aggregatedMetrics = {
      totalTweets: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      totalClicks: 0,
      totalReplies: 0,
      totalRetweets: 0,
      totalLikes: 0,
      totalQuoteTweets: 0,
      dates: Object.keys(metricsDataByDate),
    };
    
    for (const dateString in metricsDataByDate) {
      const metrics = metricsDataByDate[dateString];
      aggregatedMetrics.totalTweets += metrics.tweets?.length || 0;
      aggregatedMetrics.totalImpressions += metrics.totalImpressions || 0;
      aggregatedMetrics.totalEngagements += metrics.totalEngagements || 0;
      aggregatedMetrics.totalClicks += metrics.totalClicks || 0;
      aggregatedMetrics.totalReplies += metrics.totalReplies || 0;
      aggregatedMetrics.totalRetweets += metrics.totalRetweets || 0;
      aggregatedMetrics.totalLikes += metrics.totalLikes || 0;
      aggregatedMetrics.totalQuoteTweets += metrics.totalQuoteTweets || 0;
    }
    
    // 平均エンゲージメント率を計算
    aggregatedMetrics.avgEngagementRate = aggregatedMetrics.totalImpressions > 0
      ? (aggregatedMetrics.totalEngagements / aggregatedMetrics.totalImpressions) * 100
      : 0;
    
    aggregatedMetrics.avgClickRate = aggregatedMetrics.totalImpressions > 0
      ? (aggregatedMetrics.totalClicks / aggregatedMetrics.totalImpressions) * 100
      : 0;
    
    // A/Bテスト結果を取得
    const abTestData = {};
    const testNames = ['content_format', 'hashtag_strategy', 'cta_intensity'];
    for (const testName of testNames) {
      const results = await getABTestResults(testName, days);
      if (Object.keys(results).length > 0) {
        abTestData[testName] = results;
      }
    }
    
    // インフルエンサーデータを取得
    const influencerData = await analyzeInfluencerPerformance(days);
    
    // GPTで分析
    const analysis = await analyzeXAlgorithm(aggregatedMetrics, abTestData, influencerData);
    
    return {
      days,
      analyzedAt: new Date().toISOString(),
      metricsData: aggregatedMetrics,
      metricsDataByDate,
      abTestData,
      influencerData: influencerData.slice(0, 10), // トップ10のみ
      analysis,
    };
  } catch (error) {
    console.error('[OpenAI Algorithm Analyzer] Failed to perform analysis:', error.message);
    return null;
  }
}

/**
 * アルゴリズム分析レポートを生成（人間が読みやすい形式）
 * @param {Object} analysisResult - 分析結果
 * @returns {string} レポートテキスト
 */
function generateAlgorithmReport(analysisResult) {
  if (!analysisResult || !analysisResult.analysis) {
    return 'No analysis data available.';
  }
  
  const { analysis } = analysisResult;
  
  let report = `# Xアルゴリズム分析レポート（過去${analysisResult.days}日間）\n\n`;
  report += `**分析日時**: ${analysisResult.analyzedAt}\n\n`;
  
  // アルゴリズム動向
  if (analysis.algorithmTrends) {
    report += `## 📊 アルゴリズム動向\n\n`;
    report += `- **コンテンツ優先度**: ${analysis.algorithmTrends.contentPreference || 'N/A'}\n`;
    report += `- **最適な投稿タイミング**: ${analysis.algorithmTrends.timingPreference || 'N/A'}\n`;
    report += `- **重視されるエンゲージメントシグナル**: ${analysis.algorithmTrends.engagementSignals || 'N/A'}\n\n`;
  }
  
  // 最適化戦略
  if (analysis.optimizationStrategies && analysis.optimizationStrategies.length > 0) {
    report += `## 🚀 最適化戦略\n\n`;
    analysis.optimizationStrategies.forEach((strategy, index) => {
      report += `${index + 1}. **${strategy.strategy}** (優先度: ${strategy.priority})\n`;
      report += `   - 説明: ${strategy.description}\n`;
      report += `   - 期待される効果: ${strategy.expectedImpact}\n\n`;
    });
  }
  
  // リスク要因
  if (analysis.riskFactors && analysis.riskFactors.length > 0) {
    report += `## ⚠️ リスク要因\n\n`;
    analysis.riskFactors.forEach((risk, index) => {
      report += `${index + 1}. **${risk.factor}**\n`;
      report += `   - 説明: ${risk.description}\n`;
      report += `   - 対策: ${risk.mitigation}\n\n`;
    });
  }
  
  // 推奨事項
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    report += `## 💡 推奨事項\n\n`;
    analysis.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
  }
  
  return report;
}

module.exports = {
  analyzeXAlgorithm,
  performAlgorithmAnalysis,
  generateAlgorithmReport,
};
