// config/thresholds.js
// BTC Tier1 用ロジックの閾値定義（あとでここだけ触ればOK）

module.exports = {
  BOTTOM_ATTACK: {
    minScore: 75,
    maxChange24h: -3,       // -3%以下の下落
  },
  DIP_ATTACK: {
    minScore: 65,
    maxAbsChange24h: 5,     // ±5%以内の押し目
  },
  CEILING_DEFEND: {
    maxScore: 25,
    minChange24h: 5,        // +5%以上の上昇
  },
  RANGE: {
    minScore: 25,
    maxScore: 65,
    maxAbsChange24h: 3,     // ±3%以内のボラ
  },
};
