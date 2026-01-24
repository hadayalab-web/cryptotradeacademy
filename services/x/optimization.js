// services/x/optimization.js
// Xアルゴリズム最適化ロジック（Grok推奨事項ベース）

/**
 * 言語別ピーク時間を取得（UTC）
 * Grok推奨: 言語別のピーク時間に投稿タイミングを調整
 */
function getLanguagePeakHours(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // 言語別ピーク時間（UTC）- Grok推奨: アルゴリズム最適化版
  // EN: UTC 13-18（US/EU朝ピーク）、ES: UTC 15-20、PT-BR: UTC 20-02、AR: UTC 18-23、JA: UTC 12-15/00-03、KO: UTC 11-14/23-02
  const peakHours = {
    'en': { morning: 13, evening: 18, ranges: [{start: 13, end: 18}, {start: 20, end: 22}] },      // US/EU active hours (Grok推奨)
    'pt-br': { morning: 20, evening: 2, ranges: [{start: 20, end: 2}] },  // Brazil active hours (Grok推奨)
    'es': { morning: 15, evening: 20, ranges: [{start: 15, end: 20}] },     // LATAM active hours (Grok推奨)
    'ar': { morning: 18, evening: 23, ranges: [{start: 18, end: 23}] },      // MENA active hours (Grok推奨)
    'ja': { morning: 12, evening: 15, ranges: [{start: 12, end: 15}, {start: 0, end: 3}] },      // Tokyo active hours (Grok推奨)
    'ko': { morning: 11, evening: 14, ranges: [{start: 11, end: 14}, {start: 23, end: 2}] },      // Seoul active hours (Grok推奨)
  };
  
  return peakHours[normalizedLang] || peakHours['en'];
}

/**
 * 現在時刻が言語のピーク時間かどうかを判定
 * Grok推奨: 言語別ピーク時間範囲を厳密にチェック
 */
