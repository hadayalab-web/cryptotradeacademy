/**
 * Regular Briefing — public teaser (X / LP / JV) for all supported locales.
 * @see regularPublicTeaserLocales.js for slice markers (must stay in sync with regular.*.js)
 */

const { getLocale, buildFooter, SUPPORTED_LANGS } = require('./regularPublicTeaserLocales.js');

const FORMATTERS = {
  en: () => require('../telegram/messages/user/en/regular.en.js').formatRegularBriefing,
  es: () => require('../telegram/messages/user/es/regular.es.js').formatRegularBriefing,
  'pt-br': () => require('../telegram/messages/user/pt-br/regular.pt-br.js').formatRegularBriefing,
  ar: () => require('../telegram/messages/user/ar/regular.ar.js').formatRegularBriefing,
  ko: () => require('../telegram/messages/user/ko/regular.ko.js').formatRegularBriefing,
  ja: () => require('../telegram/messages/user/ja/regular.ja.js').formatRegularBriefing,
};

function loadFormatter(lang) {
  const key = String(lang || 'en').toLowerCase();
  const loader = FORMATTERS[key] || FORMATTERS.en;
  return loader();
}

/** Snapshot shape compatible with formatRegularBriefing(snapshot) — illustrative numbers only */
function buildPublicTeaserDemoSnapshot(lang = 'en', overrides = {}) {
  const locale = getLocale(lang);
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
    highResX: locale.highResX,
    divergenceSignal: null,
    sosovalueArticle: null,
    diff: null,
    ...overrides,
  };
}

/** Cut before internal / heavier blocks */
function sliceTeaserFromFullRegular(fullText, lang = 'en', stopAt = 'data_backed') {
  if (!fullText || typeof fullText !== 'string') return '';
  const locale = getLocale(lang);
  const markers = locale.markers;
  const needle = markers[stopAt] || markers.data_backed;
  const idx = fullText.indexOf(needle);
  let body = idx === -1 ? fullText.trimEnd() : fullText.slice(0, idx).trimEnd();
  body = body.replace(/\n━━━━━━━━━━━━━━━━━━━━\s*$/u, '').trimEnd();
  return body;
}

/**
 * @param {string} lang - en | es | pt-br | ar | ko | ja
 * @param {Object} [opts]
 * @param {Object} [opts.snapshotOverrides]
 * @param {'data_backed'|'psychological'|'trap_value'} [opts.stopAt]
 * @param {boolean} [opts.includeBanner]
 * @param {boolean} [opts.includeFooter]
 * @param {Object} [opts.formatterOpts]
 */
function formatRegularBriefingPublicTeaser(lang = 'en', opts = {}) {
  const locale = getLocale(lang);
  const {
    snapshotOverrides = {},
    stopAt = 'data_backed',
    includeBanner = true,
    includeFooter = true,
    formatterOpts = {},
  } = opts;

  const formatRegularBriefing = loadFormatter(lang);
  const snapshot = buildPublicTeaserDemoSnapshot(lang, snapshotOverrides);
  const full = formatRegularBriefing(snapshot, locale.formatterLang, formatterOpts);
  const body = sliceTeaserFromFullRegular(full, lang, stopAt);
  const parts = [];
  if (includeBanner) parts.push(locale.banner);
  parts.push(body);
  if (includeFooter) parts.push(buildFooter(locale));
  return parts.join('\n');
}

/**
 * Rough split for X threads
 * @param {string} text
 * @param {number} [maxLen=270]
 * @returns {string[]}
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

/**
 * Body + Zeigarnik hook + CTA for X auto-post (Minimal pipeline–style).
 * Live KV snapshot when possible; otherwise demo sample (PUBLIC SAMPLE banner).
 *
 * @param {string} lang
 * @param {object|null} snapshotMaybe - btc snapshot or null
 * @param {object} [options]
 * @param {boolean} [options.useLiveSnapshot=true] - if false, always demo
 * @param {string} [options.upgradeUrl] - optional; else process.env.REGULAR_TEASER_UPGRADE_URL
 */
function composeRegularBriefingForXAutoPost(lang, snapshotMaybe, options = {}) {
  const locale = getLocale(lang);
  const useLive =
    options.useLiveSnapshot !== false &&
    snapshotMaybe &&
    typeof snapshotMaybe === 'object' &&
    snapshotMaybe.raw != null;

  const upgradeUrl = (options.upgradeUrl || process.env.REGULAR_TEASER_UPGRADE_URL || '').trim();

  let body;
  /** @type {'live_excerpt'|'demo_fallback'} */
  let mode;
  if (useLive) {
    const fmt = loadFormatter(lang);
    const full = fmt(snapshotMaybe, locale.formatterLang, {});
    const sliced = sliceTeaserFromFullRegular(full, lang, 'data_backed');
    body = `${locale.liveExcerptPrefix}\n\n${sliced.trim()}`;
    mode = 'live_excerpt';
  } else {
    body = formatRegularBriefingPublicTeaser(lang, {
      stopAt: 'data_backed',
      includeBanner: true,
      includeFooter: false,
    }).trim();
    mode = 'demo_fallback';
  }

  const zeig = locale.xZeigarnik || '';
  const ctaLine = upgradeUrl
    ? `${locale.xCtaUrlPrefix || '🔗'} ${upgradeUrl}`.trim()
    : locale.xCtaBio;

  const disc = locale.xShortDisclaimer || locale.disclaimer;
  const text = `${body}\n\n${zeig}\n${ctaLine}\n\n${disc}`;
  return { text, mode };
}

module.exports = {
  SUPPORTED_LANGS,
  loadFormatter,
  buildPublicTeaserDemoSnapshot,
  sliceTeaserFromFullRegular,
  formatRegularBriefingPublicTeaser,
  splitForXThread,
  composeRegularBriefingForXAutoPost,
};
