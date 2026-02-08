// services/x/youtubeRandomizer.js
// 引用リポスト投稿文生成時に YouTube URL をランダム選択（X 側でサムネ多様化）

const { YOUTUBE_VIDEO_POOL } = require("../../config/youtubeVideos");

/**
 * プールからランダムに1本の YouTube URL を返す（投稿文生成時に毎回呼ぶ）
 * @returns {string} https://youtu.be/xxxx 形式の URL
 */
function getRandomYoutubeUrl() {
  if (!YOUTUBE_VIDEO_POOL || YOUTUBE_VIDEO_POOL.length === 0) {
    return "https://youtu.be/OqvqngJOiXc";
  }
  const index = Math.floor(Math.random() * YOUTUBE_VIDEO_POOL.length);
  return YOUTUBE_VIDEO_POOL[index];
}

module.exports = {
  getRandomYoutubeUrl
};
