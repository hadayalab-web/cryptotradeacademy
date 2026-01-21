// api/promo-stock-monitor.js
// プロモコードの残り枠監視とリマインド送信（Vercel Cron）

const { monitorPromoCodeStock } = require('../services/whop/promo-monitor');

// Vercel Cron実行時（15分ごと）
module.exports = async (req, res) => {
  // CRON_SECRETチェック
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const result = await monitorPromoCodeStock();
    
    // 在庫切れまたは在庫が少ない場合のログ出力
    if (result.stockout) {
      console.error('[PromoStockMonitor] ⚠️ CRITICAL: Promo code stock is ZERO! CEO has been notified.');
    } else if (result.lowStock) {
      console.warn(`[PromoStockMonitor] ⚠️ WARNING: Promo code stock is low (${result.remainingStock} remaining). CEO has been notified.`);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[PromoStockMonitor] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.monitorPromoCodeStock = monitorPromoCodeStock;
