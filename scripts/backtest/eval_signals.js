// scripts/backtest/eval_signals.js
// Binance BTCUSDT 1h足で signals_log.jsonl を検証する簡易バックテスト

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 設定 =====
const BINANCE_BASE_URL = 'https://api.binance.com';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';

// シグナルから「何時間先」まで見るか（例: 7日 = 7 * 24）
const LOOKAHEAD_HOURS = 7 * 24;

// ログ入出力ファイル（CLI から上書き可能）
const defaultSignalsPath = path.join(__dirname, '..', '..', 'data', 'signals_log.jsonl');
const defaultOutputPath = path.join(__dirname, '..', '..', 'data', 'signals_backtest.jsonl');

const argv = process.argv.slice(2);
const inputArg = argv.find((a) => a.startsWith('--input='));
const outputArg = argv.find((a) => a.startsWith('--output='));

const SIGNALS_LOG_PATH = inputArg
  ? path.resolve(inputArg.split('=')[1])
  : defaultSignalsPath;

const OUTPUT_PATH = outputArg
  ? path.resolve(outputArg.split('=')[1])
  : defaultOutputPath;


// ===== ユーティリティ =====
function toMs(ts) {
  if (typeof ts === 'number') {
    // 秒またはミリ秒の両対応
    return ts < 1e12 ? ts * 1000 : ts;
  }
  if (typeof ts === 'string') {
    const ms = Date.parse(ts);
    if (!Number.isNaN(ms)) return ms;
  }
  throw new Error(`Unsupported timestamp format: ${ts}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== 1. signals_log.jsonl を読み込み =====
function loadSignals() {
  if (!fs.existsSync(SIGNALS_LOG_PATH)) {
    throw new Error(`Signals log not found: ${SIGNALS_LOG_PATH}`);
  }

  const raw = fs.readFileSync(SIGNALS_LOG_PATH, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);

  const signals = lines.map((line, idx) => {
    try {
      const obj = JSON.parse(line);
      return { ...obj, __line: idx + 1 };
    } catch (e) {
      console.warn(`⚠️ JSON parse error at line ${idx + 1}: ${e.message}`);
      return null;
    }
  }).filter(Boolean);

  if (signals.length === 0) {
    throw new Error('No valid signals found in signals_log.jsonl');
  }

  return signals;
}

// ===== 2. Binance から 1h足を取得 =====
async function fetchKlines(startTimeMs, endTimeMs) {
  // Binanceのklinesエンドポイントは最大1000本までなので注意
  // https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=...&endTime=...
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

  // [ openTime, open, high, low, close, volume, ... ] の配列をパース
  return data.map((c) => ({
    openTime: c[0],           // ms
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// ===== 3. シグナル群に必要な期間の1h足を一括取得 =====
async function loadOhlcvForSignals(signals) {
  const times = signals.map((s, idx) => {
    const rawTs = s.ts ?? s.timestamp ?? s.time ?? s.createdAt;
    if (!rawTs) {
      throw new Error(
        `Signal #${idx + 1} has no timestamp field: ` +
        JSON.stringify(s)
      );
    }
    return toMs(rawTs);
  });

  const minTs = Math.min(...times);
  const maxTs = Math.max(...times);

  const startTimeMs = minTs; // 必要なら少し前にマージンを取ってもよい
  const endTimeMs = maxTs + LOOKAHEAD_HOURS * 60 * 60 * 1000;

  console.log('📈 Fetching Binance klines...');
  console.log(' symbol :', SYMBOL);
  console.log(' interval :', INTERVAL);
  console.log(' from :', new Date(startTimeMs).toISOString());
  console.log(' to :', new Date(endTimeMs).toISOString());

  const klines = await fetchKlines(startTimeMs, endTimeMs);

  console.log(` received : ${klines.length} candles`);

  if (klines.length === 1000) {
    console.warn('⚠️ Got 1000 candles (max). If your time range > ~41 days, split requests manually.');
  }

  return { klines, startTimeMs };
}

// ===== 4. 各シグナルを評価 =====
function evaluateSignal(signal, klines, globalStartMs) {
  const tsMs = toMs(signal.ts ?? signal.timestamp ?? signal.time ?? signal.createdAt);

  // side があれば優先、なければ metrics.signal から推定
  const side = signal.side ?? (signal.metrics?.signal === 'SELL' ? 'SHORT' : 'LONG');

  const entry = Number(signal.entry ?? signal.metrics?.priceUsd);
  const tp = Number(signal.tp);
  const sl = Number(signal.sl);

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

// ===== 5. メイン処理 =====
async function main() {
  try {
    const signals = loadSignals();
    console.log(`✅ Loaded ${signals.length} signals from ${SIGNALS_LOG_PATH}`);

    const { klines, startTimeMs } = await loadOhlcvForSignals(signals);

    const evaluated = signals.map((s) => evaluateSignal(s, klines, startTimeMs));

    const outStream = fs.createWriteStream(OUTPUT_PATH, { flags: 'w' });
    for (const s of evaluated) {
      outStream.write(`${JSON.stringify(s)}\n`);
    }
    outStream.end();

    console.log(`✅ Wrote backtest results to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('❌ Backtest error:', err);
    // 少し待ってから終了（ログフラッシュ対策）
    await sleep(500);
    process.exit(1);
  }
}

main();
