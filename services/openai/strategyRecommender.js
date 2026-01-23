// services/openai/strategyRecommender.js
// OpenAI GPTを使用した戦略的推奨事項生成

const { performAlgorithmAnalysis, generateAlgorithmReport } = require('./algorithmAnalyzer');
const { getDailyEngagementMetrics } = require('../../api/x-engagement-metrics');
const { getABTestResults } = require('../x/abTesting');

/**
 * OpenAI APIクライアントを初期化
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[OpenAI Strategy Recommender] OPENAI_API_KEY not set');
    return null;
  }
  
  return {
    apiKey,
    baseURL: 'https://api.openai.com/v1',
  };
}

/**
 * GPTを使用して戦略的推奨事項を生成
 * @param {Object} context - コンテキストデータ（メトリクス、A/Bテスト結果等）
 * @param {string} focusArea - 焦点領域（例: 'engagement', 'impressions', 'clicks'）
 * @returns {Promise<Object>} 戦略的推奨事項
 */
async function generateStrategicRecommendations(context, focusArea = 'engagement') {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }
  
  try {
    const prompt = `あなたはX（旧Twitter）マーケティング戦略の専門家です。以下のデータを分析して、${focusArea}を向上させるための戦略的推奨事項を提案してください。

## 現在の状況
- 平均エンゲージメント率: ${context.metrics?.avgEngagementRate?.toFixed(2) || 0}%
- 平均クリック率: ${context.metrics?.avgClickRate?.toFixed(2) || 0}%
- 総インプレッション: ${context.metrics?.totalImpressions?.toLocaleString() || 0}
- 総エンゲージメント: ${context.metrics?.totalEngagements?.toLocaleString() || 0}

## A/Bテスト結果
${JSON.stringify(context.abTestResults || {}, null, 2)}

## 焦点領域
${focusArea === 'engagement' ? 'エンゲージメント率の向上に焦点を当ててください。' : ''}
${focusArea === 'impressions' ? 'インプレッション数の増加に焦点を当ててください。' : ''}
${focusArea === 'clicks' ? 'クリック率の向上に焦点を当ててください。' : ''}

## 出力形式
以下のJSON形式で回答してください：
{
  "strategicRecommendations": [
    {
      "title": "推奨事項のタイトル",
      "description": "詳細説明",
      "actionItems": [
        "具体的なアクション1",
        "具体的なアクション2"
      ],
      "expectedImpact": "期待される効果（数値で）",
      "implementationDifficulty": "easy/medium/hard",
      "priority": "high/medium/low"
    }
  ],
  "quickWins": [
    {
      "action": "すぐに実行できるアクション",
      "impact": "期待される効果"
    }
  ],
  "longTermStrategies": [
    {
      "strategy": "長期的な戦略",
      "timeline": "実装期間",
      "expectedImpact": "期待される効果"
    }
  ]
}`;

    const response = await fetch(`${client.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたはX（旧Twitter）マーケティング戦略の専門家です。データに基づいて、具体的で実行可能な戦略を提案してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    const recommendationsText = data.choices[0]?.message?.content;
    
    if (!recommendationsText) {
      throw new Error('No recommendations content in response');
    }
    
    const recommendations = JSON.parse(recommendationsText);
    
    console.log('[OpenAI Strategy Recommender] ✅ Recommendations generated');
    return recommendations;
  } catch (error) {
    console.error('[OpenAI Strategy Recommender] Failed to generate recommendations:', error.message);
    return null;
  }
}

/**
 * 週次戦略レポートを生成
 * @param {number} days - 分析日数（デフォルト: 7）
 * @param {string} focusArea - 焦点領域
 * @returns {Promise<Object>} 戦略レポート
 */
async function generateWeeklyStrategyReport(days = 7, focusArea = 'engagement') {
  try {
    // メトリクスデータを取得
    const dateString = new Date().toISOString().split('T')[0];
    const metricsData = await getDailyEngagementMetrics(dateString);
    
    // A/Bテスト結果を取得
    const abTestData = {};
    const testNames = ['content_format', 'hashtag_strategy', 'cta_intensity'];
    for (const testName of testNames) {
      const results = await getABTestResults(testName, days);
      if (Object.keys(results).length > 0) {
        abTestData[testName] = results;
      }
    }
    
    // コンテキストを構築
    const context = {
      metrics: metricsData,
      abTestResults: abTestData,
    };
    
    // GPTで戦略的推奨事項を生成
    const recommendations = await generateStrategicRecommendations(context, focusArea);
    
    return {
      days,
      focusArea,
      generatedAt: new Date().toISOString(),
      metrics: metricsData,
      abTestResults: abTestData,
      recommendations,
    };
  } catch (error) {
    console.error('[OpenAI Strategy Recommender] Failed to generate weekly report:', error.message);
    return null;
  }
}

/**
 * 戦略レポートを人間が読みやすい形式で生成
 * @param {Object} reportData - レポートデータ
 * @returns {string} レポートテキスト
 */
function formatStrategyReport(reportData) {
  if (!reportData || !reportData.recommendations) {
    return 'No recommendations data available.';
  }
  
  const { recommendations } = reportData;
  
  let report = `# 戦略的推奨事項レポート（過去${reportData.days}日間）\n\n`;
  report += `**焦点領域**: ${reportData.focusArea}\n`;
  report += `**生成日時**: ${reportData.generatedAt}\n\n`;
  
  // 戦略的推奨事項
  if (recommendations.strategicRecommendations && recommendations.strategicRecommendations.length > 0) {
    report += `## 🎯 戦略的推奨事項\n\n`;
    recommendations.strategicRecommendations.forEach((rec, index) => {
      report += `### ${index + 1}. ${rec.title} (優先度: ${rec.priority})\n\n`;
      report += `**説明**: ${rec.description}\n\n`;
      report += `**期待される効果**: ${rec.expectedImpact}\n`;
      report += `**実装難易度**: ${rec.implementationDifficulty}\n\n`;
      report += `**アクション項目**:\n`;
      rec.actionItems.forEach((action, i) => {
        report += `${i + 1}. ${action}\n`;
      });
      report += `\n`;
    });
  }
  
  // クイックウィン
  if (recommendations.quickWins && recommendations.quickWins.length > 0) {
    report += `## ⚡ クイックウィン（すぐに実行可能）\n\n`;
    recommendations.quickWins.forEach((win, index) => {
      report += `${index + 1}. **${win.action}**\n`;
      report += `   - 期待される効果: ${win.impact}\n\n`;
    });
  }
  
  // 長期的戦略
  if (recommendations.longTermStrategies && recommendations.longTermStrategies.length > 0) {
    report += `## 📈 長期的戦略\n\n`;
    recommendations.longTermStrategies.forEach((strategy, index) => {
      report += `${index + 1}. **${strategy.strategy}**\n`;
      report += `   - 実装期間: ${strategy.timeline}\n`;
      report += `   - 期待される効果: ${strategy.expectedImpact}\n\n`;
    });
  }
  
  return report;
}

module.exports = {
  generateStrategicRecommendations,
  generateWeeklyStrategyReport,
  formatStrategyReport,
};
