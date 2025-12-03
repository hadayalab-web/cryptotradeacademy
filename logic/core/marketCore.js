// logic/core/marketCore.js

// 共通マーケットコンテキストを組み立て
function buildMarketContext({
  asset,
  priceUsd,
  change24h,
  inflow,      // CQ: exchange netflow (正=インフロー, 負=アウトフロー)
  mpi,         // CQ: Miners' Position Index
  xSentiment,  // { whaleBias, retailFomo, newsImpact }
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

// Netflow を -80〜+80 に正規化
// 大きなアウトフロー(負) → 強気(+), 大きなインフロー(正) → 弱気(-)
function scoreNetflow(netflow) {
  if (netflow == null) return 0;
  const clipped = Math.max(-8000, Math.min(8000, netflow)); // ±8kBTC でクリップ
  return (-clipped / 8000) * 80;
}

// MPI を -40〜+40 にマップ
// 高い MPI (大量売却) → 弱気(-), 低い or マイナス → 強気(+)
function scoreMPI(mpi) {
  if (mpi == null) return 0;
  const clipped = Math.max(-2, Math.min(4, mpi)); // ざっくりレンジ
  // 4 → -40, 0 → 0, -2 → +20
  return -clipped * 10;
}

// X センチメントを -100〜+100 にマップ
// - whaleBias: クジラ・機関の方向 (-1〜+1)
// - retailFomo: 0〜100, 高いほど「負け組FOMO」
// - newsImpact: 0〜100, ニュースのインパクト
function scoreSocial({ whaleBias, retailFomo, newsImpact }) {
  const wb = Math.max(-1, Math.min(1, whaleBias ?? 0));
  const fomo = Math.max(0, Math.min(100, retailFomo ?? 50));
  const impact = Math.max(0, Math.min(100, newsImpact ?? 0));

  const whaleScore = wb * 60;           // クジラの方向
  const fomoScore = (50 - fomo) * 0.6;  // FOMO 高いほど逆張りでマイナス
  const newsScore = impact * 0.1;       // ボラ増だけ少し加点

  return whaleScore + fomoScore + newsScore;
}

// コア意思決定ロジック
// 戻り値: { asset, priceUsd, change24h, score, regime, signal }
function decideSignal(ctx) {
  const { asset, priceUsd, change24h, onchain, social } = ctx;

  const netflowScore = scoreNetflow(onchain.exchangeNetflow);
  const mpiScore = scoreMPI(onchain.minerMPI);
  const onchainScore = netflowScore + mpiScore;

  const socialScore = scoreSocial(social);

  const total = onchainScore * 0.6 + socialScore * 0.4;
  const score = Math.max(-100, Math.min(100, total));

  let regime = 'NEUTRAL';
  let signal = 'NONE';

  if (score >= 40) {
    regime = 'ACCUMULATION';
    signal = 'BUY';
  } else if (score <= -40) {
    regime = 'DISTRIBUTION';
    signal = 'SELL';
  } else if (score >= 20) {
    regime = 'BULLISH';
  } else if (score <= -20) {
    regime = 'BEARISH';
  }

  return {
    asset,
    priceUsd,
    change24h,
    score,
    regime,
    signal,
  };
}

module.exports = {
  buildMarketContext,
  decideSignal,
};
