// api/cron.js

// --- Imports ----------------------------------------------------
const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
const { calculateMarketScore } = require('../logic/marketScorer');
const { generateSignal } = require('../logic/signalGen');
const { detectTrap } = require('../logic/trapDetector');
const { analyzeMarket } = require('../services/grok/client');
const { sendMessage } = require('../services/telegram/bot');

// --- External data helpers -------------------------------------
// BTC 現在価格＋24h変化率（CoinGecko）[web:151]
async function fetchBtcPrice() {
  const url = new URL(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
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

// Fear & Greed Index（alternative.me）[web:145]
async function fetchFearGreed() {
  const url = new URL('https://api.alternative.me/fng/?limit=1');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FNG API Error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const point = json?.data?.[0];
  if (!point) return { value: null, label: 'Unknown' };
  return {
    value: Number(point.value) || null,
    label: point.value_classification || 'Unknown', // e.g. "Extreme Fear"
  };
}

// --- Message builders -------------------------------------------

function buildRegularMessage(payload) {
  const {
    now,
    inflow,
    mpi,
    sentimentLabel,
    priceUsd,
    change24h,
    score,
    tradeSignal,
    trap,
    aiAnalysis,
  } = payload;

  const ts = now.toISOString().replace('T', ' ').slice(0, 16);
  const directionEmoji = tradeSignal.signal === 'BUY'
    ? '🟢'
    : tradeSignal.signal === 'SELL'
    ? '🔴'
    : '⚪️';

  const trapLine = trap.isTrap
    ? `🚨 Trap Detector: ${trap.type} (${trap.confidence})`
    : '🚨 Trap Detector: No critical trap detected.';

  return [
    `📢 Dr. Grok's Market Leak`,
    `【Session Briefing @ ${ts} UTC】`,
    '',
    `💰 BTC Price: $${priceUsd.toLocaleString()} (${change24h.toFixed(2)}% / 24h)`,
    `📊 Exchange Netflow: ${inflow.toFixed(2)} BTC`,
    `⛏️ Miner Position Index (MPI): ${mpi.toFixed(2)}`,
    `😰 Sentiment: ${sentimentLabel}`,
    '',
    `📈 Market Score: ${score}/100`,
    trapLine,
    '',
    `🎯 Trade Verdict`,
    `${directionEmoji} Signal: ${tradeSignal.signal}`,
    `   • Entry (spot ref.): $${Math.round(tradeSignal.entry).toLocaleString()}`,
    `   • Take Profit:      $${tradeSignal.tp.toLocaleString()}`,
    `   • Stop Loss:        $${tradeSignal.sl.toLocaleString()}`,
    '',
    `🤖 Dr. Grok's Take`,
    aiAnalysis || 'No AI commentary available this round.',
    '',
    `For educational purposes only. Not financial advice.`,
  ].join('\n');
}

function buildTrapAlertMessage(payload) {
  const { inflow, mpi, priceUsd, trap, aiAnalysis } = payload;
  const emoji = trap.type === 'BULL_TRAP' ? '🐻' : '🐂';

  return [
    `🔥 WHALE TRAP ALERT (${trap.type}) ${emoji}`,
    '',
    `BTC Price: $${priceUsd.toLocaleString()}`,
    `Exchange Netflow: ${inflow.toFixed(2)} BTC`,
    `MPI: ${mpi.toFixed(2)}`,
    '',
    `Dr. Grok's quick take:`,
    aiAnalysis || 'Trap detected, but AI commentary unavailable.',
    '',
    `This is an unscheduled alert from the Whale Trap Detector.`,
    `Educational only – manage your own risk.`,
  ].join('\n');
}

// --- Main Cron Handler -----------------------------------------

/**
 * Vercel Cron Handler
 * Triggered every 5 minutes
 */
module.exports = async (req, res) => {
  // CRON_SECRET による簡易認証
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('⏰ Cron Job Started: Whale Monitor');

  try {
    // 1. On-chain データ取得（CQ）[attached_file:115]
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
    ]);

    if (!inflowData || !mpiData) {
      console.warn('⚠️ No data fetched from CryptoQuant');
      return res.status(200).json({ message: 'No on-chain data available, skipped.' });
    }

    const inflow = Number(inflowData.value) || 0;
    const mpi = Number(mpiData.value) || 0;

    // 2. マーケットメタデータ（価格＋センチメント）[web:151][web:145]
    const [priceMeta, fng] = await Promise.all([fetchBtcPrice(), fetchFearGreed()]);
    const priceUsd = priceMeta.priceUsd;
    const change24h = priceMeta.change24h;
    const sentimentLabel = fng.label;

    // 3. スコア／シグナル／Trap 判定[attached_file:142][attached_file:141][attached_file:140]
    const score = calculateMarketScore({
      inflow,
      mpi,
      sentiment: sentimentLabel,
    });

    const tradeSignal = generateSignal(score, priceUsd);

    const trap = detectTrap(
      {
        priceChange: change24h,
        volume: 0, // v1 では未使用。将来オンチェーンボリューム等を入れる余地。
      },
      {
        inflow,
        mpi,
      },
    );

    // 4. Grok 用サマリーを構築して要約を取得[attached_file:117]
    const marketSummary = JSON.stringify(
      {
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        score,
        signal: tradeSignal.signal,
        tp: tradeSignal.tp,
        sl: tradeSignal.sl,
        trap,
      },
      null,
      2,
    );

    const aiAnalysis = await analyzeMarket(marketSummary);

    // 5. REGULAR レポート枠（4時間ごと）の判定[attached_file:112]
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const REGULAR_HOURS = [0, 4, 8, 12, 16, 20];

    const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute < 5;

// ★ ここから追加 ★
const force = req.query?.force === 'true';

console.log(
  `Slot check => utcHour=${utcHour}, utcMinute=${utcMinute}, isRegularSlot=${isRegularSlot}, force=${force}`
);
// ★ ここまで追加 ★

    let sent = 0;

// 6-A. REGULAR レポート送信
if (isRegularSlot || force) {
  console.log('Sending REGULAR message...');
  const regularText = buildRegularMessage({
    now,
    inflow,
    mpi,
    sentimentLabel,
    priceUsd,
    change24h,
    score,
    tradeSignal,
    trap,
    aiAnalysis,
  });
  await sendMessage(regularText);
  sent += 1;
}

    // 6-B. Trap 専用 EMERGENCY（REGULAR とは別枠）
    if (trap.isTrap && trap.confidence === 'HIGH' && !isRegularSlot) {
      const alertText = buildTrapAlertMessage({
        inflow,
        mpi,
        priceUsd,
        trap,
        aiAnalysis,
      });
      await sendMessage(alertText);
      sent += 1;
    }

    // 7. HTTP レスポンス
    res.status(200).json({
      success: true,
      sentMessages: sent,
      metrics: {
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        score,
        signal: tradeSignal.signal,
      },
      trap,
    });
  } catch (error) {
    console.error('❌ Cron Job Failed:', error);
    res.status(500).json({ error: error.message });
  }
};
