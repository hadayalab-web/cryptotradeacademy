// Modules
const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
const { analyzeMarket } = require('../services/grok/client');
const { sendMessage } = require('../services/telegram/bot');
// const { createSignalCard } = require('../services/telegram/card_template'); // 必要に応じて有効化

/**
 * Vercel Cron Handler
 * Triggered every 5 minutes
 */
module.exports = async (req, res) => {
  // CRON_SECRETによる認証 (Vercel Cronの保護)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ Cron Job Started: Whale Monitor');

  try {
    // 1. Fetch Data
    const inflowData = await getExchangeInflow();
    const mpiData = await getMinerPositionIndex();
    
    // データが取れなかった場合のガード
    if (!inflowData || !mpiData) {
      console.warn('⚠️ No data fetched from CryptoQuant');
      return res.status(200).json({ message: 'No data available, skipped.' });
    }

    // 2. Simple Logic Check (Tier 1 Logic)
    // 本来は logic/tier1_btc/whaleAlert.js に切り出すべき判定ロジック
    const lastInflow = inflowData.result?.data?.[0]?.value || 0;
    const lastMpi = mpiData.result?.data?.[0]?.value || 0;

    console.log(`📊 Inflow: ${lastInflow}, MPI: ${lastMpi}`);

    // 3. AI Analysis (Grok)
    const marketSummary = `Bitcoin Exchange Inflow: ${lastInflow}, MPI: ${lastMpi}`;
    const aiAnalysis = await analyzeMarket(marketSummary);

    // 4. Send Alert if needed (ここに条件分岐を入れる)
    // 例: Inflowが一定以上ならアラート
    if (lastInflow > 1000) { // 仮の閾値
        const message = `<b>🐋 WHALE ALERT!</b>\n\nHigh Exchange Inflow detected: ${lastInflow} BTC\n\n🤖 <b>AI Analysis:</b>\n${aiAnalysis}`;
        await sendMessage(message); // Default Channel
    }

    res.status(200).json({ 
      success: true, 
      metrics: { inflow: lastInflow, mpi: lastMpi },
      analysis: aiAnalysis 
    });

  } catch (error) {
    console.error('❌ Cron Job Failed:', error);
    res.status(500).json({ error: error.message });
  }
};
