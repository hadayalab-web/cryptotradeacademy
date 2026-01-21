// scripts/ask-grok-estimates.js
// Grokにリード獲得数と売上の野心的な見積もりを聞く

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

async function askGrokForEstimates() {
  try {
    console.log('🤖 Dr. Grokに野心的な見積もりを聞いています...\n');
    
    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are Dr. Grok, a strategic growth advisor for Trap Defence BTC. You provide ambitious but realistic projections based on data-driven analysis. Be bold but grounded in reality. Think like a growth hacker who has seen similar systems scale rapidly.',
        },
        {
          role: 'user',
          content: `Trap Defence BTCリード獲得システムの見積もりをお願いします。

設定:
- リード発見: 2時間ごと（1日12回）
- 対象言語: 6言語（en, es, pt-br, ar, ja, ko）
- Sources数: 30 sources/言語 × 6言語 = 180 sources/回
- 変換率: 16% (sources → リード)
- リード数/回: 約29リード/回
- 目標CVR: 30% (リード → 成約)
- 成約単価: $150/成約

質問:
1. 今日・明日のリード獲得数と売上の野心的な見積もりを教えてください
2. 初速段階で達成可能な最大値は？
3. システムが完全に最適化された場合の見積もりは？

以下のJSON形式で返してください:
{
  "day1": {
    "leads": number,
    "conversions": number,
    "revenue": number,
    "cvr": number
  },
  "day2": {
    "leads": number,
    "conversions": number,
    "revenue": number,
    "cvr": number
  },
  "optimized": {
    "leads": number,
    "conversions": number,
    "revenue": number,
    "cvr": number
  },
  "reasoning": "string",
  "keyFactors": ["factor1", "factor2", ...]
}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    console.log('📊 Dr. Grokの回答:\n');
    console.log(text);
    console.log('\n');
    
    // JSONを抽出してパース
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        return jsonData;
      }
    } catch (e) {
      console.warn('⚠️ JSONパース失敗:', e.message);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    throw error;
  }
}

if (require.main === module) {
  askGrokForEstimates()
    .then((result) => {
      if (result) {
        console.log('✅ Grokからの見積もりを取得しました');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { askGrokForEstimates };
