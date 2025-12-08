// config/thresholds.js

// BTC Tier1 用ロジックの閾値定義（FRB/SVBクラスの急変で、もう少し積極的に噛みにいく）

module.exports = {
  BOTTOM_ATTACK: {
    // 大底ロング: Extreme Fear + 下落後の底候補
    minScore: 55,      // スコア条件をかなり緩める
    maxChange24h: -1.5 // -3% → -1.5% でも候補にする
  },

  DIP_ATTACK: {
    // 押し目ロング
    minScore: 45,      // 押し目ロングを積極的に
    maxAbsChange24h: 9 // ±5% → ±9% まで許容（急変イベント用）
  },

  CEILING_DEFEND: {
    // 天井ショート/利確
    maxScore: 45,      // スコア45以下なら天井候補として拾う
    minChange24h: 3,   // +5% → +3% の上昇でも警戒
  },

  RANGE: {
    // レンジ様子見（ここは沈黙維持）
    minScore: 25,
    maxScore: 65,
    maxAbsChange24h: 3, // ±3%以内のボラ → 基本ノートレ
  },
};
