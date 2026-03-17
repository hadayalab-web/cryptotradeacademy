// Grok CSO+CFO推奨: X API言語別投稿自動化
const { getLandingPageUrl } = require('../telegram/lp-links');
const DEFAULT_HASHTAGS = '#Bitcoin #CryptoTrading #TrapDefence #FreeSignals';

// 言語別ハッシュタグ
const LANG_HASHTAGS = {
  en: '#Bitcoin #CryptoTrading #TrapDefence #FreeSignals',
  ja: '#Bitcoin #BTC #仮想通貨 #トレード #TrapDefence',
  es: '#Bitcoin #Cripto #Trading #TrapDefence',
  'pt-br': '#Bitcoin #Cripto #Trading #TrapDefence',
  ar: '#Bitcoin #Crypto #تداول #بيتكوين #TrapDefence',
  ko: '#Bitcoin #암호화폐 #트레이딩 #TrapDefence',
};

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

// 言語別バリアントコピー（短縮版、X投稿用）
const LANG_VARIANT_COPY = {
  en: VARIANT_COPY,
  ja: {
    fomo: {
      hook: 'FOMOがピーク。多くのトレーダーが罠にハマる。',
      cta: '無料4分VSL:',
    },
    whale_warning: {
      hook: 'クジラが売り抜け中。罠を回避せよ。',
      cta: 'トラップフィルター:',
    },
    fear: {
      hook: '恐怖が判断を鈍らせる。罠が待っている。',
      cta: 'エッジをリセット:',
    },
    neutral: {
      hook: '多くのトレーダーは罠を見逃して負ける。',
      cta: 'トラップフィルターを入手:',
    },
  },
  es: {
    fomo: {
      hook: 'FOMO está en su punto máximo en BTC. La mayoría de los traders caen en la trampa.',
      cta: 'VSL gratuito de 4 min:',
    },
    whale_warning: {
      hook: 'Las ballenas están vendiendo. Evita la trampa.',
      cta: 'Ver el filtro de trampas:',
    },
    fear: {
      hook: 'El miedo te paraliza. Las trampas castigan la indecisión.',
      cta: 'Reinicia tu ventaja:',
    },
    neutral: {
      hook: 'La mayoría de los traders pierden porque no ven las trampas.',
      cta: 'Obtén el filtro de trampas:',
    },
  },
  'pt-br': {
    fomo: {
      hook: 'FOMO está no pico em BTC. A maioria dos traders cai na armadilha.',
      cta: 'VSL gratuito de 4 min:',
    },
    whale_warning: {
      hook: 'Baleias estão vendendo. Evite a armadilha.',
      cta: 'Veja o filtro de armadilhas:',
    },
    fear: {
      hook: 'O medo te paralisa. Armadilhas punem hesitação.',
      cta: 'Redefina sua vantagem:',
    },
    neutral: {
      hook: 'A maioria dos traders perde porque não vê armadilhas.',
      cta: 'Obtenha o filtro de armadilhas:',
    },
  },
  ar: {
    fomo: {
      hook: 'FOMO في ذروته على BTC. معظم المتداولين يقعون في الفخ.',
      cta: 'VSL مجاني 4 دقائق:',
    },
    whale_warning: {
      hook: 'الحيتان تبيع. تجنب الفخ.',
      cta: 'شاهد مرشح الفخاخ:',
    },
    fear: {
      hook: 'الخوف يجعلك تتجمد. الفخاخ تعاقب التردد.',
      cta: 'أعد ضبط ميزتك:',
    },
    neutral: {
      hook: 'معظم المتداولين يخسرون لأنهم لا يرون الفخاخ.',
      cta: 'احصل على مرشح الفخاخ:',
    },
  },
  ko: {
    fomo: {
      hook: 'FOMO가 BTC에서 정점. 대부분의 트레이더가 함정에 빠진다.',
      cta: '무료 4분 VSL:',
    },
    whale_warning: {
      hook: '고래들이 매도 중. 함정을 피하라.',
      cta: '함정 필터 보기:',
    },
    fear: {
      hook: '공포가 판단을 둔하게 만든다. 함정이 기다린다.',
      cta: '엣지 재설정:',
    },
    neutral: {
      hook: '대부분의 트레이더는 함정을 놓쳐서 잃는다.',
      cta: '함정 필터 받기:',
    },
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

/**
 * VSL1ツイートを構築（多言語対応）
 * Grok CSO+CFO推奨: X API言語別投稿自動化
 * @param {Object} options - オプション
 * @param {string} options.vsl1Link - VSL1 YouTubeリンク
 * @param {string} options.deepLink - Telegram Deep Link
 * @param {string} options.variant - バリアント（fomo, whale_warning, fear, neutral）
 * @param {string} options.lang - 言語コード（デフォルト: 'en'）
 * @returns {string} ツイートテキスト
 */
function buildVsl1Tweet({ vsl1Link, deepLink, variant = 'neutral', lang = 'en' }) {
  const langCopy = LANG_VARIANT_COPY[lang] || VARIANT_COPY;
  const copy = langCopy[variant] || langCopy.neutral || VARIANT_COPY.neutral;
  const hashtags = LANG_HASHTAGS[lang] || DEFAULT_HASHTAGS;
  const lpUrl = getLandingPageUrl(lang);
  
  return `${copy.hook}\n\n${vsl1Link}\n\n${copy.cta} ${deepLink}\n\n${lpUrl}\n\n${hashtags}`;
}

module.exports = {
  selectVsl1Variant,
  buildVsl1Tweet,
};
