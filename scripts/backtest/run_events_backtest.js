// scripts/backtest/run_events_backtest.js
//
// signals_log.jsonl と Binance BTCUSDT 1h 足を使って
// 10〜12イベント分のバックテストサマリ JSON を出力するスクリプト。
// 実行例:
//   node scripts/backtest/run_events_backtest.js > data/events_backtest_summary.json
//
// 前提: Node.js 18+ （fetch が標準搭載）

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========= 設定 =========

// signals_log.jsonl のパス
const SIGNALS_LOG_PATH = path.join(__dirname, '..', '..', 'data', 'signals_log.jsonl');

// Binance Spot REST
const BINANCE_BASE_URL = 'https://api.binance.com';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';

// シグナルからどこまで先を見るか（7日 = 168時間）
const LOOKAHEAD_HOURS = 7 * 24;

// 「大きな値動き」とみなす閾値 X (= 7%)
const BIG_MOVE_PCT = 0.07;

// 「清算級スパイク」Z のベース (8%) と上限 (10%)
const LIQUIDATION_BASE = 0.08;
const LIQUIDATION_MAX = 0.10;

// False Negative 判定で「シグナルが出ていてほしい」直前ウィンドウ（時間）
const FN_LOOKBACK_HOURS = 6;

// ========= バックテスト対象イベント定義 =========
//
// 必要に応じて start/end を編集してください。
// ここでは UTC 日付ベースでおおまかに定義しています。

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

  // ここから 2025 オプション（期間は仮置きなので調整推奨）
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
  // 必要なら Stablecoin Shock などを追加
];

// ========= ユーティリティ =========

function toMs(ts) {
  if (typeof ts === 'number') {
    return ts < 1e12 ? ts * 1000 : ts;
  }
  const ms = Date.parse(ts);
  if (!Number.isNaN(ms)) return ms;
  throw new Error(`Unsupported timestamp: ${ts}`);
}

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
    const chunk = await fetchKlinesChunk(cursor, endMs);
    if (chunk.length === 0) break;
    candles.push(...chunk);
    const last = chunk[chunk.length - 1];
    const next = last.openTime + ONE_HOUR;
    if (next <= cursor) break;
    cursor = next;
    if (chunk.length < 1000) break;
  }

  // openTime 昇順でソート
  candles.sort((a, b) => a.openTime - b.openTime);
  return candles;
}

