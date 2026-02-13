#!/usr/bin/env node
/**
 * Regular Briefing（有料版）をサンプルデータで1回だけ出力する
 * Phase 3 Task 13: モック snapshot で formatRegularBriefing(snapshot, lang, { psychologicalSupport })
 *
 * 実行: node scripts/run-regular-briefing-sample.js
 */

const { createMockBtcSnapshot, createMockPsychologicalSupport } = require('./mock-btc-snapshot');
const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en');

const snapshot = createMockBtcSnapshot();
const psychologicalSupport = createMockPsychologicalSupport();

const text = formatRegularBriefing(snapshot, 'en', { psychologicalSupport });
console.log(text);
console.log('\n--- END (length: ' + text.length + ' chars) ---');
