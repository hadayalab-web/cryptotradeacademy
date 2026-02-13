#!/usr/bin/env node
/**
 * PT-BR (Brazilian Portuguese) sample output - Minimal, Regular, Emergency
 * Phase 3 Task 13: mock snapshot snapshot-native template
 *
 * Run: node scripts/sample-output-pt-br.js
 * Output: node scripts/sample-output-pt-br.js --out output/pt-br-sample.txt
 */

const path = require('path');
const fs = require('fs');

const { createMockBtcSnapshot, createMockPsychologicalSupport } = require('./mock-btc-snapshot');
const { formatMinimalBriefing } = require('../services/telegram/messages/user/pt-br/minimal-high-quality.pt-br.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/pt-br/regular.pt-br.js');
// Emergency テンプレートは廃止（SHIFT に統一）
const LANG = 'pt-br';

function main() {
  const snapshot = createMockBtcSnapshot();
  const psychologicalSupport = createMockPsychologicalSupport();

  const minimalMessage = formatMinimalBriefing(snapshot, LANG);
  const regularMessage = formatRegularBriefing(snapshot, LANG, {
    psychologicalSupport
  });

  const output = [
    '='.repeat(80),
    'Free Version (Minimal)',
    '='.repeat(80),
    '',
    minimalMessage,
    '',
    '='.repeat(80),
    'Paid Version (Regular Briefing)',
    '='.repeat(80),
    '',
    regularMessage,
    '',
    '='.repeat(80),
    'Emergency (廃止 — SHIFT に統一)',
    '='.repeat(80),
    '',
    '(Emergency template removed)',
    '',
    '='.repeat(80),
    'Message generation complete',
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
    console.log('Output saved to: ' + outPath);
  } else {
    console.log(output);
  }
}

main();
