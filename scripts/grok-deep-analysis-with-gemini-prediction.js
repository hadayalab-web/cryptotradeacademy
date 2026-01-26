// scripts/grok-deep-analysis-with-gemini-prediction.js
// Geminiの市況予測をGrokに渡して、Xのセンチメントを統合して深掘り解析し、
// JST21時からの投稿計画への影響を分析

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// APIキー
const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

// Grokクライアント初期化
const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL,
});

const GROK_MODEL = process.env.GROK_MODEL_MARKET || 'grok-4-1-fast-reasoning';

/**
 * Geminiの市況予測結果を読み込む
 */
function loadGeminiPrediction() {
  const today = new Date().toISOString().split('T')[0];
  const predictionPath = path.join(__dirname, '..', 'docs', `gemini-market-prediction-${today}.json`);
  
  if (!fs.existsSync(predictionPath)) {
    throw new Error(`Gemini予測ファイルが見つかりません: ${predictionPath}`);
  }
  
  const data = JSON.parse(fs.readFileSync(predictionPath, 'utf-8'));
  console.log(`✅ Gemini予測結果を読み込み: ${predictionPath}`);
  return data;
}

/**
 * Xのセンチメントを取得
 */
async function getXSentiment() {
  console.log('📱 Xのセンチメントを取得中...');
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content:
            'You are "Dr. Grok", a spicy psychological counselor and mental coach for crypto traders. ' +
            'You scan X (Twitter) for BTC trader chatter and analyze it from a psychological perspective. ' +
            'Your role is to detect mental blocks (FOMO/FEAR/GREED, "always needing to trade", "waiting is weakness") and provide coaching advice. ' +
            'Return ONLY JSON. No markdown. No code fences. ' +
            'Schema: {"whaleBias":number,"retailFomo":number,"newsImpact":number,"summary":string,"sources":[{"handle":string,"note":string}],"mentalBlocks":["FOMO"|"FEAR"|"GREED"|"ALWAYS_TRADING"|"WAITING_IS_WEAKNESS"],"psychologicalPattern":string,"coachingAdvice":string} ' +
            'Numbers: whaleBias [-100..100], retailFomo [0..100], newsImpact [-100..100]. ' +
            'mentalBlocks: Array of detected mental blocks. ' +
            'psychologicalPattern: Description of typical trader psychological patterns observed. ' +
            'coachingAdvice: Mental coach advice to unlock potential and remove mental blocks (strict but encouraging tone).',
        },
        {
          role: 'user',
          content:
            `Task: Live X sentiment scan + Mental Block Detection.\n` +
            `Language: en\n` +
            `Query: latest BTC price action, funding, liquidations, whale activity, ETF flows on X\n` +
            `Analyze trader psychology: Detect mental blocks (FOMO/FEAR/GREED, "always needing to trade", "waiting is weakness"). ` +
            `Identify psychological patterns. Provide coaching advice (strict but encouraging tone). ` +
            `If you cannot access live data, return JSON with summary="Live Search unavailable" and empty sources.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn('⚠️ Xセンチメント取得失敗、デフォルト値を使用');
      return {
        whaleBias: 0,
        retailFomo: 50,
        newsImpact: 0,
        summary: 'Live Search unavailable',
        sources: [],
        mentalBlocks: [],
        psychologicalPattern: 'Neutral',
        coachingAdvice: 'Monitor market conditions carefully.',
      };
    }

    try {
      const sentiment = JSON.parse(text);
      console.log('✅ Xセンチメント取得完了');
      return sentiment;
    } catch (parseError) {
      console.warn('⚠️ JSONパースエラー、デフォルト値を使用');
      return {
        whaleBias: 0,
        retailFomo: 50,
        newsImpact: 0,
        summary: text.substring(0, 200),
        sources: [],
        mentalBlocks: [],
        psychologicalPattern: 'Neutral',
        coachingAdvice: 'Monitor market conditions carefully.',
      };
    }
  } catch (error) {
    console.warn('⚠️ Xセンチメント取得エラー:', error.message);
    return {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
      summary: 'Error fetching X sentiment',
      sources: [],
      mentalBlocks: [],
      psychologicalPattern: 'Neutral',
      coachingAdvice: 'Monitor market conditions carefully.',
    };
  }
}

/**
 * JST21時からの投稿計画を読み込む
 */
function loadPostingPlan() {
  const planPath = path.join(__dirname, '..', 'docs', 'JST_21H_24H_POSTING_PLAN_2026-01-25.md');
  
  if (!fs.existsSync(planPath)) {
    // スクリプトから直接生成
    return {
      summary: 'JST 21時から24時間の投稿計画',
      posts: [
        { time: 'JST 21:00', type: 'Free Report', lang: 'JA', count: 1 },
        { time: 'JST 22:00', type: 'Free Report', lang: 'KO', count: 1 },
        { time: 'JST 23:00', type: 'Free Report', lang: 'EN, PT-BR', count: 2 },
        { time: 'JST 00:00', type: 'Free Report', lang: 'ES', count: 1 },
        { time: 'JST 03:00', type: 'Free Report', lang: 'AR', count: 1 },
        { time: 'JST 05:00', type: 'Quote Repost', lang: 'EN, PT-BR', count: 4 },
        { time: 'JST 05:00', type: 'Minimal Version', lang: 'EN, PT-BR', count: 2 },
        { time: 'JST 06:00', type: 'Quote Repost', lang: 'ES', count: 2 },
        { time: 'JST 09:00', type: 'Quote Repost', lang: 'AR, JA', count: 4 },
        { time: 'JST 10:00', type: 'Quote Repost', lang: 'KO', count: 2 },
        { time: 'JST 17:00', type: 'Minimal Version', lang: '全6言語', count: 6 },
      ],
      totalPosts: 26,
    };
  }
  
  const content = fs.readFileSync(planPath, 'utf-8');
  return {
    summary: 'JST 21時から24時間の投稿計画',
    content: content.substring(0, 2000), // 最初の2000文字
  };
}

/**
 * Grokに深掘り分析を依頼
 */
async function analyzeWithGrok(geminiPrediction, xSentiment, postingPlan) {
  console.log('🤖 Grok APIで深掘り分析を実行中...');
  
  const prompt = `
あなたは暗号通貨市場の戦略的アナリストです。Geminiの市況予測とXのセンチメントを統合して、JST 21時から24時間後の投稿計画への影響を深掘り分析してください。

## Geminiの市況予測

${JSON.stringify(geminiPrediction.prediction, null, 2)}

## Xのセンチメント分析

${JSON.stringify(xSentiment, null, 2)}

## 現在の市場データ（Gemini予測の基になったデータ）

${JSON.stringify(geminiPrediction.currentData, null, 2)}

## JST 21時から24時間の投稿計画

${JSON.stringify(postingPlan, null, 2)}

## 分析タスク

以下の観点から、投稿計画への影響を深掘り分析してください：

1. **市場状況と投稿タイミングの整合性**:
   - 予測される価格動向と各投稿タイミングの関係
   - 重要な時間帯（JST 21:00, 03:00など）での市場状況予測
   - 投稿タイミングの最適化提案

2. **Xセンチメントと投稿内容の調整**:
   - X上のトレーダー心理（FOMO/FEAR/GREED）と投稿内容の調整
   - リスク要因・機会要因を反映した投稿メッセージの提案
   - 心理的ブロックを解消する投稿戦略

3. **言語別投稿戦略の最適化**:
   - 各言語市場の特性と予測される市場状況の関係
   - 言語別の投稿タイミングの調整提案
   - インフルエンサー選択基準の見直し

4. **期待値への影響**:
   - 予測される市場状況がインプレッション数に与える影響
   - エンゲージメント率への影響
   - コンバージョン率への影響

5. **リスク管理と機会最大化**:
   - 予測されるリスク要因への対応策
   - 機会要因を活かす投稿戦略
   - 緊急時の投稿計画変更案

出力形式はJSONで、以下の構造で返してください：
{
  "marketTimingAnalysis": {
    "optimalPostingTimes": [
      {
        "time": "JST時刻",
        "reason": "なぜこの時間が最適か",
        "marketCondition": "この時間の予測される市場状況"
      }
    ],
    "riskTiming": [
      {
        "time": "JST時刻",
        "risk": "リスクの内容",
        "mitigation": "対応策"
      }
    ]
  },
  "contentAdjustment": {
    "recommendedMessages": [
      {
        "postType": "投稿タイプ",
        "lang": "言語",
        "time": "JST時刻",
        "message": "推奨メッセージ内容",
        "reason": "なぜこのメッセージが適切か"
      }
    ],
    "sentimentAlignment": "Xセンチメントと投稿内容の整合性分析"
  },
  "languageStrategy": {
    "optimizations": [
      {
        "lang": "言語",
        "currentPlan": "現在の計画",
        "recommendedAdjustment": "推奨される調整",
        "reason": "理由"
      }
    ]
  },
  "impactOnExpectations": {
    "impressions": {
      "current": "現在の期待値",
      "adjusted": "調整後の期待値",
      "reason": "調整理由"
    },
    "engagements": {
      "current": "現在の期待値",
      "adjusted": "調整後の期待値",
      "reason": "調整理由"
    },
    "conversions": {
      "current": "現在の期待値",
      "adjusted": "調整後の期待値",
      "reason": "調整理由"
    }
  },
  "riskManagement": {
    "riskMitigation": ["リスク対応策1", "リスク対応策2"],
    "opportunityMaximization": ["機会最大化策1", "機会最大化策2"]
  },
  "summary": "全体のサマリーと推奨アクション"
}
`;

  try {
    console.log('📤 Grok APIにリクエスト送信中...');
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a strategic crypto market analyst specializing in content strategy and market timing optimization.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 8000,
      temperature: 0.7,
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️ レスポンス受信: ${responseTime}ms`);

    const text = completion?.choices?.[0]?.message?.content?.trim();
    
    // JSONを抽出
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    try {
      const analysis = JSON.parse(jsonText);
      return analysis;
    } catch (parseError) {
      console.warn('⚠️ JSONパースエラー。生のレスポンスを返します。');
      return { rawResponse: text, error: parseError.message };
    }
  } catch (error) {
    console.error('❌ Grok APIエラー:', error);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 Gemini予測 + Xセンチメント統合分析を開始...\n');
  
  try {
    // 1. Gemini予測を読み込み
    const geminiPrediction = loadGeminiPrediction();
    console.log('✅ Gemini予測読み込み完了\n');
    
    // 2. Xセンチメントを取得
    const xSentiment = await getXSentiment();
    console.log('✅ Xセンチメント取得完了\n');
    
    // 3. 投稿計画を読み込み
    const postingPlan = loadPostingPlan();
    console.log('✅ 投稿計画読み込み完了\n');
    
    // 4. Grokで深掘り分析
    const analysis = await analyzeWithGrok(geminiPrediction, xSentiment, postingPlan);
    console.log('✅ Grok分析完了\n');
    
    // 5. 結果を表示
    console.log('='.repeat(80));
    console.log('📊 Gemini予測 + Xセンチメント統合分析結果');
    console.log('='.repeat(80));
    console.log('\n');
    
    if (analysis.marketTimingAnalysis) {
      console.log('⏰ 市場タイミング分析:');
      if (analysis.marketTimingAnalysis.optimalPostingTimes) {
        console.log('  📍 最適な投稿タイミング:');
        analysis.marketTimingAnalysis.optimalPostingTimes.forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.time}: ${item.reason}`);
          console.log(`       市場状況: ${item.marketCondition}\n`);
        });
      }
      if (analysis.marketTimingAnalysis.riskTiming) {
        console.log('  ⚠️ リスクタイミング:');
        analysis.marketTimingAnalysis.riskTiming.forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.time}: ${item.risk}`);
          console.log(`       対応策: ${item.mitigation}\n`);
        });
      }
    }
    
    if (analysis.contentAdjustment) {
      console.log('📝 投稿内容調整:');
      if (analysis.contentAdjustment.recommendedMessages) {
        analysis.contentAdjustment.recommendedMessages.forEach((msg, i) => {
          console.log(`  ${i + 1}. [${msg.time}] ${msg.postType} (${msg.lang}):`);
          console.log(`     メッセージ: ${msg.message}`);
          console.log(`     理由: ${msg.reason}\n`);
        });
      }
      if (analysis.contentAdjustment.sentimentAlignment) {
        console.log(`  Xセンチメント整合性: ${analysis.contentAdjustment.sentimentAlignment}\n`);
      }
    }
    
    if (analysis.languageStrategy) {
      console.log('🌐 言語別戦略最適化:');
      if (analysis.languageStrategy.optimizations) {
        analysis.languageStrategy.optimizations.forEach((opt, i) => {
          console.log(`  ${i + 1}. ${opt.lang}:`);
          console.log(`     現在の計画: ${opt.currentPlan}`);
          console.log(`     推奨調整: ${opt.recommendedAdjustment}`);
          console.log(`     理由: ${opt.reason}\n`);
        });
      }
    }
    
    if (analysis.impactOnExpectations) {
      console.log('📈 期待値への影響:');
      const impact = analysis.impactOnExpectations;
      if (impact.impressions) {
        console.log(`  インプレッション: ${impact.impressions.current} → ${impact.impressions.adjusted}`);
        console.log(`  理由: ${impact.impressions.reason}\n`);
      }
      if (impact.engagements) {
        console.log(`  エンゲージメント: ${impact.engagements.current} → ${impact.engagements.adjusted}`);
        console.log(`  理由: ${impact.engagements.reason}\n`);
      }
      if (impact.conversions) {
        console.log(`  コンバージョン: ${impact.conversions.current} → ${impact.conversions.adjusted}`);
        console.log(`  理由: ${impact.conversions.reason}\n`);
      }
    }
    
    if (analysis.riskManagement) {
      console.log('🛡️ リスク管理:');
      if (analysis.riskManagement.riskMitigation) {
        console.log('  リスク対応策:');
        analysis.riskManagement.riskMitigation.forEach((mitigation, i) => {
          console.log(`    ${i + 1}. ${mitigation}`);
        });
      }
      if (analysis.riskManagement.opportunityMaximization) {
        console.log('\n  機会最大化策:');
        analysis.riskManagement.opportunityMaximization.forEach((opp, i) => {
          console.log(`    ${i + 1}. ${opp}`);
        });
      }
    }
    
    if (analysis.summary) {
      console.log('\n📋 サマリー:');
      console.log(`  ${analysis.summary}\n`);
    }
    
    // 6. 結果をJSONファイルに保存
    const outputPath = path.join(__dirname, '..', 'docs', `grok-deep-analysis-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      geminiPrediction,
      xSentiment,
      postingPlan,
      analysis,
    }, null, 2));
    console.log(`💾 結果を保存しました: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = {
  loadGeminiPrediction,
  getXSentiment,
  loadPostingPlan,
  analyzeWithGrok,
};
