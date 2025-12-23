// logic/core/marketCore.js

// 閾値コンフィグ
const { BASE, EVENT_FOMC } = require('../../config/thresholds');

// Phase 2: 市場別プロファイル（Strategic SSOT v4.0）
let marketProfiles = null;
try {
  marketProfiles = require('../../config/marketProfiles');
} catch (error) {
  // marketProfiles.jsがない場合は無視（デフォルト動作）
}

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

  // Phase 2: 市場別プロファイルによる補正（Strategic SSOT v4.0）
  let market = ctx?.market || process.env.MARKET_CODE || 'EN';
  if (marketProfiles) {
    try {
      const marketProfile = marketProfiles.getMarketProfile(market);
      if (marketProfile?.algorithm) {
        const algo = marketProfile.algorithm;
        // 市場別アルゴリズム設定で上書き
        profile = {
          HARD_SIGNAL_THRESH: algo.HARD_SIGNAL_THRESH ?? profile.HARD_SIGNAL_THRESH,
          SOFT_REGIME_THRESH: algo.SOFT_REGIME_THRESH ?? profile.SOFT_REGIME_THRESH,
          MIN_CONF_FOR_TRADE: algo.MIN_CONF_FOR_TRADE ?? profile.MIN_CONF_FOR_TRADE,
        };
      }
    } catch (error) {
      // エラー時はデフォルトプロファイルを使用
      console.warn(`[marketCore] Error loading market profile for ${market}:`, error.message);
    }
  }

  const {
    HARD_SIGNAL_THRESH = 28,
    SOFT_REGIME_THRESH = 20,
    MIN_CONF_FOR_TRADE = 0.5,
  } = profile;

  // Phase 2: BUG_STANDBY_BIAS補正（市場別）
  let adjustedScore = score;
  if (marketProfiles) {
    try {
      const marketProfile = marketProfiles.getMarketProfile(market);
      const bias = marketProfile?.algorithm?.BUG_STANDBY_BIAS;
      if (bias && Math.abs(score) < HARD_SIGNAL_THRESH) {
        // 閾値未満のスコアをさらに下げる（BUG_STANDBYを増やす）
        const biasFactor = bias / 100; // パーセントを係数に変換
        adjustedScore = score * (1 - biasFactor * 0.5);
      }
    } catch (error) {
      // エラー時は調整なし
    }
  }

  // 調整後のスコアを使用（ただし、判定は元のスコアで行う）
  // adjustedScoreは表示用、判定はscoreを使用

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
    adjustedScore, // Phase 2: 市場別補正後のスコア
    regime,
    signal,
    confidence,
    market, // Phase 2: 市場コード
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

/**
 * Phase 2: 市場別スコア補正拡張版
 * @param {Object} ctx - Market context (marketプロパティを含む)
 * @returns {Object} 補正された決定結果
 */
function decideSignalAdvanced(ctx) {
  // market情報をctxに追加
  const market = ctx?.market || process.env.MARKET_CODE || 'EN';
  const enhancedCtx = { ...ctx, market };

  return decideSignal(enhancedCtx);
}

module.exports = {
  buildMarketContext,
  decideSignal,
  decideSignalAdvanced, // Phase 2: 市場別補正版
};
