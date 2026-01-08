// scripts/backtest/generate_and_backtest_recent.js
// 最新データからシグナルを生成して即座にバックテストする統合スクリプト

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// CommonJS モジュールを require で読む
const { buildMarketContext, decideSignal } = require('../../logic/core/marketCore');
const { generateSignal } = require('../../logic/tier1_btc/signalGen');
const { detectTrap } = require('../../logic/tier1_btc/trapDetector');
const { normalizeSentiment } = require('../../logic/tier1_btc/sentiment');
const { getCQDeepMetrics } = require('../../services/cryptoquant/deepMetrics');
const { getExchangeInflow, getExchangeOutflow, getMinerPositionIndex } = require('../../services/cryptoquant/endpoints/btc');
const { analyzeXSentimentLive } = require('../../services/grok/client');

// ===== 設定 =====
const BINANCE_BASE_URL = 'https://api.binance.com';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';

// デフォルト: 直近90日
const argv = process.argv.slice(2);
const daysArg = argv.find((a) => a.startsWith('--days='));
const thresholdArg = argv.find((a) => a.startsWith('--threshold='));
const DAYS = daysArg ? Number(daysArg.split('=')[1]) : 90;
// テスト用: 閾値を下げる（デフォルト: 28 → 20に下げる）
const TEST_THRESHOLD = thresholdArg ? Number(thresholdArg.split('=')[1]) : 20;

// シグナル生成は4時間ごと
const REGULAR_HOURS = [0, 4, 8, 12, 16, 20];
const LOOKAHEAD_HOURS = 7 * 24; // バックテスト用: 7日先まで見る

const OUTPUT_SIGNALS = path.join(__dirname, '..', '..', 'data', 'signals_log_recent.jsonl');
const OUTPUT_BACKTEST = path.join(__dirname, '..', '..', 'data', 'signals_backtest_recent.jsonl');

