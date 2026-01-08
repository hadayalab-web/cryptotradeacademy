// services/gemini/videoGenerator.js
// Gemini Veo 3.1を使用したAIキャスター動画生成サービス

/**
 * Gemini Veo 3.1を使用してマーケット分析動画を生成
 * @param {Object} marketData - 市場データ（スナップショット）
 * @param {string} summary - マーケット分析サマリー
 * @param {string} lang - 言語コード
 * @returns {Promise<string|null>} 生成された動画のURLまたはBase64 Data URL、失敗時null
 */
async function generateMarketVideo(marketData, summary, lang = 'en') {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('[Gemini VideoGenerator] GEMINI_API_KEY not set, skipping video generation');
      return null;
    }

    const price = marketData.price_usd_display || marketData.priceUsd || 0;
    const score = marketData.market_score || 0;
    const sentiment = marketData.sentiment_label || 'Unknown';
    const change24h = marketData.change_24h || 0;

    // 言語別のプロンプト（AIキャスターが説明する動画）
    // USP2: 臨場感を高めるため、市場バグ検知結果やダイバージェンス情報を反映
    const marketBugInfo = marketData.marketBug ? 
      `Market Bug Detected: ${marketData.marketBug.bugType || 'Anomaly'} (Severity: ${marketData.marketBug.bugSeverity || 'NONE'})` : '';
    const divergenceInfo = marketData.divergenceSignal ? 
      `Divergence Signal: ${marketData.divergenceSignal.signal || 'NONE'} (Confidence: ${(marketData.divergenceSignal.confidence * 100).toFixed(0)}%)` : '';
    
    const prompts = {
      en: `Create a professional 8-second cryptocurrency market analysis video with an AI news anchor presenting:
- BTC Price: $${price.toLocaleString()}
- Market Score: ${score}/100
- Sentiment: ${sentiment}
- 24h Change: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
${marketBugInfo ? `- ${marketBugInfo}` : ''}
${divergenceInfo ? `- ${divergenceInfo}` : ''}

Summary: ${summary.substring(0, 200)}

Style: Professional news broadcast style with a modern AI anchor in a news studio setting. The anchor should gesture naturally while presenting the market data with urgency and authority. Include dynamic background graphics showing price charts, market indicators, and real-time data visualizations. ${marketBugInfo ? 'Add subtle warning indicators or anomaly highlights to emphasize market irregularities.' : ''} Clean, professional, and engaging presentation that creates an immersive experience for traders.`,
      ja: `プロフェッショナルな8秒の暗号通貨市場分析動画を作成。AIニュースキャスターが説明:
- BTC価格: $${price.toLocaleString()}
- マーケットスコア: ${score}/100
- センチメント: ${sentiment}
- 24時間変動: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%
${marketBugInfo ? `- 市場バグ検知: ${marketBugInfo}` : ''}
${divergenceInfo ? `- ダイバージェンスシグナル: ${divergenceInfo}` : ''}

サマリー: ${summary.substring(0, 200)}

スタイル: モダンなニューススタジオ設定で、AIキャスターが緊迫感と権威を持って自然にジェスチャーをしながら市場データを説明。価格チャートや市場指標を示す動的な背景グラフィックを含む。${marketBugInfo ? '市場の異常を示す警告インジケーターや異常値ハイライトを追加して、市場の不規則性を強調。' : ''} クリーンでプロフェッショナルで魅力的なプレゼンテーション。トレーダーに臨場感のある体験を提供。`,
      ko: `전문적인 8초 암호화폐 시장 분석 동영상 생성. AI 뉴스 앵커가 설명:
- BTC 가격: $${price.toLocaleString()}
- 시장 점수: ${score}/100
- 센티먼트: ${sentiment}
- 24시간 변동: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%

요약: ${summary.substring(0, 200)}

스타일: 현대적인 뉴스 스튜디오 설정에서 AI 앵커가 자연스럽게 제스처를 하며 시장 데이터를 설명. 가격 차트와 시장 지표를 보여주는 미묘한 배경 그래픽 포함. 깔끔하고 전문적이며 매력적인 프레젠테이션.`,
      es: `Crea un video profesional de análisis de mercado de criptomonedas de 8 segundos con un presentador de noticias AI:
- Precio BTC: $${price.toLocaleString()}
- Puntuación de mercado: ${score}/100
- Sentimiento: ${sentiment}
- Cambio 24h: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%

Resumen: ${summary.substring(0, 200)}

Estilo: Estilo de transmisión de noticias profesional con un presentador AI moderno en un estudio de noticias. El presentador debe hacer gestos naturales mientras presenta los datos del mercado. Incluir gráficos de fondo sutiles que muestren gráficos de precios e indicadores de mercado. Presentación limpia, profesional y atractiva.`,
      'pt-br': `Crie um vídeo profissional de análise de mercado de criptomoedas de 8 segundos com um apresentador de notícias AI:
- Preço BTC: $${price.toLocaleString()}
- Pontuação de mercado: ${score}/100
- Sentimento: ${sentiment}
- Variação 24h: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%

Resumo: ${summary.substring(0, 200)}

Estilo: Estilo de transmissão de notícias profissional com um apresentador AI moderno em um estúdio de notícias. O apresentador deve fazer gestos naturais enquanto apresenta os dados do mercado. Incluir gráficos de fundo sutis mostrando gráficos de preços e indicadores de mercado. Apresentação limpa, profissional e envolvente.`,
      ar: `إنشاء فيديو تحليل احترافي لسوق العملات المشفرة مدته 8 ثوانٍ مع مذيع أخبار AI:
- سعر BTC: $${price.toLocaleString()}
- درجة السوق: ${score}/100
- المشاعر: ${sentiment}
- التغيير 24 ساعة: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%

الملخص: ${summary.substring(0, 200)}

النمط: نمط بث إخباري احترافي مع مذيع AI حديث في استوديو أخبار. يجب على المذيع أن يقوم بإيماءات طبيعية أثناء تقديم بيانات السوق. تضمين رسوم بيانية خلفية دقيقة تظهر مخططات الأسعار ومؤشرات السوق. عرض نظيف واحترافي وجذاب.`,
    };

    const prompt = prompts[lang] || prompts.en;

    console.log(`[Gemini VideoGenerator] Generating video for ${lang} market...`);
    console.log(`[Gemini VideoGenerator] Prompt length: ${prompt.length} chars`);

    // Veo 3.1 API呼び出し
    const videoDataUrl = await callVeoAPI(prompt, apiKey);

    if (videoDataUrl) {
      console.log(`[Gemini VideoGenerator] Video generated successfully`);
      return videoDataUrl;
    }

    console.warn('[Gemini VideoGenerator] Video generation returned null');
    return null;
  } catch (error) {
    console.error('[Gemini VideoGenerator] Error generating video:', error);
    return null;
  }
}

