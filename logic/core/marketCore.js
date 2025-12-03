// logic/core/marketCore.js

// 共通マーケットコンテキストを組み立て
function buildMarketContext({
  asset,
  priceUsd,
  change24h,
  inflow,      // CQ: exchange netflow (正=インフロー, 負=アウトフロー)
  mpi,        // CQ: Miners' Position Index
  xSentiment, // { whaleBias, retailFomo, newsImpact }
}) {
  const onchain = {
    exchangeNetflow: inflow,
    minerMPI: mpi,
  };

  const social = {
    whaleBias: xSentiment?.whaleBias ?? 0,
    retailFomo: xSentiment?.retailFomo ?? 50,
    newsImpact: xSentiment?.newsImpact ?? 0,
  };

  return {
    asset,
    priceUsd,
    change24h,
    onchain,
    social,
  };
}

// ===============================
// スコア関数群（v1.1 SmartMoney Trap）
// ===============================

// Netflow を -40〜+40 に正規化
// 大きなアウトフロー(負) → 強気(+), 大きなインフロー(正) → 弱気(-)
// 以前よりインパクトを半減させて、過度にNetflowだけに振られないようにする。[file:141]
function scoreNetflow(netflow) {
  if (netflow == null) return 0;
  const clipped = Math.max(-8000, Math.min(8000, netflow)); // ±8kBTC でクリップ (元実装と同じレンジ)[file:141]
  return (-clipped / 8000) * 40; // 以前は *80 → ここで半分に弱める[file:141]
}

// MPI を -20〜+10 にマップ
// 高い MPI (大量売却) → 弱気(-), 低い or マイナス → 強気(+)
// ここも「補助指標」扱いとしてインパクト控えめに。[file:141]
function scoreMPI(mpi) {
  if (mpi == null) return 0;
  const clipped = Math.max(-2, Math.min(4, mpi)); // ざっくりレンジ[file:141]
  // 4 → -20, 0 → 0, -2 → +10
  return -clipped * 5;
}

// X センチメントを -100〜+100 にマップ（SmartMoney vs Retail Trap 中心）
// - whaleBias: クジラ・機関の方向 (-1〜+1, +が強気)
// - retailFomo: 0〜100, 高いほど「負け組FOMO／強欲」
// - newsImpact: 0〜100, ニュースのインパクト
//
// ポイント:
// 1) クジラ方向（whaleBias）を強く効かせる（スマートマネー優先）[web:129][web:137]
// 2) retailFomo は「逆張り」評価（強欲なら売り側、極端な恐怖なら買い側に有利）[web:131][web:126]
// 3) whaleBias と retailFomo のズレ(ダイバージェンス)をトラップシグナルとして加点
function scoreSocial({ whaleBias, retailFomo, newsImpact }) {
  const wb = Math.max(-1, Math.min(1, whaleBias ?? 0));
  const fomoRaw = Math.max(0, Math.min(100, retailFomo ?? 50));
  const impact = Math.max(0, Math.min(100, newsImpact ?? 0));

  // クジラの裸方向スコア（-70 ～ +70）
  const whaleScore = wb * 70;

  // リテールの「強欲/恐怖」を -1〜+1 に正規化
  // fomoNorm > 0 → 強欲, <0 → 恐怖
  const fomoNorm = (fomoRaw - 50) / 50;

  // リテールは基本「逆張り」したいので、強欲(>0)ならマイナス、恐怖(<0)ならプラス方向
  const retailTrapScore = -fomoNorm * 40; // -40 ～ +40

  // クジラとリテールのダイバージェンス
  // 例) wb > 0 かつ fomoNorm < 0 → クジラは買い、リテールは恐怖で売り → 強いBUYトラップ[web:129][web:134]
  //     wb < 0 かつ fomoNorm > 0 → クジラは売り、リテールは強欲で買い → 強いSELLトラップ[web:131][web:126]
  const divergence = wb - fomoNorm; // -2〜+2程度
  const divergenceScore = divergence * 30; // -60 ～ +60

  // ニュースインパクトはボラティリティUPとして控えめに
  const newsScore = impact * 0.15; // 0 ～ +15

  return whaleScore * 0.5 + retailTrapScore * 0.2 + divergenceScore * 0.25 + newsScore * 0.05;
}