// signals_log.jsonl を全部読む
function loadAllSignals() {
  if (!fs.existsSync(SIGNALS_LOG_PATH)) {
    throw new Error(`Signals log not found: ${SIGNALS_LOG_PATH}`);
  }
  const raw = fs.readFileSync(SIGNALS_LOG_PATH, 'utf8');
  return raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((line, idx) => {
      try {
        const obj = JSON.parse(line);
        return { ...obj, __line: idx + 1 };
      } catch (e) {
        console.warn(`JSON parse error at line ${idx + 1}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

// ts がイベント期間中かどうか
function inEventRange(tsMs, ev) {
  const s = toMs(ev.start);
  const e = toMs(ev.end);
  return tsMs >= s && tsMs <= e;
}

// そのシグナルに対する side/entry/tp/sl を決定
function getTradeParams(signal) {
  const side =
    signal.side ??
    (signal.metrics?.signal === 'SELL' ? 'SHORT' : 'LONG');

  const entry =
    typeof signal.entry === 'number'
      ? signal.entry
      : Number(signal.metrics?.priceUsd);

  const tp = typeof signal.tp === 'number' ? signal.tp : NaN;
  const sl = typeof signal.sl === 'number' ? signal.sl : NaN;

  if (!Number.isFinite(entry) || !Number.isFinite(tp) || !Number.isFinite(sl)) {
    return null;
  }
  return { side, entry, tp, sl };
}

// Z = 8〜10% を change24h から動的決定
function getDynamicLiquidationThresholdPct(signal) {
  const change24h = Number(signal.metrics?.change24h ?? 0); // 単位: %
  const absCh = Math.abs(change24h);
  // |change24h| <= 7% -> 8%
  // |change24h| >= 10% -> 10%
  const t = Math.min(1, Math.max(0, (absCh - 7) / 3));
  return LIQUIDATION_BASE + (LIQUIDATION_MAX - LIQUIDATION_BASE) * t;
}

// ========= シグナル1件の評価 =========

function evaluateSignal(signal, klines, startTimeMs) {
  const tsMs = toMs(
    signal.ts ?? signal.timestamp ?? signal.time ?? signal.createdAt,
  );

  const trade = getTradeParams(signal);
  if (!trade) {
    return {
      ...signal,
      backtest: { status: 'SKIPPED', reason: 'Missing entry/tp/sl' },
    };
  }

  const { side, entry, tp, sl } = trade;

  // シグナルに最も近い足のインデックス
  const ONE_HOUR = 60 * 60 * 1000;
  const firstIdx = Math.max(
    0,
    Math.floor((tsMs - startTimeMs) / ONE_HOUR),
  );
  const lastIdx = Math.min(
    klines.length - 1,
    firstIdx + LOOKAHEAD_HOURS,
  );

  let tpIndex = null;
  let slIndex = null;
  let maxRunup = 0;
  let maxDrawdown = 0;

  // Trap 関連
  const isTrap = !!(signal.trap && signal.trap.isTrap);
  const liqThreshold = getDynamicLiquidationThresholdPct(signal);
  let liqSpikeIndex = null;

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
      if (isTrap && liqSpikeIndex === null) {
        // ロングにとっての清算級: down が -Z% 以下
        if (down <= -liqThreshold) liqSpikeIndex = i;
      }
    } else if (side === 'SHORT') {
      if (tpIndex === null && k.low <= tp) tpIndex = i;
      if (slIndex === null && k.high >= sl) slIndex = i;
      if (isTrap && liqSpikeIndex === null) {
        // ショートにとっての清算級: up が +Z% 以上
        if (up >= liqThreshold) liqSpikeIndex = i;
      }
    }

    if (tpIndex !== null && slIndex !== null && liqSpikeIndex !== null) {
      break;
    }
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

  const holdingHours = hitIndex !== null ? hitIndex - firstIdx : null;
  const hitCandle = hitIndex !== null ? klines[hitIndex] : null;

  let trapLeadMinutes = null;
  if (isTrap && liqSpikeIndex !== null) {
    const diffIdx = liqSpikeIndex - firstIdx;
    trapLeadMinutes = diffIdx * 60;
  }

  const backtest = {
    status: 'EVAL',
    outcome,
    holdingHours,
    hitTime: hitCandle
      ? new Date(hitCandle.openTime).toISOString()
      : null,
    maxRunup,
    maxDrawdown,
    trapLeadMinutes,
  };

  return { ...signal, backtest };
}

// ========= False Negative（大きな値動きなのにシグナル無し）カウント =========
//
// シンプルな定義:
// - 各 1h 足について、直前 24h の値幅が BIG_MOVE_PCT 以上
// - その足の開始時刻から過去 FN_LOOKBACK_HOURS にシグナルが1本も無ければ「FN 1件」

function countFalseNegatives(klines, signalTsListMs) {
  if (klines.length === 0) return 0;
  const ONE_HOUR = 60 * 60 * 1000;
  const sigSet = new Set(signalTsListMs.map((t) => Math.floor(t / ONE_HOUR)));

  let fn = 0;

  for (let i = 0; i < klines.length; i += 1) {
    const windowStartIdx = Math.max(0, i - 24);
    let high = -Infinity;
    let low = Infinity;
    for (let j = windowStartIdx; j <= i; j += 1) {
      if (klines[j].high > high) high = klines[j].high;
      if (klines[j].low < low) low = klines[j].low;
    }
    const base = klines[i].open || klines[i].close;
    if (!base) continue;
    const moveUp = (high - base) / base;
    const moveDown = (low - base) / base;
    const bigMove =
      Math.abs(moveUp) >= BIG_MOVE_PCT ||
      Math.abs(moveDown) >= BIG_MOVE_PCT;
    if (!bigMove) continue;

    // 直前 FN_LOOKBACK_HOURS にシグナルがあるか
    const bucket = Math.floor(klines[i].openTime / ONE_HOUR);
    let hasSignal = false;
    for (let h = 0; h <= FN_LOOKBACK_HOURS; h += 1) {
      if (sigSet.has(bucket - h)) {
        hasSignal = true;
        break;
      }
    }
    if (!hasSignal) fn += 1;
  }

  return fn;
}

// ========= イベント単位で集計 =========

async function runForEvent(ev, allSignals) {
  const startMs = toMs(ev.start);
  const endMs = toMs(ev.end);

  const eventSignals = allSignals.filter((s) => {
    const tsMs = toMs(
      s.ts ?? s.timestamp ?? s.time ?? s.createdAt,
    );
    return inEventRange(tsMs, ev);
  });

  if (eventSignals.length === 0) {
    return {
      event: ev.event,
      period: ev.period,
      signals_tested: 0,
      accuracy: 'n/a',
      false_breakouts_detected: 0,
      trap_alerts: 0,
      liquidation_warnings_lead_time_min: null,
      true_positives: 0,
      false_positives: 0,
      false_negatives: 0,
    };
  }

  // イベント期間 + 先7日ぶんの klines
  const klines = await fetchKlinesRange(startMs, endMs + LOOKAHEAD_HOURS * 60 * 60 * 1000);
  if (klines.length === 0) {
    throw new Error(`No klines for event ${ev.id}`);
  }
  const globalStartMs = klines[0].openTime;

  const evaluated = eventSignals.map((s) =>
    evaluateSignal(s, klines, globalStartMs),
  );

  let tpCount = 0;
  let fpCount = 0;
  let openCount = 0;
  let trapAlerts = 0;
  const trapLeadTimes = [];

  for (const row of evaluated) {
    const bt = row.backtest;
    if (!bt || bt.status !== 'EVAL') continue;

    const oc = bt.outcome;
    if (oc === 'TP' || oc === 'TP_FIRST') tpCount += 1;
    else if (oc === 'SL' || oc === 'SL_FIRST') fpCount += 1;
    else if (oc === 'OPEN') openCount += 1;

    if (row.trap && row.trap.isTrap) {
      trapAlerts += 1;
      if (
        typeof bt.trapLeadMinutes === 'number' &&
        bt.trapLeadMinutes >= 0
      ) {
        trapLeadTimes.push(bt.trapLeadMinutes);
      }
    }
  }

  const signalsTested = evaluated.filter(
    (r) => r.backtest && r.backtest.status === 'EVAL',
  ).length;

  const closedTrades = tpCount + fpCount;
  const accuracyPct =
    closedTrades > 0
      ? (tpCount / closedTrades) * 100
      : null;

  const avgTrapLead =
    trapLeadTimes.length > 0
      ? trapLeadTimes.reduce((a, b) => a + b, 0) /
        trapLeadTimes.length
      : null;

  // False Negatives
  const signalTsMs = eventSignals.map((s) =>
    toMs(s.ts ?? s.timestamp ?? s.time ?? s.createdAt),
  );
  const fnCount = countFalseNegatives(klines, signalTsMs);

  return {
    event: ev.event,
    period: ev.period,
    signals_tested: signalsTested,
    accuracy:
      accuracyPct != null
        ? `${accuracyPct.toFixed(0)}%`
        : 'n/a',
    false_breakouts_detected: fpCount,
    trap_alerts: trapAlerts,
    liquidation_warnings_lead_time_min:
      avgTrapLead != null
        ? Math.round(avgTrapLead)
        : null,
    true_positives: tpCount,
    false_positives: fpCount,
    false_negatives: fnCount,
  };
}

// ========= エントリーポイント =========

async function main() {
  const allSignals = loadAllSignals();
  const results = [];
  for (const ev of EVENTS) {
    console.log(`Running backtest for ${ev.event} (${ev.period}) ...`);
    // eslint-disable-next-line no-await-in-loop
    const r = await runForEvent(ev, allSignals);
    results.push(r);
  }
  // 最終結果を JSON で出力
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error('Backtest error:', err);
  process.exit(1);
});
