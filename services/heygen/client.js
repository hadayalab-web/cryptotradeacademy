// services/heygen/client.js
// HeyGen APIクライアント - AIアンカー動画生成

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = process.env.HEYGEN_API_URL || 'https://api.heygen.com/v1';

/**
 * HeyGen AIアンカー動画を生成
 * @param {Object} options - 動画生成オプション
 * @param {string} options.scriptText - スクリプトテキスト
 * @param {string} options.avatarId - アバターID（デフォルト: 市場別アバター）
 * @param {string} options.lang - 言語コード
 * @param {string} options.voiceId - 音声ID（オプション）
 * @returns {Promise<string|null>} 動画URLまたはnull
 */
async function generateAIAnchorVideo(options = {}) {
  const {
    scriptText = '',
    avatarId = null,
    lang = 'en',
    voiceId = null,
  } = options;

  if (!HEYGEN_API_KEY) {
    console.warn('[HeyGen] API key not configured, skipping video generation');
    return null;
  }

  if (!scriptText || scriptText.trim().length === 0) {
    console.warn('[HeyGen] Script text is empty, skipping video generation');
    return null;
  }

  try {
    // 市場別のデフォルトアバターID（設定が必要）
    const defaultAvatarIds = {
      en: process.env.HEYGEN_AVATAR_ID_EN || null,
      ja: process.env.HEYGEN_AVATAR_ID_JA || null,
      ko: process.env.HEYGEN_AVATAR_ID_KO || null,
      es: process.env.HEYGEN_AVATAR_ID_ES || null,
      'pt-br': process.env.HEYGEN_AVATAR_ID_PT_BR || null,
      ar: process.env.HEYGEN_AVATAR_ID_AR || null,
    };

    const finalAvatarId = avatarId || defaultAvatarIds[lang] || null;
    if (!finalAvatarId) {
      console.warn(`[HeyGen] Avatar ID not configured for lang=${lang}, skipping video generation`);
      return null;
    }

    // HeyGen API v2呼び出し
    const apiUrl = 'https://api.heygen.com/v2/video/generate';
    
    console.log('[HeyGen] Generating video...', {
      scriptLength: scriptText.length,
      avatarId: finalAvatarId,
      lang,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script_text: scriptText.substring(0, 5000), // 最大5000文字
        avatar_id: finalAvatarId,
        voice_id: voiceId,
        aspect_ratio: '16:9',
        background: 'transparent',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.video_id) {
      // 動画生成は非同期なので、ステータスをポーリング
      console.log(`[HeyGen] Video generation started: ${data.video_id}`);
      const videoUrl = await pollHeyGenVideoStatus(data.video_id);
      return videoUrl;
    }

    return null;
  } catch (error) {
    console.error('[HeyGen] Error generating AI anchor video:', error);
    return null;
  }
}

/**
 * HeyGen動画生成のステータスをポーリング
 * @param {string} videoId - 動画ID
 * @param {number} maxAttempts - 最大試行回数
 * @param {number} pollInterval - ポーリング間隔（秒）
 * @returns {Promise<string|null>} 動画URLまたはnull
 */
async function pollHeyGenVideoStatus(videoId, maxAttempts = 60, pollInterval = 10) {
  const statusUrl = `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
      }
      
      const response = await fetch(statusUrl, {
        headers: {
          'X-API-KEY': HEYGEN_API_KEY,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Status API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'completed' && data.video_url) {
        console.log(`[HeyGen] Video generation completed: ${data.video_url}`);
        return data.video_url;
      }
      
      if (data.status === 'failed') {
        throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
      }
      
      if (attempt % 10 === 0 || attempt < 3) {
        console.log(`[HeyGen] Polling attempt ${attempt + 1}/${maxAttempts}... (status: ${data.status})`);
      }
    } catch (error) {
      console.error(`[HeyGen] Polling error:`, error.message);
      if (attempt === maxAttempts - 1) {
        return null;
      }
    }
  }
  
  console.warn(`[HeyGen] Video generation timeout after ${maxAttempts} attempts`);
  return null;
}

module.exports = {
  generateAIAnchorVideo,
  pollHeyGenVideoStatus,
};
