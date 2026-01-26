// scripts/integrate-grok-gemini-algorithms.js
// GrokのXアルゴリズム解析とGeminiの高エンゲージメント+高CVRアルゴリズム解析を統合

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * GrokにXアルゴリズム解析を依頼
 */
async function analyzeXAlgorithmWithGrok() {
  const prompt = `あなたはX（Twitter）アルゴリズムの専門家です。2026年のXアルゴリズムの最新動向を分析し、エンゲージメント率を最大化するための戦略を提供してください。

## 現在の状況
- インプレッション: 2,830,000（6.5時間分）→ 24時間換算で約10,440,000
- エンゲージメント: 86（6.5時間分）→ 24時間換算で約317
- エンゲージメント率: 0.003%（業界平均の100分の1以下）

## 分析依頼事項

1. **Xアルゴリズムの最新動向（2026年）**
   - エンゲージメント率に影響する主要な要素
   - アルゴリズムが評価する投稿の特徴
   - タイミング、フォーマット、コンテンツタイプの最適化

2. **エンゲージメント率0.003%の根本原因分析**
   - インプレッションは高いがエンゲージメントが低い理由
   - 投稿内容、タイミング、フォーマットの問題点

3. **即座に実行すべき最適化戦略**
   - 投稿内容の改善（質問CTA、リンク、ハッシュタグ）
   - 投稿タイミングの最適化
   - フォーマットの最適化（テキスト、画像、動画、ポール）

4. **具体的な実装ガイドライン**
   - 投稿内容生成のプロンプト改善
   - 文字数制限の最適化（引用リポスト140文字、通常ツイート280文字）
   - エンゲージメント要素の優先順位

以下のJSON形式で出力してください：
{
  "algorithmInsights": {
    "keyFactors": ["要素1", "要素2", "要素3"],
    "engagementDrivers": ["ドライバー1", "ドライバー2"],
    "timingOptimization": "タイミング最適化の説明",
    "formatOptimization": "フォーマット最適化の説明"
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
      "emoji": "絵文字の最適化方法"
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
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはX（Twitter）アルゴリズムの専門家です。2026年の最新動向を分析し、エンゲージメント率を最大化するための戦略を提供します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const response = completion?.choices?.[0]?.message?.content?.trim();
    if (!response) {
      throw new Error('Grok analysis failed: empty response');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('[Grok X Algorithm Analysis] Error:', error);
    throw error;
  }
}

/**
 * Geminiに高エンゲージメント+高CVRアルゴリズム解析を依頼
 */
async function analyzeEngagementCVRWithGemini() {
  const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `あなたは高エンゲージメント率と高CVR（コンバージョン率）を実現するコンテンツ戦略の専門家です。X（Twitter）でのエンゲージメント率とCVRを最大化するためのアルゴリズムを分析してください。

## 現在の状況
- インプレッション: 2,830,000（6.5時間分）→ 24時間換算で約10,440,000
- エンゲージメント: 86（6.5時間分）→ 24時間換算で約317
- エンゲージメント率: 0.003%（業界平均の100分の1以下）
- Telegramオプトイン: 17人（6.5時間分）→ 24時間換算で約63人/日
- Whopコンバージョン: 不明

## 分析依頼事項

1. **高エンゲージメント率のアルゴリズム**
   - エンゲージメントを引き出すコンテンツの特徴
   - 質問CTA、リンク、ハッシュタグの最適な配置
   - 心理的トリガーの活用方法

2. **高CVR（コンバージョン率）のアルゴリズム**
   - Telegramオプトインを最大化する方法
   - Whopコンバージョンを最大化する方法
   - コンバージョンファネルの最適化

3. **エンゲージメント率0.003%の根本原因分析**
   - コンテンツの問題点
   - CTAの問題点
   - フォーマットの問題点

4. **具体的な実装ガイドライン**
   - 投稿内容生成の最適化
   - エンゲージメント要素の優先順位
   - CVR向上のための戦略

以下のJSON形式で出力してください：
{
  "engagementAlgorithm": {
    "keyElements": ["要素1", "要素2", "要素3"],
    "contentStructure": "コンテンツ構造の説明",
    "psychologicalTriggers": ["トリガー1", "トリガー2"],
    "optimalFormat": "最適なフォーマット"
  },
  "cvrAlgorithm": {
    "telegramOptIn": {
      "strategy": "Telegramオプトイン戦略",
      "ctaOptimization": "CTA最適化",
      "funnelOptimization": "ファネル最適化"
    },
    "whopConversion": {
      "strategy": "Whopコンバージョン戦略",
      "linkPlacement": "リンク配置",
      "promoOptimization": "プロモーション最適化"
    }
  },
  "rootCauseAnalysis": {
    "engagementIssues": ["問題1", "問題2"],
    "cvrIssues": ["問題1", "問題2"],
    "recommendations": ["推奨事項1", "推奨事項2"]
  },
  "implementationGuide": {
    "contentOptimization": "コンテンツ最適化の具体的な内容",
    "ctaStrategy": "CTA戦略",
    "priorityOrder": ["優先順位1", "優先順位2"]
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSONを抽出（```json で囲まれている場合）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('[Gemini Engagement CVR Analysis] Error:', error);
    throw error;
  }
}

/**
 * GrokとGeminiの解析結果を統合
 */
async function integrateGrokGeminiAlgorithms() {
  console.log('🔄 GrokとGeminiのアルゴリズム解析を統合中...\n');

  try {
    // 1. GrokのXアルゴリズム解析
    console.log('1️⃣ GrokのXアルゴリズム解析を実行中...');
    const grokAnalysis = await analyzeXAlgorithmWithGrok();
    console.log('✅ Grok解析完了\n');

    // 2. Geminiの高エンゲージメント+高CVRアルゴリズム解析
    console.log('2️⃣ Geminiの高エンゲージメント+高CVRアルゴリズム解析を実行中...');
    const geminiAnalysis = await analyzeEngagementCVRWithGemini();
    console.log('✅ Gemini解析完了\n');

    // 3. 統合結果を生成
    console.log('3️⃣ 統合結果を生成中...');
    const integratedResult = {
      timestamp: new Date().toISOString(),
      grokAnalysis,
      geminiAnalysis,
      integratedStrategy: {
        contentOptimization: {
          questionCTA: grokAnalysis.optimizationStrategies?.contentGuidelines?.questionCTA || 
                       geminiAnalysis.engagementAlgorithm?.keyElements?.[0] || 
                       '質問CTAを投稿の最後に配置し、明確な行動喚起を含める',
          links: grokAnalysis.optimizationStrategies?.contentGuidelines?.links || 
                 geminiAnalysis.cvrAlgorithm?.whopConversion?.linkPlacement || 
                 'リンクを質問CTAの前に配置し、プロモーションコードを含める',
          hashtags: grokAnalysis.optimizationStrategies?.contentGuidelines?.hashtags || 
                    'トレンドハッシュタグ1つ + ニッチハッシュタグ2-3つ',
          emoji: grokAnalysis.optimizationStrategies?.contentGuidelines?.emoji || 
                 '絵文字は2-3個、感情的なインパクトを最大化',
        },
        timingOptimization: grokAnalysis.algorithmInsights?.timingOptimization || 
                           'ピーク時間（UTC 0,1,20,21）に投稿',
        formatOptimization: grokAnalysis.algorithmInsights?.formatOptimization || 
                           geminiAnalysis.engagementAlgorithm?.optimalFormat || 
                           'テキスト + 質問CTA + リンク + ハッシュタグ',
        cvrOptimization: {
          telegramOptIn: geminiAnalysis.cvrAlgorithm?.telegramOptIn?.strategy || 
                        'Telegram Deep Linkを明確に表示し、無料価値を強調',
          whopConversion: geminiAnalysis.cvrAlgorithm?.whopConversion?.strategy || 
                         'Whopリンクを優先的に配置し、プロモーションコード（DEFEND50）を含める',
        },
        priorityOrder: [
          grokAnalysis.implementationGuide?.priorityOrder?.[0] || 
          geminiAnalysis.implementationGuide?.priorityOrder?.[0] || 
          '質問CTAの最適化',
          'リンクの最適化',
          'ハッシュタグの最適化',
          'タイミングの最適化',
        ],
      },
    };

    // 4. 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(outputDir, `INTEGRATED_GROK_GEMINI_ALGORITHMS_${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(integratedResult, null, 2), 'utf-8');
    console.log(`📄 統合結果を保存: ${outputFile}\n`);

    // 5. Markdownレポートを生成
    const markdownFile = path.join(outputDir, `INTEGRATED_GROK_GEMINI_ALGORITHMS_${timestamp}.md`);
    let markdown = `# GrokとGeminiのアルゴリズム統合レポート（${timestamp}）

## 📋 統合概要

GrokのXアルゴリズム解析とGeminiの高エンゲージメント+高CVRアルゴリズム解析を統合しました。

---

## 🔍 GrokのXアルゴリズム解析結果

### アルゴリズムインサイト

**主要要素**:
${grokAnalysis.algorithmInsights?.keyFactors?.map(f => `- ${f}`).join('\n') || '- データなし'}

**エンゲージメントドライバー**:
${grokAnalysis.algorithmInsights?.engagementDrivers?.map(d => `- ${d}`).join('\n') || '- データなし'}

**タイミング最適化**: ${grokAnalysis.algorithmInsights?.timingOptimization || 'データなし'}

**フォーマット最適化**: ${grokAnalysis.algorithmInsights?.formatOptimization || 'データなし'}

### 根本原因分析

**主要原因**: ${grokAnalysis.rootCauseAnalysis?.primaryCause || 'データなし'}

**二次原因**:
${grokAnalysis.rootCauseAnalysis?.secondaryCauses?.map(c => `- ${c}`).join('\n') || '- データなし'}

**影響**: ${grokAnalysis.rootCauseAnalysis?.impact || 'データなし'}

### 最適化戦略

**即座に実行すべき施策**:
${grokAnalysis.optimizationStrategies?.immediate?.map(s => `- ${s}`).join('\n') || '- データなし'}

**短期施策**:
${grokAnalysis.optimizationStrategies?.shortTerm?.map(s => `- ${s}`).join('\n') || '- データなし'}

**コンテンツガイドライン**:
- **質問CTA**: ${grokAnalysis.optimizationStrategies?.contentGuidelines?.questionCTA || 'データなし'}
- **リンク**: ${grokAnalysis.optimizationStrategies?.contentGuidelines?.links || 'データなし'}
- **ハッシュタグ**: ${grokAnalysis.optimizationStrategies?.contentGuidelines?.hashtags || 'データなし'}
- **絵文字**: ${grokAnalysis.optimizationStrategies?.contentGuidelines?.emoji || 'データなし'}

---

## 🎯 Geminiの高エンゲージメント+高CVRアルゴリズム解析結果

### エンゲージメントアルゴリズム

**主要要素**:
${geminiAnalysis.engagementAlgorithm?.keyElements?.map(e => `- ${e}`).join('\n') || '- データなし'}

**コンテンツ構造**: ${geminiAnalysis.engagementAlgorithm?.contentStructure || 'データなし'}

**心理的トリガー**:
${geminiAnalysis.engagementAlgorithm?.psychologicalTriggers?.map(t => `- ${t}`).join('\n') || '- データなし'}

**最適なフォーマット**: ${geminiAnalysis.engagementAlgorithm?.optimalFormat || 'データなし'}

### CVRアルゴリズム

**Telegramオプトイン戦略**: ${geminiAnalysis.cvrAlgorithm?.telegramOptIn?.strategy || 'データなし'}

**CTA最適化**: ${geminiAnalysis.cvrAlgorithm?.telegramOptIn?.ctaOptimization || 'データなし'}

**ファネル最適化**: ${geminiAnalysis.cvrAlgorithm?.telegramOptIn?.funnelOptimization || 'データなし'}

**Whopコンバージョン戦略**: ${geminiAnalysis.cvrAlgorithm?.whopConversion?.strategy || 'データなし'}

**リンク配置**: ${geminiAnalysis.cvrAlgorithm?.whopConversion?.linkPlacement || 'データなし'}

**プロモーション最適化**: ${geminiAnalysis.cvrAlgorithm?.whopConversion?.promoOptimization || 'データなし'}

---

## 🚀 統合戦略

### コンテンツ最適化

1. **質問CTA**: ${integratedResult.integratedStrategy.contentOptimization.questionCTA}
2. **リンク**: ${integratedResult.integratedStrategy.contentOptimization.links}
3. **ハッシュタグ**: ${integratedResult.integratedStrategy.contentOptimization.hashtags}
4. **絵文字**: ${integratedResult.integratedStrategy.contentOptimization.emoji}

### タイミング最適化

${integratedResult.integratedStrategy.timingOptimization}

### フォーマット最適化

${integratedResult.integratedStrategy.formatOptimization}

### CVR最適化

**Telegramオプトイン**: ${integratedResult.integratedStrategy.cvrOptimization.telegramOptIn}

**Whopコンバージョン**: ${integratedResult.integratedStrategy.cvrOptimization.whopConversion}

### 優先順位

${integratedResult.integratedStrategy.priorityOrder.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

## 📊 次のアクション

1. **投稿内容生成ロジックの更新**
   - \`services/grok/client.js\`の\`generateQuoteRepostText\`関数を更新
   - \`api/x-quote-repost.js\`のテンプレートを更新

2. **CTA最適化の実装**
   - 質問CTAの配置を最適化
   - リンクの配置を最適化

3. **エンゲージメント要素の優先順位付け**
   - 質問CTAを最優先
   - リンクを次に優先
   - ハッシュタグを最後に配置

---

## 📚 参照

- \`docs/INTEGRATED_GROK_GEMINI_ALGORITHMS_${timestamp}.json\` - 統合結果のJSONファイル
- \`services/grok/client.js\` - Grokクライアント
- \`services/gemini/showProducer.js\` - Geminiクライアント
`;

    fs.writeFileSync(markdownFile, markdown, 'utf-8');
    console.log(`📄 Markdownレポートを保存: ${markdownFile}\n`);

    console.log('✅ 統合完了！');
    console.log('\n📊 統合結果のサマリー:');
    console.log('='.repeat(60));
    console.log('コンテンツ最適化:');
    console.log(`  質問CTA: ${integratedResult.integratedStrategy.contentOptimization.questionCTA}`);
    console.log(`  リンク: ${integratedResult.integratedStrategy.contentOptimization.links}`);
    console.log(`  ハッシュタグ: ${integratedResult.integratedStrategy.contentOptimization.hashtags}`);
    console.log(`  絵文字: ${integratedResult.integratedStrategy.contentOptimization.emoji}`);
    console.log('\n優先順位:');
    integratedResult.integratedStrategy.priorityOrder.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p}`);
    });
    console.log('='.repeat(60));

    return integratedResult;
  } catch (error) {
    console.error('❌ 統合エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  integrateGrokGeminiAlgorithms()
    .then(() => {
      console.log('\n✅ スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ スクリプト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { integrateGrokGeminiAlgorithms, analyzeXAlgorithmWithGrok, analyzeEngagementCVRWithGemini };
