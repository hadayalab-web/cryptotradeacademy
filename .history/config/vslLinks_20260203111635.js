// config/vslLinks.js
// VSL（YouTube）の正式タイトル・URLの SSOT。引用リポスト・Whop 導線で参照する。
// 注意: 両動画とも EN 以外 5 言語（JA, ES, PT-BR, AR, KO）の字幕スクリプトを埋め込み済み。
// 「字幕あり」「(subs)」「CC をオンに」などの表記は使わないこと（スマホで字幕が二重になる）。

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
