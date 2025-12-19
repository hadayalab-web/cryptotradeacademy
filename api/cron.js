// api/cron.js

// --- Imports ----------------------------------------------------

// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

// 言語別テンプレートを lang-suffixed ファイルから読み込む
function loadUserTemplates(lang) {
  try {
    // 例: services/telegram/messages/user/en/regular.en.js
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { formatRegularBriefing } = require(
      `../services/telegram/messages/user/${lang}/regular.${lang}`,
    );
    const { formatTrapAlert } = require(
      `../services/telegram/messages/user/${lang}/emergency.${lang}`,
    );
    return { formatRegularBriefing, formatTrapAlert };
  } catch (e) {
    console.warn(`Fallback to EN templates. lang=${lang} error=${e.message}`);
    const { formatRegularBriefing } = require(
      '../services/telegram/messages/user/en/regular.en',
    );
    const { formatTrapAlert } = require(
      '../services/telegram/messages/user/en/emergency.en',
    );
    return { formatRegularBriefing, formatTrapAlert };
  }
}

const { formatRegularBriefing, formatTrapAlert } = loadUserTemplates(LANG);

const { getExchangeInflow, getMinerPositionIndex } = require(
  '../services/cryptoquant/endpoints/btc',
);

const { buildMarketContext, decideSignal } = require('../logic/core/marketCore');
const { generateSignal } = require('../logic/tier1_btc/signalGen');
const { detectTrap } = require('../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../logic/tier1_btc/sentiment');

const { analyzeMarket, analyzeXSentimentLive } = require('../services/grok/client');
const { sendMessage } = require('../services/telegram/bot');

// --- External data helpers -------------------------------------

async function fetchBtcPrice() {
  const url = new URL(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
  );
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Price API Error: ${res.status} ${res.statusText}`);
  }
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
  if (!res.ok) {
    throw new Error(`FNG API Error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const point = json?.data?.[0];
  if (!point) return { value: null, label: 'Unknown' };
  return {
    value: Number(point.value) || null,
    label: point.value_classification || 'Unknown',
  };
}

// --- Watch helper (cheap trigger, no LLM) -----------------------
function shouldWatch({ score, confidence, trap, isRegularSlot }) {
  // REGULAR 時は定期配信でカバーするので WATCH を抑制
  if (isRegularSlot) return false;

  // EMERGENCY は別で処理（trap HIGH）
  if (trap?.isTrap && trap?.confidence === 'HIGH') return false;

  // “重要そう”の薄いWATCH: スコアがそこそこ偏っていて、confidenceもそれなり
  // ※しきい値は後でログ見て調整
  const s = Number(score ?? 0);
  const c = Number(confidence ?? 0);

  return (Math.abs(s) >= 22 && c >= 0.55) || (Math.abs(s) >= 28 && c >= 0.5);
}

// --- Main Cron Handler -----------------------------------------

