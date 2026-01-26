// scripts/generate-email-youtube-package.js
// Eメール配信 + YouTube統合 + HeyGen動画生成の統合パッケージ生成スクリプト

const { fetchOnchainDataWithHistory, analyzeHistoricalPatterns, generateSoSoValueNews } = require('./generate-sosovalue-news');
const { showArticleToGrok } = require('./show-grok-sosovalue-article');
const { improveArticleWithGrokFeedback } = require('./improve-article-with-grok-feedback');
const { generateImage, generateHolographicDataViz } = require('../services/gemini/imageGenerator');
const { generateMarketVideo } = require('../services/gemini/videoGenerator');
const { generateAIAnchorVideo } = require('../services/heygen/client');
const { sendResendEmail } = require('../services/email/resendClient');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// 環境変数からAPIキーを取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';
const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const CRYPTOQUANT_API_KEY = process.env.CRYPTOQUANT_API_KEY || 'AqSfkCmyWnepP1JX3xnPvqeR3EYNQot38egiAICE2421tcYdIZAlnXcb99pyFkis08uN7Ln';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

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
 * Eメール用のHTMLテンプレートを生成
 */
function generateEmailHTML(article, chartImageUrl, holographicImageUrl, videoUrl, heygenVideoUrl) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trap Defence BTC - 市場分析レポート</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #1a1a1a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      font-size: 28px;
      margin: 0;
      font-weight: 700;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .article-content {
      font-size: 16px;
      line-height: 1.8;
      color: #2c2c2c;
    }
    .article-content h2 {
      color: #1a1a1a;
      font-size: 22px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #ff6b35;
      padding-left: 15px;
    }
    .article-content h3 {
      color: #333;
      font-size: 18px;
      margin-top: 25px;
      margin-bottom: 12px;
    }
    .article-content p {
      margin-bottom: 15px;
    }
    .article-content ul, .article-content ol {
      margin-bottom: 15px;
      padding-left: 25px;
    }
    .article-content li {
      margin-bottom: 8px;
    }
    .article-content strong {
      color: #1a1a1a;
      font-weight: 600;
    }
    .media-section {
      margin: 30px 0;
      text-align: center;
    }
    .media-section img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      margin: 15px 0;
    }
    .media-section video {
      max-width: 100%;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      margin: 15px 0;
    }
    .trap-score-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      margin: 30px 0;
      text-align: center;
    }
    .trap-score-box h3 {
      color: white;
      margin-top: 0;
      font-size: 20px;
    }
    .trap-score-value {
      font-size: 48px;
      font-weight: 700;
      margin: 10px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #ff6b35;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
      transition: background-color 0.3s;
    }
    .cta-button:hover {
      background-color: #e55a2b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
    .youtube-link {
      display: inline-block;
      background-color: #ff0000;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 15px 0;
    }
    .youtube-link:hover {
      background-color: #cc0000;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Trap Defence BTC</h1>
      <div class="subtitle">市場分析レポート - ${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <div class="article-content">
      ${article.split('\n').map(line => {
        // 見出しの処理
        if (line.startsWith('**') && line.endsWith('**')) {
          const text = line.replace(/\*\*/g, '');
          return `<h2>${text}</h2>`;
        }
        // Trap Scoreの処理
        if (line.includes('Trap Score')) {
          const match = line.match(/Trap Score[:\s]*(\d+)\/(\d+)/);
          if (match) {
            return `
              <div class="trap-score-box">
                <h3>🛡️ Trap Score</h3>
                <div class="trap-score-value">${match[1]}/${match[2]}</div>
                <p>現在の市場リスクレベル</p>
              </div>
            `;
          }
        }
        // リストアイテム
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          const text = line.replace(/^[-*]\s*/, '');
          return `<li>${text}</li>`;
        }
        // 通常の段落
        if (line.trim()) {
          return `<p>${line}</p>`;
        }
        return '';
      }).join('')}
    </div>

    ${chartImageUrl ? `
      <div class="media-section">
        <h3>📊 オンチェーンデータチャート</h3>
        <img src="${chartImageUrl}" alt="Market Chart" />
      </div>
    ` : ''}

    ${holographicImageUrl ? `
      <div class="media-section">
        <h3>🌐 ホログラフィックデータビジュアライゼーション</h3>
        <img src="${holographicImageUrl}" alt="Holographic Visualization" />
      </div>
    ` : ''}

    ${videoUrl ? `
      <div class="media-section">
        <h3>🎬 市場分析動画（Veo生成）</h3>
        <video controls width="100%">
          <source src="${videoUrl}" type="video/mp4">
          お使いのブラウザは動画タグをサポートしていません。
        </video>
      </div>
    ` : ''}

    ${heygenVideoUrl ? `
      <div class="media-section">
        <h3>🎥 AIアンカー解説動画（HeyGen生成）</h3>
        <video controls width="100%">
          <source src="${heygenVideoUrl}" type="video/mp4">
          お使いのブラウザは動画タグをサポートしていません。
        </video>
      </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.youtube.com/@trapdefencebtc" class="youtube-link" target="_blank">
        📺 YouTubeチャンネルで視聴
      </a>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="https://trapdefencebtc.com" class="cta-button" target="_blank">
        詳細分析を見る →
      </a>
    </div>

    <div class="footer">
      <p>このメールは自動生成された市場分析レポートです。</p>
      <p>投資判断は自己責任でお願いいたします。</p>
      <p>配信停止: <a href="https://trapdefencebtc.com/unsubscribe">こちら</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * GrokにXアルゴリズム最適化された投稿文を生成させる
 */
async function generateXPostWithGrok(article, onchainData) {
  try {
    const prompt = `あなたはX（旧Twitter）のアルゴリズムを理解したSNSマーケティングの専門家です。

以下のTrap Defence BTCの市場分析記事を、Xのアルゴリズムで最大限のエンゲージメントを獲得できる投稿文に変換してください。

## 記事内容

${article.substring(0, 1000)}

## 市場データ

- BTC価格: $${onchainData.current.price.toLocaleString()}
- Trap Score: ${onchainData.current.trapScore || 'N/A'}/10
- 24時間変動: ${onchainData.current.change24h > 0 ? '+' : ''}${onchainData.current.change24h.toFixed(2)}%

## Xアルゴリズム最適化要件

1. **エンゲージメント最大化**
   - リプライ、リツイート、いいねを促す構成
   - 議論を喚起する質問形式の活用
   - 感情を動かす表現（FOMO、FUD、期待感など）

2. **アルゴリズム最適化**
   - 最初の3行で興味を引く
   - ハッシュタグの戦略的使用（#Bitcoin #BTC #Crypto #TrapDefence）
   - メンションや引用ツイートの活用
   - 視覚的要素（画像/動画）への言及

3. **バイラル要素**
   - シェアしたくなる要素
   - ソーシャル証明（「過去の予測的中率」など）
   - 緊急性の演出

4. **CTA（行動喚起）**
   - Eメール登録への誘導
   - YouTubeチャンネル登録への誘導
   - 詳細記事へのリンク

## 出力形式

以下の形式で出力してください：

### メイン投稿（280文字以内）

[投稿文]

### スレッド投稿1（280文字以内）

[投稿文]

### スレッド投稿2（280文字以内）

[投稿文]

### ハッシュタグ戦略

[推奨ハッシュタグ]

### メンション戦略

[推奨メンション先]

日本語で、Xのアルゴリズムを最大限に活用した投稿文を生成してください。`;

    console.log('🤖 GrokにXアルゴリズム最適化投稿文の生成を依頼中...');
    
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in X (Twitter) algorithm optimization and viral content creation. You understand how to maximize engagement through strategic use of hashtags, mentions, and content structure.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content || '投稿文が生成できませんでした。';
    return text;
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    return null;
  }
}

/**
 * HeyGen APIでAIアバター動画を生成
 */
async function generateHeyGenVideo(article, lang = 'ja') {
  try {
    if (!HEYGEN_API_KEY) {
      console.warn('⚠️ HEYGEN_API_KEY is not set, skipping HeyGen video generation');
      return null;
    }

    // 記事からスクリプトを抽出（最初の1000文字程度、より詳細な説明）
    const scriptText = article
      .substring(0, 1000)
      .replace(/\*\*/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!scriptText || scriptText.length < 50) {
      console.warn('⚠️ Script text too short, skipping HeyGen video generation');
      return null;
    }

    console.log('🎥 HeyGenでAIアバター動画を生成中...');
    console.log(`   スクリプト長: ${scriptText.length}文字`);
    
    // HeyGen API呼び出し（実装済みの関数を使用）
    const videoUrl = await generateAIAnchorVideo({
      scriptText,
      lang,
    });

    if (videoUrl) {
      console.log('✅ HeyGen動画生成完了');
      return videoUrl;
    }

    return null;
  } catch (error) {
    console.error('❌ HeyGen動画生成エラー:', error.message);
    return null;
  }
}

/**
 * Base64データURLをファイルに保存してURLを返す
 */
function saveDataUrlToFile(dataUrl, filePath) {
  try {
    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
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
  console.log('🚀 Eメール配信 × YouTube統合 × HeyGen動画生成スクリプト\n');
  
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
    
    const chartImage = await generateOnchainChartImage(onchainData, patterns);
    const holographicViz = await generateHolographicViz(onchainData);
    const veoVideo = await generateOnchainVideo(onchainData, finalArticle);
    const heygenVideo = await generateHeyGenVideo(finalArticle, 'ja');
    
    // 6. ファイルを保存してURLを取得
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let chartImageUrl = null;
    let holographicImageUrl = null;
    let videoUrl = null;
    let heygenVideoUrl = null;
    
    if (chartImage) {
      const chartPath = `output/chart-${timestamp}.png`;
      saveDataUrlToFile(chartImage, chartPath);
      // 実際の運用では、CDNやS3にアップロードしてURLを取得
      chartImageUrl = `https://trapdefencebtc.com/images/chart-${timestamp}.png`; // 仮のURL
    }
    
    if (holographicViz) {
      const holographicPath = `output/holographic-${timestamp}.png`;
      saveDataUrlToFile(holographicViz, holographicPath);
      holographicImageUrl = `https://trapdefencebtc.com/images/holographic-${timestamp}.png`; // 仮のURL
    }
    
    if (veoVideo) {
      const videoPath = `output/video-${timestamp}.mp4`;
      saveDataUrlToFile(veoVideo, videoPath);
      videoUrl = `https://trapdefencebtc.com/videos/video-${timestamp}.mp4`; // 仮のURL
    }
    
    if (heygenVideo) {
      heygenVideoUrl = heygenVideo; // HeyGenから直接URLが返される
    }
    
    // 7. GrokにXアルゴリズム最適化投稿文を生成
    console.log('\n📱 Step 6: GrokにXアルゴリズム最適化投稿文を生成中...\n');
    const xPost = await generateXPostWithGrok(finalArticle, onchainData);
    
    // 8. EメールHTMLを生成
    console.log('\n📧 Step 7: EメールHTMLを生成中...\n');
    const emailHTML = generateEmailHTML(finalArticle, chartImageUrl, holographicImageUrl, videoUrl, heygenVideoUrl);
    
    // 9. 結果を表示・保存
    console.log('\n' + '='.repeat(80));
    console.log('📰 最終記事');
    console.log('='.repeat(80) + '\n');
    console.log(finalArticle);
    console.log('\n' + '='.repeat(80));
    
    if (xPost) {
      console.log('\n📱 Xアルゴリズム最適化投稿文');
      console.log('='.repeat(80) + '\n');
      console.log(xPost);
      console.log('='.repeat(80) + '\n');
    }
    
    // ファイルに保存
    const articlePath = `output/article-${timestamp}.md`;
    const emailPath = `output/email-${timestamp}.html`;
    const xPostPath = `output/x-post-${timestamp}.md`;
    
    if (!fs.existsSync('output')) {
      fs.mkdirSync('output', { recursive: true });
    }
    
    fs.writeFileSync(articlePath, finalArticle, 'utf-8');
    fs.writeFileSync(emailPath, emailHTML, 'utf-8');
    if (xPost) {
      fs.writeFileSync(xPostPath, xPost, 'utf-8');
    }
    
    console.log(`💾 記事を保存: ${articlePath}`);
    console.log(`💾 EメールHTMLを保存: ${emailPath}`);
    if (xPost) {
      console.log(`💾 X投稿文を保存: ${xPostPath}`);
    }
    
    // 10. Eメール送信（オプション）
    if (RESEND_API_KEY && process.env.EMAIL_RECIPIENTS) {
      console.log('\n📧 Step 8: Eメール送信中...\n');
      const recipients = process.env.EMAIL_RECIPIENTS.split(',');
      
      try {
        const emailResult = await sendResendEmail({
          to: recipients,
          subject: `🛡️ Trap Defence BTC - ${new Date().toLocaleDateString('ja-JP')} 市場分析レポート`,
          html: emailHTML,
          from: 'onboarding@cryptotradeacademy.io',
          fromName: 'Trap Defence BTC',
          tags: [
            { name: 'type', value: 'market-analysis' },
            { name: 'date', value: new Date().toISOString().split('T')[0] },
          ],
          lang: 'ja',
        });
        
        console.log('✅ Eメール送信成功:', emailResult);
      } catch (error) {
        console.error('❌ Eメール送信エラー:', error.message);
      }
    } else {
      console.log('\n⚠️ Eメール送信をスキップ（RESEND_API_KEYまたはEMAIL_RECIPIENTSが設定されていません）');
    }
    
    console.log('\n✅ すべての処理が完了しました！\n');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// ヘルパー関数（他のスクリプトから再利用）
async function generateOnchainChartImage(onchainData, patterns) {
  const { generateImage } = require('../services/gemini/imageGenerator');
  
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
- Suitable for email embedding

Make it visually appealing and easy to read, similar to CryptoQuant or TradingView charts.`;

  return await generateImage(prompt, '16:9');
}

async function generateHolographicViz(onchainData) {
  return await generateHolographicDataViz('bitcoin-network-flows', {
    netflow: onchainData.current.exchangeNetflow,
    mpi: onchainData.current.mpi,
    price: onchainData.current.price,
  });
}

async function generateOnchainVideo(onchainData, article) {
  const marketData = {
    price_usd_display: onchainData.current.price,
    market_score: 75,
    sentiment_label: onchainData.current.exchangeNetflow < 0 ? 'Bullish' : 'Neutral',
    change_24h: onchainData.current.change24h,
    inflow: onchainData.current.exchangeNetflow,
  };
  
  const summary = article.substring(0, 300);
  return await generateMarketVideo(marketData, summary, 'ja');
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  generateEmailHTML,
  generateXPostWithGrok,
  generateHeyGenVideo,
};
