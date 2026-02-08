// config/youtubeVideos.js
// 引用リポスト用 YouTube URL プール（サムネランダム表示で視覚的多様性・CTR向上）
// 必要に応じて後から増やせる構造。

/** 引用リポストでランダムに選ぶ YouTube URL の配列（https://youtu.be/xxxx 形式） */
const YOUTUBE_VIDEO_POOL = [
  "https://youtu.be/OqvqngJOiXc", // Trap Score 28/100
  "https://youtu.be/fXgVsKhqDjI" // Market Trap / Defense First
];

module.exports = {
  YOUTUBE_VIDEO_POOL
};
