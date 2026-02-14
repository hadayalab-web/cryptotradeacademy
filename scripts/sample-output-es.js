#!/usr/bin/env node
/**
 * ES（スペイン語）版 Minimal, Regular, Emergency のサンプル出力
 * Phase 3 Task 13: モック snapshot で snapshot-native テンプレートを呼び出し
 *
 * 実行: node scripts/sample-output-es.js
 * ファイル出力: node scripts/sample-output-es.js --out output/es-sample.txt
 */

const path = require('path');
const fs = require('fs');

const { createMockBtcSnapshot, createMockPsychologicalSupport } = require('./mock-btc-snapshot');
const { formatMinimalBriefing } = require('../services/telegram/messages/user/es/minimal-high-quality.es.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/es/regular.es.js');
// Emergency テンプレートは廃止（内部アラートに統一）
const LANG = 'es';

function main() {
  const snapshot = createMockBtcSnapshot();
  const psychologicalSupport = createMockPsychologicalSupport();

  const minimalMessage = formatMinimalBriefing(snapshot, LANG);
  const regularMessage = formatRegularBriefing(snapshot, LANG, {
    psychologicalSupport
  });

  const output = [
    '='.repeat(80),
    '📱 Versión Gratuita (Minimal Version)',
    '='.repeat(80),
    '',
    minimalMessage,
    '',
    '='.repeat(80),
    '💎 Versión de Pago (Regular Briefing)',
    '='.repeat(80),
    '',
    regularMessage,
    '',
    '='.repeat(80),
    '🚨 Emergencia (廃止 — 内部アラートに統一)',
    '='.repeat(80),
    '',
    '(Emergency template removed)',
    '',
    '='.repeat(80),
    '✅ Generación de mensajes completa',
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
