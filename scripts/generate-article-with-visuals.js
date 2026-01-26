// scripts/generate-article-with-visuals.js
// CryptoQuantデータ×Gemini×Grokで記事を生成し、NanoBnana（画像）とVeo（動画）で視覚化を追加するスクリプト

const { fetchOnchainDataWithHistory, analyzeHistoricalPatterns, generateSoSoValueNews } = require('./generate-sosovalue-news');
const { showArticleToGrok } = require('./show-grok-sosovalue-article');
const { improveArticleWithGrokFeedback } = require('./improve-article-with-grok-feedback');
const { generateImage, generateHolographicDataViz } = require('../services/gemini/imageGenerator');
const { generateMarketVideo } = require('../services/gemini/videoGenerator');
const fs = require('fs');
const path = require('path');

// 環境変数からAPIキーを取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';
const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const CRYPTOQUANT_API_KEY = process.env.CRYPTOQUANT_API_KEY || 'AqSfkCmyWnepP1JX3xnPvqeR3EYNQot38egiAICE2421tcYdIZAlnXcb99pyFkis08uN7Ln';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

// CryptoQuant APIキーを環境変数に設定
if (CRYPTOQUANT_API_KEY) {
  process.env.CRYPTOQUANT_API_KEY = CRYPTOQUANT_API_KEY;
}

/**
 * オンチェーンデータに基づいたチャート画像を生成（NanoBnana）
 */
async function generateOnchainChartImage(onchainData, patterns) {
  try {
    const netflow = onchainData.current.exchangeNetflow || 0;
    const mpi = onchainData.current.mpi || 0;
    const price = onchainData.current.price || 0;
    const change24h = onchainData.current.change24h || 0;
    
    const prompt = `Create a professional cryptocurrency on-chain data visualization chart showing:

**Main Chart: Exchange Netflow (30-day trend)**
- Current Netflow: ${netflow.toFixed(2)} BTC
- 30-day Average: ${patterns.netflow.average?.toFixed(2) || 'N/A'} BTC
- Show a line chart with the netflow trend over the past 30 days
- Highlight the current value with a marker
- Use green for positive values (outflow), red for negative values (inflow)

**Secondary Chart: Miner Position Index (MPI)**
- Current MPI: ${mpi.toFixed(2)}
- 30-day Average: ${patterns.mpi.average?.toFixed(2) || 'N/A'}
- Show MPI trend as a bar chart or line chart
- Highlight when MPI is below -1.0 (miner selling pressure low)

**Key Metrics Display:**
- BTC Price: $${price.toLocaleString()}
- 24h Change: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
- Exchange Inflow: ${onchainData.current.exchangeInflow?.toFixed(2) || 'N/A'} BTC
- Exchange Outflow: ${onchainData.current.exchangeOutflow?.toFixed(2) || 'N/A'} BTC

**Style:**
- Modern, clean trading dashboard style
- Dark theme with professional color scheme
- Clear labels and data points
- Professional typography
- Suitable for news article embedding

Make it visually appealing and easy to read, similar to CryptoQuant or TradingView charts.`;

    console.log('🎨 NanoBnanaでチャート画像を生成中...');
    const imageDataUrl = await generateImage(prompt, '16:9');
    
    if (imageDataUrl) {
      console.log('✅ チャート画像生成完了');
      return imageDataUrl;
    }
    
    console.warn('⚠️ チャート画像生成に失敗');
    return null;
  } catch (error) {
    console.error('❌ チャート画像生成エラー:', error.message);
    return null;
  }
}

/**
 * ホログラフィックデータビジュアライゼーション画像を生成（NanoBnana）
 */
async function generateHolographicViz(onchainData) {
  try {
    console.log('🌐 NanoBnanaでホログラフィックデータビジュアライゼーションを生成中...');
    const imageDataUrl = await generateHolographicDataViz('bitcoin-network-flows', {
      netflow: onchainData.current.exchangeNetflow,
      mpi: onchainData.current.mpi,
      price: onchainData.current.price,
    });
    
    if (imageDataUrl) {
      console.log('✅ ホログラフィックビジュアライゼーション生成完了');
      return imageDataUrl;
    }
    
    console.warn('⚠️ ホログラフィックビジュアライゼーション生成に失敗');
    return null;
  } catch (error) {
    console.error('❌ ホログラフィックビジュアライゼーション生成エラー:', error.message);
    return null;
  }
}

/**
 * オンチェーンデータに基づいた動画を生成（Veo）
 */