function isPeakHourForLang(lang, currentHour = null) {
  const hour = currentHour !== null ? currentHour : new Date().getUTCHours();
  const peaks = getLanguagePeakHours(lang);
  
  // Grok推奨: 範囲ベースのチェック（rangesが定義されている場合）
  if (peaks.ranges && Array.isArray(peaks.ranges)) {
    return peaks.ranges.some(range => {
      if (range.end < range.start) {
        // 日をまたぐ場合（例: 20-02）
        return hour >= range.start || hour <= range.end;
      }
      return hour >= range.start && hour <= range.end;
    });
  }
  
  // 後方互換性: 従来のロジック
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
 * Grok推奨: 1メイン + 3リプライに拡張（滞在時間延長でアルゴリズム評価UP）
 */
function getThreadStrategy(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // Grok推奨: 全言語で1メイン + 3リプライ（アルゴリズムの「深読み」を促進）
  return {
    type: 'optimized_thread',
    mainCount: 1,
    replyCount: 3, // Grok推奨: 3リプライで滞在時間延長
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
 * Grok推奨: 50%動画スレッド、30%画像+ポール、15%スレッド、5%テキスト
 */
function getContentFormat(sequence = 0) {
  // Grok推奨比率: 50%動画、30%ポール、15%スレッド、5%テキスト
  const formats = [
    'thread_with_video',  // 50% (0-4) - BTCチャート動くGIF/短動画
    'thread_with_video',  // 50%
    'thread_with_video',  // 50%
    'thread_with_video',  // 50%
    'thread_with_video',  // 50%
    'thread_with_poll',   // 30% (5-7) - Trap Scoreビジュアル+ポール
    'thread_with_poll',   // 30%
    'thread_with_poll',   // 30%
    'thread_with_image',  // 15% (8) - スレッド（1メイン+3リプライ）
    'text_only',          // 5% (9)
  ];
  
  return formats[sequence % 10];
}

/**
 * 引用リポストの最適なタイミングを計算
 * Grok推奨: インフルエンサーの投稿後10-20分以内（新鮮度MAX、競合低）
 */
function shouldPostQuoteRepost(influencerTweetTimestamp, currentTime = null) {
  const now = currentTime || new Date();
  const tweetTime = new Date(influencerTweetTimestamp);
  const minutesDiff = (now - tweetTime) / (1000 * 60);
  
  // Grok推奨: 10-20分以内（アルゴリズムの「新鮮度」ボーナス最大）
  if (minutesDiff < 10 || minutesDiff > 20) {
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
 * Grok推奨: 総投稿数を35/日に増加（アカウント分散で安全に）
 */
function checkDailyPostLimit(currentPostCount, maxPosts = 35) {
  return currentPostCount < maxPosts;
}

/**
 * エンゲージメント強化用のCTAを生成
 * Grok推奨: 質問+リンク+絵文字でクリック+リプライ複合を高評価
 */
function generateEngagementCTA(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  const ctaTemplates = {
    'en': [
      '🚀 This prediction accurate? Reply below! 👇',
      '💥 Check Trap Score now! 👉 t.me/... Free report',
      '🔥 Your biggest trap fear? Share below!',
      '⚡ Can you trade with this? Reply!',
    ],
    'ja': [
      '🚀 この予測当たる？下にリプライ！ 👇',
      '💥 Trap Score今すぐチェック！ 👉 t.me/... 無料レポート',
      '🔥 最大のトラップ恐怖は？下に共有！',
      '⚡ これでトレード勝てる？リプで意見！',
    ],
    'es': [
      '🚀 ¿Esta predicción es precisa? ¡Responde abajo! 👇',
      '💥 ¡Verifica Trap Score ahora! 👉 t.me/... Informe gratis',
      '🔥 ¿Tu mayor miedo de trampa? ¡Comparte abajo!',
      '⚡ ¿Puedes operar con esto? ¡Responde!',
    ],
    'pt-br': [
      '🚀 Esta previsão está correta? Responda abaixo! 👇',
      '💥 Verifique Trap Score agora! 👉 t.me/... Relatório grátis',
      '🔥 Seu maior medo de armadilha? Compartilhe abaixo!',
      '⚡ Você pode operar com isso? Responda!',
    ],
    'ar': [
      '🚀 هل هذا التنبؤ دقيق؟ أجب أدناه! 👇',
      '💥 تحقق من Trap Score الآن! 👉 t.me/... تقرير مجاني',
      '🔥 أكبر خوفك من الفخاخ؟ شارك أدناه!',
      '⚡ هل يمكنك التداول بهذا؟ أجب!',
    ],
    'ko': [
      '🚀 이 예측 정확한가요? 아래에 답글! 👇',
      '💥 Trap Score 지금 확인! 👉 t.me/... 무료 리포트',
      '🔥 가장 큰 함정 공포는? 아래에 공유!',
      '⚡ 이것으로 거래 승리할 수 있나요? 답글!',
    ],
  };
  
  const ctas = ctaTemplates[normalizedLang] || ctaTemplates['en'];
  return ctas[Math.floor(Math.random() * ctas.length)];
}

/**
 * トレンドハッシュタグを動的に取得（Grok推奨: 1トレンド+2ニッチ）
 * Grok APIでトレンドハッシュタグを動的取得（1時間更新、ボリューム中10k-100k投稿で競合低）
 * @param {string} lang - 言語コード
 * @param {string} topic - トピック（例: 'BTC'）
 * @returns {Promise<Array>} ハッシュタグ配列 [トレンド1, ニッチ2, プロジェクト専用]
 */
async function getTrendyHashtags(lang, topic = 'BTC') {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // ニッチハッシュタグ（固定）
  const nicheHashtags = {
    'en': ['#BTCAnalysis', '#TrapTrading'],
    'ja': ['#ビットコイン分析', '#トラップ取引'],
    'es': ['#AnálisisBTC', '#TradingTrampas'],
    'pt-br': ['#AnáliseBTC', '#TradingArmadilhas'],
    'ar': ['#تحليل_بيتكوين', '#تداول_الفخاخ'],
    'ko': ['#비트코인분석', '#함정거래'],
  };
  
  // Grok APIでトレンドハッシュタグを動的取得
  let trendingHashtag = '#Bitcoin'; // デフォルト値
  
  try {
    const { discoverTrendingHashtags } = require('../grok/client');
    const trending = await discoverTrendingHashtags(normalizedLang, topic);
    if (trending && trending.length > 0) {
      // ボリューム中（10k-100k投稿）で競合低のものを優先
      trendingHashtag = trending[0];
    }
  } catch (error) {
    console.warn('[Optimization] Failed to get trending hashtags from Grok, using default:', error.message);
  }
  
  const niche = nicheHashtags[normalizedLang] || nicheHashtags['en'];
  
  // Grok推奨: 1トレンド + 2ニッチ + プロジェクト専用
  return [trendingHashtag, ...niche.slice(0, 2), '#TrapDefence'];
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
  getTrendyHashtags,
};
