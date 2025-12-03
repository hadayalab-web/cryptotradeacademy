// scripts/backtest/summarize_backtest.js

// signals_backtest.jsonl を読み込み、勝率やドローダウンを集計するスクリプト

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 入力ファイル（CLI から上書き可能）
const defaultInputPath = path.join(__dirname, '..', '..', 'data', 'signals_backtest.jsonl');

const argv = process.argv.slice(2);
const inputArg = argv.find((a) => a.startsWith('--input='));

const INPUT_PATH = inputArg
  ? path.resolve(inputArg.split('=')[1])
  : defaultInputPath;

// JSONL 読み込み
function loadBacktestRows() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Backtest file not found: ${INPUT_PATH}`);
  }

  const raw = fs.readFileSync(INPUT_PATH, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);

  const rows = [];
  lines.forEach((line, idx) => {
    try {
      const obj = JSON.parse(line);
      rows.push(obj);
    } catch (e) {
      console.warn(`⚠️ JSON parse error at line ${idx + 1}: ${e.message}`);
    }
  });

  if (rows.length === 0) {
    throw new Error('No valid rows in signals_backtest.jsonl');
  }

  return rows;
}

// 集計ロジック
function summarize(rows) {
  const summary = {
    total: 0,
    skipped: 0,
    evaluated: 0,
    outcomes: {},

    wins: 0,    // TP / TP_FIRST
    losses: 0,  // SL / SL_FIRST
    open: 0,    // outcome === OPEN

    maxRunupSum: 0,
    maxRunupCount: 0,
    maxDrawdownSum: 0,
    maxDrawdownCount: 0,
    worstDrawdown: 0, // 最も大きな含み損（マイナス方向に一番大きい値）
  };

  for (const row of rows) {
    const bt = row.backtest;
    if (!bt || !bt.status) continue;

    summary.total += 1;

    if (bt.status === 'SKIPPED') {
      summary.skipped += 1;
      continue;
    }

    if (bt.status === 'EVAL') {
      summary.evaluated += 1;
    }

    const outcome = bt.outcome ?? 'UNKNOWN';
    summary.outcomes[outcome] = (summary.outcomes[outcome] ?? 0) + 1;

    if (outcome === 'TP' || outcome === 'TP_FIRST') {
      summary.wins += 1;
    } else if (outcome === 'SL' || outcome === 'SL_FIRST') {
      summary.losses += 1;
    } else if (outcome === 'OPEN') {
      summary.open += 1;
    }

    if (typeof bt.maxRunup === 'number') {
      summary.maxRunupSum += bt.maxRunup;
      summary.maxRunupCount += 1;
    }

    if (typeof bt.maxDrawdown === 'number') {
      summary.maxDrawdownSum += bt.maxDrawdown;
      summary.maxDrawdownCount += 1;
      if (bt.maxDrawdown < summary.worstDrawdown) {
        summary.worstDrawdown = bt.maxDrawdown;
      }
    }
  }

  const closedTrades = summary.wins + summary.losses;
  const winRate = closedTrades > 0 ? (summary.wins / closedTrades) * 100 : null;
  const avgRunup =
    summary.maxRunupCount > 0 ? summary.maxRunupSum / summary.maxRunupCount : null;
  const avgDrawdown =
    summary.maxDrawdownCount > 0 ? summary.maxDrawdownSum / summary.maxDrawdownCount : null;

  return { summary, winRate, avgRunup, avgDrawdown, closedTrades };
}

// レポート出力
function printReport(result) {
  const { summary, winRate, avgRunup, avgDrawdown, closedTrades } = result;

  console.log('===== Backtest Summary =====');
  console.log(`Total rows          : ${summary.total}`);
  console.log(`Evaluated trades    : ${summary.evaluated}`);
  console.log(`Skipped trades      : ${summary.skipped}`);
  console.log('');

  console.log('Outcomes:');
  for (const [k, v] of Object.entries(summary.outcomes)) {
    console.log(`  ${k.padEnd(10)}: ${v}`);
  }
  console.log('');

  console.log(`Closed trades       : ${closedTrades}`);
  console.log(`Wins (TP/TP_FIRST)  : ${summary.wins}`);
  console.log(`Losses (SL/SL_FIRST): ${summary.losses}`);
  console.log(`Open positions      : ${summary.open}`);

  if (winRate != null) {
    console.log(`Win rate            : ${winRate.toFixed(2)} %`);
  } else {
    console.log('Win rate            : n/a (no closed trades)');
  }
  console.log('');

  if (avgRunup != null) {
    console.log(`Avg max run-up      : ${(avgRunup * 100).toFixed(2)} %`);
  } else {
    console.log('Avg max run-up      : n/a');
  }

  if (avgDrawdown != null) {
    console.log(`Avg max drawdown    : ${(avgDrawdown * 100).toFixed(2)} %`);
    console.log(`Worst drawdown      : ${(summary.worstDrawdown * 100).toFixed(2)} %`);
  } else {
    console.log('Avg max drawdown    : n/a');
  }
}

// メイン
async function main() {
  try {
    const rows = loadBacktestRows();
    const result = summarize(rows);
    printReport(result);
  } catch (err) {
    console.error('❌ Summary error:', err);
    process.exit(1);
  }
}

main();
