// services/x/videoGenerator.js
// 動画生成機能（Grok推奨: 50%動画スレッド - BTCチャート動くGIF/短動画）
// Phase 3完全実装: Gemini Veo 3.1 + NanoBanana Pro + Canvas API + X API動画アップロード

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Vercel KV（動画生成キャッシュ用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Video Generator] @vercel/kv not available:', error.message);
}

/**
 * Base64 Data URLまたはURLをBufferに変換
 * @param {string} dataUrlOrUrl - Base64 Data URL（例: data:video/mp4;base64,...）またはURL
 * @returns {Promise<Buffer|null>} Bufferまたはnull
 */
async function dataUrlToBuffer(dataUrlOrUrl) {
  if (!dataUrlOrUrl || typeof dataUrlOrUrl !== 'string') {
    return null;
  }
  
  // Data URL形式: data:video/mp4;base64,<base64data>
  const base64Match = dataUrlOrUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (base64Match) {
    try {
      return Buffer.from(base64Match[1], 'base64');
    } catch (error) {
      console.warn('[Video Generator] Failed to convert data URL to buffer:', error.message);
      return null;
    }
  }
  
  // URL形式の場合（直接URLが返された場合）
  if (dataUrlOrUrl.startsWith('http://') || dataUrlOrUrl.startsWith('https://')) {
    try {
      console.log('[Video Generator] Fetching video from URL:', dataUrlOrUrl);
      const response = await fetch(dataUrlOrUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.warn('[Video Generator] Failed to fetch video from URL:', error.message);
      return null;
    }
  }
  
  return null;
}

/**
 * BTCチャート動画/GIFを生成
 * Grok推奨: 15-30秒、キャプションに質問CTA
 * 実装優先順位: Gemini Veo 3.1 → NanoBanana Pro → Canvas API
 * @param {Object} chartData - チャートデータ（価格、変動など）
 * @param {string} lang - 言語コード
 * @returns {Promise<Buffer>} 動画/GIFバッファ
 */
async function generateBTCChartVideo(chartData, lang = 'en') {
  const { trapScore = 25, priceUsd = null, change24h = null } = chartData || {};
  
  // キャッシュキーを生成（同じデータで再生成を避ける）
  const cacheKey = `video:${lang}:${trapScore}:${priceUsd || 'null'}:${change24h || 'null'}`;
  const cacheHash = crypto.createHash('md5').update(cacheKey).digest('hex');
  
  // キャッシュから取得を試みる
  if (kv) {
    try {
      const cached = await kv.get(`x:video_cache:${cacheHash}`);
      if (cached) {
        console.log('[Video Generator] Using cached video');
        return Buffer.from(cached, 'base64');
      }
    } catch (error) {
      console.warn('[Video Generator] Failed to get cached video:', error.message);
    }
  }
  
  // 優先順位1: Gemini Veo 3.1で動画生成
  try {
    const { generateMarketVideo } = require('../gemini/videoGenerator');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      console.log('[Video Generator] 🎬 Attempting Gemini Veo 3.1 video generation...');
      
      // 市場データ形式に変換
      const marketData = {
        price_usd_display: priceUsd,
        priceUsd: priceUsd,
        market_score: trapScore,
        sentiment_label: trapScore <= 25 ? 'Very Low Risk' : trapScore <= 50 ? 'Low Risk' : trapScore <= 75 ? 'High Risk' : 'Very High Risk',
        change_24h: change24h || 0,
      };
      
      const summary = `BTC Trap Score: ${trapScore}/100. ${trapScore <= 25 ? 'Very low risk - patience wins!' : trapScore <= 50 ? 'Low risk - stay cautious' : trapScore <= 75 ? 'High risk - protect capital' : 'Very high risk - avoid traps!'}`;
      
      const videoDataUrl = await generateMarketVideo(marketData, summary, lang);
      
      if (videoDataUrl) {
        // Base64 Data URLまたはURLをBufferに変換
        const videoBuffer = await dataUrlToBuffer(videoDataUrl);
        if (videoBuffer) {
          // ファイルサイズチェック（X API制限: 5MB）
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (videoBuffer.length <= maxSize) {
            // キャッシュに保存（24時間）
            if (kv) {
              try {
                await kv.set(`x:video_cache:${cacheHash}`, videoBuffer.toString('base64'), { ex: 86400 });
              } catch (error) {
                console.warn('[Video Generator] Failed to cache video:', error.message);
              }
            }
            console.log('[Video Generator] ✅ Gemini Veo 3.1 video generated successfully');
            return videoBuffer;
          } else {
            console.warn(`[Video Generator] Video too large (${videoBuffer.length} bytes > ${maxSize} bytes), falling back...`);
          }
        } else {
          console.warn('[Video Generator] Failed to convert Veo 3.1 data URL to buffer, falling back...');
        }
      }
    }
  } catch (error) {
    console.warn('[Video Generator] Gemini Veo 3.1 generation failed, falling back:', error.message);
  }
  
  // 優先順位2: Gemini NanoBanana Proで画像生成
  try {
    const { generateMarketImage } = require('../gemini/imageGenerator');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      console.log('[Video Generator] 🎨 Attempting Gemini NanoBanana Pro image generation...');
      
      // 市場データ形式に変換
      const marketData = {
        price_usd_display: priceUsd,
        priceUsd: priceUsd,
        market_score: trapScore,
        sentiment_label: trapScore <= 25 ? 'Very Low Risk' : trapScore <= 50 ? 'Low Risk' : trapScore <= 75 ? 'High Risk' : 'Very High Risk',
        change_24h: change24h || 0,
      };
      
      const imageDataUrl = await generateMarketImage(marketData, lang);
      
      if (imageDataUrl) {
        // Base64 Data URLまたはURLをBufferに変換
        const imageBuffer = await dataUrlToBuffer(imageDataUrl);
        if (imageBuffer) {
          // ファイルサイズチェック（X API制限: 5MB）
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (imageBuffer.length <= maxSize) {
            // キャッシュに保存（24時間）
            if (kv) {
              try {
                await kv.set(`x:video_cache:${cacheHash}`, imageBuffer.toString('base64'), { ex: 86400 });
              } catch (error) {
                console.warn('[Video Generator] Failed to cache image:', error.message);
              }
            }
            console.log('[Video Generator] ✅ Gemini NanoBanana Pro image generated successfully');
            return imageBuffer;
          } else {
            console.warn(`[Video Generator] Image too large (${imageBuffer.length} bytes > ${maxSize} bytes), falling back...`);
          }
        } else {
          console.warn('[Video Generator] Failed to convert NanoBanana data URL to buffer, falling back...');
        }
      }
    }
  } catch (error) {
    console.warn('[Video Generator] Gemini NanoBanana Pro generation failed, falling back:', error.message);
  }
  
  // 優先順位3: Canvas APIでフォールバック（既存実装）
  try {
    // Canvas APIでBTCチャートを生成
    const width = 1080; // X推奨解像度（16:9）
    const height = 608;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 背景を描画
    ctx.fillStyle = '#000000'; // 黒背景
    ctx.fillRect(0, 0, width, height);
    
    // タイトルを描画
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BTC Trap Score Analysis', width / 2, 60);
    
    // Trap Scoreを描画
    ctx.font = 'bold 72px Arial';
    const scoreColor = trapScore <= 25 ? '#00FF00' : trapScore <= 50 ? '#FFFF00' : trapScore <= 75 ? '#FF8800' : '#FF0000';
    ctx.fillStyle = scoreColor;
    ctx.fillText(`${trapScore}/100`, width / 2, height / 2 - 50);
    
    // 価格情報を描画
    if (priceUsd) {
      ctx.font = '36px Arial';
      ctx.fillStyle = '#FFFFFF';
      const priceText = `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      ctx.fillText(priceText, width / 2, height / 2 + 50);
      
      if (change24h != null) {
        const changeColor = change24h >= 0 ? '#00FF00' : '#FF0000';
        ctx.fillStyle = changeColor;
        const changeText = `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`;
        ctx.fillText(changeText, width / 2, height / 2 + 100);
      }
    }
    
    // チャートエリアを描画（簡易的な線グラフ）
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // サンプルデータポイント（実際のデータがあればそれを使用）
    const dataPoints = 20;
    const chartWidth = width * 0.8;
    const chartHeight = height * 0.3;
    const chartX = width * 0.1;
    const chartY = height * 0.6;
    
    // 簡易的な価格変動シミュレーション
    const basePrice = priceUsd || 50000;
    for (let i = 0; i < dataPoints; i++) {
      const x = chartX + (i / (dataPoints - 1)) * chartWidth;
      const variation = Math.sin(i * 0.5) * 0.02; // 2%変動
      const price = basePrice * (1 + variation);
      const normalizedPrice = (price - basePrice * 0.98) / (basePrice * 0.04); // 正規化
      const y = chartY + chartHeight - (normalizedPrice * chartHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // フレームを生成（アニメーション用）
    // 注意: Vercel環境ではFFmpegが使えないため、静止画像を返す
    // 将来的に外部サービス（Cloudinary等）でGIF/MP4変換可能
    
    // 品質最適化: JPEG形式でファイルサイズを削減（X API推奨）
    const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
    
    // ファイルサイズチェック（X API制限: 5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > maxSize) {
      // 品質を下げて再生成
      console.warn('[Video Generator] Image too large, reducing quality...');
      const reducedBuffer = canvas.toBuffer('image/jpeg', { quality: 0.7 });
      if (reducedBuffer.length <= maxSize) {
        const finalBuffer = reducedBuffer;
        // キャッシュに保存（24時間）
        if (kv) {
          try {
            await kv.set(`x:video_cache:${cacheHash}`, finalBuffer.toString('base64'), { ex: 86400 });
          } catch (error) {
            console.warn('[Video Generator] Failed to cache video:', error.message);
          }
        }
        console.log('[Video Generator] ✅ Chart image generated (JPEG format, optimized)');
        return finalBuffer;
      }
    }
    
    // キャッシュに保存（24時間）
    if (kv) {
      try {
        await kv.set(`x:video_cache:${cacheHash}`, imageBuffer.toString('base64'), { ex: 86400 });
      } catch (error) {
        console.warn('[Video Generator] Failed to cache video:', error.message);
      }
    }
    
    console.log('[Video Generator] ✅ Chart image generated (JPEG format, Canvas fallback)');
    return imageBuffer; // Canvas APIで生成したJPEG画像を返す
  } catch (error) {
    console.error('[Video Generator] Failed to generate chart video:', error.message);
    console.error('[Video Generator] Error stack:', error.stack);
    return null;
  }
}

/**
 * 動画キャプションを生成
 * Grok推奨: 質問CTAを含める（「これでトレード勝てる？リプで意見！」）
 * @param {string} lang - 言語コード
 * @param {Object} chartData - チャートデータ
 * @returns {string} キャプションテキスト
 */
function generateVideoCaption(lang, chartData = null) {
  const normalizedLang = (lang || 'en').toLowerCase();
  const { trapScore = 25 } = chartData || {};
  
  const captions = {
    'en': [
      `🚀 BTC Chart Analysis - Trap Score ${trapScore}/100\n\nCan you trade with this? Reply your strategy! 👇`,
      `💥 Real-time BTC signals - Trap Score ${trapScore}/100\n\nWhat do you think? Reply below! 👇`,
      `⚡ BTC Chart Update - Trap Score ${trapScore}/100\n\nHow do you use this? Reply! 👇`,
    ],
    'ja': [
      `🚀 BTCチャート分析 - Trap Score ${trapScore}/100\n\nこれでトレード勝てる？リプで意見！ 👇`,
      `💥 リアルタイムBTCシグナル - Trap Score ${trapScore}/100\n\nどう思う？下にリプライ！ 👇`,
      `⚡ BTCチャート更新 - Trap Score ${trapScore}/100\n\nどう使う？リプライ！ 👇`,
    ],
    'es': [
      `🚀 Análisis de gráfico BTC - Trap Score ${trapScore}/100\n\n¿Puedes operar con esto? ¡Responde tu estrategia! 👇`,
      `💥 Señales BTC en tiempo real - Trap Score ${trapScore}/100\n\n¿Qué piensas? ¡Responde abajo! 👇`,
      `⚡ Actualización de gráfico BTC - Trap Score ${trapScore}/100\n\n¿Cómo lo usas? ¡Responde! 👇`,
    ],
    'pt-br': [
      `🚀 Análise de gráfico BTC - Trap Score ${trapScore}/100\n\nVocê pode operar com isso? Responda sua estratégia! 👇`,
      `💥 Sinais BTC em tempo real - Trap Score ${trapScore}/100\n\nO que você acha? Responda abaixo! 👇`,
      `⚡ Atualização de gráfico BTC - Trap Score ${trapScore}/100\n\nComo você usa isso? Responda! 👇`,
    ],
    'ar': [
      `🚀 تحليل مخطط BTC - Trap Score ${trapScore}/100\n\nهل يمكنك التداول بهذا؟ أجب عن استراتيجيتك! 👇`,
      `💥 إشارات BTC في الوقت الفعلي - Trap Score ${trapScore}/100\n\nما رأيك؟ أجب أدناه! 👇`,
      `⚡ تحديث مخطط BTC - Trap Score ${trapScore}/100\n\nكيف تستخدم هذا؟ أجب! 👇`,
    ],
    'ko': [
      `🚀 BTC 차트 분석 - Trap Score ${trapScore}/100\n\n이것으로 거래 승리할 수 있나요? 답글로 의견! 👇`,
      `💥 실시간 BTC 신호 - Trap Score ${trapScore}/100\n\n어떻게 생각하나요? 아래에 답글! 👇`,
      `⚡ BTC 차트 업데이트 - Trap Score ${trapScore}/100\n\n어떻게 사용하나요? 답글! 👇`,
    ],
  };
  
  const langCaptions = captions[normalizedLang] || captions['en'];
  return langCaptions[Math.floor(Math.random() * langCaptions.length)];
}

/**
 * 動画投稿用のメディアIDを取得（X API v1.1動画アップロード）
 * Grok推奨: X API v1.1エンドポイント統合
 * @param {Buffer} videoBuffer - 動画バッファ（現在はPNG画像）
 * @returns {Promise<string>} media_id_string
 */
async function uploadVideoForTweet(videoBuffer) {
  if (!videoBuffer) {
    throw new Error('Video buffer is required');
  }
  
  // X API v1.1の動画アップロードエンドポイントを使用
  const { uploadVideo, uploadMedia } = require('./client');
  
  try {
    // 動画としてアップロードを試みる（フォールバック: 画像としてアップロード）
    let mediaId;
    try {
      mediaId = await uploadVideo(videoBuffer, { mimeType: 'video/mp4' });
    } catch (videoError) {
      console.warn('[Video Generator] Video upload failed, falling back to image upload:', videoError.message);
      // フォールバック: 画像としてアップロード
      mediaId = await uploadMedia(videoBuffer, { mediaType: 'image' });
    }
    
    console.log('[Video Generator] ✅ Media uploaded to X API:', mediaId);
    return mediaId;
  } catch (error) {
    console.error('[Video Generator] Failed to upload video to X API:', error.message);
    throw error;
  }
}

module.exports = {
  generateBTCChartVideo,
  generateVideoCaption,
  uploadVideoForTweet,
};
