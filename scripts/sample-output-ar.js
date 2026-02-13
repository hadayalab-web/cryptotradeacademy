#!/usr/bin/env node
/**
 * AR（アラビア語）版 Minimal & Regular のサンプル出力
 *
 * 実行: node scripts/sample-output-ar.js
 * ファイル出力: node scripts/sample-output-ar.js --out output/ar-sample.txt
 */

const path = require('path');
const fs = require('fs');

const { createMockBtcSnapshot, createMockPsychologicalSupport } = require('./mock-btc-snapshot');
const { formatMinimalBriefing } = require('../services/telegram/messages/user/ar/minimal-high-quality.ar.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/ar/regular.ar.js');
// Emergency テンプレートは廃止（SHIFT に統一）
const LANG = 'ar';

function main() {
  const snapshot = createMockBtcSnapshot();
  const psychologicalSupport = createMockPsychologicalSupport();

  const minimalMessage = formatMinimalBriefing(snapshot, LANG);
  const regularMessage = formatRegularBriefing(snapshot, LANG, {
    psychologicalSupport
  });

  const output = [
    '='.repeat(80),
    '📱 النسخة المجانية (Minimal Version)',
    '='.repeat(80),
    '',
    minimalMessage,
    '',
    '='.repeat(80),
    '💎 النسخة المدفوعة (Regular Briefing)',
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
    console.log(`📄 Output saved to: ${outPath}`);
  } else {
    console.log(output);
  }
}

main();
