// logic/tier1_btc/exitMap.js

/**
 * Exit Map（撤退マップ）生成システム
 * 
 * phase1-product推奨事項に基づく「Exit Map」機能
 * 分割利確/撤退条件の固定テンプレートを提供
 * 「戦わずして売る」戦略の核心機能
 * 
 * @param {Object} ctx - 市場コンテキスト
 * @param {number} ctx.priceUsd - 現在価格
 * @param {string} ctx.signal - シグナル (BUY/SELL/NONE)
 * @param {number} ctx.entry - エントリー価格
 * @param {number} ctx.tp - Take Profit価格
 * @param {number} ctx.sl - Stop Loss価格
 * @param {number} ctx.trapRisk - Trap Risk Score (0-100)
 * @param {string} ctx.market - 市場コード
 * @returns {Object} Exit Map（分割利確ゾーン、撤退条件）
 */
function generateExitMap(ctx = {}) {
  const {
    priceUsd = 0,
    signal = 'NONE',
    entry = null,
    tp = null,
    sl = null,
    trapRisk = 0,
    market = 'EN',
  } = ctx || {};

  // エントリーがない場合は基本マップのみ
  if (!entry || !tp || !sl || signal === 'NONE') {
    return {
      hasActivePosition: false,
      exitMap: {
        recommendation: 'No active position. Monitor for entry signals.',
        zones: [],
        exitConditions: [],
      },
    };
  }

  const entryPrice = Number(entry);
  const tpPrice = Number(tp);
  const slPrice = Number(sl);
  const currentPrice = Number(priceUsd);

  // ポジション方向の判定
  const isLong = signal === 'BUY';
  const isShort = signal === 'SELL';

  // 現在のポジション状態
  let positionStatus = 'NEUTRAL';
  let unrealizedPnl = 0;
  let unrealizedPnlPct = 0;

  if (isLong) {
    unrealizedPnl = currentPrice - entryPrice;
    unrealizedPnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    if (currentPrice >= tpPrice * 0.9) {
      positionStatus = 'NEAR_TP';
    } else if (currentPrice <= slPrice * 1.1) {
      positionStatus = 'NEAR_SL';
    } else {
      positionStatus = 'IN_POSITION';
    }
  } else if (isShort) {
    unrealizedPnl = entryPrice - currentPrice;
    unrealizedPnlPct = ((entryPrice - currentPrice) / entryPrice) * 100;
    if (currentPrice <= tpPrice * 1.1) {
      positionStatus = 'NEAR_TP';
    } else if (currentPrice >= slPrice * 0.9) {
      positionStatus = 'NEAR_SL';
    } else {
      positionStatus = 'IN_POSITION';
    }
  }

  // === 分割利確ゾーンの生成 ===
  const zones = [];

  if (isLong) {
    // LONG: 上方向に分割利確
    const priceRange = tpPrice - entryPrice;
    
    // Zone A: 50%利確（TPの50%地点）
    const zoneA = entryPrice + priceRange * 0.5;
    zones.push({
      zone: 'A',
      price: Math.round(zoneA),
      takeProfitPct: 50,
      description: 'First profit target - Take 50% position off',
      priority: 'HIGH',
      reason: 'Lock in initial profits, reduce risk',
    });

    // Zone B: 30%利確（TPの80%地点）
    const zoneB = entryPrice + priceRange * 0.8;
    zones.push({
      zone: 'B',
      price: Math.round(zoneB),
      takeProfitPct: 30,
      description: 'Second profit target - Take 30% position off',
      priority: 'MEDIUM',
      reason: 'Capture majority of move, let runner run',
    });

    // Zone C: 20%利確（TP到達時）
    zones.push({
      zone: 'C',
      price: Math.round(tpPrice),
      takeProfitPct: 20,
      description: 'Final profit target - Take remaining 20% off',
      priority: 'LOW',
      reason: 'Full target reached, complete exit',
    });
  } else if (isShort) {
    // SHORT: 下方向に分割利確
    const priceRange = entryPrice - tpPrice;
    
    // Zone A: 50%利確（TPの50%地点）
    const zoneA = entryPrice - priceRange * 0.5;
    zones.push({
      zone: 'A',
      price: Math.round(zoneA),
      takeProfitPct: 50,
      description: 'First profit target - Take 50% position off',
      priority: 'HIGH',
      reason: 'Lock in initial profits, reduce risk',
    });

    // Zone B: 30%利確（TPの80%地点）
    const zoneB = entryPrice - priceRange * 0.8;
    zones.push({
      zone: 'B',
      price: Math.round(zoneB),
      takeProfitPct: 30,
      description: 'Second profit target - Take 30% position off',
      priority: 'MEDIUM',
      reason: 'Capture majority of move, let runner run',
    });

    // Zone C: 20%利確（TP到達時）
    zones.push({
      zone: 'C',
      price: Math.round(tpPrice),
      takeProfitPct: 20,
      description: 'Final profit target - Take remaining 20% off',
      priority: 'LOW',
      reason: 'Full target reached, complete exit',
    });
  }

  // === 撤退条件の生成 ===
  const exitConditions = [];

  // 条件1: Stop Loss到達
  exitConditions.push({
    condition: 'STOP_LOSS',
    price: Math.round(slPrice),
    action: 'IMMEDIATE_EXIT',
    description: `Stop Loss hit at $${Math.round(slPrice)}. Exit 100% position immediately.`,
    priority: 'CRITICAL',
  });

  // 条件2: Trap Risk Score が高い場合の早期撤退
  if (trapRisk >= 70) {
    exitConditions.push({
      condition: 'HIGH_TRAP_RISK',
      trigger: `Trap Risk Score >= 70 (Current: ${trapRisk})`,
      action: 'PARTIAL_EXIT',
      description: `High trap risk detected. Exit 50% position immediately, move SL to breakeven.`,
      priority: 'HIGH',
    });
  }

  // 条件3: 流動性ギャップ検知時の撤退
  exitConditions.push({
    condition: 'LIQUIDITY_GAP',
    trigger: 'Liquidity gap > 5% detected',
    action: 'IMMEDIATE_EXIT',
    description: 'Liquidity gap detected. Exit position immediately to avoid trap.',
    priority: 'HIGH',
  });

  // 条件4: クジラ流入検知時の撤退（LONGの場合）
  if (isLong) {
    exitConditions.push({
      condition: 'WHALE_INFLOW',
      trigger: 'Large whale inflow (>2000 BTC) detected',
      action: 'PARTIAL_EXIT',
      description: 'Large whale inflow detected. Exit 50% position, monitor for distribution.',
      priority: 'MEDIUM',
    });
  }

  // 条件5: センチメント過熱時の撤退
  exitConditions.push({
    condition: 'SENTIMENT_OVERHEATING',
    trigger: 'Retail FOMO >= 80 or Retail Panic <= 20',
    action: 'PARTIAL_EXIT',
    description: 'Sentiment overheating detected. Take profits, reduce exposure.',
    priority: 'MEDIUM',
  });

  // 条件6: 市場別の特殊撤退条件
  if (market === 'JA') {
    // JA市場: 週末→月曜調整パターン
    exitConditions.push({
      condition: 'JA_WEEKEND_PATTERN',
      trigger: 'Monday after weekend high',
      action: 'PARTIAL_EXIT',
      description: 'JA market: Weekend high → Monday correction pattern. Exit 50% on Monday open.',
      priority: 'MEDIUM',
    });
  }

  // === 推奨アクション ===
  let recommendation = '';
  
  if (positionStatus === 'NEAR_TP') {
    recommendation = 'NEAR TARGET: Consider taking partial profits (50%) at Zone A. Move SL to breakeven.';
  } else if (positionStatus === 'NEAR_SL') {
    recommendation = 'NEAR STOP: Monitor closely. If SL hit, exit immediately. Consider reducing position size if re-entering.';
  } else if (unrealizedPnlPct > 2) {
    recommendation = 'IN PROFIT: Lock in some profits. Consider taking 30% off at current price, move SL to breakeven.';
  } else if (unrealizedPnlPct < -1) {
    recommendation = 'IN LOSS: Monitor closely. If trap risk increases, consider early exit. Do not add to losing position.';
  } else {
    recommendation = 'MONITOR: Position is neutral. Follow exit map zones and conditions.';
  }

  // Trap Riskが高い場合は追加警告
  if (trapRisk >= 60) {
    recommendation += ` ⚠️ HIGH TRAP RISK (${trapRisk}/100): Consider reducing position size or early exit.`;
  }

  return {
    hasActivePosition: true,
    positionStatus,
    unrealizedPnl: Math.round(unrealizedPnl),
    unrealizedPnlPct: Number(unrealizedPnlPct.toFixed(2)),
    exitMap: {
      recommendation,
      zones,
      exitConditions,
      currentPrice: Math.round(currentPrice),
      entryPrice: Math.round(entryPrice),
      tpPrice: Math.round(tpPrice),
      slPrice: Math.round(slPrice),
    },
    debug: {
      signal,
      market,
      trapRisk,
    },
  };
}

module.exports = { generateExitMap };