// ===============================
// コア意思決定ロジック
// ===============================
// 戻り値: {
//   asset, priceUsd, change24h,
//   score, regime, signal,
//   confidence, // 0〜1
//   components: { onchainScore, smartMoneyScore, retailScore, divergenceScore }
// }
function decideSignal(ctx) {
  const { asset, priceUsd, change24h, onchain, social } = ctx;

  const netflowScore = scoreNetflow(onchain.exchangeNetflow);
  const mpiScore = scoreMPI(onchain.minerMPI);
  const socialRawScore = scoreSocial(social);

  // 「スマートマネー軸」＝ Netflow + MPI + クジラ方向(社会スコアに内包)
  const smartMoneyScore = netflowScore + mpiScore;

  // リテール側とトラップ成分を分離評価
  const fomoRaw = Math.max(0, Math.min(100, social.retailFomo ?? 50));
  const fomoNorm = (fomoRaw - 50) / 50;
  const retailScore = -fomoNorm * 40; // 上のscoreSocialと同じロジック由来
  const divergenceScore = socialRawScore - (smartMoneyScore + retailScore); // 残差としてのダイバージェンス寄与

  // 最終スコア:
  // スマートマネー 60% + リテール逆張り 25% + ダイバージェンス 15%
  const onchainScore = netflowScore + mpiScore;
  const total =
    smartMoneyScore * 0.6 +
    retailScore * 0.25 +
    divergenceScore * 0.15;

  const score = Math.max(-100, Math.min(100, total));

  // コンフィデンス: スコア絶対値 + 合流/トラップの状態で調整
  const baseConf = Math.min(1, Math.abs(score) / 70); // |score|≒70 で 1.0 近辺
  const smartSign = smartMoneyScore >= 0 ? 1 : -1;
  const retailSign = retailScore >= 0 ? 1 : -1;
  const aligned = smartSign === retailSign;
  const trap = !aligned && Math.abs(retailScore) > 10; // 逆方向に強く出ているときは「トラップ」候補[web:131][web:126]

  let confidence = baseConf;
  if (aligned) confidence += 0.1;    // スマートマネーと群衆が同方向 → 確度UP
  if (trap) confidence += 0.1;       // クジラ vs リテールの明確なズレ → トレード機会として加点
  confidence = Math.max(0, Math.min(1, confidence));

  let regime = 'NEUTRAL';
  let signal = 'NONE';

  // ===============================
  // 保守的なトリガー設計
  // ===============================
  // ・まず confidence >= 0.65 以上でないとトレードしない（雑シグナル排除）
  // ・BUY/SELL は |score| >= 55 のときだけ
  // ・中間ゾーン (35〜55) はレジームだけ更新（BULLISH/BEARISH）
  const HARD_SIGNAL_THRESH = 28;   // 30 → 28
  const SOFT_REGIME_THRESH = 20;
  const MIN_CONF_FOR_TRADE = 0.5;

  if (score >= HARD_SIGNAL_THRESH && confidence >= MIN_CONF_FOR_TRADE && smartMoneyScore > 0) {
    // クジラ側もBUY方向に乗っているときだけBUYを出す[web:129][web:137]
    regime = 'ACCUMULATION';
    signal = 'BUY';
  } else if (score <= -HARD_SIGNAL_THRESH && confidence >= MIN_CONF_FOR_TRADE && smartMoneyScore < 0) {
    // クジラ側もSELL方向に乗っているときだけSELLを出す[web:129][web:131]
    regime = 'DISTRIBUTION';
    signal = 'SELL';
  } else if (score >= SOFT_REGIME_THRESH) {
    regime = 'BULLISH';
  } else if (score <= -SOFT_REGIME_THRESH) {
    regime = 'BEARISH';
  }

  return {
    asset,
    priceUsd,
    change24h,
    score,
    regime,
    signal,
    confidence,
    components: {
      onchainScore,
      smartMoneyScore,
      retailScore,
      divergenceScore,
      netflowScore,
      mpiScore,
      socialRawScore,
    },
  };
}

module.exports = {
  buildMarketContext,
  decideSignal,
};
