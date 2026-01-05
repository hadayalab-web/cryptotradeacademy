// logic/tier1_btc/noTradeDetector.js

/**
 * NO TRADE（見送り）判定システム
 * 
 * phase1-product推奨事項に基づく「見送り判定」機能
 * エントリーよりも「見送り判断」を優先する設計
 * 
 * @param {Object} ctx - 市場コンテキスト
 * @param {number} ctx.priceUsd - BTC価格
 * @param {number} ctx.change24h - 24時間変動率
 * @param {number} ctx.inflow - Exchange Netflow
 * @param {number} ctx.mpi - Miners' Position Index
 * @param {number} ctx.whaleBias - Whale Bias (-1 to +1)
 * @param {number} ctx.retailFomo - Retail FOMO (0-100)
 * @param {number} ctx.volume - 取引量
 * @param {number} ctx.trapRisk - Trap Risk Score (0-100)
 * @param {string} ctx.market - 市場コード (EN/AR/ES/JA/KO/PT-BR)
 * @returns {Object} NO TRADE判定結果
 */
function detectNoTrade(ctx = {}) {
  const {
    priceUsd = 0,
    change24h = 0,
    inflow = null,
    mpi = null,
    whaleBias = 0,
    retailFomo = 50,
    volume = 0,
    trapRisk = 0,
    market = 'EN',
  } = ctx || {};

  // データ不足の場合は「見送り」を推奨
  if (inflow === null || Number.isNaN(Number(inflow))) {
    return {
      shouldNoTrade: true,
      reason: 'Missing or invalid on-chain data',
      confidence: 'MEDIUM',
      recommendation: 'Wait for data confirmation before trading',
      debug: { inflow, mpi, whaleBias, retailFomo },
    };
  }

  const reasons = [];
  let confidence = 'LOW';
  let riskScore = 0;

  // === 判定条件1: クジラ流入直後（24時間待機推奨） ===
  if (inflow > 2000) {
    reasons.push('Large whale inflow detected (>2000 BTC). Wait 24h for confirmation.');
    riskScore += 30;
  }

  // === 判定条件2: 流動性ギャップ（5%超で即エグジット推奨） ===
  const liquidityGap = Math.abs(change24h);
  if (liquidityGap > 5 && volume < 1000000) {
    reasons.push(`Liquidity gap detected (${liquidityGap.toFixed(2)}% change, low volume). High risk of trap.`);
    riskScore += 40;
  }

  // === 判定条件3: フェイクボリューム（出来高が伴わないブレイク） ===
  if (Math.abs(change24h) > 3 && volume < 500000) {
    reasons.push('Price movement without volume confirmation. Possible fake breakout.');
    riskScore += 35;
  }

  // === 判定条件4: Trap Risk Score が高い ===
  if (trapRisk >= 60) {
    reasons.push(`High trap risk score (${trapRisk}/100). Avoid entry.`);
    riskScore += 50;
  }

  // === 判定条件5: Whale Bias と Retail FOMO の不均衡 ===
  const biasFomoDivergence = Math.abs(whaleBias * 100 - retailFomo);
  if (biasFomoDivergence > 50) {
    reasons.push(`Large divergence between whale bias (${(whaleBias * 100).toFixed(0)}) and retail FOMO (${retailFomo}). Market uncertainty.`);
    riskScore += 25;
  }

  // === 判定条件6: MPI が極端な値（Miner売り圧） ===
  if (mpi !== null && mpi < -20) {
    reasons.push(`Extreme miner selling pressure (MPI: ${mpi}). Wait for stabilization.`);
    riskScore += 30;
  }

  // === 判定条件7: 市場別の特殊条件 ===
  if (market === 'JA') {
    // JA市場: 週末高値更新→月曜調整パターン
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    if (dayOfWeek === 1 && change24h > 2) {
      reasons.push('JA market: Weekend high → Monday correction pattern detected. Wait for confirmation.');
      riskScore += 20;
    }
  }

  if (market === 'KO') {
    // KO市場: キムチプレミアム異常値
    // (この実装では簡易版として、大きな価格変動を検知)
    if (Math.abs(change24h) > 5) {
      reasons.push('KO market: Extreme price movement. Monitor Kimchi Premium before entry.');
      riskScore += 15;
    }
  }

  // === 判定条件8: センチメント過熱（Fear & Greed 極端値） ===
  // この実装では retailFomo で代用
  if (retailFomo >= 80) {
    reasons.push(`Extreme retail FOMO (${retailFomo}/100). Sentiment overheating. Wait for cooling.`);
    riskScore += 30;
  }

  if (retailFomo <= 20) {
    reasons.push(`Extreme retail panic (${retailFomo}/100). Wait for sentiment stabilization.`);
    riskScore += 20;
  }

  // === 総合判定 ===
  const shouldNoTrade = riskScore >= 50 || reasons.length >= 3;

  // Confidence の決定
  if (riskScore >= 80) {
    confidence = 'HIGH';
  } else if (riskScore >= 50) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  // 推奨アクション
  let recommendation = '';
  if (shouldNoTrade) {
    if (riskScore >= 80) {
      recommendation = 'STRONGLY AVOID: High risk of trap. Wait for clear signal or data confirmation.';
    } else {
      recommendation = 'AVOID: Multiple risk factors detected. Wait for better setup.';
    }
  } else {
    recommendation = 'MONITOR: Some risk factors present, but not critical. Proceed with caution.';
  }

  return {
    shouldNoTrade,
    riskScore: Math.min(100, riskScore),
    confidence,
    reasons: reasons.length > 0 ? reasons : ['No significant risk factors detected'],
    recommendation,
    debug: {
      priceUsd,
      change24h,
      inflow,
      mpi,
      whaleBias,
      retailFomo,
      volume,
      trapRisk,
      market,
    },
  };
}

module.exports = { detectNoTrade };
