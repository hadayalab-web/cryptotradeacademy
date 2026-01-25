// config/influencerStrategy.js
// 言語別インフルエンサー戦略設定（10万～20万インプレッション規模を目指す）

/**
 * 言語別インフルエンサー数設定（投稿用）
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
 * 言語別ストック数設定（好反応率重視 - 投稿数の3-5倍をストック）
 * より多くの選択肢を確保し、好反応率が期待できるインフルエンサーを優先
 */
const STOCK_COUNT_BY_LANG = {
  // 英語: 投稿数4 × 5 = 20人をストック
  en: parseInt(process.env.INFLUENCER_STOCK_COUNT_EN || '20', 10),
  
  // その他言語: 投稿数2 × 5 = 10人をストック
  es: parseInt(process.env.INFLUENCER_STOCK_COUNT_ES || '10', 10),
  'pt-br': parseInt(process.env.INFLUENCER_STOCK_COUNT_PT_BR || '10', 10),
  ar: parseInt(process.env.INFLUENCER_STOCK_COUNT_AR || '10', 10),
  ko: parseInt(process.env.INFLUENCER_STOCK_COUNT_KO || '10', 10),
  ja: parseInt(process.env.INFLUENCER_STOCK_COUNT_JA || '10', 10),
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
 * 言語別のインフルエンサー数を取得（投稿用）
 * @param {string} lang - 言語コード
 * @returns {number} インフルエンサー数
 */
function getInfluencerCountForLang(lang) {
  const normalizedLang = normalizeLang(lang);
  return INFLUENCER_COUNT_BY_LANG[normalizedLang] || 1;
}

/**
 * 言語別のストック数を取得（好反応率重視）
 * @param {string} lang - 言語コード
 * @returns {number} ストック数
 */
function getStockCountForLang(lang) {
  const normalizedLang = normalizeLang(lang);
  return STOCK_COUNT_BY_LANG[normalizedLang] || 10;
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
 * 総インプレッション目標を達成するためのインフルエンサー選択戦略（投稿用）
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

/**
 * 好反応率重視のインフルエンサー選択戦略（ストック用）
 * エンゲージメント率とインプレッション数のバランスを重視
 * @param {Array} influencers - インフルエンサー配列
 * @param {string} lang - 言語コード
 * @returns {Array} 選択されたインフルエンサー配列
 */
function selectInfluencersForHighEngagement(influencers, lang) {
  const stockCount = getStockCountForLang(lang);
  const target = getImpressionTargetForLang(lang);
  
  // スコア計算関数（エンゲージメント率とインプレッション数のバランス）
  const calculateScore = (inf) => {
    const engagementRate = inf.engagementRate || 0;
    const impressions = inf.recentImpressions || 0;
    const followerCount = inf.followerCount || 10000;
    
    // エンゲージメント率スコア（0-100点）
    const engagementScore = Math.min(100, engagementRate * 2000); // 5% = 100点
    
    // インプレッションスコア（0-100点）
    const impressionScore = Math.min(100, (impressions / target.max) * 100);
    
    // フォロワー数スコア（適度な規模を重視、0-50点）
    // 10万-50万フォロワーが最適（大きすぎるとエンゲージメント率が下がる）
    let followerScore = 0;
    if (followerCount >= 10000 && followerCount <= 500000) {
      followerScore = 50;
    } else if (followerCount > 500000) {
      followerScore = 30; // 大きすぎるとエンゲージメント率が下がる傾向
    } else {
      followerScore = 20; // 小さすぎるとリーチが限定的
    }
    
    // 総合スコア（エンゲージメント率を重視）
    const totalScore = engagementScore * 0.5 + impressionScore * 0.3 + followerScore * 0.2;
    
    return {
      influencer: inf,
      score: totalScore,
      engagementScore,
      impressionScore,
      followerScore,
    };
  };
  
  // スコアを計算してソート
  const scored = influencers.map(calculateScore);
  scored.sort((a, b) => b.score - a.score);
  
  // 上位を選択
  const selected = scored.slice(0, stockCount).map(item => item.influencer);
  
  console.log(`[InfluencerStrategy] Selected ${selected.length} influencers for ${lang} stock (engagement-focused)`);
  if (scored.length > 0) {
    const topScore = scored[0];
    console.log(`[InfluencerStrategy] Top influencer: @${topScore.influencer.username} (score: ${topScore.score.toFixed(2)}, engagement: ${(topScore.influencer.engagementRate * 100).toFixed(2)}%, impressions: ${(topScore.influencer.recentImpressions || 0).toLocaleString()})`);
  }
  
  return selected;
}

module.exports = {
  INFLUENCER_COUNT_BY_LANG,
  STOCK_COUNT_BY_LANG,
  IMPRESSION_TARGET_BY_LANG,
  getInfluencerCountForLang,
  getStockCountForLang,
  getImpressionTargetForLang,
  filterInfluencersByImpressionTarget,
  selectInfluencersForImpressionTarget,
  selectInfluencersForHighEngagement,
  normalizeLang,
};
