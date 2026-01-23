// services/x/carouselGenerator.js
// Carousel Media Stacking: 動画+画像カルーセル（最大4枚）を50%以上の投稿に適用
// Xアルゴがマルチメディアスレッドを優先表示する裏技

const { generateBTCChartVideo, dataUrlToBuffer } = require('./videoGenerator');
const { generateMarketImage } = require('../gemini/imageGenerator');

/**
 * カルーセル用メディアを生成（動画+画像、最大4枚）
 * @param {Object} chartData - チャートデータ
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @returns {Promise<Array<Buffer>>} メディアバッファの配列
 */
async function generateCarouselMedia(chartData, lang = 'en', options = {}) {
  const { maxItems = 4, includeVideo = true } = options;
  const mediaBuffers = [];
  
  try {
    // 優先順位1: 動画（Gemini Veo 3.1）
    if (includeVideo && mediaBuffers.length < maxItems) {
      try {
        console.log('[Carousel Generator] 🎬 Generating video for carousel...');
        const videoBuffer = await generateBTCChartVideo(chartData, lang);
        if (videoBuffer && videoBuffer.length > 0) {
          mediaBuffers.push(videoBuffer);
          console.log('[Carousel Generator] ✅ Video added to carousel');
        }
      } catch (error) {
        console.warn('[Carousel Generator] Failed to generate video:', error.message);
      }
    }
    
    // 優先順位2: 画像（Gemini NanoBanana Pro、2-3枚）
    const imageCount = Math.min(maxItems - mediaBuffers.length, 3);
    for (let i = 0; i < imageCount; i++) {
      try {
        console.log(`[Carousel Generator] 🖼️ Generating image ${i + 1}/${imageCount} for carousel...`);
        
        // 市場データ形式に変換（generateMarketImageの期待する形式）
        const marketData = {
          price_usd_display: chartData.priceUsd,
          priceUsd: chartData.priceUsd,
          market_score: chartData.trapScore || 25,
          sentiment_label: (chartData.trapScore || 25) <= 25 ? 'Very Low Risk' : 
                          (chartData.trapScore || 25) <= 50 ? 'Low Risk' : 
                          (chartData.trapScore || 25) <= 75 ? 'High Risk' : 'Very High Risk',
          change_24h: chartData.change24h || 0,
          inflow: chartData.exchangeNetflow || 0,
        };
        
        const imageDataUrl = await generateMarketImage(marketData, lang);
        if (imageDataUrl) {
          const imageBuffer = await dataUrlToBuffer(imageDataUrl);
          if (imageBuffer && imageBuffer.length > 0) {
            mediaBuffers.push(imageBuffer);
            console.log(`[Carousel Generator] ✅ Image ${i + 1} added to carousel`);
          }
        }
      } catch (error) {
        console.warn(`[Carousel Generator] Failed to generate image ${i + 1}:`, error.message);
      }
    }
    
    console.log(`[Carousel Generator] ✅ Carousel media generated: ${mediaBuffers.length} items`);
    return mediaBuffers;
  } catch (error) {
    console.error('[Carousel Generator] Failed to generate carousel media:', error.message);
    return mediaBuffers; // 生成できた分だけ返す
  }
}

/**
 * カルーセルメディアをX APIにアップロード
 * @param {Array<Buffer>} mediaBuffers - メディアバッファの配列
 * @returns {Promise<Array<string>>} メディアIDの配列
 */
async function uploadCarouselMedia(mediaBuffers) {
  const { uploadMedia } = require('./client');
  const mediaIds = [];
  
  for (let i = 0; i < mediaBuffers.length; i++) {
    try {
      const buffer = mediaBuffers[i];
      // 最初のメディアが動画の可能性があるため、mediaTypeを自動判定
      const mediaType = i === 0 && buffer.length > 1000000 ? 'video' : 'image'; // 1MB以上は動画と仮定
      const mediaId = await uploadMedia(buffer, { mediaType });
      if (mediaId) {
        mediaIds.push(mediaId);
        console.log(`[Carousel Generator] ✅ Media ${i + 1} uploaded: ${mediaId}`);
      }
    } catch (error) {
      console.warn(`[Carousel Generator] Failed to upload media ${i + 1}:`, error.message);
    }
  }
  
  return mediaIds;
}

/**
 * カルーセルメディアを生成してアップロード（統合関数）
 * @param {Object} chartData - チャートデータ
 * @param {string} lang - 言語コード
 * @param {Object} options - オプション
 * @returns {Promise<Array<string>>} メディアIDの配列
 */
async function generateAndUploadCarousel(chartData, lang = 'en', options = {}) {
  try {
    const mediaBuffers = await generateCarouselMedia(chartData, lang, options);
    if (mediaBuffers.length === 0) {
      console.warn('[Carousel Generator] No media generated');
      return [];
    }
    
    const mediaIds = await uploadCarouselMedia(mediaBuffers);
    console.log(`[Carousel Generator] ✅ Carousel ready: ${mediaIds.length} media IDs`);
    return mediaIds;
  } catch (error) {
    console.error('[Carousel Generator] Failed to generate and upload carousel:', error.message);
    return [];
  }
}

module.exports = {
  generateCarouselMedia,
  uploadCarouselMedia,
  generateAndUploadCarousel,
};
