// config/influencerStrategy.js
// 言語別インフルエンサー戦略設定（10万～20万インプレッション規模を目指す）

/**
 * 言語別インフルエンサー数設定（投稿用）
 * 🚀 824人ストックを最大限活用: 1日1,000-1,200投稿を達成するための時価配分
 * - ピーク時間（UTC 0,1,20,21,22）: 多く投稿
 * - オフピーク時間（UTC 13,14）: 少なく投稿
 * 
 * 配分（1,000-1,200投稿/日、6分ごと実行 = 1日240回）:
 * - EN: 約400-500投稿/日 → 1回あたり35-40人（基本値、ピーク時間）
 * - ES: 約200-250投稿/日 → 1回あたり18-22人（基本値、ピーク時間）
 * - PT-BR: 約150-200投稿/日 → 1回あたり15-18人（基本値、ピーク時間）
 * - AR: 約100-150投稿/日 → 1回あたり10-15人（基本値、ピーク時間）
 * - JA: 約80-120投稿/日 → 1回あたり8-12人（基本値、ピーク時間）
 * - KO: 約60-100投稿/日 → 1回あたり6-10人（基本値、ピーク時間）
 * 
 * ストック数（実際）:
 * - EN: 210人 → 1人あたり約2回/日（最大限活用）
 * - ES: 168人 → 1人あたり約1.2-1.5回/日
 * - PT-BR: 158人 → 1人あたり約1-1.3回/日
 * - AR: 112人 → 1人あたり約1-1.3回/日
 * - JA: 98人 → 1人あたり約1-1.2回/日
 * - KO: 78人 → 1人あたり約1-1.3回/日
 */
const INFLUENCER_COUNT_BY_LANG = {
  // 英語: ピーク時間35-40人、オフピーク時間14-16人（1日1,000-1,200投稿達成）
  en: parseInt(process.env.INFLUENCER_COUNT_EN || '35', 10), // ピーク時間用（オフピークは動的に調整）
  
  // その他言語: ピーク時間で配分（1,000-1,200投稿/日達成）
  es: parseInt(process.env.INFLUENCER_COUNT_ES || '20', 10),   // 約200-250投稿/日
  'pt-br': parseInt(process.env.INFLUENCER_COUNT_PT_BR || '16', 10), // 約150-200投稿/日
  ar: parseInt(process.env.INFLUENCER_COUNT_AR || '12', 10),  // 約100-150投稿/日
  ko: parseInt(process.env.INFLUENCER_COUNT_KO || '8', 10),   // 約60-100投稿/日
  ja: parseInt(process.env.INFLUENCER_COUNT_JA || '10', 10),  // 約80-120投稿/日
};

/**
 * 時価配分設定（ピーク時間とオフピーク時間の投稿数比率）
 * 🚀 数撃て作戦: 1日500投稿を達成するための時価配分
 */
const HOURLY_DISTRIBUTION = {
  // ピーク時間（UTC 0,1,20,21,22）: 多く投稿
  peak: {
    hours: [0, 1, 20, 21, 22],
    multiplier: 1.0, // 通常の投稿数
  },
  // オフピーク時間（UTC 13,14）: 少なく投稿
  offPeak: {
    hours: [13, 14],
    multiplier: 0.4, // 通常の40%（EN: 17 → 7、ES: 8 → 3、その他も同様）
  },
};

/**
 * 言語別ストック数設定（好反応率重視 - 投稿用の2倍をストック）
 * より多くの選択肢を確保し、好反応率が期待できるインフルエンサーを優先
 * 
 * 500投稿/日想定のストック数:
 * - EN: 75人（投稿用）×2 = 150人（ストック）
 * - ES: 38人（投稿用）×2 = 76人（ストック）
 * - PT-BR: 29人（投稿用）×2 = 58人（ストック）
 * - AR: 20人（投稿用）×2 = 40人（ストック）
 * - JA: 20人（投稿用）×2 = 40人（ストック）
 * - KO: 11人（投稿用）×2 = 22人（ストック）
 */
const STOCK_COUNT_BY_LANG = {
  // 英語: 150人をストック（500投稿/日想定）
  en: parseInt(process.env.INFLUENCER_STOCK_COUNT_EN || '150', 10),
  
  // その他言語: 500投稿/日想定のストック数
  es: parseInt(process.env.INFLUENCER_STOCK_COUNT_ES || '76', 10),
  'pt-br': parseInt(process.env.INFLUENCER_STOCK_COUNT_PT_BR || '58', 10),
  ar: parseInt(process.env.INFLUENCER_STOCK_COUNT_AR || '40', 10),
  ko: parseInt(process.env.INFLUENCER_STOCK_COUNT_KO || '22', 10),
  ja: parseInt(process.env.INFLUENCER_STOCK_COUNT_JA || '40', 10),
};

