// config/vslLinks.js
// VSL（YouTube）の正式タイトル・URL。Grokセールスレター（getLinkBlockGrokStyle）でのみ参照する。
// 引用リポストの統合/オプトインテンプレートではVSLは使わずWhop導線のみ。

/** 無料版（Minimal）VSL: Stop Being the Prey — Free Trap Score | Trap Defence BTC */
const VSL_MINIMAL = {
  url: "https://youtu.be/OqvqngJOiXc",
  titleEn: "Stop Being the Prey — Free Trap Score | Trap Defence BTC"
};

/** 有料版（Regular / Upgrade）VSL: Upgrade Trap Defence: 50% Off — Code DEFEND50 | Next 50 Only */
const VSL_REGULAR = {
  url: "https://youtu.be/fXgVsKhqDjI",
  titleEn: "Upgrade Trap Defence: 50% Off — Code DEFEND50 | Next 50 Only"
};

/**
 * 引用リポスト用：Trap Defence の YouTube URL 候補（ランダム表示でサムネ多様化）
 * 追加・削除はこの配列の編集のみで可。必ず https://youtu.be/xxxx 形式で記載すること。
 */
const TRAP_DEFENCE_QUOTE_YOUTUBE_URLS = [
  VSL_MINIMAL.url,
  VSL_REGULAR.url
];

/** 上記配列からランダムに1件を返す（投稿生成時に毎回呼ぶ） */
function pickRandomTrapDefenceQuoteYoutubeUrl() {
  if (!TRAP_DEFENCE_QUOTE_YOUTUBE_URLS.length) return VSL_MINIMAL.url;
  return TRAP_DEFENCE_QUOTE_YOUTUBE_URLS[Math.floor(Math.random() * TRAP_DEFENCE_QUOTE_YOUTUBE_URLS.length)];
}

module.exports = {
  VSL_MINIMAL,
  VSL_REGULAR,
  TRAP_DEFENCE_QUOTE_YOUTUBE_URLS,
  pickRandomTrapDefenceQuoteYoutubeUrl
};
