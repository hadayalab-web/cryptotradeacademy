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
// Phase 2: 市場別深掘りデータ
const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');

const { buildMarketContext, decideSignal, decideSignalAdvanced } = require('../logic/core/marketCore');
const { generateSignal } = require('../logic/tier1_btc/signalGen');
const { detectTrap } = require('../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../logic/tier1_btc/sentiment');

const { analyzeMarket, analyzeXSentimentLive } = require('../services/grok/client');
const { sendMessage } = require('../services/telegram/bot');

// Phase 1: イベント駆動配信システム（Strategic SSOT v4.0）
const ENABLE_EVENT_DRIVEN = process.env.ENABLE_EVENT_DRIVEN === 'true';
let stateManager, evaluateTrigger;

if (ENABLE_EVENT_DRIVEN) {
  try {
    stateManager = require('../utils/stateManager');
    evaluateTrigger = require('../logic/eventTriggers').evaluateTrigger;
    console.log('[Phase 1] Event-driven delivery system enabled');
  } catch (error) {
    console.warn('[Phase 1] Event-driven modules not found, falling back to legacy mode:', error.message);
  }
}

// 市場コードの取得（LANGから推測、または環境変数から）
function getMarketCode(lang) {
  const langToMarket = {
    'en': 'EN',
    'ar': 'AR',
    'ko': 'KO',
    'ja': 'JA',
    'es': 'ES',
    'pt-br': 'PT-BR',
  };
  return langToMarket[lang] || 'EN';
}

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
      market: getMarketCode(LANG), // Phase 2: 市場情報追加
    });

    // Phase 2: decideSignalAdvanced使用（市場別補正）
    let coreDecision = decideSignalAdvanced ? decideSignalAdvanced(ctx) : decideSignal(ctx);
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

    // Phase 2: 深掘りデータ初期化（全パスで使用可能にする）
    let cqDeep = { inflow, mpi };

    // ===== Phase 1: イベント駆動配信判定（Strategic SSOT v4.0） =====
    let shouldSend = true; // デフォルト: 既存動作維持
    let triggerType = isRegularSlot ? 'REGULAR' : (finalNeedsEmergency ? 'EMERGENCY' : 'WATCH');
    let triggerReason = 'Legacy mode';

    if (ENABLE_EVENT_DRIVEN && stateManager && evaluateTrigger) {
      try {
        const market = getMarketCode(LANG);

        // 前回状態取得
        const lastState = await stateManager.getLastState(market);

        // Phase 2: CryptoQuant深掘りデータ取得（先に取得）
        let cqDeep = { inflow, mpi };
        try {
          const deepData = await getCQDeepMetrics(market, {
            upbitPrice: priceUsd, // 実際の価格取得が必要（要修正）
            binancePrice: priceUsd, // 実際の価格取得が必要（要修正）
            usdKrwRate: 1300, // 実際の為替レート取得が必要（要修正）
          });
          cqDeep = { ...cqDeep, ...deepData };
        } catch (error) {
          console.warn('[Phase 2] Error fetching deep metrics, using basic data:', error.message);
        }

        // 現在状態の構築（trapScore計算が必要な場合）
        // signalの正規化: NONE → BUG_STANDBY
        let normalizedSignal = coreDecision.signal || tradeSignal.signal;
        if (!normalizedSignal || normalizedSignal === 'NONE' || normalizedSignal === 'FLAT') {
          normalizedSignal = 'BUG_STANDBY';
        }

        const currentState = {
          signal: normalizedSignal,
          score: coreDecision.score,
          regime: coreDecision.regime,
          confidence: coreDecision.confidence,
          trapScore: cqDeep.trapScore ?? (trap.isTrap ? (trap.confidence === 'HIGH' ? 80 : trap.confidence === 'MEDIUM' ? 50 : 30) : 0),
          kimchiPremium: cqDeep.kimchiPremium ?? 0,
          riskReward: cqDeep.riskReward ?? 1.0,
        };

        // イベントトリガー評価
        const trigger = await evaluateTrigger(market, currentState, lastState, cqDeep);

        shouldSend = trigger.shouldSend;
        triggerType = trigger.triggerType;
        triggerReason = trigger.reason;

        console.log(`[Event-Driven] Market: ${market}, Trigger: ${triggerType}, ShouldSend: ${shouldSend}, Reason: ${triggerReason}`);

        // 配信する場合のみ状態保存
        if (shouldSend) {
          await stateManager.saveState(market, {
            ...currentState,
            lastSignal: currentState.signal,
            lastScore: currentState.score,
          });
        }
      } catch (error) {
        console.error('[Event-Driven] Error in event trigger evaluation, falling back to legacy mode:', error);
        // エラー時は既存動作を維持
      }
    }
    // ===== Phase 1 End =====

    // 6-2. Grok long report (only when needed)
    // イベント駆動有効時は、トリガー判定後にGrok呼び出しを調整
    const shouldCallGrok = shouldSend || isRegularSlot || force;
    if (needsLongReport && shouldCallGrok) {
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

    // ===== Phase 1: イベント駆動配信対応 =====
    // イベント駆動有効時は、shouldSend判定を優先
    const willSend = ENABLE_EVENT_DRIVEN ? shouldSend : true;

    if (!willSend && !force) {
      console.log(`[Event-Driven] Skipping send: ${triggerReason}`);
      return res.status(200).json({
        success: true,
        sentMessages: 0,
        skipped: true,
        trigger: { type: triggerType, reason: triggerReason },
        slot: { isRegularSlot, force },
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
      });
    }
    // ===== Phase 1 End =====

    // 7-A. REGULAR
    if (isRegularSlot || force || (ENABLE_EVENT_DRIVEN && triggerType === 'REGULAR')) {
      console.log('Sending REGULAR message...');

      // Phase 2: イベント駆動が無効な場合でも深掘りデータを取得
      if (!ENABLE_EVENT_DRIVEN || !stateManager) {
        try {
          const market = getMarketCode(LANG);
          const deepData = await getCQDeepMetrics(market, {
            upbitPrice: priceUsd,
            binancePrice: priceUsd,
            usdKrwRate: 1300,
          });
          cqDeep = { ...cqDeep, ...deepData };
        } catch (error) {
          console.warn('[Phase 2] Error fetching deep metrics:', error.message);
        }
      }

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
        // Phase 2: 市場別データ追加
        trapScore: cqDeep?.trapScore,
        whaleFlows: cqDeep?.whaleFlows,
        liquidations: cqDeep?.liquidations,
        kimchiPremium: cqDeep?.kimchiPremium,
        upbitPrice: cqDeep?.upbitPrice ?? priceUsd,
        binancePrice: cqDeep?.binancePrice ?? priceUsd,
        riskReward: cqDeep?.riskReward,
        nupl: cqDeep?.longTerm?.nupl,
        sopr30d: cqDeep?.longTerm?.sopr30d,
      });
      await sendMessage(regularText);
      sent += 1;
    }

    // 7-B. EMERGENCY (Trap)
    if (finalNeedsEmergency || (ENABLE_EVENT_DRIVEN && triggerType === 'EMERGENCY')) {
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
    // 7-D. STANDBY_BREAK (Phase 1新規)
    if (ENABLE_EVENT_DRIVEN && triggerType === 'STANDBY_BREAK') {
      console.log('Sending STANDBY_BREAK message...');
      const standbyBreakText = formatRegularBriefing({
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
      await sendMessage(standbyBreakText);
      sent += 1;
    } else if (needsWatch && !finalNeedsEmergency && !isRegularSlot && !force && (ENABLE_EVENT_DRIVEN && triggerType === 'WATCH' || !ENABLE_EVENT_DRIVEN)) {
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
      eventDriven: ENABLE_EVENT_DRIVEN ? {
        enabled: true,
        trigger: { type: triggerType, reason: triggerReason, shouldSend },
      } : { enabled: false },
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
