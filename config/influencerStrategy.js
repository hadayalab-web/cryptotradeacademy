// config/influencerStrategy.js
// 言語別インフルエンサー戦略設定（10万～20万インプレッション規模を目指す）

/**
 * 言語別インフルエンサー数設定
 * 初速で10万～20万インプレッション規模を出すための戦略
 */
const INFLUENCER_COUNT_BY_LANG = {
  // 英語: Grok推奨 - 4本/日（10万～20万インプレッション規模達成）
  en: parseInt(process.env.INFLUENCER_COUNT_EN || '4', 10),
  
  // スペイン語: Grok推奨 - 2本/日（5万～10万インプレッション規模）
  es: parseInt(process.env.INFLUENCER_COUNT_ES || '2', 10),
  
  // ポルトガル語: Grok推奨 - 2本/日（5万～10万インプレッション規模）
  'pt-br': parseInt(process.env.INFLUENCER_COUNT_PT_BR || '2', 10),
  
  // アラビア語: Grok推奨 - 2本/日（5万～10万インプレッション規模）
  ar: parseInt(process.env.INFLUENCER_COUNT_AR || '2', 10),
  
  // 韓国語: Grok推奨 - 2本/日（5万～10万インプレッション規模）
  ko: parseInt(process.env.INFLUENCER_COUNT_KO || '2', 10),
  
  // 日本語: Grok推奨 - 2本/日（5万～10万インプレッション規模）
  ja: parseInt(process.env.INFLUENCER_COUNT_JA || '2', 10),
};

/**
 * 言語別インプレッション目標設定
 * 初速で10万～20万インプレッション規模を出すための目標値
 */
const IMPRESSION_TARGET_BY_LANG = {
  en: {
    min: 100000,  // 10万インプレッション
    max: 200000,  // 20万インプレッション
    priority: 'high', // 高優先度
  },
  es: {
    min: 50000,   // 5万インプレッション
    max: 100000,  // 10万インプレッション
    priority: 'medium',
  },
  'pt-br': {
    min: 50000,
    max: 100000,
    priority: 'medium',
  },
  ar: {
    min: 30000,
    max: 80000,
    priority: 'medium',
  },
  ko: {
    min: 50000,
    max: 100000,
    priority: 'medium',
  },
  ja: {
    min: 30000,
    max: 80000,
    priority: 'medium',
  },
};

/**
 * 言語別のインフルエンサー数を取得
 * @param {string} lang - 言語コード
 * @returns {number} インフルエンサー数
 */
function getInfluencerCountForLang(lang) {
  const normalizedLang = normalizeLang(lang);
  return INFLUENCER_COUNT_BY_LANG[normalizedLang] || 1;
}

/**
 * 言語別のインプレッション目標を取得
 * @param {string} lang - 言語コード
 * @returns {Object} インプレッション目標 {min, max, priority}
 */
function getImpressionTargetForLang(lang) {
  const normalizedLang = normalizeLang(lang);
  return IMPRESSION_TARGET_BY_LANG[normalizedLang] || {
    min: 10000,
    max: 50000,
    priority: 'low',
  };
}

/**
 * 言語コードを正規化
 * @param {string} lang - 言語コード
 * @returns {string} 正規化された言語コード
 */
function normalizeLang(lang) {
  if (!lang) return 'en';
  const normalized = String(lang).trim().toLowerCase().replace('_', '-');
  const supported = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
  return supported.includes(normalized) ? normalized : 'en';
}

/**
 * インフルエンサーをインプレッション規模でフィルタリング
 * @param {Array} influencers - インフルエンサー配列
 * @param {string} lang - 言語コード
 * @returns {Array} フィルタリングされたインフルエンサー配列
 */
function filterInfluencersByImpressionTarget(influencers, lang) {
  const target = getImpressionTargetForLang(lang);
  
  // recentImpressionsでフィルタリング（目標範囲内のインフルエンサーを優先）
  const filtered = influencers.filter(inf => {
    const impressions = inf.recentImpressions || 0;
    // 目標範囲内、または目標の80%以上
    return impressions >= target.min * 0.8;
  });
  
  // インプレッション数でソート（降順）
  filtered.sort((a, b) => {
    const impA = a.recentImpressions || 0;
    const impB = b.recentImpressions || 0;
    return impB - impA;
  });
  
  // 目標数のインフルエンサーを返す
  const count = getInfluencerCountForLang(lang);
  return filtered.slice(0, count);
}

/**
 * 総インプレッション目標を達成するためのインフルエンサー選択戦略
 * @param {Array} influencers - インフルエンサー配列
 * @param {string} lang - 言語コード
 * @returns {Array} 選択されたインフルエンサー配列
 */
function selectInfluencersForImpressionTarget(influencers, lang) {
  const target = getImpressionTargetForLang(lang);
  const count = getInfluencerCountForLang(lang);
  
  // インプレッション数でソート（降順）
  const sorted = [...influencers].sort((a, b) => {
    const impA = a.recentImpressions || 0;
    const impB = b.recentImpressions || 0;
    return impB - impA;
  });
  
  // 目標インプレッション規模を達成するために最適な組み合わせを選択
  const selected = [];
  let totalImpressions = 0;
  
  for (const inf of sorted) {
    const impressions = inf.recentImpressions || 0;
    
    // 目標範囲内に収まるように選択
    if (selected.length < count) {
      selected.push(inf);
      totalImpressions += impressions;
      
      // 目標の上限に近づいたら停止
      if (totalImpressions >= target.max * 0.9) {
        break;
      }
    }
  }
  
  // 目標数に達していない場合は、残りを追加
  if (selected.length < count) {
    const remaining = sorted.filter(inf => !selected.includes(inf));
    selected.push(...remaining.slice(0, count - selected.length));
  }
  
  return selected.slice(0, count);
}

module.exports = {
  INFLUENCER_COUNT_BY_LANG,
  IMPRESSION_TARGET_BY_LANG,
  getInfluencerCountForLang,
  getImpressionTargetForLang,
  filterInfluencersByImpressionTarget,
  selectInfluencersForImpressionTarget,
  normalizeLang,
};
