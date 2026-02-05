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

module.exports = {
  VSL_MINIMAL,
  VSL_REGULAR
};
