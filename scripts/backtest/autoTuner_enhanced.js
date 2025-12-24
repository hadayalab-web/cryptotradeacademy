// scripts/backtest/autoTuner_enhanced.js
// Enhanced auto-tuner with real evaluation metrics

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { scoreParameterSet, PRESET_WEIGHTS, generateScoringReport, findBestResult } from './evaluation/scorer.js';

const __filename = fileURLToPath(import.meta.url');
const __dirname = path.dirname(__filename);

// ========= Configuration =========

const SIGNALS_LOG_PATH = path.join(__dirname, '..', '..', 'data', 'signals_log.jsonl');
const EVAL_SIGNALS_SCRIPT = path.join(__dirname, 'eval_signals.js');
const TEMP_OUTPUT_PATH = path.join(__dirname, '..', '..', 'data', 'autotuner_temp.jsonl');

// Command line arguments
const argv = process.argv.slice(2);
const marketArg = argv.find((a) => a.startsWith('--market='));
const targetArg = argv.find((a) => a.startsWith('--target='));
const iterationsArg = argv.find((a) => a.startsWith('--iterations='));

const MARKET = marketArg ? marketArg.split('=')[1] : 'EN';
const TARGET_METRIC = targetArg ? targetArg.split('=')[1] : 'balanced'; // balanced, aggressive, conservative
const MAX_ITERATIONS = iterationsArg ? parseInt(iterationsArg.split('=')[1], 10) : 50;

// ========= Parameter Space Definition =========

/**
 * Get parameter space for a market
 * This uses a CommonJS-style require for now since marketProfiles might be CommonJS
 */
function getParameterSpace(market) {
  // Base parameter ranges for optimization
  return {
    HARD_SIGNAL_THRESH: {
      min: 15,
      max: 35,
      step: 2,
      current: 25,
    },
    SOFT_REGIME_THRESH: {
      min: 10,
      max: 25,
      step: 2,
      current: 15,
    },
    MIN_CONF_FOR_TRADE: {
      min: 0.3,
      max: 0.7,
      step: 0.1,
      current: 0.5,
    },
    BUG_STANDBY_BIAS: {
      min: 0,
      max: 80,
      step: 10,
      current: 40,
    },
  };
}

/**
 * Run backtest with specific parameters
 * @param {Object} params - Parameter set to test
 * @returns {Array} Evaluated signals
 */
async function runBacktestWithParams(params) {
  // For now, we'll use the existing eval_signals.js
  // In a production implementation, you would inject params into the signal generation
  
  // Check if signals log exists
  if (!fs.existsSync(SIGNALS_LOG_PATH)) {
    console.warn('⚠️ Signals log not found. Using empty dataset.');
    return [];
  }

  // Run eval_signals.js
  try {
    const cmd = `node ${EVAL_SIGNALS_SCRIPT} --input=${SIGNALS_LOG_PATH} --output=${TEMP_OUTPUT_PATH}`;
    execSync(cmd, { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Backtest execution failed:', error.message);
    return [];
  }

  // Read results
  if (!fs.existsSync(TEMP_OUTPUT_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(TEMP_OUTPUT_PATH, 'utf8');
  const signals = raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  // Clean up temp file
  fs.unlinkSync(TEMP_OUTPUT_PATH);

  return signals;
}

/**
 * Evaluate parameter set
 * @param {Object} params - Parameter set
 * @param {Object} weights - Scoring weights
 * @returns {Object} Evaluation result
 */
async function evaluateParameters(params, weights) {
  console.log('  Evaluating params:', JSON.stringify(params, null, 2));
  
  const signals = await runBacktestWithParams(params);
  
  if (signals.length === 0) {
    console.warn('  ⚠️ No signals to evaluate');
    return {
      params,
      score: 0,
      metrics: null,
    };
  }

  const result = scoreParameterSet(signals, { weights });
  
  console.log(`  Score: ${result.score.toFixed(2)}`);
  
  return {
    params,
    ...result,
  };
}

/**
 * Grid search optimization
 * @param {Object} paramSpace - Parameter space
 * @param {Object} weights - Scoring weights
 * @returns {Object} Best parameters
 */
async function gridSearchOptimization(paramSpace, weights) {
  console.log('🔍 Starting grid search optimization...\n');
  
  const results = [];
  let iteration = 0;

  // Simple grid search: optimize one parameter at a time
  const optimized = {};
  
  for (const [key, range] of Object.entries(paramSpace)) {
    optimized[key] = range.current;
  }

  for (const [key, range] of Object.entries(paramSpace)) {
    console.log(`\n📊 Optimizing ${key}...`);
    console.log(`  Range: ${range.min} to ${range.max} (step: ${range.step})`);
    
    let bestValue = range.current;
    let bestScore = -Infinity;
    
    // Test each value in range
    for (let value = range.min; value <= range.max; value += range.step) {
      if (iteration >= MAX_ITERATIONS) {
        console.log('\n⚠️ Max iterations reached');
        break;
      }
      
      iteration++;
      
      const testParams = { ...optimized, [key]: value };
      
      // eslint-disable-next-line no-await-in-loop
      const result = await evaluateParameters(testParams, weights);
      results.push(result);
      
      if (result.score > bestScore) {
        bestScore = result.score;
        bestValue = value;
      }
    }
    
    optimized[key] = bestValue;
    console.log(`  ✅ Best ${key}: ${bestValue} (score: ${bestScore.toFixed(2)})`);
    
    if (iteration >= MAX_ITERATIONS) {
      break;
    }
  }

  return {
    optimizedParams: optimized,
    allResults: results,
    bestResult: findBestResult(results),
  };
}

/**
 * Random search optimization (alternative to grid search)
 * @param {Object} paramSpace - Parameter space
 * @param {Object} weights - Scoring weights
 * @param {number} iterations - Number of random samples
 * @returns {Object} Best parameters
 */
async function randomSearchOptimization(paramSpace, weights, iterations) {
  console.log('🎲 Starting random search optimization...\n');
  
  const results = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`\n📊 Iteration ${i + 1}/${iterations}`);
    
    // Generate random parameters
    const randomParams = {};
    for (const [key, range] of Object.entries(paramSpace)) {
      const steps = Math.floor((range.max - range.min) / range.step);
      const randomStep = Math.floor(Math.random() * (steps + 1));
      randomParams[key] = range.min + randomStep * range.step;
    }
    
    // eslint-disable-next-line no-await-in-loop
    const result = await evaluateParameters(randomParams, weights);
    results.push(result);
  }

  return {
    optimizedParams: findBestResult(results).params,
    allResults: results,
    bestResult: findBestResult(results),
  };
}

/**
 * Save optimization results
 * @param {Object} optimizationResult - Optimization result
 * @param {string} outputPath - Output file path
 */
function saveResults(optimizationResult, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    market: MARKET,
    targetMetric: TARGET_METRIC,
    optimizedParams: optimizationResult.optimizedParams,
    bestScore: optimizationResult.bestResult.score,
    bestMetrics: optimizationResult.bestResult.metrics,
    allResults: optimizationResult.allResults.map((r) => ({
      params: r.params,
      score: r.score,
      metrics: r.metrics,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Enhanced Auto-Tuner\n');
  console.log(`Market: ${MARKET}`);
  console.log(`Target: ${TARGET_METRIC}`);
  console.log(`Max Iterations: ${MAX_ITERATIONS}\n`);

  // Get parameter space
  const paramSpace = getParameterSpace(MARKET);
  
  console.log('📊 Parameter Space:');
  for (const [key, range] of Object.entries(paramSpace)) {
    console.log(`  ${key}: [${range.min}, ${range.max}] step ${range.step}`);
  }
  console.log();

  // Get scoring weights
  const weights = PRESET_WEIGHTS[TARGET_METRIC] || PRESET_WEIGHTS.balanced;
  console.log('🎯 Scoring Weights:');
  for (const [key, value] of Object.entries(weights)) {
    console.log(`  ${key}: ${(value * 100).toFixed(0)}%`);
  }
  console.log();

  // Run optimization
  const optimizationResult = await gridSearchOptimization(paramSpace, weights);

  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('✅ Optimization Complete!\n');
  
  console.log('📊 Best Parameters:');
  for (const [key, value] of Object.entries(optimizationResult.optimizedParams)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log();

  if (optimizationResult.bestResult.metrics) {
    console.log(generateScoringReport(optimizationResult.bestResult));
  }

  // Save results
  const outputPath = path.join(__dirname, '..', '..', 'reports', `autotuner_${MARKET}_${Date.now()}.json`);
  saveResults(optimizationResult, outputPath);
  console.log(`\n💾 Results saved to: ${outputPath}`);

  console.log('\n🎉 Auto-tuning complete!');
}

// Run if executed directly
main().catch((err) => {
  console.error('❌ Auto-tuning failed:', err);
  process.exit(1);
});
