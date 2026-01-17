// services/gemini/imageGenerator.js
// Gemini Nano Banana Proを使用した市場分析画像生成サービス

const fs = require('fs');
const path = require('path');

/**
 * Gemini API RESTエンドポイントを直接呼び出して画像を生成
 * @param {string} prompt - 画像生成用のプロンプト
 * @param {string} apiKey - Gemini APIキー
 * @param {string} model - 使用するモデル（'nano-banana' または 'nano-banana-pro'）
 * @param {string} aspectRatio - アスペクト比（'1:1', '9:16', '16:9', '4:3', '3:4'）
 * @returns {Promise<string|null>} 生成された画像のBase64データURLまたはnull（失敗時）
 */
async function callGeminiImageAPI(prompt, apiKey, model = 'nano-banana-pro', aspectRatio = '16:9') {
  try {
    if (!apiKey) {
      console.warn('[Gemini ImageGenerator] API key not provided');
      return null;
    }

    // モデル名のマッピング
    const modelMap = {
      'nano-banana': 'gemini-2.5-flash-image',
      'nano-banana-pro': 'gemini-3-pro-image-preview',
    };
    const modelName = modelMap[model] || modelMap['nano-banana-pro'];

    // REST APIエンドポイント（クエリパラメータではなくヘッダーで認証）
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    // リクエストボディ（公式ドキュメントに準拠）
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'], // 大文字で指定
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: '2K', // 1K, 2K, 4Kから選択（2Kがバランス良い）
        }
      }
    };

    console.log(`[Gemini ImageGenerator] Calling Gemini API: ${modelName}`);
    console.log(`[Gemini ImageGenerator] Prompt length: ${prompt.length} chars`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey, // ヘッダーで認証（セキュリティベストプラクティス）
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // レスポンスから画像データを取得
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // inlineDataにBase64エンコードされた画像データが含まれる
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType; // 例: 'image/png'
            const base64Data = part.inlineData.data;
            // Data URL形式で返す（Telegram APIで直接使用可能）
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            console.log(`[Gemini ImageGenerator] Image generated successfully (${mimeType}, ${base64Data.length} bytes)`);
            return dataUrl;
          }
        }
      }
    }

    console.warn('[Gemini ImageGenerator] No image data in API response');
    return null;
  } catch (error) {
    console.error('[Gemini ImageGenerator] API call failed:', error.message);
    return null;
  }
}

/**
 * 市場データに基づいた画像を生成
 * @param {Object} marketData - 市場データ（スナップショット）
 * @param {string} lang - 言語コード
 * @returns {Promise<string|null>} 生成された画像のData URLまたはnull（失敗時）
 */
