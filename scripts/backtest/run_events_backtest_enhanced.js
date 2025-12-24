// scripts/backtest/run_events_backtest_enhanced.js
//
// Enhanced event backtesting with detailed report generation
// Uses critical-events.js, event-analyzer.js, and generate-report.js
//
// Usage:
//   node scripts/backtest/run_events_backtest_enhanced.js --format=markdown
//   node scripts/backtest/run_events_backtest_enhanced.js --format=json
//   node scripts/backtest/run_events_backtest_enhanced.js --output=./reports/backtest.md

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CRITICAL_EVENTS } from './events/critical-events.js';
import { analyzeEventSignals, compareWithExpected, generateInsights } from './events/event-analyzer.js';
import { generateMarkdownReport, generateJSONReport, saveReport } from './reports/generate-report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========= 設定 =========

const SIGNALS_LOG_PATH = path.join(__dirname, '..', '..', 'data', 'signals_log.jsonl');
const BINANCE_BASE_URL = 'https://api.binance.com';
const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';
const LOOKAHEAD_HOURS = 7 * 24;

// コマンドライン引数
const argv = process.argv.slice(2);
const formatArg = argv.find((a) => a.startsWith('--format='));
const outputArg = argv.find((a) => a.startsWith('--output='));
const timelineArg = argv.find((a) => a === '--timeline');

const FORMAT = formatArg ? formatArg.split('=')[1] : 'markdown';
const OUTPUT_PATH = outputArg ? path.resolve(outputArg.split('=')[1]) : null;
const INCLUDE_TIMELINE = !!timelineArg;

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

  candles.sort((a, b) => a.openTime - b.openTime);
  return candles;
}

function loadAllSignals() {
  if (!fs.existsSync(SIGNALS_LOG_PATH)) {
    console.warn(`⚠️ Signals log not found: ${SIGNALS_LOG_PATH}`);
    return [];
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

function inEventRange(tsMs, event) {
  const s = toMs(event.period.start);
  const e = toMs(event.period.end);
  return tsMs >= s && tsMs <= e;
}

function getTradeParams(signal) {
  const side = signal.side ?? (signal.metrics?.signal === 'SELL' ? 'SHORT' : 'LONG');
  const entry = typeof signal.entry === 'number' ? signal.entry : Number(signal.metrics?.priceUsd);
  const tp = typeof signal.tp === 'number' ? signal.tp : NaN;
  const sl = typeof signal.sl === 'number' ? signal.sl : NaN;

  if (!Number.isFinite(entry) || !Number.isFinite(tp) || !Number.isFinite(sl)) {
    return null;
  }
  return { side, entry, tp, sl };
}

function getDynamicLiquidationThresholdPct(signal) {
  const change24h = Number(signal.metrics?.change24h ?? 0);
  const absCh = Math.abs(change24h);
  const t = Math.min(1, Math.max(0, (absCh - 7) / 3));
  return 0.08 + 0.02 * t;
}

function evaluateSignal(signal, klines, startTimeMs) {
  const tsMs = toMs(signal.ts ?? signal.timestamp ?? signal.time ?? signal.createdAt);
  const trade = getTradeParams(signal);
  
  if (!trade) {
    return {
      ...signal,
      backtest: { status: 'SKIPPED', reason: 'Missing entry/tp/sl' },
    };
  }

  const { side, entry, tp, sl } = trade;
  const ONE_HOUR = 60 * 60 * 1000;
  const firstIdx = Math.max(0, Math.floor((tsMs - startTimeMs) / ONE_HOUR));
  const lastIdx = Math.min(klines.length - 1, firstIdx + LOOKAHEAD_HOURS);

  let tpIndex = null;
  let slIndex = null;
  let maxRunup = 0;
  let maxDrawdown = 0;

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
      if (isTrap && liqSpikeIndex === null && down <= -liqThreshold) {
        liqSpikeIndex = i;
      }
    } else if (side === 'SHORT') {
      if (tpIndex === null && k.low <= tp) tpIndex = i;
      if (slIndex === null && k.high >= sl) slIndex = i;
      if (isTrap && liqSpikeIndex === null && up >= liqThreshold) {
        liqSpikeIndex = i;
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
    hitTime: hitCandle ? new Date(hitCandle.openTime).toISOString() : null,
    maxRunup,
    maxDrawdown,
    trapLeadMinutes,
  };

  return { ...signal, backtest };
}

// ========= メイン処理 =========

async function runForEvent(event, allSignals) {
  const startMs = toMs(event.period.start);
  const endMs = toMs(event.period.end);

  const eventSignals = allSignals.filter((s) => {
    const tsMs = toMs(s.ts ?? s.timestamp ?? s.time ?? s.createdAt);
    return inEventRange(tsMs, event);
  });

  console.log(`📊 ${event.name}: ${eventSignals.length} signals`);

  if (eventSignals.length === 0) {
    // Return minimal analysis for events with no signals
    const analysis = analyzeEventSignals(event, [], []);
    const comparison = compareWithExpected(analysis, event.expectedBehavior);
    const insights = generateInsights(analysis, comparison);
    
    return {
      ...analysis,
      comparison,
      insights,
    };
  }

  // Fetch klines for event period + lookahead
  const klines = await fetchKlinesRange(startMs, endMs + LOOKAHEAD_HOURS * 60 * 60 * 1000);
  
  if (klines.length === 0) {
    console.warn(`⚠️ No klines available for ${event.name}`);
    const analysis = analyzeEventSignals(event, eventSignals, []);
    const comparison = compareWithExpected(analysis, event.expectedBehavior);
    const insights = generateInsights(analysis, comparison);
    
    return {
      ...analysis,
      comparison,
      insights,
    };
  }

  const globalStartMs = klines[0].openTime;
  const evaluated = eventSignals.map((s) => evaluateSignal(s, klines, globalStartMs));

  // Analyze results
  const analysis = analyzeEventSignals(event, evaluated, klines);
  const comparison = compareWithExpected(analysis, event.expectedBehavior);
  const insights = generateInsights(analysis, comparison);

  return {
    ...analysis,
    comparison,
    insights,
  };
}

async function main() {
  console.log('🚀 Enhanced Events Backtest\n');
  console.log(`Format: ${FORMAT}`);
  console.log(`Timeline: ${INCLUDE_TIMELINE ? 'Yes' : 'No'}\n`);

  const allSignals = loadAllSignals();
  console.log(`✅ Loaded ${allSignals.length} signals\n`);

  const eventAnalyses = [];
  
  for (const event of CRITICAL_EVENTS) {
    // eslint-disable-next-line no-await-in-loop
    const analysis = await runForEvent(event, allSignals);
    eventAnalyses.push(analysis);
  }

  console.log('\n📝 Generating report...\n');

  let report;
  let extension;
  
  if (FORMAT === 'json') {
    report = generateJSONReport(eventAnalyses);
    extension = 'json';
  } else {
    report = generateMarkdownReport(eventAnalyses, {
      title: 'Critical Events Backtest Report',
      includeTimeline: INCLUDE_TIMELINE,
    });
    extension = 'md';
  }

  if (OUTPUT_PATH) {
    saveReport(report, OUTPUT_PATH);
    console.log(`✅ Report saved to: ${OUTPUT_PATH}`);
  } else {
    const defaultPath = path.join(__dirname, '..', '..', 'reports', `backtest_report_${Date.now()}.${extension}`);
    saveReport(report, defaultPath);
    console.log(`✅ Report saved to: ${defaultPath}`);
  }

  // Also output to console
  console.log('\n' + '='.repeat(80));
  console.log(report);
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('❌ Backtest error:', err);
  process.exit(1);
});
