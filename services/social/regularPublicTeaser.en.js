/**
 * Regular Briefing — public "choi mise" (X / LP / JV) generator (EN)
 *
 * Uses the production EN formatter with an illustrative-only snapshot, then cuts
 * before Data-Backed Evidence so published text matches subscriber format without
 * shipping the full paid sections in one post.
 *
 * Not financial advice. Educational / marketing sample only.
 */

const { formatRegularBriefing } = require('../telegram/messages/user/en/regular.en.js');

/** Snapshot shape compatible with formatRegularBriefing(snapshot) — illustrative numbers only */
function buildPublicTeaserDemoSnapshot(overrides = {}) {
  return {
    as_of_utc: '2026-01-20T15:30:00.000Z',
    raw: {
      inflow: 920,
      mpi: 0.88,
      priceUsd: 98456,
      change24h: -2.1,
      sentimentLabel: 'Fear',
    },
    cqDeep: {
      trapScore: 48,
      exchangeNetflow: 920,
      minerMPI: 0.88,
      whaleFlows: { whaleRatio: 0.48, isHighPressure: false },
      liquidations: null,
    },
    market_score: 5,
    tradeSignal: { signal: 'STANDBY', tp: null, sl: null, rr: null },
    trapDetection: {
      trapDetected: true,
      trapSeverity: 'MEDIUM',
      trapScore: 48,
      trapType: 'LIQUIDITY_HUNT',
      label: 'Liquidity hunt conditions',
    },
    trapAlert: null,
    gptStructureReasoning: null,
    drGrok: { base: null },
    highResX:
      'Retail timeline noise is elevated: narrative spikes cluster around leverage and funding, while spot conviction looks thinner — a common pre-volatility silence pattern.',
    divergenceSignal: null,
    sosovalueArticle: null,
    diff: null,
    ...overrides,
  };
}

const DEFAULT_BANNER = [
  '📣 PUBLIC SAMPLE — Regular briefing format (illustrative-only demo, not live data).',
  'Subscribers receive the full timely briefing end-to-end.',
  '',
].join('\n');

const DEFAULT_FOOTER = [
  '',
  '—',
  '➡️ Trap Defence Regular · link in bio / pinned.',
  '',
  'For educational purposes only. Not financial advice.',
].join('\n');

/** Cut before internal / heavier blocks; keeps Radar, Key Metrics, Behind-the-Scenes (trimmed by core), Structure, Scenario Map */
function sliceTeaserFromFullRegular(fullText, stopAt = 'data_backed') {
  if (!fullText || typeof fullText !== 'string') return '';
  const markers = {
    data_backed: '\n📊 Data-Backed Evidence',
    psychological: '\n💊 Psychological Insight (Dr. Grok)',
    trap_value: '\n💎 Trap Defence Value',
  };
  const needle = markers[stopAt] || markers.data_backed;
  const idx = fullText.indexOf(needle);
  let body = idx === -1 ? fullText.trimEnd() : fullText.slice(0, idx).trimEnd();
  // Drop orphan separator line left immediately before Data-Backed / next section
  body = body.replace(/\n━━━━━━━━━━━━━━━━━━━━\s*$/u, '').trimEnd();
  return body;
}

/**
 * @param {Object} [opts]
 * @param {Object} [opts.snapshotOverrides] - merge into demo snapshot
 * @param {'data_backed'|'psychological'|'trap_value'} [opts.stopAt]
 * @param {boolean} [opts.includeBanner=true]
 * @param {boolean} [opts.includeFooter=true]
 * @param {Object} [opts.formatterOpts] - passed to formatRegularBriefing(..., 'en', formatterOpts)
 */
function formatRegularBriefingPublicTeaser(opts = {}) {
  const {
    snapshotOverrides = {},
    stopAt = 'data_backed',
    includeBanner = true,
    includeFooter = true,
    formatterOpts = {},
  } = opts;

  const snapshot = buildPublicTeaserDemoSnapshot(snapshotOverrides);
  const full = formatRegularBriefing(snapshot, 'en', formatterOpts);
  const body = sliceTeaserFromFullRegular(full, stopAt);
  const parts = [];
  if (includeBanner) parts.push(DEFAULT_BANNER);
  parts.push(body);
  if (includeFooter) parts.push(DEFAULT_FOOTER);
  return parts.join('\n');
}

/**
 * Rough split for X threads (character budget per post). Splits on blank lines first.
 * @param {string} text
 * @param {number} [maxLen=270]
 * {'returns': string[]}
 */
function splitForXThread(text, maxLen = 270) {
  if (!text) return [];
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    const candidate = cur ? `${cur}\n\n${p}` : p;
    if (candidate.length <= maxLen) {
      cur = candidate;
    } else {
      if (cur) chunks.push(cur);
      if (p.length <= maxLen) {
        cur = p;
      } else {
        for (let i = 0; i < p.length; i += maxLen) {
          chunks.push(p.slice(i, i + maxLen));
        }
        cur = '';
      }
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

module.exports = {
  buildPublicTeaserDemoSnapshot,
  sliceTeaserFromFullRegular,
  formatRegularBriefingPublicTeaser,
  splitForXThread,
};
