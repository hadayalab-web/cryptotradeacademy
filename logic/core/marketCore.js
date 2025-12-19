// logic/core/marketCore.js

// 閾値コンフィグ
const { BASE, EVENT_FOMC } = require('../../config/thresholds');

// 共通マーケットコンテキストを組み立て
function buildMarketContext({
  asset,
  priceUsd,
  change24h,
  inflow, // CQ: exchange netflow (正=インフロー, 負=アウトフロー)
  mpi, // CQ: Miners' Position Index
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
function scoreNetflow(netflow) {
  if (netflow == null) return 0;
  const clipped = Math.max(-8000, Math.min(8000, netflow)); // ±8kBTC
  return (-clipped / 8000) * 40;
}

// MPI を -20〜+10 にマップ
// 高い MPI (大量売却) → 弱気(-), 低い or マイナス → 強気(+)
function scoreMPI(mpi) {
  if (mpi == null) return 0;
  const clipped = Math.max(-2, Math.min(4, mpi));
  return -clipped * 5;
}

// X センチメントを -100〜+100 にマップ（SmartMoney vs Retail Trap 中心）
function scoreSocial({ whaleBias, retailFomo, newsImpact }) {
  const wb = Math.max(-1, Math.min(1, whaleBias ?? 0));
  const fomoRaw = Math.max(0, Math.min(100, retailFomo ?? 50));
  const impact = Math.max(0, Math.min(100, newsImpact ?? 0));

  const whaleScore = wb * 70;

  const fomoNorm = (fomoRaw - 50) / 50;
  const retailTrapScore = -fomoNorm * 40;

  const divergence = wb - fomoNorm;
  const divergenceScore = divergence * 30;

  const newsScore = impact * 0.15;

  return whaleScore * 0.5 + retailTrapScore * 0.2 + divergenceScore * 0.25 + newsScore * 0.05;
}

// ===============================
// コア意思決定ロジック
// ===============================
function decideSignal(ctx) {
  const { asset, priceUsd, change24h, onchain, social } = ctx;

  const netflowScore = scoreNetflow(onchain.exchangeNetflow);
  const mpiScore = scoreMPI(onchain.minerMPI);
  const socialRawScore = scoreSocial(social);

  const smartMoneyScore = netflowScore + mpiScore;

  const fomoRaw = Math.max(0, Math.min(100, social.retailFomo ?? 50));
  const fomoNorm = (fomoRaw - 50) / 50;
  const retailScore = -fomoNorm * 40;

  const divergenceScore = socialRawScore - (smartMoneyScore + retailScore);

  const onchainScore = netflowScore + mpiScore;

  const total =
    smartMoneyScore * 0.6 +
    retailScore * 0.25 +
    divergenceScore * 0.15;

  const score = Math.max(-100, Math.min(100, total));

  const baseConf = Math.min(1, Math.abs(score) / 70);
  const smartSign = smartMoneyScore >= 0 ? 1 : -1;
  const retailSign = retailScore >= 0 ? 1 : -1;
  const aligned = smartSign === retailSign;

  const trap = !aligned && Math.abs(retailScore) > 10;

  let confidence = baseConf;
  if (aligned) confidence += 0.1;
  if (trap) confidence += 0.1;
  confidence = Math.max(0, Math.min(1, confidence));

  let regime = 'NEUTRAL';
  let signal = 'NONE';

  // デフォルトは BASE プロファイル
  let profile = BASE || {};

  // ctx.eventProfile === 'FOMC_EVENT' のときだけ、攻めプロファイルに切り替え
  if (ctx && ctx.eventProfile === 'FOMC_EVENT' && EVENT_FOMC) {
    profile = EVENT_FOMC;
  }

  const {
    HARD_SIGNAL_THRESH = 28,
    SOFT_REGIME_THRESH = 20,
    MIN_CONF_FOR_TRADE = 0.5,
  } = profile;

  if (score >= HARD_SIGNAL_THRESH && confidence >= MIN_CONF_FOR_TRADE && smartMoneyScore > 0) {
    regime = 'ACCUMULATION';
    signal = 'BUY';
  } else if (score <= -HARD_SIGNAL_THRESH && confidence >= MIN_CONF_FOR_TRADE && smartMoneyScore < 0) {
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