export default async function handler(req, res) {
  const debugBypass = req.query?.debug === 'local';
  const authHeader = req.headers.authorization;

  if (
    !debugBypass &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🚀 Cron Job Started: Whale Monitor');

  try {
    // 0. 時間スロット判定（4時間ごと）
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const REGULAR_HOURS = [0, 4, 8, 12, 16, 20];
    const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute < 5;
    const force = req.query?.force === 'true';

    console.log(
      `Slot check => utcHour=${utcHour}, utcMinute=${utcMinute}, isRegularSlot=${isRegularSlot}, force=${force}`,
    );

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

    // 3. Base context (X Sentiment defaults)
    let xSentiment = { whaleBias: 0, retailFomo: 50, newsImpact: 0 };

    let ctx = buildMarketContext({
      asset: 'BTC',
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
    });

    let coreDecision = decideSignal(ctx); // includes confidence/components
    let tradeSignal = generateSignal({
      priceUsd,
      score: coreDecision.score,
      direction: coreDecision.signal,
    });

    // side is derived from tradeSignal.signal
    let side = 'FLAT';
    if (tradeSignal.signal === 'BUY') side = 'LONG';
    if (tradeSignal.signal === 'SELL') side = 'SHORT';

    let entry = priceUsd;
    let tp = tradeSignal.tp;
    let sl = tradeSignal.sl;

    // 5. Trap detect (on-chain only)
    let trap = detectTrap({
      priceChange: change24h,
      volume: 0,
      inflow,
      mpi,
    });

    const needsEmergency = trap.isTrap && trap.confidence === 'HIGH' && !isRegularSlot;

    // WATCH (cheap) before calling Grok
    const needsWatch = shouldWatch({
      score: coreDecision.score,
      confidence: coreDecision.confidence,
      trap,
      isRegularSlot,
    });

    // ---- Grok call gates (cost valve) --------------------------
    // needsXIntel: X監視だけ（安い） = REGULAR / force / EMERGENCY / WATCH
    const needsXIntel = isRegularSlot || force || needsEmergency || needsWatch;

    // needsLongReport: 長文生成（高い） = REGULAR / force / EMERGENCY のみ
    const needsLongReport = isRegularSlot || force || needsEmergency;

    let aiAnalysis = null;
    let xIntel = null; // for debugging/telemetry

    // 6. Grok (X intel only)
    if (needsXIntel) {
      try {
        const grokSent = await analyzeXSentimentLive(
          'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
        );
        xIntel = grokSent;

        if (grokSent && typeof grokSent === 'object') {
          xSentiment = {
            whaleBias: Number(grokSent.whaleBias) || 0,
            retailFomo: Number(grokSent.retailFomo) || 50,
            newsImpact: Number(grokSent.newsImpact) || 0,
          };
        }
      } catch (err) {
        console.warn(
          '⚠️ Grok Live Search Error in analyzeXSentimentLive, fallback to default sentiment:',
          err?.message || err,
        );
      }

      // Re-evaluate with xSentiment
      ctx = buildMarketContext({
        asset: 'BTC',
        priceUsd,
        change24h,
        inflow,
        mpi,
        xSentiment,
      });

      coreDecision = decideSignal(ctx);
      tradeSignal = generateSignal({
        priceUsd,
        score: coreDecision.score,
        direction: coreDecision.signal,
      });

      side = 'FLAT';
      if (tradeSignal.signal === 'BUY') side = 'LONG';
      if (tradeSignal.signal === 'SELL') side = 'SHORT';

      entry = priceUsd;
      tp = tradeSignal.tp;
      sl = tradeSignal.sl;

      // Re-evaluate trap with sentiment (FOMO/PANIC rules)
      const trapWithSentiment = detectTrap({
        priceChange: change24h,
        volume: 0,
        inflow,
        mpi,
        whaleBias: xSentiment.whaleBias,
        retailFomo: xSentiment.retailFomo,
      });

      if (trapWithSentiment?.isTrap) {
        trap = trapWithSentiment;
      }
    }

    // After sentiment re-check, recompute emergency (trap may upgrade)
    const finalNeedsEmergency =
      trap.isTrap && trap.confidence === 'HIGH' && !isRegularSlot;

    // 6-2. Grok long report (only when needed)
    if (needsLongReport || finalNeedsEmergency) {
      const marketSummaryPayload = {
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
      };

      try {
        aiAnalysis = await analyzeMarket(
          JSON.stringify(marketSummaryPayload),
          JSON.stringify(xSentiment),
          LANG,
        );
      } catch (err) {
        console.warn(
          '⚠️ Grok Market Analyze Error in analyzeMarket, fallback to offline analysis:',
          err?.message || err,
        );
        aiAnalysis = null;
      }
    }

    // 7. Telegram send
    let sent = 0;

    // 7-A. REGULAR
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

    // 7-B. EMERGENCY (Trap)
    if (finalNeedsEmergency) {
      const alertText = formatTrapAlert({
        inflow,
        mpi,
        priceUsd,
        trap,
        aiAnalysis, // may be null if long report disabled, but we allow
      });
      await sendMessage(alertText);
      sent += 1;
    }

    // 7-C. WATCH (short heads-up, no long report)
    if (needsWatch && !finalNeedsEmergency && !isRegularSlot && !force) {
      const watchText = [
        '👀 WATCH — Market shift detected',
        `• BTC: $${Math.round(priceUsd).toLocaleString('en-US')} (${change24h.toFixed(2)}% / 24h)`,
        `• Score: ${Math.round(coreDecision.score ?? 0)}/100 | Regime: ${coreDecision.regime} | Signal: ${tradeSignal.signal}`,
        `• X: whaleBias=${Number(xSentiment.whaleBias).toFixed(2)}, retailFomo=${Math.round(
          Number(xSentiment.retailFomo),
        )}, newsImpact=${Math.round(Number(xSentiment.newsImpact))}`,
        '• Action: Reduce leverage, wait for clarity, protect capital.',
      ].join('\n');

      await sendMessage(watchText);
      sent += 1;
    }

    return res.status(200).json({
      success: true,
      sentMessages: sent,
      slot: { isRegularSlot, force },
      flags: { needsWatch, needsXIntel, needsLongReport, finalNeedsEmergency },
      metrics: {
        inflow,
        mpi,
        sentiment: sentimentLabel,
        priceUsd,
        change24h,
        score: coreDecision.score,
        regime: coreDecision.regime,
        confidence: coreDecision.confidence,
        signal: tradeSignal.signal,
      },
      trap,
      side,
      entry,
      tp,
      sl,
      xSentiment,
      xIntel,
    });
  } catch (error) {
    console.error('❌ Cron Job Failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