async function generateMarketImage(marketData, lang = 'en') {
  try {
    // 環境変数からAPIキーを取得
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('[Gemini ImageGenerator] GEMINI_API_KEY not set, skipping image generation');
      return null;
    }

    // 市場データから画像生成用のプロンプトを構築
    const price = marketData.price_usd_display || marketData.priceUsd || 0;
    const score = marketData.market_score || 0;
    const sentiment = marketData.sentiment_label || 'Unknown';
    const change24h = marketData.change_24h || 0;
    const inflow = marketData.inflow || 0;

    // 言語別のプロンプト
    // USP2: 臨場感を高めるため、市場バグ検知結果やダイバージェンス情報を反映
    const marketBugInfo = marketData.marketBug ? 
      `Market Bug: ${marketData.marketBug.bugType || 'Anomaly'} (${marketData.marketBug.bugSeverity || 'NONE'})` : '';
    const divergenceInfo = marketData.divergenceSignal ? 
      `Signal: ${marketData.divergenceSignal.signal || 'NONE'} (${(marketData.divergenceSignal.confidence * 100).toFixed(0)}% confidence)` : '';
    
    const prompts = {
      en: `Create a professional cryptocurrency market analysis visualization showing:
- BTC price: $${price.toLocaleString()}
- Market Score: ${score}/100
- Sentiment: ${sentiment}
- 24h Change: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
- Exchange Flow: ${inflow >= 0 ? 'Inflow' : 'Outflow'} ${Math.abs(inflow).toFixed(0)} BTC
${marketBugInfo ? `- ${marketBugInfo}` : ''}
${divergenceInfo ? `- ${divergenceInfo}` : ''}

Style: Modern, clean, professional trading dashboard style with dynamic charts and real-time metrics. Use a dark theme with green/red accents for positive/negative values. ${marketBugInfo ? 'Add visual indicators for market anomalies or bugs to create urgency and highlight critical information.' : ''} Make it immersive and engaging for traders.`,
      ja: `暗号通貨市場分析の可視化画像を作成:
- BTC価格: $${price.toLocaleString()}
- マーケットスコア: ${score}/100
- センチメント: ${sentiment}
- 24時間変動: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
- 取引所フロー: ${inflow >= 0 ? '流入' : '流出'} ${Math.abs(inflow).toFixed(0)} BTC
${marketBugInfo ? `- 市場バグ: ${marketBugInfo}` : ''}
${divergenceInfo ? `- シグナル: ${divergenceInfo}` : ''}

スタイル: モダンでクリーンなプロフェッショナルなトレーディングダッシュボードスタイル。動的なチャートとリアルタイム指標を含む。ダークテーマで、正の値は緑、負の値は赤のアクセントを使用。${marketBugInfo ? '市場の異常やバグを示す視覚的インジケーターを追加して、緊迫感を演出し、重要な情報を強調。' : ''} トレーダーにとって臨場感があり魅力的なデザイン。`,
      ko: `암호화폐 시장 분석 시각화 이미지 생성:
- BTC 가격: $${price.toLocaleString()}
- 시장 점수: ${score}/100
- 센티먼트: ${sentiment}
- 24시간 변동: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
- 거래소 유입: ${inflow >= 0 ? '유입' : '유출'} ${Math.abs(inflow).toFixed(0)} BTC

스타일: 차트와 지표가 있는 현대적이고 깔끔한 전문 트레이딩 대시보드 스타일. 어두운 테마에 양수는 녹색, 음수는 빨간색 액센트 사용.`,
      es: `Crea una visualización profesional de análisis de mercado de criptomonedas mostrando:
- Precio BTC: $${price.toLocaleString()}
- Puntuación de mercado: ${score}/100
- Sentimiento: ${sentiment}
- Cambio 24h: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
- Flujo de exchanges: ${inflow >= 0 ? 'Entrada' : 'Salida'} ${Math.abs(inflow).toFixed(0)} BTC

Estilo: Estilo de panel de trading profesional, moderno y limpio con gráficos y métricas. Tema oscuro con acentos verdes/rojos para valores positivos/negativos.`,
      'pt-br': `Crie uma visualização profissional de análise de mercado de criptomoedas mostrando:
- Preço BTC: $${price.toLocaleString()}
- Score de mercado: ${score}/100
- Sentimento: ${sentiment}
- Variação 24h: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
- Fluxo de exchanges: ${inflow >= 0 ? 'Entrada' : 'Saída'} ${Math.abs(inflow).toFixed(0)} BTC

Estilo: Estilo de painel de trading profissional, moderno e limpo com gráficos e métricas. Tema escuro com destaques verdes/vermelhos para valores positivos/negativos.`,
      ar: `إنشاء تصور احترافي لتحليل سوق العملات المشفرة يعرض:
- سعر BTC: $${price.toLocaleString()}
- درجة السوق: ${score}/100
- المشاعر: ${sentiment}
- التغيير 24 ساعة: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
- تدفق البورصات: ${inflow >= 0 ? 'تدفق داخلي' : 'تدفق خارجي'} ${Math.abs(inflow).toFixed(0)} BTC

النمط: نمط لوحة تداول احترافية حديثة ونظيفة مع الرسوم البيانية والمقاييس. موضوع داكن مع لمسات خضراء/حمراء للقيم الإيجابية/السلبية.`,
    };

    const prompt = prompts[lang] || prompts.en;

    console.log(`[Gemini ImageGenerator] Generating image for ${lang} market...`);
    console.log(`[Gemini ImageGenerator] Prompt: ${prompt.substring(0, 100)}...`);
    
    // Gemini Nano Banana Proで画像生成（REST API直接呼び出し）
    const imageDataUrl = await callGeminiImageAPI(
      prompt,
      apiKey,
      'nano-banana-pro', // モデル: nano-banana-pro
      '16:9' // アスペクト比: 横長のダッシュボードスタイル
    );

    if (imageDataUrl) {
      console.log(`[Gemini ImageGenerator] Image generated successfully`);
      return imageDataUrl;
    }

    console.warn('[Gemini ImageGenerator] Image generation returned null');
    return null;
  } catch (error) {
    console.error('[Gemini ImageGenerator] Error generating image:', error);
    return null; // エラー時はnullを返してテキストのみ送信
  }
}

/**
 * 市場データに基づいた動画を生成（オプション）
 * @param {Object} marketData - 市場データ
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} 生成された動画のURLまたはファイルパス
 */
async function generateMarketVideo(marketData, lang = 'en') {
  try {
    const price = marketData.price_usd_display || marketData.priceUsd || 0;
    const score = marketData.market_score || 0;
    const sentiment = marketData.sentiment_label || 'Unknown';

    const prompts = {
      en: `Create a short 5-8 second professional cryptocurrency market analysis video showing BTC price movement and market indicators. Price: $${price.toLocaleString()}, Market Score: ${score}/100, Sentiment: ${sentiment}. Style: Modern trading dashboard animation with charts and metrics.`,
      ja: `BTC価格の動きと市場指標を示す5-8秒のプロフェッショナルな暗号通貨市場分析動画を作成。価格: $${price.toLocaleString()}, マーケットスコア: ${score}/100, センチメント: ${sentiment}。スタイル: チャートと指標のあるモダンなトレーディングダッシュボードアニメーション。`,
    };

    const prompt = prompts[lang] || prompts.en;

    console.log(`[Gemini VideoGenerator] Generating video for ${lang} market...`);
    
    // TODO: Veo 3.1 API呼び出しを実装
    
    return null; // プレースホルダー
  } catch (error) {
    console.error('[Gemini VideoGenerator] Error generating video:', error);
    return null;
  }
}

/**
 * 汎用的な画像生成関数（プロンプト指定）
 * @param {string} prompt - 画像生成プロンプト
 * @param {string} aspectRatio - アスペクト比
 * @returns {Promise<string|null>} 生成された画像のData URL
 */
async function generateImage(prompt, aspectRatio = '16:9') {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini ImageGenerator] API key not provided');
      return null;
    }
    return await callGeminiImageAPI(prompt, apiKey, 'nano-banana-pro', aspectRatio);
  } catch (error) {
    console.error('[Gemini ImageGenerator] Error generating image:', error);
    return null;
  }
}

module.exports = {
  generateMarketImage,
  generateMarketVideo,
  generateImage,
};
