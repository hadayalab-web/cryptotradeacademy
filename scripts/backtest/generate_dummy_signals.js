// scripts/backtest/generate_dummy_signals.js
//
// Binance の過去1h足から、ダミーのシグナル履歴を生成して
// data/signals_log_dummy.jsonl に書き出すスクリプト

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 設定 =====

// デフォルト: 50本・過去90日
const DEFAULT_COUNT = 50;
const DEFAULT_DAYS = 90;

// CLI から上書き可能: node ... --count=100 --days=180
const args = process.argv.slice(2);
const countArg = args.find((a) => a.startsWith('--count='));
const daysArg = args.find((a) => a.startsWith('--days='));

const SIGNAL_COUNT = countArg ? Number(countArg.split('=')[1]) : DEFAULT_COUNT;
const LOOKBACK_DAYS = daysArg ? Number(daysArg.split('=')[1]) : DEFAULT_DAYS;

const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';
const BINANCE_BASE_URL = 'https://api.binance.com';

const OUTPUT_PATH = path.join(__dirname, '..', '..', 'data', 'signals_log_dummy.jsonl');

// TP/SL 設定（LONG のとき: +3.5%/-2%、SHORT のときは逆）
const TP_PCT = 0.035;
const SL_PCT = 0.02;

// ===== ユーティリティ =====

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toMs(ts) {
  if (typeof ts === 'number') {
    return ts < 1e12 ? ts * 1000 : ts;
  }
  if (typeof ts === 'string') {
    const ms = Date.parse(ts);
    if (!Number.isNaN(ms)) return ms;
  }
  throw new Error(`Unsupported timestamp format: ${ts}`);
}

// 指定した時刻を含む1本の 1h 足を取得（openTime に最も近い足を返す）
async function fetchOneKlineAt(timestampMs) {
  // その1本の前後2時間くらいをまとめて取って、最も近い openTime を使う
  const windowHours = 3;
  const startTimeMs = timestampMs - windowHours * 60 * 60 * 1000;
  const endTimeMs = timestampMs + windowHours * 60 * 60 * 1000;

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
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No klines returned from Binance');
  }

  // openTime が timestampMs に最も近い足を選ぶ
  let best = null;
  let bestDiff = Infinity;
  for (const c of data) {
    const openTime = c[0]; // ms
    const diff = Math.abs(openTime - timestampMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  if (!best) throw new Error('No suitable kline found');

  const [openTime, open, high, low, close, volume] = best;
  return {
    openTime,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  };
}

// ===== ダミーシグナル生成ロジック =====

async function generateDummySignals() {
  const now = Date.now();
  const lookbackMs = LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const earliest = now - lookbackMs;

  const signals = [];

  console.log('===== Generating dummy signals =====');
  console.log(`Count  : ${SIGNAL_COUNT}`);
  console.log(`Lookback days: ${LOOKBACK_DAYS}`);
  console.log(`Output : ${OUTPUT_PATH}`);

  for (let i = 0; i < SIGNAL_COUNT; i += 1) {
    // 過去 LOOKBACK_DAYS の中からランダムな時刻を選ぶ
    const tsMs = Math.floor(randBetween(earliest, now));
    const tsIso = new Date(tsMs).toISOString();

    // 該当時刻付近の1h足から価格を取得
    let kline;
    try {
      kline = await fetchOneKlineAt(tsMs);
    } catch (err) {
      console.warn(`⚠️ Kline fetch failed for signal #${i + 1}: ${err.message}. Skipping.`);
      continue;
    }

    const price = kline.close; // その足のクローズをエントリー基準にする

    // side をランダムに選ぶ（LONG/SHORT 半々）
    const side = choice(['LONG', 'SHORT']);

    let entry = price;
    let tp;
    let sl;

    if (side === 'LONG') {
      tp = entry * (1 + TP_PCT);
      sl = entry * (1 - SL_PCT);
    } else {
      // SHORT: 下方向が TP, 上方向が SL
      tp = entry * (1 - TP_PCT);
      sl = entry * (1 + SL_PCT);
    }

    // metrics / trap は最小限の形で埋める
    const metrics = {
      inflow: 0,
      mpi: 0,
      sentiment: 'Unknown',
      priceUsd: entry,
      change24h: 0,
      score: 50,
      signal: side === 'LONG' ? 'BUY' : 'SELL',
    };

    const trap = { isTrap: false };

    const logEntry = {
      ts: tsIso,
      success: true,
      sentMessages: 1,
      metrics,
      trap,
      side,
      entry,
      tp,
      sl,
    };

    signals.push(logEntry);

    console.log(
      `#${signals.length} ts=${tsIso} side=${side} entry=${entry.toFixed(
        2,
      )} tp=${tp.toFixed(2)} sl=${sl.toFixed(2)}`,
    );
  }

  // 書き出し
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const outStream = fs.createWriteStream(OUTPUT_PATH, { flags: 'w' });
  for (const s of signals) {
    outStream.write(`${JSON.stringify(s)}\n`);
  }
  outStream.end();

  console.log(`✅ Wrote ${signals.length} dummy signals to ${OUTPUT_PATH}`);
}

// ===== エントリーポイント =====

generateDummySignals().catch((err) => {
  console.error('❌ Dummy generation error:', err);
  process.exit(1);
});
