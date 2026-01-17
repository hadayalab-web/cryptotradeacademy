const DEFAULT_HASHTAGS = '#Bitcoin #CryptoTrading #TrapDefence #FreeSignals';

const VARIANT_COPY = {
  fomo: {
    hook: 'FOMO is peaking on BTC. Most traders get trapped.',
    cta: 'Free 4-min VSL:',
  },
  whale_warning: {
    hook: 'Whales are selling into retail bids. Avoid the trap.',
    cta: 'See the trap filter:',
  },
  fear: {
    hook: 'Fear makes you freeze. Traps punish hesitation.',
    cta: 'Reset your edge:',
  },
  neutral: {
    hook: 'Most traders lose because they miss traps.',
    cta: 'Get the trap filter:',
  },
};

function normalizeSentiment(sentiment) {
  if (!sentiment || typeof sentiment !== 'object') return null;
  return {
    retailFomo: Number(sentiment.retailFomo) || 0,
    whaleBias: Number(sentiment.whaleBias) || 0,
    mentalBlocks: Array.isArray(sentiment.mentalBlocks) ? sentiment.mentalBlocks : [],
  };
}

function selectVsl1Variant(sentiment) {
  const normalized = normalizeSentiment(sentiment);
  if (!normalized) return { variant: 'neutral', reason: 'no_sentiment' };

  if (normalized.retailFomo >= 70) {
    return { variant: 'fomo', reason: 'retailFomo>=70' };
  }
  if (normalized.whaleBias <= -50) {
    return { variant: 'whale_warning', reason: 'whaleBias<=-50' };
  }
  if (normalized.mentalBlocks.includes('FEAR')) {
    return { variant: 'fear', reason: 'mentalBlock=FEAR' };
  }

  return { variant: 'neutral', reason: 'default' };
}

function buildVsl1Tweet({ vsl1Link, deepLink, variant = 'neutral' }) {
  const copy = VARIANT_COPY[variant] || VARIANT_COPY.neutral;
  return `${copy.hook}\n\n${vsl1Link}\n\n${copy.cta} ${deepLink}\n\n${DEFAULT_HASHTAGS}`;
}

module.exports = {
  selectVsl1Variant,
  buildVsl1Tweet,
};
