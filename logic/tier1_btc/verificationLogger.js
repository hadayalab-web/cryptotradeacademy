// logic/tier1_btc/verificationLogger.js

/**
 * 検証ログ記録システム
 * 
 * phase1-product推奨事項に基づく「週次検証ログ公開」機能
 * シグナルごとの検証ログ（改ざん不可）を記録
 * 「見送りで回避した損失」レポートを生成
 * 
 * @param {Object} ctx - 検証コンテキスト
 * @param {string} ctx.signalId - シグナルID（一意）
 * @param {string} ctx.signal - シグナル (BUY/SELL/NONE)
 * @param {number} ctx.priceUsd - エントリー価格
 * @param {number} ctx.tp - Take Profit価格
 * @param {number} ctx.sl - Stop Loss価格
 * @param {string} ctx.market - 市場コード
 * @param {Object} ctx.noTradeAlert - NO TRADEアラート結果
 * @param {Object} ctx.trapRisk - Trap Riskスコア結果
 * @param {Date} ctx.timestamp - タイムスタンプ
 * @returns {Object} 検証ログエントリ
 */
function createVerificationLog(ctx = {}) {
  const {
    signalId = `signal_${Date.now()}`,
    signal = 'NONE',
    priceUsd = 0,
    tp = null,
    sl = null,
    market = 'EN',
    noTradeAlert = null,
    trapRisk = null,
    timestamp = new Date(),
  } = ctx || {};

  const logEntry = {
    signalId,
    timestamp: timestamp.toISOString(),
    market,
    signal,
    entry: {
      price: priceUsd,
      tp,
      sl,
    },
    noTradeAlert: noTradeAlert ? {
      shouldNoTrade: noTradeAlert.shouldNoTrade,
      confidence: noTradeAlert.confidence,
      riskScore: noTradeAlert.riskScore,
      reasons: noTradeAlert.reasons || [],
    } : null,
    trapRisk: trapRisk ? {
      trapRiskScore: trapRisk.trapRiskScore,
      riskLevel: trapRisk.riskLevel,
    } : null,
    // 検証結果（後で更新）
    verification: {
      status: 'PENDING', // PENDING / VERIFIED / FAILED
      actualPrice: null, // 実際の価格動向
      actualOutcome: null, // ACTUAL_TP / ACTUAL_SL / NO_TRADE_SAVED_LOSS
      pnl: null, // 実現P&L
      avoidedLoss: null, // 回避した損失（NO TRADEの場合）
      verifiedAt: null, // 検証完了日時
    },
  };

  return logEntry;
}

/**
 * 検証ログを更新（検証結果を記録）
 * 
 * @param {Object} logEntry - 既存のログエントリ
 * @param {Object} verification - 検証結果
 * @param {string} verification.status - VERIFIED / FAILED
 * @param {number} verification.actualPrice - 実際の価格
 * @param {string} verification.actualOutcome - ACTUAL_TP / ACTUAL_SL / NO_TRADE_SAVED_LOSS
 * @param {number} verification.pnl - 実現P&L
 * @param {number} verification.avoidedLoss - 回避した損失
 * @returns {Object} 更新されたログエントリ
 */
function updateVerificationLog(logEntry, verification) {
  return {
    ...logEntry,
    verification: {
      ...logEntry.verification,
      ...verification,
      verifiedAt: new Date().toISOString(),
    },
  };
}

/**
 * 週次集計レポートを生成
 * 
 * @param {Array} logEntries - 検証ログエントリの配列
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @returns {Object} 週次集計レポート
 */
