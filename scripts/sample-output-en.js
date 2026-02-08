#!/usr/bin/env node
/**
 * EN（英語）版 Minimal & Regular のサンプル出力
 *
 * 実行: node scripts/sample-output-en.js
 * ファイル出力: node scripts/sample-output-en.js --out output/en-sample.txt
 */

const path = require('path');
const fs = require('fs');

const { formatMinimalBriefing } = require('../services/telegram/messages/user/en/minimal-high-quality.en.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en.js');

const SAMPLE_DATA = {
  now: new Date('2026-01-26T06:00:22Z'),
  trapScore: 25,
  priceUsd: 87760,
  change24h: -0.75,
  inflow: 987,
  mpi: -1.32,
  sentimentLabel: 'Extreme Fear',
  score: -6,
};

function main() {
  const minimalMessage = formatMinimalBriefing({
    now: SAMPLE_DATA.now,
    trapScore: SAMPLE_DATA.trapScore,
    priceUsd: SAMPLE_DATA.priceUsd,
    change24h: SAMPLE_DATA.change24h,
    trapData: { exchangeNetflow: SAMPLE_DATA.inflow },
    marketData: { mpi: SAMPLE_DATA.mpi },
    sentimentData: { sentiment: SAMPLE_DATA.sentimentLabel },
    lang: 'en',
  });

  const regularMessage = formatRegularBriefing({
    now: SAMPLE_DATA.now,
    inflow: SAMPLE_DATA.inflow,
    mpi: SAMPLE_DATA.mpi,
    sentimentLabel: SAMPLE_DATA.sentimentLabel,
    priceUsd: SAMPLE_DATA.priceUsd,
    change24h: SAMPLE_DATA.change24h,
    score: SAMPLE_DATA.score,
    tradeSignal: { signal: 'STANDBY', tp: null, sl: null, rr: null },
    trap: { isTrap: false, confidence: 'LOW', label: 'No trap detected' },
    trapDetection: {
      trapDetected: false,
      trapScore: SAMPLE_DATA.trapScore,
      trapSeverity: 'LOW',
      trapType: null,
    },
    trapAlert: null,
    psychologicalSupport: {
      psychologicalState: 'NEUTRAL',
      psychologicalRisk: 'LOW',
      psychologicalAdvice: '✅ Neutral state - No mental blocks detected: Market sentiment is balanced.',
    },
    gptReporterAnalysis: null,
    grokXAnalysis: null,
    aiAnalysis: null,
    lang: 'en',
  });

  const output = [
    '='.repeat(80),
    '📱 Free Version (Minimal Version)',
    '='.repeat(80),
    '',
    minimalMessage,
    '',
    '='.repeat(80),
    '💎 Paid Version (Regular Briefing)',
    '='.repeat(80),
    '',
    regularMessage,
    '',
    '='.repeat(80),
    '✅ Message generation complete',
    '='.repeat(80),
  ].join('\n');

  const outArg = process.argv.indexOf('--out');
  if (outArg !== -1 && process.argv[outArg + 1]) {
    const outPath = path.resolve(process.cwd(), process.argv[outArg + 1]);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, output, 'utf8');
    console.log(`📄 Output saved to: ${outPath}`);
  } else {
    console.log(output);
  }
}

main();
