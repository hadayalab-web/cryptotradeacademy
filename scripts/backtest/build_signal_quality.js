// scripts/backtest/build_signal_quality.js
// SELL/SHORTシグナルの勝率メトリクスを生成（80%勝率要件チェック用）

const fs = require('fs');
const path = require('path');

// 設定
const BACKTEST_PATH = path.join(__dirname, '..', '..', 'data', 'signals_backtest.jsonl');
const OUT_PATH = path.join(__dirname, '..', '..', 'data', 'signal_quality_metrics.json');

const LAST_N = 100; // 直近N件を評価
const MIN_TRADES = 30; // 最低サンプル数
const WIN_RATE_THRESHOLD = 0.80; // 80%勝率要件

// CLI引数処理
const argv = process.argv.slice(2);
const inputArg = argv.find((a) => a.startsWith('--input='));
const outputArg = argv.find((a) => a.startsWith('--output='));

const INPUT_PATH = inputArg
  ? path.resolve(inputArg.split('=')[1])
  : BACKTEST_PATH;

const OUTPUT_PATH = outputArg
  ? path.resolve(outputArg.split('=')[1])
  : OUT_PATH;

/**
 * SHORTトレードかどうかを判定
 */
function isShortTrade(row) {
  // side === 'SHORT' または signal === 'SELL' をチェック
  return row.side === 'SHORT' || row.metrics?.signal === 'SELL' || row.signal === 'SELL';
}

/**
 * SHORTトレードが勝ちかどうかを判定
 */
function isWinShort(row) {
  const bt = row.backtest;
  if (!bt || bt.status !== 'EVAL') return false;

  const outcome = bt.outcome;
  // TP または TP_FIRST が勝ち
  return outcome === 'TP' || outcome === 'TP_FIRST';
}

/**
 * バックテストデータを読み込み、SHORTトレードの勝率を計算
 */
function loadAndCalculateWinRate() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.warn(`⚠️ Backtest file not found: ${INPUT_PATH}`);
    return null;
  }

  const raw = fs.readFileSync(INPUT_PATH, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);

  // 直近N件のSHORTトレードを保持（リングバッファ）
  const lastShortTrades = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    let row;
    try {
      row = JSON.parse(line);
    } catch (e) {
      console.warn(`⚠️ JSON parse error: ${e.message}`);
      continue;
    }

    if (!isShortTrade(row)) continue;

    lastShortTrades.push(row);
    if (lastShortTrades.length > LAST_N) {
      lastShortTrades.shift(); // 古いものを削除
    }
  }

  if (lastShortTrades.length === 0) {
    console.warn('⚠️ No SHORT trades found in backtest data');
    return null;
  }

  // 勝率計算
  const total = lastShortTrades.length;
  const wins = lastShortTrades.reduce((acc, r) => acc + (isWinShort(r) ? 1 : 0), 0);
  const winRate = total > 0 ? wins / total : 0;
  const pass = total >= MIN_TRADES && winRate >= WIN_RATE_THRESHOLD;

  return {
    total,
    wins,
    losses: total - wins,
    winRate,
    minTrades: MIN_TRADES,
    threshold: WIN_RATE_THRESHOLD,
    pass,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log('📊 Building signal quality metrics...');
    console.log(`  Input: ${INPUT_PATH}`);
    console.log(`  Output: ${OUTPUT_PATH}`);

    const shortMetrics = loadAndCalculateWinRate();

    if (!shortMetrics) {
      // メトリクスが取得できない場合は、安全側（配信停止）のメトリクスを生成
      const fallback = {
        short_last_100: {
          total: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          minTrades: MIN_TRADES,
          threshold: WIN_RATE_THRESHOLD,
          pass: false,
          reason: 'NO_DATA',
          lastUpdated: new Date().toISOString(),
        },
      };

      fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ windows: fallback }, null, 2));
      console.log('⚠️ No SHORT trades found, generated fallback metrics (pass: false)');
      return;
    }

    const output = {
      generatedAt: new Date().toISOString(),
      windows: {
        short_last_100: shortMetrics,
      },
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

    console.log('✅ Signal quality metrics generated:');
    console.log(`  Total SHORT trades: ${shortMetrics.total}`);
    console.log(`  Wins: ${shortMetrics.wins}`);
    console.log(`  Losses: ${shortMetrics.losses}`);
    console.log(`  Win rate: ${(shortMetrics.winRate * 100).toFixed(2)}%`);
    console.log(`  Pass (>=${MIN_TRADES} trades & >=${WIN_RATE_THRESHOLD * 100}%): ${shortMetrics.pass ? '✅' : '❌'}`);
    console.log(`  Output: ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('❌ Error building signal quality metrics:', err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err; // require時は例外をthrow
  }
}

// 直接実行時のみmain()を実行（require時は実行しない）
if (require.main === module) {
  main();
}

module.exports = { main };