function generateWeeklyReport(logEntries, startDate, endDate) {
  const filteredLogs = logEntries.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });

  const verifiedLogs = filteredLogs.filter(log => log.verification.status === 'VERIFIED');
  const noTradeLogs = filteredLogs.filter(log => log.noTradeAlert?.shouldNoTrade === true);

  // 統計計算
  const totalSignals = filteredLogs.length;
  const totalTrades = verifiedLogs.filter(log => log.signal !== 'NONE').length;
  const totalNoTrade = noTradeLogs.length;

  // P&L統計
  const pnlValues = verifiedLogs
    .map(log => log.verification.pnl)
    .filter(pnl => pnl !== null && !Number.isNaN(pnl));

  const totalPnl = pnlValues.reduce((sum, pnl) => sum + pnl, 0);
  const averagePnl = pnlValues.length > 0 ? totalPnl / pnlValues.length : 0;
  const maxDrawdown = Math.min(...pnlValues, 0);
  const maxProfit = Math.max(...pnlValues, 0);

  // 回避した損失統計
  const avoidedLosses = noTradeLogs
    .map(log => log.verification.avoidedLoss)
    .filter(loss => loss !== null && !Number.isNaN(loss));

  const totalAvoidedLoss = avoidedLosses.reduce((sum, loss) => sum + loss, 0);
  const averageAvoidedLoss = avoidedLosses.length > 0 ? totalAvoidedLoss / avoidedLosses.length : 0;

  // 勝率計算
  const winningTrades = verifiedLogs.filter(log => 
    log.verification.pnl !== null && log.verification.pnl > 0
  ).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  // リスクリワード比
  const riskRewardRatios = verifiedLogs
    .map(log => {
      if (!log.entry.tp || !log.entry.sl || !log.entry.price) return null;
      const risk = Math.abs(log.entry.price - log.entry.sl);
      const reward = Math.abs(log.entry.tp - log.entry.price);
      return risk > 0 ? reward / risk : null;
    })
    .filter(rr => rr !== null && !Number.isNaN(rr));

  const averageRiskReward = riskRewardRatios.length > 0
    ? riskRewardRatios.reduce((sum, rr) => sum + rr, 0) / riskRewardRatios.length
    : 0;

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    summary: {
      totalSignals,
      totalTrades,
      totalNoTrade,
      winRate: Number(winRate.toFixed(2)),
      totalPnl: Number(totalPnl.toFixed(2)),
      averagePnl: Number(averagePnl.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxProfit: Number(maxProfit.toFixed(2)),
      totalAvoidedLoss: Number(totalAvoidedLoss.toFixed(2)),
      averageAvoidedLoss: Number(averageAvoidedLoss.toFixed(2)),
      averageRiskReward: Number(averageRiskReward.toFixed(2)),
    },
    breakdown: {
      bySignal: {
        // 過去データとの互換性のため、BUY/SELLも集計（新しいデータではAVOID_LONG/AVOID_SHORT/STANDBYのみ）
        BUY: filteredLogs.filter(log => log.signal === 'BUY').length,
        SELL: filteredLogs.filter(log => log.signal === 'SELL').length,
        AVOID_LONG: filteredLogs.filter(log => log.signal === 'AVOID_LONG').length,
        AVOID_SHORT: filteredLogs.filter(log => log.signal === 'AVOID_SHORT').length,
        STANDBY: filteredLogs.filter(log => log.signal === 'STANDBY').length,
        NONE: filteredLogs.filter(log => log.signal === 'NONE').length,
      },
      byMarket: filteredLogs.reduce((acc, log) => {
        acc[log.market] = (acc[log.market] || 0) + 1;
        return acc;
      }, {}),
      byOutcome: {
        ACTUAL_TP: verifiedLogs.filter(log => log.verification.actualOutcome === 'ACTUAL_TP').length,
        ACTUAL_SL: verifiedLogs.filter(log => log.verification.actualOutcome === 'ACTUAL_SL').length,
        NO_TRADE_SAVED_LOSS: verifiedLogs.filter(log => log.verification.actualOutcome === 'NO_TRADE_SAVED_LOSS').length,
      },
    },
    logs: filteredLogs,
  };
}

module.exports = {
  createVerificationLog,
  updateVerificationLog,
  generateWeeklyReport,
};
