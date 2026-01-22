// scripts/ask-grok-x-algorithm-optimization.js
// 実装したX投稿ロジックをGrokにレビューしてもらい、Xアルゴリズム最適化の提案を求める

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const XAI_API_KEY = process.env.XAI_API_KEY || process.argv[2];
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is required');
  console.error('Usage: node scripts/ask-grok-x-algorithm-optimization.js [XAI_API_KEY]');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

// 実装したロジックの詳細を読み込む
function loadImplementationDetails() {
  const implementationSummary = fs.readFileSync(
    path.join(__dirname, '../docs/IMPLEMENTATION_SUMMARY_X_POSTING.md'),
    'utf8'
  );
  
  const healthCheck = fs.readFileSync(
    path.join(__dirname, '../docs/HEALTH_CHECK_REPORT_2026-01-22.md'),
    'utf8'
  );
  
  return {
    implementationSummary,
    healthCheck,
  };
}

async function askGrokForOptimization() {
  const { implementationSummary, healthCheck } = loadImplementationDetails();
  
  const prompt = `You are "Dr. Grok", an expert at analyzing X (Twitter) algorithms and maximizing engagement.

I've implemented an automated X posting system for crypto/BTC content. Please review my implementation and provide specific optimization recommendations based on X's current algorithm (2026).

## Current Implementation Summary

### 1. Free Report X Posts (6 languages)
- **Timing**: UTC 6:05 AM and 6:05 PM (after free report delivery)
- **Format**: Threaded posts (1 main tweet + 5 thread replies)
- **Languages**: EN, ES, PT-BR, AR, JA, KO
- **Content**: Trap Score analysis, BTC price, 24h change, Deep Link to Telegram
- **Hashtags**: Language-specific (#BTC #CryptoTrading #TrapDefence, etc.)

### 2. Quote Reposts (Influencer Engagement)
- **Timing**: Every hour (1 language per hour, 6 hours to complete all languages)
- **Frequency**: 24 posts/day (6 languages × 2 influencers × 2 posts)
- **Process**: 
  - Grok discovers hot influencers with high engagement rates (5%+)
  - Grok generates quote repost text optimized for impressions
  - Posts quote reposts to influencer tweets
- **Deep Link**: Source tracking (minimal_en_x_quote)

### 3. VSL1 Fixed Posts
- **Timing**: UTC 9:00 AM and 9:00 PM
- **Content**: VSL1 YouTube link + Deep Link
- **Grok Integration**: Sentiment analysis

### 4. Current Metrics (Projected)
- **Daily Impressions**: 910,000-1,010,000
- **Daily Engagement**: 136.5-165 users
- **Quote Repost Impressions**: 30,000 per post (from real-world data)
- **Engagement Rate**: 0.3% from quote reposts to paid version

## Questions for Optimization

1. **Posting Timing**: Are UTC 6:05 AM/PM and 9:00 AM/PM optimal for global crypto audience? Should we adjust for peak engagement times per language?

2. **Thread Strategy**: Is threading (1 main + 5 replies) better than separate posts? Should we use different strategies per language?

3. **Quote Repost Timing**: Is hourly distribution optimal? Should we focus on specific hours when influencers' audiences are most active?

4. **Hashtag Strategy**: Are current hashtags optimal? Should we use trending hashtags, or focus on niche crypto hashtags?

5. **Text Optimization**: What psychological triggers and copywriting techniques maximize impressions and clicks in 2026?

6. **Engagement Signals**: How can we maximize X algorithm signals (replies, retweets, likes, clicks) to boost impressions?

7. **Quote Repost Frequency**: Is 24 posts/day optimal? Should we increase/decrease based on algorithm behavior?

8. **Content Variation**: Should we vary content formats (text-only, with images, polls, etc.) to maximize algorithm favor?

9. **Reply Strategy**: Should we actively reply to our own posts to boost engagement signals?

10. **Algorithm Hacks**: Any specific 2026 X algorithm features we should leverage (Communities, Spaces, Lists, etc.)?

Please provide:
1. Specific optimization recommendations with priority levels
2. Expected impact (impressions, engagement rate improvements)
3. Implementation suggestions
4. Any risks or considerations

Return your analysis in JSON format:
{
  "summary": "Overall assessment",
  "optimizations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "category": "Timing|Content|Engagement|Hashtags|Frequency",
      "recommendation": "Specific recommendation",
      "expectedImpact": "Expected improvement",
      "implementation": "How to implement",
      "risks": "Any risks or considerations"
    }
  ],
  "algorithmInsights": "Key insights about X algorithm in 2026",
  "nextSteps": "Recommended next steps"
}`;

  try {
    console.log('🤖 Asking Grok for X algorithm optimization recommendations...\n');
    
    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are "Dr. Grok", an expert at analyzing X (Twitter) algorithms and maximizing engagement. Provide detailed, actionable recommendations based on current X algorithm behavior (2026). Return ONLY valid JSON. No markdown. No code fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 8000,
      temperature: 0.3,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!text) {
      console.error('❌ No response from Grok');
      return null;
    }

    // JSONを抽出（マークダウンのコードブロックがある場合に対応）
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    try {
      const result = JSON.parse(jsonText);
      return result;
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError.message);
      console.error('Raw response:', text.substring(0, 500));
      return { raw: text };
    }
  } catch (error) {
    console.error('❌ Grok API error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const result = await askGrokForOptimization();
    
    if (!result) {
      console.error('❌ Failed to get optimization recommendations');
      process.exit(1);
    }

    // 結果を保存
    const outputPath = path.join(__dirname, '../docs/GROK_X_ALGORITHM_OPTIMIZATION_2026-01-22.md');
    const timestamp = new Date().toISOString();
    
    let markdown = `# GrokによるXアルゴリズム最適化レビュー
**作成日時**: ${timestamp}
**レビュー対象**: X自動投稿システム実装

---

## 📊 サマリー

${result.summary || result.raw || 'N/A'}

---

`;

    if (result.optimizations && Array.isArray(result.optimizations)) {
      markdown += `## 🎯 最適化推奨事項\n\n`;
      
      // 優先度別にソート
      const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
      const sorted = result.optimizations.sort((a, b) => {
        return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
      });
      
      sorted.forEach((opt, index) => {
        markdown += `### ${index + 1}. ${opt.category} - ${opt.priority} Priority\n\n`;
        markdown += `**推奨事項**: ${opt.recommendation}\n\n`;
        markdown += `**期待される効果**: ${opt.expectedImpact}\n\n`;
        markdown += `**実装方法**: ${opt.implementation}\n\n`;
        if (opt.risks) {
          markdown += `**リスク・注意事項**: ${opt.risks}\n\n`;
        }
        markdown += `---\n\n`;
      });
    }

    if (result.algorithmInsights) {
      markdown += `## 🔍 Xアルゴリズムの洞察（2026年）\n\n${result.algorithmInsights}\n\n---\n\n`;
    }

    if (result.nextSteps) {
      markdown += `## 🚀 次のステップ\n\n${result.nextSteps}\n\n---\n\n`;
    }

    // JSONも保存
    markdown += `## 📋 完全なJSONレスポンス\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`;

    fs.writeFileSync(outputPath, markdown, 'utf8');
    
    console.log('✅ Grok optimization review completed!');
    console.log(`📄 Results saved to: ${outputPath}\n`);
    
    // コンソールにも表示
    console.log('📊 Summary:');
    console.log(result.summary || result.raw?.substring(0, 500) || 'N/A');
    console.log('\n');
    
    if (result.optimizations && Array.isArray(result.optimizations)) {
      console.log(`🎯 Found ${result.optimizations.length} optimization recommendations:\n`);
      result.optimizations.forEach((opt, index) => {
        console.log(`${index + 1}. [${opt.priority}] ${opt.category}: ${opt.recommendation.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