async function generateOnchainVideo(onchainData, article) {
  try {
    const marketData = {
      price_usd_display: onchainData.current.price,
      market_score: 75, // 仮のスコア
      sentiment_label: onchainData.current.exchangeNetflow < 0 ? 'Bullish' : 'Neutral',
      change_24h: onchainData.current.change24h,
      inflow: onchainData.current.exchangeNetflow,
    };
    
    const summary = article.substring(0, 300); // 記事の最初の300文字をサマリーとして使用
    
    console.log('🎬 Veoで動画を生成中...');
    const videoDataUrl = await generateMarketVideo(marketData, summary, 'ja');
    
    if (videoDataUrl) {
      console.log('✅ 動画生成完了');
      return videoDataUrl;
    }
    
    console.warn('⚠️ 動画生成に失敗');
    return null;
  } catch (error) {
    console.error('❌ 動画生成エラー:', error.message);
    return null;
  }
}

/**
 * Base64データURLをファイルに保存
 */
function saveDataUrlToFile(dataUrl, filePath) {
  try {
    // Data URLからBase64データを抽出
    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // ファイルに保存
    fs.writeFileSync(filePath, buffer);
    console.log(`💾 ファイルに保存: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`❌ ファイル保存エラー: ${error.message}`);
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 記事生成 × 視覚化（NanoBnana + Veo）スクリプト\n');
  
  try {
    // 1. オンチェーンデータを取得
    console.log('📊 Step 1: オンチェーンデータを取得中...\n');
    const onchainData = await fetchOnchainDataWithHistory();
    
    if (!onchainData) {
      console.error('❌ オンチェーンデータの取得に失敗しました');
      process.exit(1);
    }
    
    const patterns = analyzeHistoricalPatterns(onchainData.current, onchainData.history);
    
    // 2. 記事を生成
    console.log('📝 Step 2: SoSoValue風ニュース記事を生成中...\n');
    const articleResult = await generateSoSoValueNews(onchainData, patterns);
    
    // 3. Grokに評価と改善提案を依頼
    console.log('📊 Step 3: Grokに評価と改善提案を依頼中...\n');
    const grokResult = await showArticleToGrok(articleResult.article, onchainData, patterns);
    
    // 4. GeminiにGrokの改善提案を渡して記事をブラッシュアップ
    console.log('✨ Step 4: GeminiにGrokの改善提案を渡して記事をブラッシュアップ中...\n');
    const improvedResult = await improveArticleWithGrokFeedback(
      articleResult.article,
      grokResult.evaluation,
      onchainData,
      patterns
    );
    
    const finalArticle = improvedResult.improvedArticle;
    
    // 5. 視覚化要素を生成
    console.log('\n🎨 Step 5: 視覚化要素を生成中...\n');
    
    // 5-1. チャート画像（NanoBnana）
    const chartImage = await generateOnchainChartImage(onchainData, patterns);
    
    // 5-2. ホログラフィックビジュアライゼーション（NanoBnana）
    const holographicViz = await generateHolographicViz(onchainData);
    
    // 5-3. 動画（Veo）
    const video = await generateOnchainVideo(onchainData, finalArticle);
    
    // 6. 結果を表示・保存
    console.log('\n' + '='.repeat(80));
    console.log('📰 最終記事');
    console.log('='.repeat(80) + '\n');
    console.log(finalArticle);
    console.log('\n' + '='.repeat(80));
    
    // 視覚化要素の情報を表示
    console.log('\n🎨 生成された視覚化要素:');
    console.log('='.repeat(80));
    
    if (chartImage) {
      console.log('✅ チャート画像: 生成成功');
      // ファイルに保存（オプション）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const chartPath = `output/chart-${timestamp}.png`;
      saveDataUrlToFile(chartImage, chartPath);
    } else {
      console.log('❌ チャート画像: 生成失敗');
    }
    
    if (holographicViz) {
      console.log('✅ ホログラフィックビジュアライゼーション: 生成成功');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const holographicPath = `output/holographic-${timestamp}.png`;
      saveDataUrlToFile(holographicViz, holographicPath);
    } else {
      console.log('❌ ホログラフィックビジュアライゼーション: 生成失敗');
    }
    
    if (video) {
      console.log('✅ 動画: 生成成功');
      if (video.startsWith('data:')) {
        // Base64データURLの場合、ファイルに保存
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const videoPath = `output/video-${timestamp}.mp4`;
        saveDataUrlToFile(video, videoPath);
      } else {
        // URLの場合
        console.log(`   動画URL: ${video}`);
      }
    } else {
      console.log('❌ 動画: 生成失敗');
    }
    
    console.log('='.repeat(80) + '\n');
    
    // 記事をファイルに保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const articlePath = `output/article-${timestamp}.md`;
    if (!fs.existsSync('output')) {
      fs.mkdirSync('output', { recursive: true });
    }
    fs.writeFileSync(articlePath, finalArticle, 'utf-8');
    console.log(`💾 記事を保存: ${articlePath}\n`);
    
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
  generateOnchainChartImage,
  generateHolographicViz,
  generateOnchainVideo,
};
