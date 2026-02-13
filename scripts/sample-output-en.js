#!/usr/bin/env node
/**
 * EN（英語）版 Minimal, Regular, Emergency のサンプル出力
 * Phase 3 Task 13: モック snapshot で snapshot-native テンプレートを呼び出し
 *
 * 実行: node scripts/sample-output-en.js
 * ファイル出力: node scripts/sample-output-en.js --out output/en-sample.txt
 */

const path = require('path');
const fs = require('fs');

const { createMockBtcSnapshot, createMockPsychologicalSupport } = require('./mock-btc-snapshot');
const { formatMinimalBriefing } = require('../services/telegram/messages/user/en/minimal-high-quality.en.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en.js');
const { formatTrapAlertFromSnapshot } = require('../services/telegram/messages/user/en/emergency.en.js');

const LANG = 'en';

function main() {
  const snapshot = createMockBtcSnapshot();
  const psychologicalSupport = createMockPsychologicalSupport();

  const minimalMessage = formatMinimalBriefing(snapshot, LANG);
  const regularMessage = formatRegularBriefing(snapshot, LANG, {
    psychologicalSupport
  });
  const emergencyMessage = formatTrapAlertFromSnapshot(snapshot, LANG);

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
    '🚨 Emergency (Trap Alert)',
    '='.repeat(80),
    '',
    emergencyMessage,
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
