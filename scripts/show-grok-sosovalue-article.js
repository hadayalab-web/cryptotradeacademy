// scripts/show-grok-sosovalue-article.js
// 生成されたSoSoValue風ニュース記事をGrokに紹介し、評価とフィードバックを求めるスクリプト

const OpenAI = require('openai');
const { fetchOnchainDataWithHistory, analyzeHistoricalPatterns, generateSoSoValueNews } = require('./generate-sosovalue-news');

// 環境変数からAPIキーを取得
const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const CRYPTOQUANT_API_KEY = process.env.CRYPTOQUANT_API_KEY || 'AqSfkCmyWnepP1JX3xnPvqeR3EYNQot38egiAICE2421tcYdIZAlnXcb99pyFkis08uN7Ln';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
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
 * Grokに生成された記事を紹介し、評価とフィードバックを求める
 */
async function showArticleToGrok(article, onchainData, patterns) {
  try {
    const prompt = `あなたはTrap Defence BTCのコンテンツ品質評価担当者です。

以下のSoSoValue風のニュース記事を評価してください。この記事は、CryptoQuantのオンチェーンデータとGeminiの分析力を組み合わせて自動生成されたものです。

## 生成された記事

${article}

## 使用されたデータ

### 現在のオンチェーンデータ
- 取引所ネットフロー: ${onchainData.current.exchangeNetflow || 'N/A'} BTC
- 取引所流入量: ${onchainData.current.exchangeInflow || 'N/A'} BTC
- 取引所流出量: ${onchainData.current.exchangeOutflow || 'N/A'} BTC
- MPI: ${onchainData.current.mpi || 'N/A'}
- BTC価格: $${onchainData.current.price.toLocaleString()}
- 24時間変動: ${onchainData.current.change24h > 0 ? '+' : ''}${onchainData.current.change24h.toFixed(2)}%

### 過去データ分析
- 類似パターン（Netflow）: ${patterns.netflow.similarPeriods.length}件
- 類似パターン（MPI）: ${patterns.mpi.similarPeriods.length}件
- 過去30日平均（Netflow）: ${patterns.netflow.average?.toFixed(2) || 'N/A'} BTC
- 過去30日平均（MPI）: ${patterns.mpi.average?.toFixed(2) || 'N/A'}

## 評価依頼事項

以下の視点から、この記事を評価してください：

### 1. 記事のクオリティ評価
- **SoSoValue風のスタイル**: SoSoValueやOdailyのようなスタイルになっているか？
- **データ駆動性**: CryptoQuantのデータが適切に活用されているか？
- **過去データとの比較**: 「過去に照らし合わせると、、」のような歴史比較が適切に含まれているか？
- **24時間予測**: 市況予測が具体的で有用か？
- **Trap Defence独自性**: Trap Defenceらしい要素（トラップ検出、心理的コーチング）が含まれているか？

### 2. 記事の構成と流れ
- **見出し**: キャッチーでクリックしたくなるか？
- **本文の流れ**: データ提示 → 過去比較 → 市場解釈 → 予測 → 結論の流れが自然か？
- **読みやすさ**: 専門的でありながら読みやすいか？

### 3. 技術的な正確性
- **データの解釈**: データの解釈が正確か？
- **予測の根拠**: 24時間予測の根拠が明確か？
- **リスク要因**: リスク要因が適切に明記されているか？

### 4. 改善提案
- **追加すべき要素**: 何か追加すべき要素はあるか？
- **改善点**: 改善できる点はあるか？
- **Trap Defenceらしさ**: もっとTrap Defenceらしさを出すにはどうすればよいか？

### 5. 実用性と配信可能性
- **Minimal Version（無料版）**: この記事を無料版に配信する価値はあるか？
- **Regular Briefing（有料版）**: 有料版ならどのような深掘りが可能か？
- **エンゲージメント予測**: XやTelegramでどの程度のエンゲージメントを獲得できると予測するか？

## 回答形式

以下の形式で回答してください：

### 1. 総合評価
- 記事のクオリティを10点満点で評価
- 一言コメント

### 2. 各項目の評価
- SoSoValue風スタイル: [評価]
- データ駆動性: [評価]
- 過去データ比較: [評価]
- 24時間予測: [評価]
- Trap Defence独自性: [評価]

### 3. 記事の構成と流れ
- 見出し: [評価]
- 本文の流れ: [評価]
- 読みやすさ: [評価]

### 4. 技術的な正確性
- データ解釈: [評価]
- 予測の根拠: [評価]
- リスク要因: [評価]

### 5. 改善提案
- 追加すべき要素: [具体的な提案]
- 改善点: [具体的な改善案]
- Trap Defenceらしさの強化: [具体的な提案]

### 6. 実用性と配信可能性
- Minimal Versionでの配信価値: [評価と理由]
- Regular Briefingでの深掘り案: [具体的な提案]
- エンゲージメント予測: [具体的な数値予測]

日本語で回答してください。`;

    console.log('🤖 Grokに記事を紹介し、評価を依頼中...');
    
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a content quality evaluator for Trap Defence BTC, specializing in cryptocurrency news article analysis and content strategy. You provide detailed, constructive feedback on article quality, style, and effectiveness.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const text = completion.choices[0]?.message?.content || '評価が取得できませんでした。';
    const usage = completion.usage || {};

    return {
      evaluation: text,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Grok × SoSoValue風ニュース記事評価スクリプト\n');
  
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
    console.log('📰 生成された記事:');
    console.log('='.repeat(80));
    console.log(articleResult.article);
    console.log('='.repeat(80) + '\n');
    
    // 2. Grokに記事を紹介して評価を依頼
    console.log('📊 Step 2: Grokに記事を紹介し、評価を依頼中...\n');
    const grokResult = await showArticleToGrok(articleResult.article, onchainData, patterns);
    
    // 3. 結果を表示
    console.log('\n' + '='.repeat(80));
    console.log('🎯 Grokの評価とフィードバック');
    console.log('='.repeat(80) + '\n');
    console.log(grokResult.evaluation);
    console.log('\n' + '='.repeat(80));
    console.log('📊 トークン使用量');
    console.log('='.repeat(80));
    console.log(`プロンプトトークン: ${grokResult.usage.promptTokens}`);
    console.log(`レスポンストークン: ${grokResult.usage.completionTokens}`);
    console.log(`合計トークン: ${grokResult.usage.totalTokens}`);
    console.log('='.repeat(80) + '\n');
    
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
  showArticleToGrok,
};