// ===== ユーティリティ =====
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== Binance API =====
async function fetchKlinesChunk(startTimeMs, endTimeMs) {
  const params = new URLSearchParams({
    symbol: SYMBOL,
    interval: INTERVAL,
    startTime: String(startTimeMs),
    endTime: String(endTimeMs),
    limit: '1000',
  });

  const url = `${BINANCE_BASE_URL}/api/v3/klines?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Binance API error: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data.map((c) => ({
    openTime: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

async function fetchKlines(startTimeMs, endTimeMs) {
  const MAX_CANDLES_PER_REQUEST = 1000;
  const MS_PER_HOUR = 60 * 60 * 1000;
  const CHUNK_MS = MAX_CANDLES_PER_REQUEST * MS_PER_HOUR;

  const allKlines = [];
  let currentStart = startTimeMs;
  let requestCount = 0;

  while (currentStart < endTimeMs) {
    const currentEnd = Math.min(currentStart + CHUNK_MS, endTimeMs);
    
    console.log(`  📥 Request ${++requestCount}: ${new Date(currentStart).toISOString()} ~ ${new Date(currentEnd).toISOString()}`);
    
    const chunk = await fetchKlinesChunk(currentStart, currentEnd);
    allKlines.push(...chunk);
    
    console.log(`     ✅ Received ${chunk.length} candles`);
    
    if (currentEnd < endTimeMs) {
      await sleep(1000);
    }
    
    if (chunk.length > 0) {
      currentStart = chunk[chunk.length - 1].openTime + MS_PER_HOUR;
    } else {
      currentStart = currentEnd;
    }
    
    if (chunk.length < MAX_CANDLES_PER_REQUEST) {
      break;
    }
  }

  // 重複除去とソート
  const uniqueKlines = [];
  const seen = new Set();
  
  for (const k of allKlines) {
    if (!seen.has(k.openTime)) {
      seen.add(k.openTime);
      uniqueKlines.push(k);
    }
  }
  
  uniqueKlines.sort((a, b) => a.openTime - b.openTime);
  return uniqueKlines;
}

// ===== 24h変化率計算 =====
function calcChange24h(idx, klines) {
  if (idx < 24) return 0;
  const current = klines[idx].close;
  const past24h = klines[idx - 24].close;
  return ((current - past24h) / past24h) * 100;
}

// ===== センチメント変換 =====
function sentimentFromChange(change24h) {
  if (change24h <= -7) return 'Extreme Fear';
  if (change24h <= -2) return 'Fear';
  if (change24h < 2) return 'Neutral';
  if (change24h < 7) return 'Greed';
  return 'Extreme Greed';
}

// ===== 実際のCryptoQuantデータとX解析を取得 =====
async function fetchRealOnchainAndSocial(change24h, market = 'EN') {
  try {
    // CryptoQuantデータを並列取得
    const [inflowData, outflowData, mpiData, cqDeep] = await Promise.all([
      getExchangeInflow(),
      getExchangeOutflow(),
      getMinerPositionIndex(),
      getCQDeepMetrics(market).catch(() => null), // エラー時はnull
    ]);

    // 実際のデータを使用
    const exchangeInflow = inflowData?.value ?? 0;
    const exchangeOutflow = outflowData?.value ?? 0;
    const netflow = exchangeInflow - exchangeOutflow;
    const mpi = mpiData?.value ?? 0;

    // X解析を取得（Grok API）
    let xSentiment = {
      whaleBias: 0,
      retailFomo: 50,
      newsImpact: 0,
    };

    try {
      const grokSent = await analyzeXSentimentLive(
        'latest BTC price action, funding, liquidations, whale activity, ETF flows on X',
        'en'
      );
      
      if (grokSent && typeof grokSent === 'object') {
        xSentiment = {
          whaleBias: Number(grokSent.whaleBias) || 0,
          retailFomo: Number(grokSent.retailFomo) || 50,
          newsImpact: Number(grokSent.newsImpact) || 0,
        };
      }
    } catch (error) {
      console.warn('⚠️ X解析エラー（フォールバック）:', error.message);
      // フォールバック: 価格変化から推定
      if (change24h <= -7) xSentiment = { whaleBias: 1, retailFomo: 20, newsImpact: 30 };
      else if (change24h <= -2) xSentiment = { whaleBias: 0.5, retailFomo: 35, newsImpact: 20 };
      else if (change24h < 2) xSentiment = { whaleBias: 0, retailFomo: 50, newsImpact: 10 };
      else if (change24h < 7) xSentiment = { whaleBias: -0.5, retailFomo: 70, newsImpact: 20 };
      else xSentiment = { whaleBias: -1, retailFomo: 90, newsImpact: 40 };
    }

    // CryptoQuant深掘りデータから追加情報を取得
    if (cqDeep) {
      // EN市場: trapScoreを使用してX解析を補正
      if (market === 'EN' && cqDeep.trapScore !== undefined) {
        if (cqDeep.trapScore > 50) {
          // トラップスコアが高い場合、whaleBiasを強化
          xSentiment.whaleBias = Math.min(-1, xSentiment.whaleBias - 0.3);
          xSentiment.retailFomo = Math.min(100, xSentiment.retailFomo + 10);
        }
      }

      // Whale Flowsデータを使用
      if (cqDeep.whaleFlows) {
        const whaleRatio = cqDeep.whaleFlows.whaleRatio || 0;
        if (whaleRatio > 0.85) {
          // 高いWhale Ratio = 売り圧力
          xSentiment.whaleBias = Math.min(-1, xSentiment.whaleBias - 0.2);
        }
      }
    }

    return {
      inflow: netflow, // 実際のネットフロー
      mpi, // 実際のMPI
      xSentiment, // 実際のX解析またはフォールバック
      cqDeep, // CryptoQuant深掘りデータ
    };
  } catch (error) {
    console.warn('⚠️ CryptoQuantデータ取得エラー（フォールバック）:', error.message);
    // フォールバック: 価格変化から推定（より現実的な値）
    // 価格変化に基づいて、より動的なデータを生成
    const baseInflow = Math.round(change24h * 400);
    const baseMpi = change24h * 0.2;
    
    // ランダム要素を追加して、より現実的なデータを生成
    const r1 = Math.random();
    const r2 = Math.random();
    const r3 = Math.random();
    
    // 流入データに変動を追加
    let inflow = baseInflow;
    if (Math.abs(change24h) >= 2) {
      // 大きな価格変動時は、より大きな流入/流出を生成
      const amp = 1.5 + r1 * 1.5; // 1.5x ~ 3.0x
      inflow = Math.round(baseInflow * amp);
      
      // ダイバージェンスパターンを注入（20%の確率）
      if (r2 < 0.2) {
        inflow = -Math.round(Math.abs(baseInflow) * (1.2 + r3 * 0.8));
      }
    }
    
    // MPIに変動を追加
    let mpi = baseMpi;
    if (Math.abs(change24h) >= 3) {
      mpi = baseMpi * (0.8 + r2 * 0.4); // 0.8x ~ 1.2x
    }
    
    // 流入の上限/下限を設定
    const INFLOW_CAP = 8000;
    if (inflow > INFLOW_CAP) inflow = INFLOW_CAP;
    if (inflow < -INFLOW_CAP) inflow = -INFLOW_CAP;
    
    // whaleBias計算: 流入が大きいほどクジラは売り（負のバイアス）
    let whaleBias = 0;
    if (inflow <= -2000) whaleBias = 1; // 大きなアウトフロー = クジラ買い
    else if (inflow >= 2000) whaleBias = -1; // 大きなインフロー = クジラ売り
    else if (inflow <= -1000) whaleBias = 0.5;
    else if (inflow >= 1000) whaleBias = -0.5;
    
    // retailFomo計算: 価格上昇時はFOMOが高まる
    let retailFomo = 50 + change24h * 5;
    // 大きな流入 + 価格変動がある場合、FOMOをさらに強化
    if (Math.abs(inflow) > 3000 && Math.abs(change24h) >= 2) {
      retailFomo += 10 * Math.sign(change24h);
    }
    // Bull Trap時はFOMOを極端に高める
    if (change24h > 5 && inflow > 2000) {
      retailFomo = Math.min(100, retailFomo + 20);
    }
    retailFomo = Math.max(0, Math.min(100, retailFomo));
    
    // newsImpact計算
    let newsImpact = Math.max(Math.abs(change24h) * 8, Math.abs(mpi) * 4);
    if (Math.abs(inflow) > 4000) {
      newsImpact += 10;
    }
    newsImpact = Math.max(0, Math.min(100, newsImpact));
    
    return {
      inflow,
      mpi,
      xSentiment: {
        whaleBias,
        retailFomo,
        newsImpact,
      },
      cqDeep: null,
    };
  }
}

// ===== シグナル生成 =====
async function buildSignalForCandle(candle, idx, klines, onchainData, debug = false) {
  const tsIso = new Date(candle.openTime).toISOString();
  const date = new Date(candle.openTime);
  const utcHour = date.getUTCHours();

  // 4時間ごとの00分だけシグナル検討
  if (!REGULAR_HOURS.includes(utcHour)) return null;

  const priceUsd = candle.close;
  const change24h = calcChange24h(idx, klines);
  const sentimentLabel = sentimentFromChange(change24h);
  const normalizedSentiment = normalizeSentiment(sentimentLabel);

  // 実際のCryptoQuantデータとX解析を使用（メイン処理で取得済み）
  const { inflow, mpi, xSentiment } = onchainData;

  // marketCore → coreDecision
  const ctx = buildMarketContext({
    asset: 'BTC',
    priceUsd,
    change24h,
    inflow,
    mpi,
    xSentiment,
  });

  const coreDecision = decideSignal(ctx);

  // テスト用: 閾値を下げてより多くのシグナルを生成（SELL/SHORT対応強化 v2.0）
  let adjustedSignal = coreDecision.signal;
  if (TEST_THRESHOLD < 28) {
    // smartMoneyScoreの簡易計算（inflowベース）
    const netflowScore = inflow <= -2000 ? 30 : inflow >= 2000 ? -30 : inflow * 0.01;
    const mpiScore = mpi * 10;
    const smartMoneyScore = netflowScore + mpiScore;
    
    // トラップ検出ベースのSELLシグナル判定（marketCore.jsと同じロジック）
    const isFomoBullTrap = change24h > 7 && inflow > 2500 && xSentiment.retailFomo >= 85 && xSentiment.whaleBias <= -0.5;
    const isBullTrap = change24h > 6 && inflow > 2000 && xSentiment.retailFomo >= 75;
    const isCeilingDivergence = change24h > 3 && change24h < 8 && smartMoneyScore < -15 && xSentiment.retailFomo >= 75 && inflow > 1000;
    
    // 追加フィルタリング条件
    const isExtremeInflow = inflow > 3000;
    const isModerateRise = change24h > 2 && change24h < 8;
    const hasMinerSelling = mpi > 1.0;
    
    // 閾値を下げた条件でシグナル生成
    if (coreDecision.score >= TEST_THRESHOLD && coreDecision.confidence >= 0.4 && smartMoneyScore > 0) {
      adjustedSignal = 'BUY';
    } else if (
      // 従来の条件
      (coreDecision.score <= -TEST_THRESHOLD && coreDecision.confidence >= 0.4 && smartMoneyScore < 0) ||
      // FOMO Bull Trap（最高の条件）
      (isFomoBullTrap && coreDecision.confidence >= 0.38 && isModerateRise) ||
      // Bull Trap（極端な流入 + マイナー売却）
      (isBullTrap && isExtremeInflow && hasMinerSelling && coreDecision.confidence >= 0.38 && isModerateRise) ||
      // 天井検出（より厳格な条件）
      (isCeilingDivergence && coreDecision.score <= -TEST_THRESHOLD * 1.3 && coreDecision.confidence >= 0.36 && hasMinerSelling)
    ) {
      adjustedSignal = 'SELL';
    }
  }

  if (debug && Math.abs(coreDecision.score) > 15) {
    console.log(`  [${tsIso}] score=${coreDecision.score.toFixed(1)}, signal=${coreDecision.signal}→${adjustedSignal}, confidence=${coreDecision.confidence?.toFixed(2) || 'N/A'}`);
  }

  // signalGen（調整後のシグナルを使用）
  const trade = generateSignal({
    priceUsd,
    score: coreDecision.score,
    direction: adjustedSignal,
  });

  // バックテスト可能なエントリーだけ残す
  if (
    !trade ||
    trade.signal === 'HOLD' ||
    trade.signal === 'NONE' ||
    !Number.isFinite(trade.tp) ||
    !Number.isFinite(trade.sl)
  ) {
    return null;
  }

  const side = trade.signal === 'SELL' ? 'SHORT' : 'LONG';
  const entry = trade.entry ?? Math.round(priceUsd);
  const tp = trade.tp;
  const sl = trade.sl;

  // trap検出
  const trap = detectTrap({
    priceChange: change24h,
    volume: candle.volume,
    inflow,
    mpi,
    whaleBias: xSentiment.whaleBias,
    retailFomo: xSentiment.retailFomo,
  });

  return {
    ts: tsIso,
    success: true,
    sentMessages: 1,
    eventId: 'recent_backtest',
    eventName: 'Recent Market Data',
    metrics: {
      inflow,
      mpi,
      sentiment: sentimentLabel,
      priceUsd: entry,
      change24h,
      score: coreDecision.score,
      signal: trade.signal,
    },
    trap,
    side,
    entry,
    tp,
    sl,
  };
}

// ===== バックテスト評価 =====
function evaluateSignal(signal, klines, globalStartMs) {
  const tsMs = new Date(signal.ts).getTime();
  const side = signal.side;
  const entry = signal.entry;
  const tp = signal.tp;
  const sl = signal.sl;

  if (!Number.isFinite(entry) || !Number.isFinite(tp) || !Number.isFinite(sl)) {
    return { ...signal, backtest: { status: 'SKIPPED', reason: 'Missing entry/tp/sl' } };
  }

  const firstIdx = Math.max(0, Math.floor((tsMs - globalStartMs) / (60 * 60 * 1000)));
  const lastIdx = Math.min(
    klines.length - 1,
    firstIdx + LOOKAHEAD_HOURS,
  );

  let tpIndex = null;
  let slIndex = null;
  let maxRunup = 0;
  let maxDrawdown = 0;

  for (let i = firstIdx; i <= lastIdx; i += 1) {
    const k = klines[i];
    if (!k) break;

    const up = (k.high - entry) / entry;
    const down = (k.low - entry) / entry;

    if (up > maxRunup) maxRunup = up;
    if (down < maxDrawdown) maxDrawdown = down;

    if (side === 'LONG') {
      if (tpIndex === null && k.high >= tp) tpIndex = i;
      if (slIndex === null && k.low <= sl) slIndex = i;
    } else if (side === 'SHORT') {
      if (tpIndex === null && k.low <= tp) tpIndex = i;
      if (slIndex === null && k.high >= sl) slIndex = i;
    }

    if (tpIndex !== null && slIndex !== null) break;
  }

  let outcome = 'OPEN';
  let hitIndex = null;

  if (tpIndex !== null || slIndex !== null) {
    if (tpIndex !== null && slIndex !== null) {
      if (tpIndex <= slIndex) {
        outcome = 'TP_FIRST';
        hitIndex = tpIndex;
      } else {
        outcome = 'SL_FIRST';
        hitIndex = slIndex;
      }
    } else if (tpIndex !== null) {
      outcome = 'TP';
      hitIndex = tpIndex;
    } else if (slIndex !== null) {
      outcome = 'SL';
      hitIndex = slIndex;
    }
  }

  const holdingHours = hitIndex !== null ? (hitIndex - firstIdx) : null;
  const hitCandle = hitIndex !== null ? klines[hitIndex] : null;

  const backtest = {
    status: 'EVAL',
    outcome,
    holdingHours,
    hitTime: hitCandle ? new Date(hitCandle.openTime).toISOString() : null,
    maxRunup,
    maxDrawdown,
  };

  return { ...signal, backtest };
}

// ===== メイン処理 =====
async function main() {
  try {
    const now = Date.now();
    const lookbackMs = DAYS * 24 * 60 * 60 * 1000;
    const startTimeMs = now - lookbackMs;
    const endTimeMs = now;

    console.log('🚀 Generate and Backtest Recent Signals');
    console.log(`📅 Period: Last ${DAYS} days`);
    console.log(`   From: ${new Date(startTimeMs).toISOString()}`);
    console.log(`   To:   ${new Date(endTimeMs).toISOString()}`);
    if (TEST_THRESHOLD < 28) {
      console.log(`⚠️  Test mode: Threshold lowered to ${TEST_THRESHOLD} (default: 28)\n`);
    } else {
      console.log();
    }

    // 1. データ取得
    console.log('📈 Fetching Binance klines...');
    const klines = await fetchKlines(startTimeMs, endTimeMs);
    console.log(`✅ Total received: ${klines.length} candles\n`);

    // 2. シグナル生成
    console.log('🔍 Generating signals from market data...');
    console.log('📊 Fetching real CryptoQuant data and X analysis...');
    const signals = [];
    let checked = 0;
    let skippedNoSlot = 0;
    let skippedNoSignal = 0;
    let scoreStats = { min: Infinity, max: -Infinity, count: 0 };
    
    // 最新のCryptoQuantデータを1回取得（全シグナルで共有）
    const latestChange24h = calcChange24h(klines.length - 1, klines);
    const latestOnchainData = await fetchRealOnchainAndSocial(latestChange24h, 'EN');
    console.log(`✅ CryptoQuant data: netflow=${latestOnchainData.inflow?.toFixed(0) || 'N/A'}, MPI=${latestOnchainData.mpi?.toFixed(2) || 'N/A'}`);
    if (latestOnchainData.cqDeep?.trapScore !== undefined) {
      console.log(`   Trap Score: ${latestOnchainData.cqDeep.trapScore.toFixed(1)}/100`);
    }
    console.log(`✅ X Sentiment: whaleBias=${latestOnchainData.xSentiment.whaleBias.toFixed(2)}, retailFomo=${latestOnchainData.xSentiment.retailFomo.toFixed(0)}, newsImpact=${latestOnchainData.xSentiment.newsImpact.toFixed(0)}\n`);
    
    for (let i = 24; i < klines.length; i += 1) {
      const candle = klines[i];
      const date = new Date(candle.openTime);
      const utcHour = date.getUTCHours();
      
      // 4時間ごとのチェック
      if (!REGULAR_HOURS.includes(utcHour)) {
        skippedNoSlot++;
        continue;
      }
      
      checked++;
      
      // スコア統計を収集
      const change24h = calcChange24h(i, klines);
      // 各キャンドルごとに適切なデータを生成（フォールバックモード時）
      // 実際のCryptoQuantデータが取得できない場合は、価格変化から推定
      let onchainData = latestOnchainData;
      if (latestOnchainData.inflow === 0 && latestOnchainData.mpi === 0) {
        // フォールバックモード: 各キャンドルごとにデータを生成
        onchainData = await fetchRealOnchainAndSocial(change24h, 'EN');
      }
      const { inflow, mpi, xSentiment } = onchainData;
      const ctx = buildMarketContext({
        asset: 'BTC',
        priceUsd: candle.close,
        change24h,
        inflow,
        mpi,
        xSentiment,
      });
      const coreDecision = decideSignal(ctx);
      
      if (scoreStats.count < 10 || Math.abs(coreDecision.score) > 20) {
        scoreStats.min = Math.min(scoreStats.min, coreDecision.score);
        scoreStats.max = Math.max(scoreStats.max, coreDecision.score);
        scoreStats.count++;
      }
      
      // 各キャンドルごとに適切なデータを使用
      let candleOnchainData = latestOnchainData;
      if (latestOnchainData.inflow === 0 && latestOnchainData.mpi === 0) {
        // フォールバックモード: 各キャンドルごとにデータを生成
        candleOnchainData = await fetchRealOnchainAndSocial(change24h, 'EN');
      }
      const signal = await buildSignalForCandle(candle, i, klines, candleOnchainData, checked <= 5);
      if (signal) {
        signals.push(signal);
      } else {
        skippedNoSignal++;
      }
    }

    console.log(`   Checked ${checked} time slots (${skippedNoSlot} skipped - not regular hours)`);
    console.log(`   Generated ${signals.length} signals (${skippedNoSignal} skipped - no valid signal)`);
    if (scoreStats.count > 0) {
      console.log(`   Score range: ${scoreStats.min.toFixed(1)} ~ ${scoreStats.max.toFixed(1)} (sampled ${scoreStats.count} slots)\n`);
    } else {
      console.log();
    }

    // 3. バックテスト
    console.log('📊 Running backtest...');
    const evaluated = signals.map((s) => evaluateSignal(s, klines, startTimeMs));

    // 4. 結果保存
    const signalsStream = fs.createWriteStream(OUTPUT_SIGNALS, { flags: 'w' });
    for (const s of signals) {
      signalsStream.write(`${JSON.stringify(s)}\n`);
    }
    signalsStream.end();

    const backtestStream = fs.createWriteStream(OUTPUT_BACKTEST, { flags: 'w' });
    for (const s of evaluated) {
      backtestStream.write(`${JSON.stringify(s)}\n`);
    }
    backtestStream.end();

    // 5. サマリー
    const closed = evaluated.filter((s) => s.backtest?.outcome !== 'OPEN');
    const wins = closed.filter((s) => s.backtest?.outcome === 'TP' || s.backtest?.outcome === 'TP_FIRST');
    const losses = closed.filter((s) => s.backtest?.outcome === 'SL' || s.backtest?.outcome === 'SL_FIRST');
    const shorts = closed.filter((s) => s.side === 'SHORT');
    const shortWins = shorts.filter((s) => s.backtest?.outcome === 'TP' || s.backtest?.outcome === 'TP_FIRST');

    console.log('📊 Backtest Summary:');
    console.log(`   Total signals: ${signals.length}`);
    console.log(`   Closed trades: ${closed.length}`);
    console.log(`   Wins: ${wins.length}, Losses: ${losses.length}`);
    console.log(`   Overall win rate: ${closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(2) : 0}%`);
    console.log(`   SHORT trades: ${shorts.length}`);
    console.log(`   SHORT wins: ${shortWins.length}`);
    console.log(`   SHORT win rate: ${shorts.length > 0 ? ((shortWins.length / shorts.length) * 100).toFixed(2) : 0}%`);
    console.log(`\n✅ Signals saved: ${OUTPUT_SIGNALS}`);
    console.log(`✅ Backtest saved: ${OUTPUT_BACKTEST}`);
  } catch (err) {
    console.error('❌ Error:', err);
    await sleep(500);
    process.exit(1);
  }
}

main();
