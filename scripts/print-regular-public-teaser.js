#!/usr/bin/env node
/**
 * Print EN Regular "public teaser" for X / LP / affiliates (stdout).
 *
 * Usage:
 *   node scripts/print-regular-public-teaser.js
 *   node scripts/print-regular-public-teaser.js --thread
 *   node scripts/print-regular-public-teaser.js --stop psych
 *
 * --stop: data_backed | psychological | trap_value (default: data_backed)
 * --thread: also print numbered splits (~270 chars) for X thread paste
 */

const {
  formatRegularBriefingPublicTeaser,
  splitForXThread,
  sliceTeaserFromFullRegular,
  buildPublicTeaserDemoSnapshot,
} = require('../services/social/regularPublicTeaser.en.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/en/regular.en.js');

function parseArgs(argv) {
  const out = { thread: false, stopAt: 'data_backed' };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--thread') out.thread = true;
    else if (argv[i] === '--stop' && argv[i + 1]) {
      const v = argv[++i].toLowerCase();
      if (v === 'psych' || v === 'psychological') out.stopAt = 'psychological';
      else if (v === 'trap' || v === 'trap_value') out.stopAt = 'trap_value';
      else out.stopAt = 'data_backed';
    }
  }
  return out;
}

const { thread, stopAt } = parseArgs(process.argv);

const teaser = formatRegularBriefingPublicTeaser({
  stopAt,
  includeBanner: true,
  includeFooter: true,
});

console.log(teaser);
console.log('\n--- stats ---\n');
console.log('chars:', teaser.length);

if (thread) {
  const chunks = splitForXThread(teaser, 270);
  console.log('\n--- x thread (approx) ---\n');
  chunks.forEach((c, i) => {
    console.log(`[${i + 1}/${chunks.length}] (${c.length} chars)\n${c}\n`);
  });
}

// Fail-soft: ensure production marker still exists (formatter drift guard)
const snap = buildPublicTeaserDemoSnapshot();
const full = formatRegularBriefing(snap, 'en', {});
if (full.indexOf('📊 Data-Backed Evidence') === -1) {
  console.warn(
    '[print-regular-public-teaser] Warning: full Regular EN no longer contains 📊 Data-Backed Evidence — slice position may need updating.',
  );
}
