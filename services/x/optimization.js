// services/x/optimization.js
// Xアルゴリズム最適化ロジック（Grok推奨事項ベース）

/**
 * 言語別ピーク時間を取得（UTC）
 * Grok推奨: 言語別のピーク時間に投稿タイミングを調整
 */
function getLanguagePeakHours(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // 言語別ピーク時間（UTC）
  // 1日2回の投稿スロット（午前・午後）
  const peakHours = {
    'en': { morning: 14, evening: 20 },      // US/EU active hours
    'pt-br': { morning: 14, evening: 20 },  // Brazil active hours
    'es': { morning: 15, evening: 21 },     // LATAM active hours
    'ar': { morning: 18, evening: 0 },      // MENA active hours (UTC+2-4)
    'ja': { morning: 12, evening: 0 },      // Tokyo active hours (UTC+9)
    'ko': { morning: 13, evening: 1 },      // Seoul active hours (UTC+9)
  };
  
  return peakHours[normalizedLang] || peakHours['en'];
}

/**
 * 現在時刻が言語のピーク時間かどうかを判定
 */
function isPeakHourForLang(lang, currentHour = null) {
  const hour = currentHour !== null ? currentHour : new Date().getUTCHours();
  const peaks = getLanguagePeakHours(lang);
  
  // ピーク時間の±1時間を許容範囲とする
  return (
    (hour >= peaks.morning - 1 && hour <= peaks.morning + 1) ||
    (hour >= peaks.evening - 1 && hour <= peaks.evening + 1) ||
    (peaks.evening === 0 && (hour >= 23 || hour <= 1)) // UTC 0時の場合
  );
}

/**
 * ピーク時間帯（UTC 12-22）かどうかを判定
 * Grok推奨: 引用リポストはピーク時間のみに集中
 */
function isPeakTimeWindow(currentHour = null) {
  const hour = currentHour !== null ? currentHour : new Date().getUTCHours();
  return hour >= 12 && hour <= 22;
}

/**
 * スレッド戦略を決定
 * Grok推奨: 1メイン + 2-3リプライに短縮、AR/JAは単一投稿もテスト
 */
function getThreadStrategy(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // AR/JAは短い形式を優先（将来的に単一投稿もテスト可能）
  if (normalizedLang === 'ar' || normalizedLang === 'ja') {
    return {
      type: 'short_thread',
      mainCount: 1,
      replyCount: 2, // 短縮版
      preferSinglePost: true, // 将来的に単一投稿もテスト
    };
  }
  
  // その他の言語は1メイン + 2-3リプライ
  return {
    type: 'optimized_thread',
    mainCount: 1,
    replyCount: 3, // 最適化版（従来の5から削減）
    preferSinglePost: false,
  };
}

/**
 * ポールオプションを生成（Grok推奨）
 * 50%のスレッドにポールを追加
 */
function generatePollOptions(lang, trapScore) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  const pollTemplates = {
    'en': [
      { text: 'Yes, trap detected', position: 0 },
      { text: 'No, safe to trade', position: 1 },
    ],
    'ja': [
      { text: 'はい、トラップ検出', position: 0 },
      { text: 'いいえ、安全に取引可能', position: 1 },
    ],
    'es': [
      { text: 'Sí, trampa detectada', position: 0 },
      { text: 'No, seguro para operar', position: 1 },
    ],
    'pt-br': [
      { text: 'Sim, armadilha detectada', position: 0 },
      { text: 'Não, seguro para operar', position: 1 },
    ],
    'ar': [
      { text: 'نعم، تم اكتشاف فخ', position: 0 },
      { text: 'لا، آمن للتداول', position: 1 },
    ],
    'ko': [
      { text: '예, 함정 감지됨', position: 0 },
      { text: '아니요, 안전하게 거래 가능', position: 1 },
    ],
  };
  
  return pollTemplates[normalizedLang] || pollTemplates['en'];
}

/**
 * ハッシュタグ戦略を最適化
 * Grok推奨: 2-3個のニッチ + 1個のトレンド（動的）
 */
