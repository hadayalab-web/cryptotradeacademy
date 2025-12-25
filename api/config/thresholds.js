// api/config/thresholds.js
// BTC Tier1 用ロジックの閾値定義
// - BASE: 通常モード
// - EVENT_FOMC: FOMC などのマクロイベント時に少し攻めるモード

module.exports = {
  BASE: {
    HARD_SIGNAL_THRESH: 28, // 元の decideSignal の値
    SOFT_REGIME_THRESH: 20,
    MIN_CONF_FOR_TRADE: 0.5,
  },

  EVENT_FOMC: {
    // FOMC など「世界が見ている瞬間」にだけ使う攻めプロファイル
    HARD_SIGNAL_THRESH: 22,  // 28 → 22 に緩めてシグナル数アップ
    SOFT_REGIME_THRESH: 18,  // レジーム切り替えも少し早め
    MIN_CONF_FOR_TRADE: 0.45, // 0.5 → 0.45 に緩める
  },

  BOTTOM_ATTACK: {
    // 大底ロング: Extreme Fear + 下落後の底候補
    minScore: 55,          // スコア条件をかなり緩める
    maxChange24h: -1.5,    // -3% → -1.5% でも候補にする
  },

  DIP_ATTACK: {
    // 押し目ロング
    minScore: 45,          // 押し目ロングを積極的に
    maxAbsChange24h: 9,    // ±5% → ±9% まで許容（急変イベント用）
  },

  CEILING_DEFEND: {
    // 天井ショート/利確
    maxScore: 45,          // スコア45以下なら天井候補として拾う
    minChange24h: 3,       // +5% → +3% の上昇でも警戒
  },

  RANGE: {
    // レンジ様子見（ここは沈黙維持）
    minScore: 25,
    maxScore: 65,
    maxAbsChange24h: 3,    // ±3%以内のボラ → 基本ノートレ
  },
};