/**
 * Gemini Veo 3.1 APIを直接呼び出して動画を生成
 * @param {string} prompt - 動画生成用のプロンプト
 * @param {string} apiKey - Gemini APIキー
 * @param {string} model - 使用するモデル（'veo-3.1-generate-preview' または 'veo-3.1-fast-generate-preview'）
 * @returns {Promise<string|null>} 生成された動画のBase64 Data URLまたはnull（失敗時）
 */
async function callVeoAPI(prompt, apiKey, model = 'veo-3.1-generate-preview') {
  try {
    if (!apiKey) {
      console.warn('[Gemini VideoGenerator] API key not provided');
      return null;
    }

    // REST APIエンドポイント（クエリパラメータではなくヘッダーで認証）
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // リクエストボディ（公式ドキュメントに準拠）
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseModalities: ['VIDEO'], // 大文字で指定
        videoConfig: {
          durationSeconds: 8, // 8秒の動画
          resolution: '720p', // 720pまたは1080p
        }
      }
    };

    console.log(`[Gemini VideoGenerator] Calling Veo API: ${model}`);

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
      throw new Error(`Veo API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // レスポンスから動画データを取得
    // Veo APIは非同期処理のため、job_idが返される可能性がある
    if (data.jobId) {
      // 非同期処理の場合、ポーリングが必要
      console.log(`[Gemini VideoGenerator] Video generation job created: ${data.jobId}`);
      const videoUrl = await pollVideoGeneration(data.jobId, apiKey);
      return videoUrl;
    }

    // 同期処理の場合、直接動画データが返される
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType; // 例: 'video/mp4'
            const base64Data = part.inlineData.data;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            console.log(`[Gemini VideoGenerator] Video generated successfully (${mimeType}, ${base64Data.length} bytes)`);
            return dataUrl;
          }
          // URL形式で返される場合
          if (part.videoUrl) {
            console.log(`[Gemini VideoGenerator] Video URL received: ${part.videoUrl}`);
            return part.videoUrl;
          }
        }
      }
    }

    console.warn('[Gemini VideoGenerator] No video data in API response');
    return null;
  } catch (error) {
    console.error('[Gemini VideoGenerator] API call failed:', error.message);
    return null;
  }
}

/**
 * 動画生成ジョブのポーリング（非同期処理の場合）
 * @param {string} jobId - ジョブID
 * @param {string} apiKey - Gemini APIキー
 * @param {number} maxAttempts - 最大ポーリング試行回数（デフォルト: 60）
 * @param {number} pollInterval - ポーリング間隔（秒、デフォルト: 10）
 * @returns {Promise<string|null>} 生成された動画のURLまたはnull
 */
async function pollVideoGeneration(jobId, apiKey, maxAttempts = 60, pollInterval = 10) {
  const pollUrl = `https://generativelanguage.googleapis.com/v1beta/operations/${jobId}`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
      
      const response = await fetch(pollUrl, {
        headers: {
          'x-goog-api-key': apiKey, // ヘッダーで認証
        },
      });
      if (!response.ok) {
        throw new Error(`Poll API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // ジョブが完了しているか確認
      if (data.done) {
        if (data.response) {
          // レスポンスから動画データを取得
          const videoData = data.response;
          if (videoData.videoUrl) {
            console.log(`[Gemini VideoGenerator] Video generation completed: ${videoData.videoUrl}`);
            return videoData.videoUrl;
          }
          if (videoData.inlineData) {
            const mimeType = videoData.inlineData.mimeType;
            const base64Data = videoData.inlineData.data;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            console.log(`[Gemini VideoGenerator] Video generation completed (${mimeType})`);
            return dataUrl;
          }
        }
        // エラーが発生した場合
        if (data.error) {
          throw new Error(`Video generation failed: ${JSON.stringify(data.error)}`);
        }
      }
      
      console.log(`[Gemini VideoGenerator] Polling attempt ${attempt + 1}/${maxAttempts}...`);
    } catch (error) {
      console.error(`[Gemini VideoGenerator] Polling error:`, error.message);
      if (attempt === maxAttempts - 1) {
        return null;
      }
    }
  }
  
  console.warn(`[Gemini VideoGenerator] Video generation timeout after ${maxAttempts} attempts`);
  return null;
}

module.exports = {
  generateMarketVideo,
};
