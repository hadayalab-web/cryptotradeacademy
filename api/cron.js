export const dynamic = 'force-dynamic';

// api/cron.js

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// --- Imports ----------------------------------------------------

const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular');
const { formatTrapAlert } = require('../services/telegram/messages/user/en/emergency');
const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
const { calculateMarketScore } = require('../logic/tier1_btc/marketScorer');
const { generateSignal } = require('../logic/tier1_btc/signalGen');
const { detectTrap } = require('../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../logic/tier1_btc/sentiment'); // ★ これを追加
const { analyzeMarket } = require('../services/grok/client');
const { sendMessage } = require('../services/telegram/bot');


// --- External data helpers -------------------------------------
// BTC ���݉��i�{24h�ω����iCoinGecko�j[web:151]
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

// Fear & Greed Index�ialternative.me�j[web:145]
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

// --- Main Cron Handler -----------------------------------------

/**
 * Vercel Cron Handler
 * Triggered every 5 minutes
 */

const handler = async (req, res) => {
  // �f�o�b�O�p�t���O�i�u���E�U���@���̂Ƃ������g���j
  const debugBypass = req.query?.debug === 'local';

  // CRON_SECRET �ɂ��ȈՔF��
  const authHeader = req.headers.authorization;
  if (!debugBypass && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  } // ���� ���̃J�b�R�����t�@�C���ɖ���

  console.log('? Cron Job Started: Whale Monitor');
  // �������牺�͍��̂܂܂�OK



  try {
    // 1. On-chain �f�[�^�擾�iCQ�j[attached_file:115]
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
    ]);

    if (!inflowData || !mpiData) {
      console.warn('?? No data fetched from CryptoQuant');
      return res.status(200).json({ message: 'No on-chain data available, skipped.' });
    }

    const inflow = Number(inflowData.value) || 0;
    const mpi = Number(mpiData.value) || 0;

    // 2. �}�[�P�b�g���^�f�[�^�i���i�{�Z���`�����g�j[web:151][web:145]
    const [priceMeta, fng] = await Promise.all([fetchBtcPrice(), fetchFearGreed()]);
    const priceUsd = priceMeta.priceUsd;
    const change24h = priceMeta.change24h;

    // fng.label があれば優先、なければ数値 value から正規化
    const rawSentiment = fng.label ?? fng.value;
    const sentimentLabel = normalizeSentiment(rawSentiment);

    // 3. �X�R�A�^�V�O�i���^Trap ����[attached_file:142][attached_file:141][attached_file:140]
    const score = calculateMarketScore({
      inflow,
      mpi,
      sentiment: sentimentLabel,
      change24h, // ここを追加
    });


    const tradeSignal = generateSignal(score, priceUsd, {
    sentimentLabel,
    change24h,
    });

    // tradeSignal から売買方向と TP/SL を展開
    const side =
    tradeSignal.signal === 'SELL'
    ? 'SHORT'
    : 'LONG'; // BUY それ以外は LONG 扱い

const entry = priceUsd;        // 発報時の価格をそのままエントリー価格に
const tp = tradeSignal.tp;     // generateSignal が決めた TP 価格
const sl = tradeSignal.sl;     // 同じく SL 価格


    const trap = detectTrap(
      {
        priceChange: change24h,
        volume: 0, // v1では未使用
      },
      {
        inflow,
        mpi,
      },
    );


    // 4. Grok �p�T�}���[���\�z���ėv����擾[attached_file:117]
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

    // 5. REGULAR ���|�[�g�g�i4���Ԃ��Ɓj�̔���[attached_file:112]
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const REGULAR_HOURS = [0, 4, 8, 12, 16, 20];

    const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute < 5;

// �� ��������ǉ� ��
const force = req.query?.force === 'true';

console.log(
  `Slot check => utcHour=${utcHour}, utcMinute=${utcMinute}, isRegularSlot=${isRegularSlot}, force=${force}`
);
// �� �����܂Œǉ� ��

    let sent = 0;

// 6-A. REGULAR レポート送信
if (isRegularSlot || force) {
  console.log('Sending REGULAR message...');

  const regularText = formatRegularBriefing({
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

// 6-B. Trap 用 EMERGENCY（REGULAR とは独立）
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


    // 7. HTTP ���X�|���X
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
    // ここから追加
    side,
    entry,
    tp,
    sl,
  });

  } catch (error) {
    console.error('? Cron Job Failed:', error);
    res.status(500).json({ error: error.message });
  }
};
export default handler;
