// config/quoteRepostTargets.js
// 引用リポストのターゲットリスト（セカンダリ＝カテゴリ別の探索・優先ヒント）

/**
 * 引用リポストのセカンダリターゲット（カテゴリ別）
 * Grok のインフルエンサー発掘やフィルタ時のヒントとして利用可能。
 */
const SECONDARY_TARGETS = {
  core: [
    "elonmusk",
    "xai",
    "tesla",
    "spacex"
  ],
  marketStructure: [
    "liquiditymap系",
    "orderflow系",
    "onchain分析系",
    "whale追跡系",
    "marketpsychology系"
  ],
  aiAutomation: [
    "ai自動化系",
    "aitrading系",
    "xai関連",
    "aiミーム系"
  ],
  memeCluster: [
    "cryptoミーム系",
    "marketミーム系",
    "dogeミーム系"
  ],
  philosophyTech: [
    "市場哲学系",
    "経済構造系",
    "テック思想家"
  ]
};

module.exports = {
  SECONDARY_TARGETS
};
