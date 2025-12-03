// api/cron.js
// --- Imports ----------------------------------------------------

const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular');
const { formatTrapAlert } = require('../services/telegram/messages/user/en/emergency');

const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');

const { pollXSentiment } = require('../services/x/xPoller');
const { buildMarketContext, decideSignal } = require('../logic/core/marketCore');

const { generateSignal } = require('../logic/tier1_btc/signalGen');
const { detectTrap } = require('../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../logic/tier1_btc/sentiment');

const { analyzeMarket } = require('../services/grok/client');
const { sendMessage } = require('../services/telegram/bot');

// --- External data helpers -------------------------------------

async function fetchBtcPrice() {
  const url = new URL(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
  );
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Price API Error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const data = json.bitcoin || {};
  return {
    priceUsd: Number(data.usd) || 0,
    change24h: Number(data.usd_24h_change) || 0,
  };
}

async function fetchFearGreed() {
  const url = new URL('https://api.alternative.me/fng/?limit=1');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FNG API Error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const point = json?.data?.[0];
  if (!point) return { value: null, label: 'Unknown' };
  return {
    value: Number(point.value) || null,
    label: point.value_classification || 'Unknown',
  };
}

// --- Main Cron Handler -----------------------------------------

export default async function handler(req, res) {
  // ↑の本体ロジックをそのまま中にコピペ
  const debugBypass = req.query?.debug === 'local';

  const authHeader = req.headers.authorization;
  if (!debugBypass && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 Cron Job Started: Whale Monitor');

  try {
    // 1. On-chain (CryptoQuant)
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
    ]);

    if (!inflowData || !mpiData) {
      console.warn('⚠️ No data from CryptoQuant');
      return res.status(200).json({ message: 'No on-chain data, skipped.' });
    }

    const inflow = Number(inflowData.value) || 0;
    const mpi = Number(mpiData.value) || 0;

    // 2. Price & Fear&Greed
    const [priceMeta, fng] = await Promise.all([fetchBtcPrice(), fetchFearGreed()]);
    const priceUsd = priceMeta.priceUsd;
    const change24h = priceMeta.change24h;
    const rawSentiment = fng.label ?? fng.value;
    const sentimentLabel = normalizeSentiment(rawSentiment);

    // 3. X sentiment (Grok + X)
    const xSentiment =
      (await pollXSentiment()) || {
        whaleBias: 0,
        retailFomo: 50,
        newsImpact: 0,
      };

    // 4. コア・ロジック
    const ctx = buildMarketContext({
      asset: 'BTC',
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
    });

    const coreDecision = decideSignal(ctx); // { score, regime, signal }

    // 5. TP/SL などのシグナル生成
    const tradeSignal = generateSignal({
      priceUsd,
      score: coreDecision.score,
      direction: coreDecision.signal, // 'BUY' | 'SELL' | 'NONE'
    });

    const side = tradeSignal.signal === 'SELL' ? 'SHORT' : 'LONG';
    const entry = priceUsd;
    const tp = tradeSignal.tp;
    const sl = tradeSignal.sl;

    // 6. Trap 検出
    const trap = detectTrap(
      {
        priceChange: change24h,
        volume: 0, // v1 では未使用
      },
      {
        inflow,
        mpi,
      },
    );

    // 7. Grok に市場サマリーを投げてコメント生成
    const marketSummary = JSON.stringify(
      {
        asset: 'BTC',
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        xSentiment,
        score: coreDecision.score,
        signal: tradeSignal.signal,
        tp: tradeSignal.tp,
        sl: tradeSignal.sl,
        trap,
      },
      null,
      2,
    );

    const aiAnalysis = await analyzeMarket(marketSummary);

    // 8. 時間スロット判定（4時間ごと）
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const REGULAR_HOURS = [0, 4, 8, 12, 16, 20];
    const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute < 5;
    const force = req.query?.force === 'true';

    console.log(
      `Slot check => utcHour=${utcHour}, utcMinute=${utcMinute}, isRegularSlot=${isRegularSlot}, force=${force}`,
    );

    let sent = 0;

    // 9-A. REGULAR レポート送信
    if (isRegularSlot || force) {
      console.log('Sending REGULAR message...');
      const regularText = formatRegularBriefing({
        now,
        inflow,
        mpi,
        sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        tradeSignal,
        trap,
        aiAnalysis,
      });
      await sendMessage(regularText);
      sent += 1;
    }

    // 9-B. Trap 用 EMERGENCY
    if (trap.isTrap && trap.confidence === 'HIGH' && !isRegularSlot) {
      const alertText = formatTrapAlert({
        inflow,
        mpi,
        priceUsd,
        trap,
        aiAnalysis,
      });
      await sendMessage(alertText);
      sent += 1;
    }

    // 10. HTTP レスポンス
    res.status(200).json({
      success: true,
      sentMessages: sent,
      metrics: {
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        signal: tradeSignal.signal,
      },
      trap,
      side,
      entry,
      tp,
      sl,
    });
  } catch (error) {
    console.error('❌ Cron Job Failed:', error);
    res.status(500).json({ error: error.message });
  }
};             // ← handler 関数を閉じるこの行は残す

