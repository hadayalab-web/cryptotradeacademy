// services/gemini/imageGenerator.js
// Gemini Nano Banana Proを使用した市場分析画像生成サービス

const fs = require('fs');
const path = require('path');

/**
 * Gemini API RESTエンドポイントを直接呼び出して画像を生成（画像入力対応）
 * @param {string} prompt - 画像生成用のプロンプト
 * @param {string} apiKey - Gemini APIキー
 * @param {string} model - 使用するモデル（'nano-banana' または 'nano-banana-pro'）
 * @param {string} aspectRatio - アスペクト比（'1:1', '9:16', '16:9', '4:3', '3:4'）
 * @param {string|null} inputImageBase64 - 入力画像のBase64データ（オプション）
 * @param {string|null} inputImageMimeType - 入力画像のMIMEタイプ（オプション）
 * @returns {Promise<string|null>} 生成された画像のBase64データURLまたはnull（失敗時）
 */
async function callGeminiImageAPI(prompt, apiKey, model = 'nano-banana-pro', aspectRatio = '16:9', inputImageBase64 = null, inputImageMimeType = null) {
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
    const parts = [];
    
    // 入力画像がある場合は追加
    if (inputImageBase64 && inputImageMimeType) {
      parts.push({
        inlineData: {
          mimeType: inputImageMimeType,
          data: inputImageBase64
        }
      });
    }
    
    // テキストプロンプトを追加
    parts.push({ text: prompt });
    
    const requestBody = {
      contents: [{
        parts: parts
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
    // モデルは nano-banana-pro (Imagen 3) を使用
    return await callGeminiImageAPI(prompt, apiKey, 'nano-banana-pro', aspectRatio);
  } catch (error) {
    console.error('[Gemini ImageGenerator] Error generating image:', error);
    return null;
  }
}

/**
 * 統一されたエディトリアル・カートゥーン（風刺画）スタイル定義
 * 
 * 歴史的・文化的文脈:
 * - ル・モンド (Le Monde): 世界的に見れば、その伝統と芸術性において最も象徴的な存在の一つ
 *   プランテュ（Plantu）が確立した、芸術的価値と批評的視点を兼ね備えた風刺画スタイル
 * - ジャパン・パンチ (The Japan Punch, 1862-1887): 幕末・明治期にチャールズ・ワーグマンが創刊
 *   日本における近代的な風刺画の先駆け、東西文化の融合による独特の表現手法
 * 
 * 参考: The Economist, The New Yorker, ガーディアン (The Guardian)
 * 
 * トンマナ統一のため、すべての風刺画生成でこのスタイル定義を使用すること
 */
const EDITORIAL_CARTOON_STYLE = `
Style: High-quality editorial political cartoon style, combining Le Monde's Plantu tradition (French satirical art with artistic value and critical perspective) and The Japan Punch's historical legacy (Charles Wirgman's 1862-1887 fusion of Eastern and Western satirical traditions from the Bakumatsu-Meiji era).

Technique: 
- Intricate cross-hatching texture (Plantu's refined French technique)
- Hand-drawn aesthetic with ink and watercolor feel
- Fusion of European satirical precision with Japanese visual storytelling (Japan Punch influence)
- Dramatic pen strokes and expressive line work

Mood: Satirical, witty, intellectual, dramatic lighting. Combines Plantu's sophisticated critique with Japan Punch's bold visual metaphors.

Composition: Cinematic perspective, clear visual metaphor. European editorial cartoon structure enhanced with Japanese narrative clarity.

Colors: Muted, sophisticated palette with one or two symbolic accent colors (e.g., Green for greed/money, Red for danger). Plantu's restrained elegance meets Japan Punch's expressive contrast.

No text overlays, purely visual storytelling. Professional magazine cover quality with historical depth and cultural resonance, honoring both French satirical tradition and Japan's pioneering editorial cartoon heritage.
`;

/**
 * ホログラフィック・データビジュアライゼーションスタイル定義
 * CryptoQuantのような未来感のあるホログラフィックインターフェーススタイル
 */
const HOLOGRAPHIC_DATA_VIZ_STYLE = `
Style: Futuristic holographic data visualization interface, similar to CryptoQuant's on-chain data maps.
Display: Transparent, curved holographic screen with blue-green tint and soft glow effect.
Environment: Modern, sophisticated office setting with dark wood paneling, dim ambient lighting, city skyline visible through large windows at night.
Atmosphere: High-tech, professional, data-driven, slightly futuristic, emphasizing transparency and digital information visualization.

Technical Details:
- Display: Semi-transparent, curved glass-like screen with blue-green tint, emitting soft glow
- Data Map: World map visualization with network flows
  - Orange/Gold: North America, Europe, parts of Asia, Australia (clusters of glowing points and connecting lines)
  - Blue/Teal: East Asia, Southeast Asia, parts of Russia (clusters of blue-green points and connecting lines)
- Data Panels: Metrics display with progress bars
  - TOTAL BTC BALANCE (yellow/orange progress bar)
  - TRANSACTION VOLUME (yellow/orange progress bar)
  - NETWORK ACTIVITY (blue-green progress bar)
- Environment: Modern office, dark polished wooden desk, sleek keyboard with glowing keys, wireless mouse
- Background: Large windows revealing blurred cityscape with twinkling lights at night, dim ambient lighting, dark wood paneling
- Color Palette: Deep blues, grays, blacks for environment, contrasted by vibrant glowing orange/gold and blue/teal of the holographic display
- Accent Lights: White or blue LED accents

Overall aesthetic: High-tech, professional, data-driven, slightly futuristic, emphasizing transparency and digital information visualization.
`;

/**
 * 3Dキャラクタースタイル定義
 * 任天堂のキャラクター風（Dr. Mario風）のフレンドリーで親しみやすい3Dアニメーション
 */
const CHARACTER_3D_STYLE = `
Style: High-quality 3D computer-generated imagery (CGI) in Nintendo character art style, similar to Dr. Mario or modern Mario characters. Bright, clean, and highly polished 3D animation typical of modern Nintendo character designs.

Character Design:
- Nintendo-like 3D animation style
- Cartoonish proportions: larger head relative to body, prominent facial features
- Friendly, approachable, and inviting aesthetic
- Clean and vibrant colors without excessive grunge or realism
- Clearly defined shapes contributing to a graphic, illustrative feel
- No hyper-realism - prioritizes clear character recognition and welcoming, iconic look
- Smooth surfaces, soft lighting, polished appearance

Character Appearance:
- Male figure resembling a scientist, analyst, or trader (40s-50s)
- Fair skin tone, large bright eyes (blue), thick dark eyebrows
- Prominent rounded nose, thick dark brown mustache
- Dark brown hair, relatively short and neat
- Thoughtful, curious, or confident expression
- Pensive pose: one white-gloved hand positioned under chin (index finger and thumb on jawline)
- Slightly leaning forward, friendly posture

Attire:
- Clean white doctor's lab coat or jacket with buttons
- Red collared shirt underneath
- Red necktie (can have gold Bitcoin logo tie clip)
- Dark grey pants with rolled-up cuffs (optional)
- Large, rounded brown shoes with light yellow soles (Nintendo-style)
- White gloves on hands

Accessories:
- Brown strap with circular metallic doctor's head mirror positioned on forehead
- Stethoscope around neck (dark red with silver accents, or silver)
- Can include transparent AR glasses/visor displaying cryptocurrency data:
  - Left lens: Circular gauge labeled "Fear & Greed Index"
  - Right lens: Line graph labeled "X sentiment" with data points
- Bitcoin logo pin on lapel (optional)
- Headphones around neck with Bitcoin logos (optional)

Background & Environment:
- Solid white or black background (isolating the character, making them pop)
- Subtle drop shadow beneath character indicating depth
- Optional: Modern office setting with cryptocurrency charts visible
- Optional: Multiple screens displaying trading data
- Clean, uncluttered composition focusing on character

Color Palette:
- Solid, clean, and vibrant colors
- Red, white, brown, blue (for eyes) as primary colors
- Gold accents for Bitcoin logos
- Green and red for chart indicators (if visible)
- No excessive realism or grunge textures
- Bright and cheerful palette

Art Style:
- Unmistakably Nintendo-like 3D rendering
- Smooth surfaces, soft lighting, polished appearance
- Exaggerated but friendly proportions
- Graphic, illustrative feel despite being 3D
- Clean, vibrant, and welcoming aesthetic
- Iconic and recognizable character design
- Medium close-up or full-body shot
- Character isolation with clean background
`;

/**
 * 風刺画風（Editorial Cartoon）のサムネイル画像を生成
 * 世界共通のコンテンツとして、知的でウィットに富んだ風刺画スタイルを採用
 * 
 * @param {string} concept - 画像のコンセプト（例: "Whale Trap", "FOMO Crowd"）
 * @returns {Promise<string|null>} 生成された画像のData URL
 */
async function generateEditorialCartoon(concept) {
  // 統一されたスタイル定義を使用
  const style = EDITORIAL_CARTOON_STYLE;
  
  let subject = "";
  
  // コンセプト別の被写体定義
  switch (concept) {
    case 'Whale Trap':
      subject = "A tiny, determined retail trader in a small wooden boat navigating a stormy ocean of financial charts. Below the surface, a gigantic, shadowy Whale (representing market manipulation) is silently opening its massive mouth to swallow the boat along with a glowing 'Green Candle' bait hanging on a hook. The water surface represents the boundary between visible price action and hidden institutional liquidity.";
      break;
    case 'FOMO Crowd':
      subject = "A herd of lemmings dressed in business suits running blindly and enthusiastically towards a cliff edge that looks like a steep drop in a cryptocurrency chart. In the background, sophisticated whales (fat cats in tuxedos) are watching calmly from a safe, luxurious VIP lounge, drinking wine and laughing. The contrast between the chaotic crowd and the calm manipulators.";
      break;
    case 'Market Manipulation':
      subject = "A giant hand emerging from the clouds, moving small trader figures on a chessboard like pawns. The chessboard is made of green and red candlestick patterns. The atmosphere is mysterious and overwhelming.";
      break;
    default:
      subject = `A satirical illustration depicting ${concept} in the cryptocurrency market. Highlighting the disparity between institutional power and individual traders.`;
  }

  const prompt = `${subject} ${style}`;
  
  console.log(`[Gemini ImageGenerator] Generating Editorial Cartoon: ${concept}`);
  return await generateImage(prompt, '16:9');
}

/**
 * ホログラフィック・データビジュアライゼーション画像を生成
 * CryptoQuantのような未来感のあるホログラフィックインターフェーススタイル
 * 
 * @param {string} dataType - データタイプ（例: "bitcoin-network-flows", "on-chain-analysis", "institutional-wallets"）
 * @param {Object} options - オプション（カスタムデータ、タイトルなど）
 * @returns {Promise<string|null>} 生成された画像のData URL
 */
async function generateHolographicDataViz(dataType = 'bitcoin-network-flows', options = {}) {
  const style = HOLOGRAPHIC_DATA_VIZ_STYLE;
  
  let dataContent = "";
  
  // データタイプ別のコンテンツ定義
  switch (dataType) {
    case 'bitcoin-network-flows':
      dataContent = `A futuristic holographic interface showing a "CryptoQuant On-Chain Data Map" for "Bitcoin Network Flows."

The central element is a semi-transparent, curved glass-like holographic screen with a blue-green tint, emitting a soft glow. The screen displays:

- Top left: Logo "+Q CryptoQuant" and label "INSTITUTIONAL WALLETS" (indicated by an orange dot)
- Centered at top: Title "CRYPTOQUANT ON-CHAIN DATA MAP" and "BITCOIN NETWORK FLOWS"
- Top right: Legend showing "MINERS" (orange dot), "EXCHANGES" (blue-green dot), "HODLers" (light blue dot)
- Main visual: A world map with landmasses subtly outlined. North America, Europe, parts of Asia, and Australia show clusters of glowing orange points and connecting lines (orange-yellow spectrum). East Asia, Southeast Asia, and parts of Russia show clusters of blue-green points and connecting lines
- Bottom: Three horizontal progress/data bars labeled "TOTAL BTC BALANCE" (yellow bar, about 40-85% full), "TRANSACTION VOLUME" (yellow bar, about 50-92% full), and "NETWORK ACTIVITY" (blue-green bar, about 60-88% full)`;
      break;
    case 'on-chain-analysis':
      dataContent = `A futuristic holographic interface displaying comprehensive on-chain analysis data for Bitcoin.

The holographic screen shows:
- Network metrics: Active addresses, transaction volume, hash rate
- Flow analysis: Exchange inflows/outflows visualized as glowing streams
- Institutional activity indicators
- Market sentiment visualization with color-coded regions`;
      break;
    case 'institutional-wallets':
      dataContent = `A futuristic holographic interface showing institutional wallet activity and movements.

The screen displays:
- Large wallet addresses and their balances
- Transaction flows between institutional entities
- Geographic distribution of institutional holdings
- Time-based activity patterns`;
      break;
    default:
      dataContent = `A futuristic holographic interface displaying ${dataType} data visualization for cryptocurrency market analysis.`;
  }
  
  const prompt = `${dataContent}

${style}`;
  
  console.log(`[Gemini ImageGenerator] Generating Holographic Data Viz: ${dataType}`);
  return await generateImage(prompt, '16:9');
}

/**
 * 3Dキャラクター画像を生成
 * フレンドリーで親しみやすい3Dアニメーション風のキャラクター
 * 
 * @param {string} characterType - キャラクタータイプ（例: "trap-defense-analyst", "crypto-trader", "market-analyst"）
 * @param {Object} options - オプション（ポーズ、表情、背景など）
 * @returns {Promise<string|null>} 生成された画像のData URL
 */
async function generate3DCharacter(characterType = 'trap-defense-analyst', options = {}) {
  const style = CHARACTER_3D_STYLE;
  
  let characterDescription = "";
  
  // キャラクタータイプ別の説明
  switch (characterType) {
    case 'trap-defense-analyst':
    case 'dr-grok':
      characterDescription = `Dr. Grok - A friendly, clean, and highly polished 3D animated character in Nintendo character art style (similar to Dr. Mario), a male figure resembling a cryptocurrency analyst and trader advisor.

The character is Dr. Grok: a fair-skinned man with brown hair, large bright blue eyes, thick dark eyebrows, a prominent rounded nose, and a thick dark brown mustache. His hair is dark brown, relatively short and neat.

He has a thoughtful, curious expression with his eyebrows slightly furrowed. One white-gloved hand is positioned under his chin, with index finger and thumb gently resting on his jawline in a pondering gesture.

He wears a clean white doctor's lab coat with buttons, featuring "DR. GROK" or "TRAP DEFENSE" logo embroidery. A red collared shirt underneath, and a red tie. On his forehead, he has a brown strap holding a reflective, circular doctor's head mirror. A stethoscope (dark red with silver accents, or silver) hangs around his neck, with earpieces resting on his shoulders.

He wears transparent AR glasses/visor displaying cryptocurrency data:
- Left lens: Circular gauge labeled "Fear & Greed Index" with needle indicator
- Right lens: Line graph labeled "X sentiment" with data points and numerical labels

A Bitcoin logo pin is on his lapel. He wears large, rounded brown shoes with light yellow soles (Nintendo-style).

The background is solid white or black, isolating the character and making them pop, with a subtle drop shadow beneath indicating depth.`;
      break;
    case 'crypto-trader':
      characterDescription = `Dr. Grok - A friendly 3D animated character in Nintendo style of a cryptocurrency trader, wearing AR glasses that display real-time market data. The character has a confident, approachable demeanor, dressed in professional attire with cryptocurrency-themed accessories.`;
      break;
    case 'market-analyst':
      characterDescription = `Dr. Grok - A professional 3D animated character in Nintendo style of a market analyst, standing in a high-tech trading room. The character analyzes data through AR displays, surrounded by multiple screens showing market charts and analytics.`;
      break;
    default:
      characterDescription = `A friendly, professional 3D animated character representing a ${characterType}, standing in a modern, high-tech environment with cryptocurrency trading elements visible.`;
  }
  
  const prompt = `${characterDescription}

${style}`;
  
  console.log(`[Gemini ImageGenerator] Generating 3D Character: ${characterType}`);
  return await generateImage(prompt, '16:9');
}

/**
 * 参照画像のスタイルを適用して画像を変換
 * @param {string} inputImagePath - 入力画像のファイルパス
 * @param {string} referenceImagePath - 参照画像（スタイル元）のファイルパス
 * @param {string} aspectRatio - アスペクト比
 * @returns {Promise<string|null>} 生成された画像のData URL
 */
async function convertImageWithStyleReference(inputImagePath, referenceImagePath, aspectRatio = '16:9') {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini ImageGenerator] API key not provided');
      return null;
    }

    // 入力画像を読み込み
    if (!fs.existsSync(inputImagePath)) {
      console.error(`[Gemini ImageGenerator] Input image file not found: ${inputImagePath}`);
      return null;
    }

    // 参照画像を読み込み
    if (!fs.existsSync(referenceImagePath)) {
      console.error(`[Gemini ImageGenerator] Reference image file not found: ${referenceImagePath}`);
      return null;
    }

    const inputImageBuffer = fs.readFileSync(inputImagePath);
    const inputImageBase64 = inputImageBuffer.toString('base64');
    
    const referenceImageBuffer = fs.readFileSync(referenceImagePath);
    const referenceImageBase64 = referenceImageBuffer.toString('base64');
    
    // MIMEタイプを判定
    const getMimeType = (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      };
      return mimeTypes[ext] || 'image/jpeg';
    };

    const inputMimeType = getMimeType(inputImagePath);
    const referenceMimeType = getMimeType(referenceImagePath);

    // スタイル転送用のプロンプト（リアルな写真として生成）
    const prompt = `Transform the first image to match the photographic style, color palette, lighting, background, and overall realistic aesthetic of the second reference image. 

Key requirements:
1. Generate as a realistic, high-quality photograph (not illustration or artwork)
2. Apply the complete background from the reference image exactly (including the office setting with wooden bookshelf, concrete wall, window with natural light, and desk)
3. Match the professional photographic style, depth of field, and natural lighting from the reference image
4. Maintain the subject's identity and facial features from the first image
5. Apply realistic skin texture, hair details, and clothing materials matching the reference photo quality
6. Use the same color grading, contrast, and exposure as the reference image
7. Ensure the background is fully visible, in focus, and matches the reference image's environment exactly
8. Create natural shadows and lighting that match the reference image's lighting conditions
9. Maintain photorealistic quality throughout - this should look like a real photograph, not a digital artwork

The result should be a realistic photograph that looks like the subject from the first image was photographed in the exact same location and lighting conditions as the reference image, with professional photo quality.`;

    console.log(`[Gemini ImageGenerator] Converting image with style reference`);
    console.log(`[Gemini ImageGenerator] Input: ${inputImagePath}`);
    console.log(`[Gemini ImageGenerator] Reference: ${referenceImagePath}`);
    
    // 複数画像を送信するためのカスタムAPI呼び出し
    const modelMap = {
      'nano-banana': 'gemini-2.5-flash-image',
      'nano-banana-pro': 'gemini-3-pro-image-preview',
    };
    const modelName = modelMap['nano-banana-pro'];
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: inputMimeType,
              data: inputImageBase64
            }
          },
          {
            inlineData: {
              mimeType: referenceMimeType,
              data: referenceImageBase64
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: '2K',
        }
      }
    };

    console.log(`[Gemini ImageGenerator] Calling Gemini API: ${modelName}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
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
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType;
            const base64Data = part.inlineData.data;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            console.log(`[Gemini ImageGenerator] Image converted successfully (${mimeType}, ${base64Data.length} bytes)`);
            return dataUrl;
          }
        }
      }
    }

    console.warn('[Gemini ImageGenerator] No image data in API response');
    return null;
  } catch (error) {
    console.error('[Gemini ImageGenerator] Error converting image with style reference:', error);
    return null;
  }
}

/**
 * 参照画像のスタイルを適用してイラスト風に変換
 * @param {string} inputImagePath - 入力画像のファイルパス
 * @param {string} referenceImagePath - 参照画像（スタイル元）のファイルパス
 * @param {string} aspectRatio - アスペクト比
 * @returns {Promise<string|null>} 生成された画像のData URL
 */
async function convertImageToIllustrationWithStyleReference(inputImagePath, referenceImagePath, aspectRatio = '16:9') {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini ImageGenerator] API key not provided');
      return null;
    }

    // 入力画像を読み込み
    if (!fs.existsSync(inputImagePath)) {
      console.error(`[Gemini ImageGenerator] Input image file not found: ${inputImagePath}`);
      return null;
    }

    // 参照画像を読み込み
    if (!fs.existsSync(referenceImagePath)) {
      console.error(`[Gemini ImageGenerator] Reference image file not found: ${referenceImagePath}`);
      return null;
    }

    const inputImageBuffer = fs.readFileSync(inputImagePath);
    const inputImageBase64 = inputImageBuffer.toString('base64');
    
    const referenceImageBuffer = fs.readFileSync(referenceImagePath);
    const referenceImageBase64 = referenceImageBuffer.toString('base64');
    
    // MIMEタイプを判定
    const getMimeType = (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      };
      return mimeTypes[ext] || 'image/jpeg';
    };

    const inputMimeType = getMimeType(inputImagePath);
    const referenceMimeType = getMimeType(referenceImagePath);

    // アニメ風スタイル転送用のプロンプト
    const prompt = `Transform the first image into an anime/manga illustration style matching the second reference image. Apply the anime art style, character design, color palette, line work, shading technique, and overall anime aesthetic from the reference image.

Key requirements:
1. Convert to high-quality anime/manga illustration style (not photograph) - match the anime art style from the reference image
2. Apply the complete background from the reference image exactly (including all background elements, environment, and setting)
3. Match the anime art style characteristics:
   - Bold, clear black outlines with varying line weights
   - Vibrant, saturated colors with flat color blocks
   - Smooth cel-shading with clear shadow and highlight areas
   - Characteristic anime facial features (large expressive eyes, simplified nose, stylized proportions)
   - Clean, polished anime illustration quality
4. Maintain the subject's identity and facial features from the first image, but render them in anime style with appropriate anime character design
5. Apply the same color palette, shading technique (cel-shading), and artistic rendering style as the reference anime image
6. Use the same line work style - bold black outlines with clean, precise lines typical of anime/manga
7. Ensure the background is fully visible and matches the reference image's environment and anime style exactly
8. Apply the same lighting style and artistic effects as the reference anime illustration
9. Create a cohesive anime illustration that looks like it was drawn in the exact same anime/manga style as the reference image

The result should be a high-quality anime illustration that looks like the subject from the first image was drawn in the exact same anime/manga style, technique, and environment as the reference image.`;

    console.log(`[Gemini ImageGenerator] Converting image to illustration with style reference`);
    console.log(`[Gemini ImageGenerator] Input: ${inputImagePath}`);
    console.log(`[Gemini ImageGenerator] Reference: ${referenceImagePath}`);
    
    // 複数画像を送信するためのカスタムAPI呼び出し
    const modelMap = {
      'nano-banana': 'gemini-2.5-flash-image',
      'nano-banana-pro': 'gemini-3-pro-image-preview',
    };
    const modelName = modelMap['nano-banana-pro'];
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: inputMimeType,
              data: inputImageBase64
            }
          },
          {
            inlineData: {
              mimeType: referenceMimeType,
              data: referenceImageBase64
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: '2K',
        }
      }
    };

    console.log(`[Gemini ImageGenerator] Calling Gemini API: ${modelName}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
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
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType;
            const base64Data = part.inlineData.data;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            console.log(`[Gemini ImageGenerator] Image converted successfully (${mimeType}, ${base64Data.length} bytes)`);
            return dataUrl;
          }
        }
      }
    }

    console.warn('[Gemini ImageGenerator] No image data in API response');
    return null;
  } catch (error) {
    console.error('[Gemini ImageGenerator] Error converting image to illustration with style reference:', error);
    return null;
  }
}

