// scripts/ask-grok-gpt-model-selection.js
// GrokにGPT-4o vs GPT-5.2の選択について検討してもらう

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

async function askGrokAboutGPTModelSelection() {
  const prompt = `あなたはX（旧Twitter）アルゴリズム分析の専門家です。以下のタスクについて、GPT-4oとGPT-5.2のどちらを選択すべきか、技術的・戦略的・コスト効率の観点から検討してください。

## タスクの詳細

### 使用目的
Xアルゴリズムの動向分析と最適化戦略の提案

### 具体的なタスク
1. **アルゴリズム動向の分析**: メトリクスデータ（エンゲージメント率、クリック率、インプレッション等）から、Xアルゴリズムがどのようなコンテンツを優先しているかを分析
2. **エンゲージメントパターンの発見**: A/Bテスト結果とインフルエンサーデータから、効果的な投稿形式・タイミング・コンテンツを発見
3. **最適化戦略の提案**: インプレッションとエンゲージメントを向上させる具体的な戦略を提案
4. **リスク要因の特定**: アルゴリズム評価を下げる可能性のある要因を特定し、対策を提案

### 入力データ
- メトリクスデータ（エンゲージメント率、クリック率、インプレッション、エンゲージメント、クリック数）
- A/Bテスト結果（content_format, hashtag_strategy, cta_intensity等）
- インフルエンサーデータ（トップ10のエンゲージメント率、クリック率等）

### 出力形式
JSON形式（algorithmTrends, optimizationStrategies, riskFactors, recommendations）

### 実行頻度
週次レポート（毎週月曜10:00 UTCに1回実行）

### 現在の実装
- モデル: GPT-4o
- Temperature: 0.3（分析タスクなので低め）
- Response Format: JSON形式

## 検討ポイント

1. **推論能力**: 複雑なデータ分析とパターン発見にどちらが適しているか
2. **コスト効率**: 週次レポート（週1回）なので、コスト増は限定的だが、GPT-5.2の方が高コスト
3. **精度**: より正確なアルゴリズム動向分析と戦略提案ができるか
4. **実用性**: 提案される戦略が実際に実行可能で効果的か
5. **将来性**: 長期的な視点でどちらが適しているか

## 最新情報（OpenAI公式ドキュメントより）

### GPT-5.2の特徴
- 「The best model for coding and agentic tasks across industries」
- 「human expert level」のパフォーマンス
- 長文脈理解に優れている
- エージェント機能（複雑な多段階タスク）に適している
- 推論能力が大幅に向上（GPT-5.1と比較して）

### GPT-4oの特徴
- 「Fast, intelligent, flexible GPT model」
- コスト効率が良い
- 安定性と互換性が高い

## 質問

CEOは最新モデル（GPT-5.2）を推奨していますが、あなたの専門家としての意見を聞かせてください：

1. **技術的観点**: このタスクにはGPT-4oとGPT-5.2のどちらが適しているか？その理由は？
2. **コスト効率**: 週次レポート（週1回）という実行頻度を考慮すると、GPT-5.2へのアップグレードは合理的か？
3. **精度向上**: GPT-5.2にすることで、どれくらいの精度向上が期待できるか？
4. **実用性**: GPT-5.2の提案は、GPT-4oの提案と比べて実際に実行可能で効果的か？
5. **推奨**: 最終的な推奨モデルとその理由

以下のJSON形式で回答してください：
{
  "technicalAnalysis": {
    "recommendedModel": "gpt-4o" | "gpt-5.2",
    "reason": "技術的な理由の詳細説明",
    "strengths": ["GPT-4oの強み", "GPT-5.2の強み"],
    "weaknesses": ["GPT-4oの弱み", "GPT-5.2の弱み"]
  },
  "costEfficiency": {
    "weeklyCostEstimate": {
      "gpt-4o": "週次レポート1回あたりの推定コスト",
      "gpt-5.2": "週次レポート1回あたりの推定コスト"
    },
    "costBenefitAnalysis": "コストとベネフィットの分析",
    "recommendation": "コスト効率の観点からの推奨"
  },
  "accuracyImprovement": {
    "expectedImprovement": "GPT-5.2による精度向上の期待値（%または具体的な説明）",
    "keyAreas": ["精度向上が期待される領域1", "精度向上が期待される領域2"]
  },
  "practicality": {
    "executionFeasibility": "提案の実行可能性の比較",
    "effectiveness": "提案の効果の比較"
  },
  "finalRecommendation": {
    "model": "gpt-4o" | "gpt-5.2",
    "reason": "最終推奨の理由",
    "implementationNote": "実装時の注意点や推奨事項"
  }
}`;

  try {
    console.log('[Grok GPT Model Selection] Asking Grok for recommendation...');
    console.log('[Grok GPT Model Selection] ========================================');
    
    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning', // 推論タスクなのでfast-reasoningを使用
      messages: [
        {
          role: 'system',
          content: 'あなたはX（旧Twitter）アルゴリズム分析とAIモデル選択の専門家です。技術的・戦略的・コスト効率の観点から、具体的で実行可能な推奨を提供してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3, // 分析タスクなので低めの温度
      response_format: { type: 'json_object' }, // JSON形式で返す
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('No response from Grok');
    }

    // JSONをパース
    const recommendation = JSON.parse(responseText);
    
    console.log('[Grok GPT Model Selection] ========================================');
    console.log('[Grok GPT Model Selection] ✅ Grok recommendation received');
    console.log('[Grok GPT Model Selection] ========================================');
    console.log(JSON.stringify(recommendation, null, 2));
    console.log('[Grok GPT Model Selection] ========================================');
    
    return recommendation;
  } catch (error) {
    console.error('[Grok GPT Model Selection] ❌ Error:', error.message);
    console.error('[Grok GPT Model Selection] Stack:', error.stack);
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGrokAboutGPTModelSelection()
    .then((recommendation) => {
      console.log('\n[Final Recommendation]');
      console.log(`Model: ${recommendation.finalRecommendation.model}`);
      console.log(`Reason: ${recommendation.finalRecommendation.reason}`);
      console.log(`Implementation Note: ${recommendation.finalRecommendation.implementationNote}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to get Grok recommendation:', error);
      process.exit(1);
    });
}

module.exports = { askGrokAboutGPTModelSelection };
