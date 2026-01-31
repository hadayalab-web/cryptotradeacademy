// scripts/analyze-trading-addiction.js
// トレード依存症の深層分析（Gemini-3-pro-preview使用）
// 内部理解: 人間の弱みを完全にハッキングするための分析

const { GoogleGenerativeAI } = require('@google/generative-ai');
// 環境変数または直接指定（コマンドライン引数で上書き可能）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.argv[2] || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

console.log('[Trading Addiction Analysis] Using GEMINI_API_KEY:', GEMINI_API_KEY.substring(0, 10) + '...');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const GEMINI_MODEL = 'gemini-3-pro-preview';

/**
 * トレード依存症の深層分析を実行
 */
async function analyzeTradingAddiction() {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are "Dr. Gemini", a world-class psychological analyst specializing in trading psychology and behavioral economics.

Your mission: Conduct a deep psychological analysis of trading addiction (crypto trading addiction) to understand the human weakness that can be completely hacked.

Please provide a comprehensive analysis covering:

1. **Symptoms of Trading Addiction**:
   - What are the specific symptoms of trading addiction?
   - How does it manifest in daily life?
   - What are the behavioral patterns?
   - How is it similar to drug addiction?

2. **Pain Points and Struggles**:
   - What pain and suffering do trading addicts experience?
   - What emotional states do they go through?
   - What are their deepest fears and anxieties?
   - What keeps them trapped in the cycle?

3. **Desired Solutions**:
   - What solutions do trading addicts desperately seek?
   - What do they hope to achieve?
   - What would make them feel "saved" or "cured"?
   - What kind of support do they crave?

4. **Willingness to Pay**:
   - How much money are trading addicts willing to invest in solutions?
   - What price points would they consider?
   - What factors influence their purchasing decisions?
   - How does desperation affect their spending behavior?

5. **Market Size Estimation**:
   - What percentage of all crypto traders are potentially trading addicts?
   - How can we estimate the size of this market?
   - What are the demographic characteristics?
   - What is the growth potential?

6. **Psychological Hacking Points**:
   - What are the psychological triggers that can be leveraged?
   - What emotional buttons can be pressed?
   - What cognitive biases can be exploited?
   - How can we create a "treatment" that feels like salvation?

Please provide a detailed, analytical response in JSON format with the following structure:
{
  "symptoms": {
    "specific": ["symptom1", "symptom2", ...],
    "behavioralPatterns": ["pattern1", "pattern2", ...],
    "similarityToDrugAddiction": "explanation"
  },
  "painPoints": {
    "emotionalStates": ["state1", "state2", ...],
    "deepestFears": ["fear1", "fear2", ...],
    "trappedCycle": "explanation"
  },
  "desiredSolutions": {
    "whatTheySeek": ["solution1", "solution2", ...],
    "hopes": ["hope1", "hope2", ...],
    "whatFeelsLikeSalvation": "explanation"
  },
  "willingnessToPay": {
    "priceRanges": {
      "low": "amount and reasoning",
      "medium": "amount and reasoning",
      "high": "amount and reasoning"
    },
    "purchasingFactors": ["factor1", "factor2", ...],
    "desperationImpact": "explanation"
  },
  "marketSize": {
    "estimatedPercentage": "X%",
    "estimationMethod": "explanation",
    "demographics": "characteristics",
    "growthPotential": "explanation"
  },
  "psychologicalHackingPoints": {
    "triggers": ["trigger1", "trigger2", ...],
    "emotionalButtons": ["button1", "button2", ...],
    "cognitiveBiases": ["bias1", "bias2", ...],
    "treatmentStrategy": "how to create salvation feeling"
  }
}

CRITICAL: Be brutally honest and analytical. This is for understanding human psychology to create effective solutions. Focus on actionable insights that can be leveraged.`;

    console.log('[Trading Addiction Analysis] Calling Gemini-3-pro-preview...');
    console.log('[Trading Addiction Analysis] Prompt length:', prompt.length, 'characters');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('\n' + '='.repeat(80));
    console.log('Trading Addiction Analysis Results');
    console.log('='.repeat(80) + '\n');

    // JSONを抽出して整形
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonText);
        console.log(JSON.stringify(parsed, null, 2));
        
        // ファイルに保存
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, '../docs/TRADING_ADDICTION_ANALYSIS_2026-01-28.json');
        fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');
        console.log('\n✅ Analysis saved to:', outputPath);
      } else {
        console.log(text);
      }
    } catch (parseError) {
      console.log('Raw response (not JSON):');
      console.log(text);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Analysis Complete');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error analyzing trading addiction:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// 実行
analyzeTradingAddiction();