/**
 * 言語別インプレッション目標設定（1日あたりの合計インプレッション）
 * 
 * 計算根拠:
 * - 1投稿あたりのインプレッション（保守的）: 元のツイートの10%（引用リポスト転換率）
 * - 1日あたりの投稿数: 言語別に設定（EN: 400-500投稿/日など）
 * - 合計 = 1投稿あたりのインプレッション × 1日あたりの投稿数
 * 
 * 保守的推定（10%転換率）と楽観的推定（30%転換率）の範囲を設定
 * 
 * 更新（2026-01-30）: 824人ストックを最大限活用するため、投稿数を2-3倍に増加
 */
const IMPRESSION_TARGET_BY_LANG = {
  en: {
    min: 2000000,  // 200万インプレッション/日（保守的推定: 400投稿 × 5,000）
    max: 7500000,  // 750万インプレッション/日（楽観的推定: 500投稿 × 15,000）
    priority: 'high', // 高優先度
  },
  es: {
    min: 600000,   // 60万インプレッション/日（保守的推定: 200投稿 × 3,000）
    max: 2250000,   // 225万インプレッション/日（楽観的推定: 250投稿 × 9,000）
    priority: 'medium',
  },
  'pt-br': {
    min: 375000,    // 37.5万インプレッション/日（保守的推定: 150投稿 × 2,500）
    max: 1500000,   // 150万インプレッション/日（楽観的推定: 200投稿 × 7,500）
    priority: 'medium',
  },
  ar: {
    min: 200000,    // 20万インプレッション/日（保守的推定: 100投稿 × 2,000）
    max: 900000,    // 90万インプレッション/日（楽観的推定: 150投稿 × 6,000）
    priority: 'medium',
  },
  ja: {
    min: 160000,    // 16万インプレッション/日（保守的推定: 80投稿 × 2,000）
    max: 720000,    // 72万インプレッション/日（楽観的推定: 120投稿 × 6,000）
    priority: 'medium',
  },
  ko: {
    min: 90000,     // 9万インプレッション/日（保守的推定: 60投稿 × 1,500）
    max: 450000,    // 45万インプレッション/日（楽観的推定: 100投稿 × 4,500）
    priority: 'medium',
  },
};

/**
 * 言語別のインフルエンサー数を取得（投稿用）
 * 🚀 数撃て作戦: 時価配分を考慮して動的に調整
 * @param {string} lang - 言語コード
 * @param {number} currentHour - 現在時刻（UTC、省略時は自動取得）
 * @returns {number} インフルエンサー数
 */
function getInfluencerCountForLang(lang, currentHour = null) {
  const normalizedLang = normalizeLang(lang);
  const baseCount = INFLUENCER_COUNT_BY_LANG[normalizedLang] || 1;
  
  // 時価配分を考慮
  if (currentHour !== null) {
    const hour = currentHour;
    const isPeakHour = HOURLY_DISTRIBUTION.peak.hours.includes(hour);
    const isOffPeakHour = HOURLY_DISTRIBUTION.offPeak.hours.includes(hour);
    
    if (isOffPeakHour) {
      // オフピーク時間: 通常の40%
      return Math.max(1, Math.floor(baseCount * HOURLY_DISTRIBUTION.offPeak.multiplier));
    }
    // ピーク時間: 通常の投稿数
    return baseCount;
  }
  
  // 時刻が指定されていない場合は基本値を返す
  return baseCount;
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
  
  // インプレッション数を数値に変換（文字列の場合は数値を抽出）
  const parseImpressions = (impressions) => {
    if (typeof impressions === 'number') {
      return impressions;
    }
    if (typeof impressions === 'string') {
      // "300000+" や "100000-200000" のような形式を処理
      const match = impressions.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
      // 範囲の場合は平均値を計算
      const rangeMatch = impressions.match(/(\d+)-(\d+)/);
      if (rangeMatch) {
        return (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
      }
    }
    return 0;
  };
  
  // フォロワー数を数値に変換
  const parseFollowerCount = (followerCount) => {
    if (typeof followerCount === 'number') {
      return followerCount;
    }
    if (typeof followerCount === 'string') {
      // "100000-500000" のような形式を処理
      const rangeMatch = followerCount.match(/(\d+)-(\d+)/);
      if (rangeMatch) {
        return (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
      }
      const match = followerCount.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 50000; // デフォルト値
  };
  
  // スコア計算関数（エンゲージメント率とインプレッション数のバランス）
  const calculateScore = (inf) => {
    const engagementRate = inf.engagementRate || 0;
    const impressions = parseImpressions(inf.recentImpressions);
    const followerCount = parseFollowerCount(inf.followerCount);
    
    // エンゲージメント率スコア（0-100点）
    const engagementScore = Math.min(100, engagementRate * 2000); // 5% = 100点
    
    // インプレッションスコア（0-100点）
    const impressionScore = impressions > 0 ? Math.min(100, (impressions / target.max) * 100) : 0;
    
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
  HOURLY_DISTRIBUTION,
  getInfluencerCountForLang,
  getStockCountForLang,
  getImpressionTargetForLang,
  filterInfluencersByImpressionTarget,
  selectInfluencersForImpressionTarget,
  selectInfluencersForHighEngagement,
  normalizeLang,
};