/**
 * リアル写真をイラスト風に変換
 * @param {string} imagePath - 入力画像のファイルパス
 * @param {string} style - スタイル指定（'anime', 'cartoon', 'watercolor', 'sketch'など）
 * @param {string} aspectRatio - アスペクト比
 * @returns {Promise<string|null>} 生成された画像のData URL
 */
async function convertPhotoToIllustration(imagePath, style = 'anime', aspectRatio = '16:9') {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini ImageGenerator] API key not provided');
      return null;
    }

    // 画像ファイルを読み込み
    if (!fs.existsSync(imagePath)) {
      console.error(`[Gemini ImageGenerator] Image file not found: ${imagePath}`);
      return null;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    // MIMEタイプを判定
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';

    // スタイル別のプロンプト
    const stylePrompts = {
      anime: 'Convert this photo into a high-quality anime illustration style. Use vibrant colors, smooth shading, and characteristic anime art features. Maintain the original composition and subject matter while transforming it into an anime aesthetic.',
      cartoon: 'Transform this photo into a professional cartoon illustration. Use bold outlines, simplified shapes, and vibrant colors. Create a clean, modern cartoon style while preserving the original subject and composition.',
      watercolor: 'Convert this photo into a beautiful watercolor painting illustration. Use soft brush strokes, flowing colors, and artistic watercolor techniques. Maintain the essence of the original image while creating an artistic watercolor effect.',
      sketch: 'Transform this photo into a detailed pencil sketch illustration. Use fine lines, cross-hatching, and shading techniques. Create a professional sketch art style while preserving the original composition.',
      illustration: 'Convert this photo into a professional digital illustration. Use clean lines, vibrant colors, and modern illustration techniques. Transform the realistic photo into a stylized illustration while maintaining the original subject and composition.'
    };

    const stylePrompt = stylePrompts[style] || stylePrompts.illustration;
    const prompt = `${stylePrompt} Style: High-quality illustration, professional artwork, detailed and polished.`;

    console.log(`[Gemini ImageGenerator] Converting photo to ${style} illustration: ${imagePath}`);
    
    return await callGeminiImageAPI(
      prompt,
      apiKey,
      'nano-banana-pro',
      aspectRatio,
      imageBase64,
      mimeType
    );
  } catch (error) {
    console.error('[Gemini ImageGenerator] Error converting photo to illustration:', error);
    return null;
  }
}

module.exports = {
  generateImage,
  generateEditorialCartoon,
  generateHolographicDataViz,
  generate3DCharacter,
  generateMarketImage,
  generateMarketVideo,
  convertPhotoToIllustration,
  convertImageWithStyleReference,
  convertImageToIllustrationWithStyleReference,
  callGeminiImageAPI,
  EDITORIAL_CARTOON_STYLE, // スタイル定義をエクスポート（他のスクリプトで再利用可能）
  HOLOGRAPHIC_DATA_VIZ_STYLE, // ホログラフィックスタイル定義をエクスポート
  CHARACTER_3D_STYLE, // 3Dキャラクタースタイル定義をエクスポート
};