function getOptimizedHashtags(lang, trendingHashtag = null) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // ニッチハッシュタグ（2-3個）
  const nicheHashtags = {
    'en': ['#BTC', '#CryptoTrap', '#TrapDefence'],
    'ja': ['#BTC', '#仮想通貨', '#TrapDefence'],
    'es': ['#BTC', '#CriptoTrap', '#TrapDefence'],
    'pt-br': ['#BTC', '#CriptoTrap', '#TrapDefence'],
    'ar': ['#BTC', '#Crypto', '#TrapDefence'],
    'ko': ['#BTC', '#비트코인', '#TrapDefence'],
  };
  
  const baseHashtags = nicheHashtags[normalizedLang] || nicheHashtags['en'];
  
  // トレンドハッシュタグを追加（関連性がある場合のみ）
  if (trendingHashtag && baseHashtags.length < 4) {
    return [...baseHashtags, trendingHashtag];
  }
  
  // 最大3個に制限
  return baseHashtags.slice(0, 3);
}

/**
 * コンテンツ形式を決定
 * Grok推奨: 40% 画像付きスレッド、30% ポール、20% 動画、10% テキストのみ
 */
function getContentFormat(sequence = 0) {
  const formats = [
    'thread_with_image',  // 40% (0-3)
    'thread_with_image',  // 40%
    'thread_with_image',  // 40%
    'thread_with_image',  // 40%
    'thread_with_poll',   // 30% (4-6)
    'thread_with_poll',   // 30%
    'thread_with_poll',   // 30%
    'thread_with_video',  // 20% (7-8)
    'thread_with_video',  // 20%
    'text_only',          // 10% (9)
  ];
  
  return formats[sequence % 10];
}

/**
 * 引用リポストの最適なタイミングを計算
 * Grok推奨: インフルエンサーの投稿後15-60分以内、ピーク時間のみ
 */
function shouldPostQuoteRepost(influencerTweetTimestamp, currentTime = null) {
  const now = currentTime || new Date();
  const tweetTime = new Date(influencerTweetTimestamp);
  const minutesDiff = (now - tweetTime) / (1000 * 60);
  
  // 15-60分以内
  if (minutesDiff < 15 || minutesDiff > 60) {
    return false;
  }
  
  // ピーク時間帯（UTC 12-22）かどうか
  const hour = now.getUTCHours();
  if (!isPeakTimeWindow(hour)) {
    return false;
  }
  
  return true;
}

/**
 * 1日の投稿上限をチェック
 * Grok推奨: 総投稿数を20-25/日に制限
 */
function checkDailyPostLimit(currentPostCount, maxPosts = 25) {
  return currentPostCount < maxPosts;
}

/**
 * エンゲージメント強化用のCTAを生成
 * Grok推奨: 質問/CTAでエンゲージメントを促進
 */
function generateEngagementCTA(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  const ctaTemplates = {
    'en': [
      'Reply your BTC price target!',
      'What\'s your trap strategy? Reply below 👇',
      'Share your experience - have you avoided traps?',
    ],
    'ja': [
      'あなたのBTC価格目標をリプライしてください！',
      'あなたのトラップ戦略は？下にリプライ 👇',
      '経験を共有してください - トラップを回避しましたか？',
    ],
    'es': [
      '¡Responde tu precio objetivo de BTC!',
      '¿Cuál es tu estrategia contra trampas? Responde abajo 👇',
      'Comparte tu experiencia - ¿has evitado trampas?',
    ],
    'pt-br': [
      'Responda seu preço alvo de BTC!',
      'Qual é sua estratégia contra armadilhas? Responda abaixo 👇',
      'Compartilhe sua experiência - você evitou armadilhas?',
    ],
    'ar': [
      'أجب عن سعر BTC المستهدف!',
      'ما هي استراتيجيتك ضد الفخاخ؟ أجب أدناه 👇',
      'شارك تجربتك - هل تجنبت الفخاخ؟',
    ],
    'ko': [
      'BTC 목표 가격을 답글해주세요!',
      '당신의 함정 전략은 무엇인가요? 아래에 답글 👇',
      '경험을 공유하세요 - 함정을 피했나요?',
    ],
  };
  
  const ctas = ctaTemplates[normalizedLang] || ctaTemplates['en'];
  return ctas[Math.floor(Math.random() * ctas.length)];
}

module.exports = {
  getLanguagePeakHours,
  isPeakHourForLang,
  isPeakTimeWindow,
  getThreadStrategy,
  generatePollOptions,
  getOptimizedHashtags,
  getContentFormat,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  generateEngagementCTA,
};
