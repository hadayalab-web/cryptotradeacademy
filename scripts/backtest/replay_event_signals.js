// scripts/backtest/replay_event_signals.js
//
// Binance BTCUSDT 1h足だけを使って、各イベント期間に
// marketCore + signalGen + trapDetector を回し、
// 「その期間にボットが動いていたら出していたはずのシグナル」を
// data/signals_log.jsonl に書き出すオフライン・リプレイスクリプト。
//
// 実行例:
//   node scripts/backtest/replay_event_signals.js
//
// ※ 実行すると data/signals_log.jsonl を上書きします。

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

// ========= 設定 =========

const OUTPUT_PATH = path.join(__dirname, '..', '..', 'data', 'signals_log.jsonl');

// Binance Spot REST
const BINANCE_BASE_URL = 'https://api.binance.com';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';

// 24h 変化率算出用のウィンドウ
const LOOKBACK_HOURS_24 = 24;

// 実際に「シグナル検討」を行うのは 4時間ごとの足だけ
const REGULAR_HOURS = [0, 4, 8, 12, 16, 20];

// ========= バックテスト対象イベント定義 =========
//
// run_events_backtest.js と同じイベントをここでも使う。
// 必要に応じて期間は調整してOK。

const EVENTS = [
  {
    id: 'us_election_rally',
    event: 'US Election Rally',
    period: '2024-11-05 ~ 2024-11-15',
    start: '2024-11-05T00:00:00Z',
    end: '2024-11-15T23:59:59Z',
  },
  {
    id: 'frb_rate_shock',
    event: 'FRB Rate Shock',
    period: '2024-08-01 ~ 2024-08-15',
    start: '2024-08-01T00:00:00Z',
    end: '2024-08-15T23:59:59Z',
  },
  {
    id: 'summer_doldrums',
    event: 'Summer Doldrums Range',
    period: '2024-06-15 ~ 2024-07-31',
    start: '2024-06-15T00:00:00Z',
    end: '2024-07-31T23:59:59Z',
  },
  {
    id: 'btc_etf_approval',
    event: 'Bitcoin ETF Approval',
    period: '2024-01-10 ~ 2024-01-25',
    start: '2024-01-10T00:00:00Z',
    end: '2024-01-25T23:59:59Z',
  },
  {
    id: 'halving_anticipation',
    event: 'Halving Anticipation',
    period: '2024-03-15 ~ 2024-04-20',
    start: '2024-03-15T00:00:00Z',
    end: '2024-04-20T23:59:59Z',
  },
  {
    id: 'svb_contagion_panic',
    event: 'SVB Contagion Panic',
    period: '2023-03-10 ~ 2023-03-20',
    start: '2023-03-10T00:00:00Z',
    end: '2023-03-20T23:59:59Z',
  },
  {
    id: 'inst_accumulation',
    event: 'Institutional Accumulation',
    period: '2024-09-01 ~ 2024-10-31',
    start: '2024-09-01T00:00:00Z',
    end: '2024-10-31T23:59:59Z',
  },
  {
    id: 'fomc_volatility',
    event: 'FOMC Decision Volatility',
    period: '2024-12-18',
    start: '2024-12-18T00:00:00Z',
    end: '2024-12-18T23:59:59Z',
  },
  {
    id: 'mtgox_payout',
    event: 'Mt. Gox Payout Selling Pressure',
    period: '2025-01-10 ~ 2025-01-25',
    start: '2025-01-10T00:00:00Z',
    end: '2025-01-25T23:59:59Z',
  },
  {
    id: 'trump_crypto_order',
    event: 'Trump Crypto Order FOMO',
    period: '2025-01-18 ~ 2025-01-25',
    start: '2025-01-18T00:00:00Z',
    end: '2025-01-25T23:59:59Z',
  },
];

// ========= ユーティリティ =========

function toMs(ts) {
  if (typeof ts === 'number') {
    // 秒かミリ秒かを雑に判定
    return ts < 1e12 ? ts * 1000 : ts;
  }
  const ms = Date.parse(ts);
  if (!Number.isNaN(ms)) return ms;
  throw new Error(`Unsupported timestamp: ${ts}`);
}

