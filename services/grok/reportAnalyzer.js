// services/grok/reportAnalyzer.js
// Grokがレポートを分析するための関数

const OpenAI = require('openai');
const { getReportForGrok, getLatestReport, getReportHistory } = require('../lead-discovery/reportStorage');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

const openai = XAI_API_KEY ? new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
}) : null;

/**
 * Grokがレポートを分析してPDCAサイクルの改善提案を行う
 * @param {string} reportType - 'execution' | 'daily' | 'weekly'
 * @param {Object} options - オプション
 * @returns {Promise<Object>} 分析結果
 */
async function analyzeReportWithGrok(reportType = 'execution', options = {}) {
  if (!openai) {
    throw new Error('XAI_API_KEY is not set');
  }

  const { includeHistory = false, historyLimit = 5 } = options;

  try {
    // 最新レポートを取得
    const latestReport = await getLatestReport(reportType);
    if (!latestReport) {
      throw new Error(`No ${reportType} report available`);
    }

    // Grok用のテキスト形式レポートを取得
    let reportText = await getReportForGrok(reportType);

    // 履歴を含める場合
    if (includeHistory) {
      const history = await getReportHistory(reportType, historyLimit);
      if (history.length > 0) {
        reportText += `\n\n## REPORT HISTORY (Last ${history.length} reports)\n\n`;
        for (let i = 0; i < history.length; i++) {
          const h = history[i];
          reportText += `### Report ${i + 1} - ${h.date}\n`;
          reportText += `- Error Rate: ${h.systemMetrics.cronJobs.leadDiscovery.errorRate}\n`;
          reportText += `- CVR: ${h.cvrStats?.cvr || 'N/A'}\n`;
          reportText += `- Revenue: $${h.cvrStats?.revenue?.toLocaleString() || 0}\n\n`;
        }
      }
    }

    // Grokに分析を依頼
    const systemPrompt = `あなたはTrap Defence BTCのCOO（Chief Operating Officer）として、リード発見システムのレポートを分析し、PDCAサイクルに基づいた改善提案を行います。

## あなたの役割
- **COO視点**: システムの稼働状況、エラー率、パフォーマンスを重視
- **データドリブン**: 数値データに基づいた具体的な改善提案
- **PDCAサイクル**: Plan（計画）→ Do（実行）→ Check（評価）→ Act（改善）のサイクルで考える

## 分析のポイント
1. **システム稼働状況**: エラー率0%を達成できているか？キューが蓄積していないか？
2. **リード処理効率**: リプライ送信成功率は適切か？処理待ちはないか？
3. **CVR改善**: コンバージョン率を向上させるための具体的な施策
4. **ソース別分析**: どのソース（x_direct, x_quote, telegram）が効果的か？

## 出力形式
以下のJSON形式で出力してください：
{
  "summary": "レポートの要約（100-200字）",
  "keyMetrics": {
    "errorRate": "エラー率と評価",
    "replySuccessRate": "リプライ送信成功率と評価",
    "cvr": "CVRと評価",
    "queueStatus": "キュー状況と評価"
  },
  "issues": [
    {
      "priority": "high|medium|low",
      "category": "system|performance|conversion",
      "description": "問題の説明",
      "impact": "影響度の説明"
    }
  ],
  "improvements": [
    {
      "priority": "high|medium|low",
      "category": "system|performance|conversion",
      "action": "具体的な改善アクション",
      "expectedImpact": "期待される効果",
      "implementation": "実装方法の説明"
    }
  ],
  "pdcCycle": {
    "plan": "次回実行時の計画",
    "do": "実行すべき具体的なアクション",
    "check": "確認すべき指標",
    "act": "改善アクション"
  },
  "recommendations": [
    "COO向けの推奨事項（3-5項目）"
  ]
}`;

    const userPrompt = `以下のレポートを分析し、PDCAサイクルに基づいた改善提案を行ってください：

${reportText}

上記のレポートを分析し、システム最適化のための具体的な改善提案をJSON形式で出力してください。`;

    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const analysisText = completion?.choices?.[0]?.message?.content?.trim();
    if (!analysisText) {
      throw new Error('Grok analysis failed: empty response');
    }

    // JSONをパース
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      // JSONパースに失敗した場合はテキストとして返す
      return {
        success: false,
        error: 'Failed to parse Grok response as JSON',
        rawResponse: analysisText,
      };
    }

    return {
      success: true,
      reportType,
      reportDate: latestReport.date,
      analysis,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Grok Report Analyzer] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * レポートを取得してGrokに分析させる（簡易版）
 * @param {string} reportType - 'execution' | 'daily' | 'weekly'
 * @returns {Promise<string>} 分析結果のテキスト
 */
async function getReportAnalysis(reportType = 'execution') {
  try {
    const result = await analyzeReportWithGrok(reportType);
    if (!result.success) {
      return `分析エラー: ${result.error}`;
    }

    // 読みやすい形式でフォーマット
    let output = `# レポート分析結果 (${result.reportDate})\n\n`;
    output += `## 要約\n${result.analysis.summary}\n\n`;
    
    if (result.analysis.keyMetrics) {
      output += `## 主要指標\n`;
      for (const [key, value] of Object.entries(result.analysis.keyMetrics)) {
        output += `- **${key}**: ${value}\n`;
      }
      output += `\n`;
    }

    if (result.analysis.issues && result.analysis.issues.length > 0) {
      output += `## 問題点\n`;
      for (const issue of result.analysis.issues) {
        output += `- **[${issue.priority.toUpperCase()}] ${issue.category}**: ${issue.description} (影響: ${issue.impact})\n`;
      }
      output += `\n`;
    }

    if (result.analysis.improvements && result.analysis.improvements.length > 0) {
      output += `## 改善提案\n`;
      for (const improvement of result.analysis.improvements) {
        output += `- **[${improvement.priority.toUpperCase()}] ${improvement.category}**: ${improvement.action}\n`;
        output += `  - 期待される効果: ${improvement.expectedImpact}\n`;
        output += `  - 実装方法: ${improvement.implementation}\n`;
      }
      output += `\n`;
    }

    if (result.analysis.pdcCycle) {
      output += `## PDCAサイクル\n`;
      output += `- **Plan (計画)**: ${result.analysis.pdcCycle.plan}\n`;
      output += `- **Do (実行)**: ${result.analysis.pdcCycle.do}\n`;
      output += `- **Check (評価)**: ${result.analysis.pdcCycle.check}\n`;
      output += `- **Act (改善)**: ${result.analysis.pdcCycle.act}\n\n`;
    }

    if (result.analysis.recommendations && result.analysis.recommendations.length > 0) {
      output += `## 推奨事項\n`;
      for (const rec of result.analysis.recommendations) {
        output += `- ${rec}\n`;
      }
    }

    return output;
  } catch (error) {
    return `分析エラー: ${error.message}`;
  }
}

module.exports = {
  analyzeReportWithGrok,
  getReportAnalysis,
};
