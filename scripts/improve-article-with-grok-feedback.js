// scripts/improve-article-with-grok-feedback.js
// Grokの改善提案をGeminiに渡して、SoSoValue風ニュース記事をブラッシュアップするスクリプト

const OpenAI = require('openai');
const { fetchOnchainDataWithHistory, analyzeHistoricalPatterns, generateSoSoValueNews } = require('./generate-sosovalue-news');
const { showArticleToGrok } = require('./show-grok-sosovalue-article');

// 環境変数からAPIキーを取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';
const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const CRYPTOQUANT_API_KEY = process.env.CRYPTOQUANT_API_KEY || 'AqSfkCmyWnepP1JX3xnPvqeR3EYNQot38egiAICE2421tcYdIZAlnXcb99pyFkis08uN7Ln';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

// CryptoQuant APIキーを環境変数に設定
if (CRYPTOQUANT_API_KEY) {
  process.env.CRYPTOQUANT_API_KEY = CRYPTOQUANT_API_KEY;
}

// Grokクライアントを初期化
const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * GeminiにGrokの改善提案を渡して記事をブラッシュアップ
 */
async function improveArticleWithGrokFeedback(originalArticle, grokFeedback, onchainData, patterns) {
  try {
    const prompt = `あなたはSoSoValueやOdailyのような暗号通貨ニュースメディアのプロフェッショナルなアナリスト兼ジャーナリストです。

以下のSoSoValue風のニュース記事を、Grokからの改善提案に基づいてブラッシュアップしてください。

## 元の記事

${originalArticle}

## Grokからの評価と改善提案

${grokFeedback}

## 改善の要件

Grokの改善提案に基づいて、以下の点を改善してください：

### 1. 過去データ比較の強化
- 類似パターンの具体例（日付・価格変動結果）を追加
- 過去の類似局面での実際の価格動向を具体的に記載

### 2. Trap Defenceらしさの強化
- トラップ具体例を追加（例: 「過去の類似局面で、ネットフロー均衡崩れ時にFOMOエントリーが10%下落トラップに嵌まった事例」）
- 「Trap Score: X/10（退屈トラップ高警戒）」のような独自メトリクスを導入

### 3. データの視覚化要素
- チャートやグラフの説明を追加（実際のグラフは生成できないため、テキストで説明）
- データの推移を時系列で説明

### 4. 関連指標の追加
- MVRV Z-ScoreやRHODL Ratioなどの関連指標に言及（データが利用可能な場合）
- 複数指標の統合分析を追加

### 5. 記事の構成と流れの改善
- より自然な流れになるよう調整
- 読みやすさを向上

## 出力形式

以下の形式で出力してください：

**見出し（タイトル）**

本文（1000-1500文字程度、完全な記事として完結させること）

**重要**: 
- 元の記事の良い点は維持しつつ、Grokの改善提案を反映させてください
- 記事は必ず完結させてください。途中で切れないように、結論まで含めて完全な記事として出力してください
- Trap Defence独自性を強化してください

日本語で出力してください。`;

    console.log('🤖 GeminiにGrokの改善提案を渡して記事をブラッシュアップ中...');
    
    // REST APIを直接呼び出し
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000, // 完全な記事生成のため
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // レスポンスからテキストを取得
    let text = '記事が生成できませんでした。';
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text || '記事が生成できませんでした。';
      }
    }
    
    // エラーの場合は詳細を表示
    if (data.error) {
      console.error('Gemini API Error:', JSON.stringify(data.error, null, 2));
    }
    
    const usage = data.usageMetadata || {};

    return {
      improvedArticle: text,
      usage: {
        promptTokenCount: usage.promptTokenCount || 0,
        candidatesTokenCount: usage.candidatesTokenCount || 0,
        totalTokenCount: usage.totalTokenCount || 0
      },
      rawResponse: data // デバッグ用
    };
  } catch (error) {
    console.error('❌ Gemini API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Grok改善提案 × Gemini 記事ブラッシュアップスクリプト\n');
  
  try {
    // 1. まず記事を生成
    console.log('📝 Step 1: SoSoValue風ニュース記事を生成中...\n');
    const onchainData = await fetchOnchainDataWithHistory();
    
    if (!onchainData) {
      console.error('❌ オンチェーンデータの取得に失敗しました');
      process.exit(1);
    }
    
    const patterns = analyzeHistoricalPatterns(onchainData.current, onchainData.history);
    const articleResult = await generateSoSoValueNews(onchainData, patterns);
    
    console.log('✅ 記事生成完了\n');
    
    // 2. Grokに評価と改善提案を依頼
    console.log('📊 Step 2: Grokに評価と改善提案を依頼中...\n');
    const grokResult = await showArticleToGrok(articleResult.article, onchainData, patterns);
    
    console.log('✅ Grok評価完了\n');
    
    // 3. GeminiにGrokの改善提案を渡して記事をブラッシュアップ
    console.log('✨ Step 3: GeminiにGrokの改善提案を渡して記事をブラッシュアップ中...\n');
    const improvedResult = await improveArticleWithGrokFeedback(
      articleResult.article,
      grokResult.evaluation,
      onchainData,
      patterns
    );
    
    // 4. 結果を表示
    console.log('\n' + '='.repeat(80));
    console.log('📰 ブラッシュアップ後の記事');
    console.log('='.repeat(80) + '\n');
    console.log(improvedResult.improvedArticle);
    console.log('\n' + '='.repeat(80));
    console.log('📊 トークン使用量（Gemini改善版）');
    console.log('='.repeat(80));
    console.log(`プロンプトトークン: ${improvedResult.usage.promptTokenCount}`);
    console.log(`レスポンストークン: ${improvedResult.usage.candidatesTokenCount}`);
    console.log(`合計トークン: ${improvedResult.usage.totalTokenCount}`);
    console.log('='.repeat(80) + '\n');
    
    // デバッグ情報（エラー時）
    if (improvedResult.improvedArticle === '記事が生成できませんでした。' && improvedResult.rawResponse) {
      console.log('⚠️ デバッグ情報:');
      console.log(JSON.stringify(improvedResult.rawResponse, null, 2));
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  improveArticleWithGrokFeedback,
};
