// config/influencerStrategy.js
// 言語別インフルエンサー戦略設定
//
// 【初回ストック 300件でスタート】KV 実態: en 124, pt-br 35, ko 30, es 48, ja 11, ar 52。
// 引用リポスト Cron は 1時間ごと（24回/日/言語）に統一。1回あたりの投稿数はストックに合わせて設定。
// 目標: 約 240 投稿/日（en 72, es 48, pt-br 24, ar 48, ko 24, ja 24）。1人あたり最大4回/日でローテ。
// 詳細: docs/INFLUENCER_LIST_PROGRESS_2026-02-01.md, docs/INITIAL_STOCK_PLAN_QUOTE_REPOST_2026-02-01.md

/**
 * 言語別インフルエンサー数設定（1回のCron実行あたりの投稿候補数）
 * 300人ローテーション強化: ストックをフル活用して投稿数を増加。
 * 目標: 約 480 投稿/日（en 144, es 72, pt-br 48, ar 72, ko 48, ja 48）
 */
const INFLUENCER_COUNT_BY_LANG = {
  en: parseInt(process.env.INFLUENCER_COUNT_EN || "6", 10),
  es: parseInt(process.env.INFLUENCER_COUNT_ES || "3", 10),
  "pt-br": parseInt(process.env.INFLUENCER_COUNT_PT_BR || "2", 10),
  ar: parseInt(process.env.INFLUENCER_COUNT_AR || "3", 10),
  ko: parseInt(process.env.INFLUENCER_COUNT_KO || "2", 10),
  ja: parseInt(process.env.INFLUENCER_COUNT_JA || "2", 10)
};

/**
 * 時価配分設定（ピーク時間とオフピーク時間の投稿数比率）
 * 初回ストック運用: オフピーク（UTC 13,14）は少し控えめに。
 */
const HOURLY_DISTRIBUTION = {
  peak: {
    hours: [0, 1, 20, 21, 22],
    multiplier: 1.0
  },
  offPeak: {
    hours: [13, 14],
    multiplier: 0.5 // 通常の50%（en 3→1, es 2→1 など）
  }
};

/**
 * 言語別ストック数設定（参照用・目標値）
 * 初回ストック実態に合わせて設定。KV 実数は docs/INFLUENCER_LIST_PROGRESS を参照。
 */
const STOCK_COUNT_BY_LANG = {
  en: parseInt(process.env.INFLUENCER_STOCK_COUNT_EN || "124", 10),
  es: parseInt(process.env.INFLUENCER_STOCK_COUNT_ES || "48", 10),
  "pt-br": parseInt(process.env.INFLUENCER_STOCK_COUNT_PT_BR || "35", 10),
  ar: parseInt(process.env.INFLUENCER_STOCK_COUNT_AR || "52", 10),
  ko: parseInt(process.env.INFLUENCER_STOCK_COUNT_KO || "30", 10),
  ja: parseInt(process.env.INFLUENCER_STOCK_COUNT_JA || "11", 10)
};

/**
 * 言語別インプレッション目標設定（1日あたりの合計インプレッション）
 * 初回ストック 300 運用: 約 240 投稿/日 × 5,000 imp/投稿 ≒ 120万 imp/日 を目安に設定。
 */
const IMPRESSION_TARGET_BY_LANG = {
  en: {
    min: 360000, // 72投稿/日 × 5,000
    max: 1080000, // 72 × 15,000
    priority: "high"
  },
  es: {
    min: 240000, // 48投稿/日 × 5,000
    max: 720000,
    priority: "medium"
  },
  "pt-br": {
    min: 120000, // 24投稿/日 × 5,000
    max: 360000,
    priority: "medium"
  },
  ar: {
    min: 240000, // 48投稿/日 × 5,000
    max: 720000,
    priority: "medium"
  },
  ja: {
    min: 55000, // 11投稿/日 × 5,000（ja ストック 11 の上限）
    max: 165000,
    priority: "medium"
  },
  ko: {
    min: 120000, // 24投稿/日 × 5,000
    max: 360000,
    priority: "medium"
  }
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
  return (
    IMPRESSION_TARGET_BY_LANG[normalizedLang] || {
      min: 10000,
      max: 50000,
      priority: "low"
    }
  );
}

/**
 * 言語コードを正規化
 * @param {string} lang - 言語コード
 * @returns {string} 正規化された言語コード
 */
function normalizeLang(lang) {
  if (!lang) return "en";
  const normalized = String(lang).trim().toLowerCase().replace("_", "-");
  const supported = ["en", "es", "pt-br", "ar", "ja", "ko"];
  return supported.includes(normalized) ? normalized : "en";
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
  const filtered = influencers.filter((inf) => {
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
    const remaining = sorted.filter((inf) => !selected.includes(inf));
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
    if (typeof impressions === "number") {
      return impressions;
    }
    if (typeof impressions === "string") {
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
    if (typeof followerCount === "number") {
      return followerCount;
    }
    if (typeof followerCount === "string") {
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
      followerScore
    };
  };

  // スコアを計算してソート
  const scored = influencers.map(calculateScore);
  scored.sort((a, b) => b.score - a.score);

  // 上位を選択
  const selected = scored.slice(0, stockCount).map((item) => item.influencer);

  console.log(
    `[InfluencerStrategy] Selected ${selected.length} influencers for ${lang} stock (engagement-focused)`
  );
  if (scored.length > 0) {
    const topScore = scored[0];
    console.log(
      `[InfluencerStrategy] Top influencer: @${topScore.influencer.username} (score: ${topScore.score.toFixed(2)}, engagement: ${(topScore.influencer.engagementRate * 100).toFixed(2)}%, impressions: ${(topScore.influencer.recentImpressions || 0).toLocaleString()})`
    );
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
  normalizeLang
};