// startTimeMs〜endTimeMs の範囲で、1h足 klines を1000本ごとに取得
async function fetchKlinesChunk(startTimeMs, endTimeMs, limit = 1000) {
  const params = new URLSearchParams({
    symbol: SYMBOL,
    interval: INTERVAL,
    startTime: String(startTimeMs),
    endTime: String(endTimeMs),
    limit: String(limit),
  });

  const url = `${BINANCE_BASE_URL}/api/v3/klines?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Binance error ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  // [ openTime, open, high, low, close, volume, ... ]
  return data.map((c) => ({
    openTime: c[0],
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5]),
  }));
}

// startMs〜endMs まで 1h 足をすべて取得（1000本制限を跨いで分割）
async function fetchKlinesRange(startMs, endMs) {
  const candles = [];
  let cursor = startMs;
  const ONE_HOUR = 60 * 60 * 1000;

  while (cursor < endMs) {
    // eslint-disable-next-line no-await-in-loop
    const chunk = await fetchKlinesChunk(cursor, endMs);
    if (chunk.length === 0) break;

    candles.push(...chunk);

    const last = chunk[chunk.length - 1];
    const next = last.openTime + ONE_HOUR;

    if (next <= cursor) break;
    cursor = next;

    if (chunk.length < 1000) break;
  }

  candles.sort((a, b) => a.openTime - b.openTime);
  return candles;
}

// 24h変化率を price series から計算
function calcChange24h(idx, klines) {
  if (idx === 0) return 0;

  const current = klines[idx].close;
  const lookbackIdx = Math.max(0, idx - LOOKBACK_HOURS_24);
  const base = klines[lookbackIdx].close || current;
  if (!base) return 0;

  return ((current - base) / base) * 100;
}

// change24h から簡易 Fear & Greed ラベル
function sentimentFromChange(change24h) {
  if (change24h <= -7) return 'Extreme Fear';
  if (change24h <= -2) return 'Fear';
  if (change24h < 2) return 'Neutral';
  if (change24h < 7) return 'Greed';
  return 'Extreme Greed';
}

// change24h から擬似 inflow / mpi / X sentiment を生成（オフライン用近似）
// 「きれいな相関」だけでなく、あえてダイバージェンスやトラップっぽい異常も注入する。
function synthesizeOnchainAndSocial(change24h) {
  // 1. ベース値（価格と素直に相関）
  const baseInflow = Math.round(change24h * 400); // 5% → 2000 くらい
  const baseMpi = change24h * 0.2;

  let inflow = baseInflow;
  let mpi = baseMpi;

  // 乱数（バックテスト用途なので簡易でOK）
  const r1 = Math.random();
  const r2 = Math.random();
  const r3 = Math.random();

  // 2. ダイバージェンス注入
  // - 価格は大きく上昇しているのに inflow がマイナス（売り圧）
  // - 価格は大きく下落しているのに inflow がプラス（買い圧）
  if (Math.abs(change24h) >= 2 && r1 < 0.12) {
    const amp = 1.2 + r2 * 0.8; // 1.2〜2.0倍
    inflow = -Math.round(baseInflow * amp || (change24h * 400 * amp));
    mpi = baseMpi * (0.5 + r3); // 0.5〜1.5倍
  }

  // 3. トラップ注入
  // - 価格はほぼ横ばいだが、巨大な売り/買いフローだけ走る
  if (Math.abs(change24h) < 1 && r2 < 0.06) {
    const sign = r3 < 0.5 ? -1 : 1; // -1: 売り圧トラップ, 1: 買い圧トラップ
    const baseMag = 3000 + Math.abs(baseInflow) * 2; // 3000〜程度
    inflow = sign * baseMag;
    mpi = sign * Math.max(1.5, Math.abs(baseMpi) + 1);
  }

  // 4. 安全なクリッピング
  const INFLOW_CAP = 10000;
  if (inflow > INFLOW_CAP) inflow = INFLOW_CAP;
  if (inflow < -INFLOW_CAP) inflow = -INFLOW_CAP;

  // 5. X 情報（whaleBias / retailFomo / newsImpact）
  let whaleBias = 0;
  if (inflow <= -2000) whaleBias = 1; // 強い買い圧（クジラ買い）
  else if (inflow >= 2000) whaleBias = -1; // 強い売り圧（クジラ売り）

  // retailFomo は価格変化＋トラップっぽい状況で増幅
  let retailFomo = 50 + change24h * 5; // ベース
  if (Math.abs(inflow) > 3000 && Math.abs(change24h) >= 2) {
    retailFomo += 10 * Math.sign(change24h); // 上昇＋大きなフロー → FOMO
  }
  retailFomo = Math.max(0, Math.min(100, retailFomo));

  // newsImpact は価格変化と mpi の絶対値をミックス
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
  };
}

// ========= シグナル生成（1本の足） =========

function buildSignalForCandle(ev, candle, idx, klines) {
  const tsIso = new Date(candle.openTime).toISOString();
  const date = new Date(candle.openTime);
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();

  // 4時間おきの 00分 だけシグナル検討
  const isRegularSlot = REGULAR_HOURS.includes(utcHour) && utcMinute === 0;
  if (!isRegularSlot) return null;

  const priceUsd = candle.close;
  const change24h = calcChange24h(idx, klines);
  const sentimentLabel = sentimentFromChange(change24h);
  const normalizedSentiment = normalizeSentiment(sentimentLabel);

  const { inflow, mpi, xSentiment } = synthesizeOnchainAndSocial(change24h);

  // marketCore → coreDecision
  const ctx = buildMarketContext({
    asset: 'BTC',
    priceUsd,
    change24h,
    inflow,
    mpi,
    xSentiment,
  });

  const coreDecision = decideSignal(ctx); // { score, regime, signal, ... }

  // cron.js と同じ v1 仕様: 1オブジェクト引数で generateSignal を呼ぶ
  const trade = generateSignal({
    priceUsd,
    score: coreDecision.score,
    direction: coreDecision.signal, // 'BUY' | 'SELL' | 'NONE'
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

  // cron.js と同じ引数構造で trap 検出
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
    eventId: ev.id,
    eventName: ev.event,
    metrics: {
      inflow,
      mpi,
      sentiment: normalizedSentiment,
      priceUsd,
      change24h,
      score: coreDecision.score,
      signal: trade.signal, // 最終シグナル
    },
    trap,
    side,
    entry,
    tp,
    sl,
  };
}

// ========= イベント単位でのリプレイ =========

async function replayEvent(ev) {
  const startMs = toMs(ev.start);
  const endMs = toMs(ev.end);

  // 24h 変化率計算のため、開始前 24h から取得しておく
  const marginMs = 24 * 60 * 60 * 1000;
  const klines = await fetchKlinesRange(startMs - marginMs, endMs);

  if (klines.length === 0) {
    console.warn(`⚠️ No klines for event ${ev.id}`);
    return [];
  }

  const signals = [];

  for (let i = 0; i < klines.length; i += 1) {
    const k = klines[i];
    if (k.openTime < startMs || k.openTime > endMs) continue;

    const s = buildSignalForCandle(ev, k, i, klines);
    if (s) {
      signals.push(s);
      console.log(
        `[${ev.id}] ts=${s.ts} side=${s.side} entry=${s.entry} tp=${s.tp} sl=${s.sl}`,
      );
    }
  }

  console.log(
    `✅ Event ${ev.event} (${ev.period}) generated ${signals.length} signals.`,
  );

  return signals;
}

// ========= エントリーポイント =========

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const outStream = fs.createWriteStream(OUTPUT_PATH, { flags: 'w' });

  let total = 0;

  for (const ev of EVENTS) {
    console.log(
      `===== Replaying event: ${ev.event} (${ev.period}) =====`,
    );
    // eslint-disable-next-line no-await-in-loop
    const signals = await replayEvent(ev);
    for (const s of signals) {
      outStream.write(`${JSON.stringify(s)}\n`);
    }
    total += signals.length;
  }

  outStream.end();
  console.log(
    `🎯 Replay complete. Wrote ${total} signals to ${OUTPUT_PATH}`,
  );
}

main().catch((err) => {
  console.error('❌ Replay error:', err);
  process.exit(1);
});
