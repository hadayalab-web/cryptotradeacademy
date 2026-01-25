// services/x/optimization.js
// Xアルゴリズム最適化ロジック（Grok推奨事項ベース）

/**
 * 言語別ピーク時間を取得（UTC）
 * Grok推奨: 言語別のピーク時間に投稿タイミングを調整
 */
function getLanguagePeakHours(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // 言語別ピーク時間（UTC）- Grok推奨: アルゴリズム最適化版（2026-01-22更新）
  // EN/PT-BR: UTC 14:00/20:00 (US/EU/Brazil active)
  // ES: UTC 15:00/21:00 (LATAM)
  // AR: UTC 18:00/00:00 (MENA)
  // JA: UTC 12:00/00:00 (Tokyo)
  // KO: UTC 13:00/01:00 (Seoul)
  const peakHours = {
    'en': { morning: 14, evening: 20, ranges: [{start: 14, end: 14}, {start: 20, end: 20}] },      // US/EU active hours (Grok推奨: UTC 14:00/20:00)
    'pt-br': { morning: 14, evening: 20, ranges: [{start: 14, end: 14}, {start: 20, end: 20}] },  // Brazil active hours (Grok推奨: UTC 14:00/20:00)
    'es': { morning: 15, evening: 21, ranges: [{start: 15, end: 15}, {start: 21, end: 21}] },     // LATAM active hours (Grok推奨: UTC 15:00/21:00)
    'ar': { morning: 18, evening: 0, ranges: [{start: 18, end: 18}, {start: 0, end: 0}] },      // MENA active hours (Grok推奨: UTC 18:00/00:00)
    'ja': { morning: 12, evening: 0, ranges: [{start: 12, end: 12}, {start: 0, end: 0}] },      // Tokyo active hours (Grok推奨: UTC 12:00/00:00)
    'ko': { morning: 13, evening: 1, ranges: [{start: 13, end: 13}, {start: 1, end: 1}] },      // Seoul active hours (Grok推奨: UTC 13:00/01:00)
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
  
  // Grok推奨: 正確なピーク時間をチェック（rangesが定義されている場合）
  if (peaks.ranges && Array.isArray(peaks.ranges)) {
    return peaks.ranges.some(range => {
      // Grok推奨: 正確な時間に一致するかチェック（例: UTC 14:00, 20:00）
      if (range.start === range.end) {
        // 単一の時間（例: 14:00）
        return hour === range.start;
      }
      // 日をまたぐ場合（例: 20-02）
      if (range.end < range.start) {
        return hour >= range.start || hour <= range.end;
      }
      // 範囲の場合（通常は使用しないが、後方互換性のため）
      return hour >= range.start && hour <= range.end;
    });
  }
  
  // 後方互換性: 従来のロジック（morning/eveningが定義されている場合）
  return (
    hour === peaks.morning ||
    hour === peaks.evening ||
    (peaks.evening === 0 && hour === 0) // UTC 0時の場合
  );
}

/**
 * ピーク時間帯（UTC 10-23に拡大 - インプレッション最大化）
 * インプレッション最大化のため、ピーク時間帯を拡大
 */
function isPeakTimeWindow(currentHour = null) {
  const hour = currentHour !== null ? currentHour : new Date().getUTCHours();
  return hour >= 10 && hour <= 23; // 12-22 → 10-23に拡大
}

/**
 * スレッド戦略を決定
 * Grok推奨: 1メイン + 3リプライに拡張（滞在時間延長でアルゴリズム評価UP）
 * AR/JAは単一投稿をテスト（短いフォームを好む）
 */
function getThreadStrategy(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  // Grok推奨: AR/JAは単一投稿をテスト（短いフォームを好む）
  if (normalizedLang === 'ar' || normalizedLang === 'ja') {
    return {
      type: 'single_post',
      mainCount: 1,
      replyCount: 0, // AR/JAは単一投稿
      preferSinglePost: true,
    };
  }
  
  // Grok推奨: その他言語で1メイン + 3リプライ（アルゴリズムの「深読み」を促進）
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
 * Grok推奨: 動画（10x）、ポール（4x）、画像（2x）を優先
 * 更新: 70%動画/ポール/画像、30%テキスト（エンゲージメント最大化）
 */
function getContentFormat(sequence = 0) {
  // Grok推奨比率（更新版）: 動画優先、ポール強化、画像維持、テキスト最小化
  // エンゲージメント最大化: 動画10x、ポール4x、画像2x
  const formats = [
    'thread_with_video',  // 30% (0-2) - BTCチャート動画（15秒）- 10x boost
    'thread_with_video',  // 30%
    'thread_with_video',  // 30%
    'thread_with_poll',   // 30% (3-5) - Trap Scoreビジュアル+ポール - 4x boost
    'thread_with_poll',   // 30%
    'thread_with_poll',   // 30%
    'thread_with_image',  // 20% (6-7) - BTCチャート画像 - 2x boost
    'thread_with_image',  // 20%
    'thread_with_video',  // 10% (8) - 動画追加
    'text_only',          // 10% (9) - テキストのみ（最小化）
  ];
  
  return formats[sequence % 10];
}

/**
 * 引用リポストの最適なタイミングを計算
 * Grok推奨: インフルエンサーの投稿後10-20分以内（新鮮度MAX、競合低）
 * 注意: UTC 0:00と1:00も引用リポストのピーク時間として定義されているため、isPeakTimeWindowチェックを削除
 * 
 * 修正: createdAtが存在しない場合、または現在時刻に近すぎる場合は、タイミングチェックをスキップ
 * （実際の投稿時刻が取得できない場合でも、ピーク時間であれば投稿を許可）
 */
function shouldPostQuoteRepost(influencerTweetTimestamp, currentTime = null) {
  const now = currentTime || new Date();
  const tweetTime = new Date(influencerTweetTimestamp);
  const minutesDiff = (now - tweetTime) / (1000 * 60);
  
  // 引用リポストのピーク時間（UTC 0,1,20,21）かどうかをチェック
  // getPeakMapForHour()で定義された時刻を信頼し、isPeakTimeWindowチェックは削除
  const hour = now.getUTCHours();
  const quoteRepostPeakHours = [0, 1, 20, 21]; // vercel.jsonの設定に基づく
  if (!quoteRepostPeakHours.includes(hour)) {
    return false;
  }
  
  // createdAtが存在しない場合、または現在時刻に近すぎる場合（5分以内）は、
  // 実際の投稿時刻が取得できていない可能性が高いため、タイミングチェックをスキップ
  // ピーク時間であれば投稿を許可（インプレッション最大化のため）
  if (minutesDiff < 5) {
    // 現在時刻に近すぎる = createdAtが実際の投稿時刻ではない可能性が高い
    // ピーク時間であれば投稿を許可
    return true;
  }
  
  // 実際の投稿時刻が取得できている場合、Grok推奨の10-20分以内をチェック
  // Grok推奨: 10-20分以内（アルゴリズムの「新鮮度」ボーナス最大）
  if (minutesDiff < 10 || minutesDiff > 20) {
    return false;
  }
  
  return true;
}

/**
 * 1日の投稿数を取得（Vercel KV）
 * 統一実装: すべてのAPIファイルで使用
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<number>} 1日の投稿数
 */
async function getDailyPostCount(dateString) {
  let kv = null;
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    console.warn('[Optimization] @vercel/kv not available for daily post count');
    return 0;
  }
  
  if (!kv) {
    return 0;
  }
  
  try {
    // 統一キーを使用: x:posts_count:${dateString}
    const count = await kv.get(`x:posts_count:${dateString}`) || 0;
    return typeof count === 'number' ? count : parseInt(count) || 0;
  } catch (error) {
    console.warn('[Optimization] Failed to get daily post count:', error.message);
    return 0;
  }
}

/**
 * 1日の投稿数をインクリメント（Vercel KV）
 * 統一実装: すべてのAPIファイルで使用
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {number} count - インクリメント数（デフォルト: 1）
 * @returns {Promise<number>} 更新後の投稿数
 */
async function incrementDailyPostCount(dateString, count = 1) {
  let kv = null;
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    console.warn('[Optimization] @vercel/kv not available for daily post count');
    return 0;
  }
  
  if (!kv) {
    return 0;
  }
  
  try {
    const key = `x:posts_count:${dateString}`;
    const current = await getDailyPostCount(dateString);
    const newCount = current + count;
    await kv.set(key, newCount, { ex: 86400 * 2 }); // 2日間保持
    return newCount;
  } catch (error) {
    console.warn('[Optimization] Failed to increment daily post count:', error.message);
    return 0;
  }
}

/**
 * 1日の投稿上限をチェック
 * インプレッション最大化: 総投稿数を35-45/日に増加（スパム判定回避しつつ最大化）
 */
function checkDailyPostLimit(currentPostCount, maxPosts = 45) {
  return currentPostCount < maxPosts;
}

/**
 * 1時間あたりの投稿数制限をチェック
 * Grok推奨: ピーク時間帯にクラスター化（3-4/時間最大）
 * @param {number} currentHour - UTC時刻（0-23）
 * @param {number} currentHourlyPostCount - 現在の1時間あたりの投稿数
 * @param {number} maxPostsPerHour - 1時間あたりの最大投稿数（デフォルト: 4）
 * @returns {boolean} 投稿可能な場合 true
 */
function checkHourlyPostLimit(currentHourlyPostCount, maxPostsPerHour = 4) {
  // Grok推奨: ピーク時間帯にクラスター化（3-4/時間最大）
  return currentHourlyPostCount < maxPostsPerHour;
}

/**
 * 1時間あたりの投稿数を取得（Vercel KV）
 * @param {string} hourKey - 時間キー（例: "2026-01-24T14"）
 * @returns {Promise<number>} 1時間あたりの投稿数
 */
async function getHourlyPostCount(hourKey) {
  let kv = null;
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    console.warn('[Optimization] @vercel/kv not available for hourly post count');
    return 0;
  }
  
  if (!kv) {
    return 0;
  }
  
  try {
    const count = await kv.get(`x:hourly:${hourKey}`) || 0;
    return Number(count);
  } catch (error) {
    console.warn('[Optimization] Failed to get hourly post count:', error.message);
    return 0;
  }
}

/**
 * 1時間あたりの投稿数をインクリメント（Vercel KV）
 * @param {string} hourKey - 時間キー（例: "2026-01-24T14"）
 * @returns {Promise<number>} 更新後の投稿数
 */
async function incrementHourlyPostCount(hourKey) {
  let kv = null;
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    console.warn('[Optimization] @vercel/kv not available for hourly post count');
    return 0;
  }
  
  if (!kv) {
    return 0;
  }
  
  try {
    const key = `x:hourly:${hourKey}`;
    const count = await kv.incr(key);
    // TTL: 2時間後に自動削除（1時間のバッファ）
    await kv.expire(key, 7200);
    return count;
  } catch (error) {
    console.warn('[Optimization] Failed to increment hourly post count:', error.message);
    return 0;
  }
}

/**
 * エンゲージメント強化用のCTAを生成
 * Grok推奨: 質問+リンク+絵文字でクリック+リプライ複合を高評価
 * 更新: 2質問/投稿、3-5絵文字、2ハッシュタグ最大
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
 * 言語別絵文字スタイルを取得（Grok推奨: マルチ言語最適化）
 * @param {string} lang - 言語コード
 * @returns {Array<string>} 推奨絵文字配列（3-5個）
 */
function getLanguageEmojiStyle(lang) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  const emojiStyles = {
    'en': ['🚨', '🔥', '👇'], // Polls
    'es': ['¡', '🚨', '!'], // Questions
    'pt-br': ['🔥', '😱'], // Videos
    'ar': ['🔥', '🛑'], // Images (RTL)
    'ja': ['😱', '🔥'], // Threads
    'ko': ['🚨', '💥'], // Polls
  };
  
  return emojiStyles[normalizedLang] || emojiStyles['en'];
}

/**
 * フック戦略: 最初の280文字を最適化（Grok推奨: 70%読了率）
 * @param {string} text - 元のテキスト
 * @param {string} lang - 言語コード
 * @param {number} trapScore - Trap Score
 * @returns {string} 最適化されたフックテキスト
 */
function optimizeHookText(text, lang, trapScore) {
  const normalizedLang = (lang || 'en').toLowerCase();
  const emojis = getLanguageEmojiStyle(normalizedLang);
  
  // Grok推奨: フック構造 [🚨 Influencer] TRAPPED! Score: 92/100 😱
  const hookTemplates = {
    'en': `${emojis[0] || '🚨'} TRAPPED! Score: ${trapScore}/100 ${emojis[1] || '😱'}\n\n`,
    'ja': `${emojis[0] || '😱'} トラップ検出！スコア: ${trapScore}/100 ${emojis[1] || '🔥'}\n\n`,
    'es': `${emojis[0] || '¡'}¡TRAMPA DETECTADA! Puntuación: ${trapScore}/100 ${emojis[1] || '🚨'}!\n\n`,
    'pt-br': `${emojis[0] || '🔥'} ARMADILHA DETECTADA! Pontuação: ${trapScore}/100 ${emojis[1] || '😱'}\n\n`,
    'ar': `${emojis[0] || '🔥'} تم اكتشاف فخ! النتيجة: ${trapScore}/100 ${emojis[1] || '🛑'}\n\n`,
    'ko': `${emojis[0] || '🚨'} 함정 감지! 점수: ${trapScore}/100 ${emojis[1] || '💥'}\n\n`,
  };
  
  const hook = hookTemplates[normalizedLang] || hookTemplates['en'];
  
  // フックを先頭に追加（280文字制限内）
  const maxHookLength = 50;
  const remainingLength = 280 - hook.length - 10; // 10文字のバッファ
  const optimizedText = hook + text.substring(0, Math.min(text.length, remainingLength));
  
  return optimizedText.substring(0, 280);
}

/**
 * ベロシティ戦術: 投稿直後の自己質問を生成（Grok推奨）
 * @param {string} lang - 言語コード
 * @param {number} trapScore - Trap Score
 * @returns {Array<string>} 3つの質問配列
 */
function generateVelocitySelfQuestions(lang, trapScore) {
  const normalizedLang = (lang || 'en').toLowerCase();
  
  const questionTemplates = {
    'en': [
      `Why ${trapScore}? 👇`,
      `Thoughts? Reply your score!`,
      `Score your trap? 🗳️`,
    ],
    'ja': [
      `なぜ${trapScore}？ 👇`,
      `どう思う？スコアをリプライ！`,
      `あなたのトラップスコアは？ 🗳️`,
    ],
    'es': [
      `¿Por qué ${trapScore}? 👇`,
      `¿Pensamientos? ¡Responde tu puntuación!`,
      `¿Puntuación de tu trampa? 🗳️`,
    ],
    'pt-br': [
      `Por que ${trapScore}? 👇`,
      `Pensamentos? Responda sua pontuação!`,
      `Pontuação da sua armadilha? 🗳️`,
    ],
    'ar': [
      `لماذا ${trapScore}؟ 👇`,
      `أفكار؟ أجب بنتيجتك!`,
      `نتيجة فخك؟ 🗳️`,
    ],
    'ko': [
      `왜 ${trapScore}? 👇`,
      `생각? 점수를 답글!`,
      `당신의 함정 점수는? 🗳️`,
    ],
  };
  
  return questionTemplates[normalizedLang] || questionTemplates['en'];
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

/**
 * 時間帯別のピークマップを取得
 * Grok推奨: 各時間帯に処理すべき言語と投稿タイプを定義
 * @param {number} hour - UTC時刻（0-23）
 * @returns {Object} { langs: Array<string>, type: 'quote'|'free_report'|'minimal', count: number }
 */
function getPeakMapForHour(hour) {
  // Grok推奨: クラスター化とピーク時間最適化（2026-01-25更新）
  // エンゲージメント速度最大化のため、3-4投稿/30分のクラスター化
  // x-quote-repost: UTC 0,1,13,14,20,21,22（クラスター化）
  // x-post-free-report: UTC 12,13,14,15,18（クラスター化）
  // x-post-minimal-version-cron: UTC 8,20（2回/日）
  
  // UTC 13:00と14:00、20:00は複数のタイプが重複するため、特別処理
  if (hour === 13) {
    // UTC 13:00: KO free_report + KO/JA quote（クラスター化）
    return { langs: ['ko', 'ja'], type: 'quote', count: 2, alsoFreeReport: ['ko'] };
  }
  if (hour === 14) {
    // UTC 14:00: EN/PT-BR free_report + JA quote（クラスター化）
    return { langs: ['en', 'pt-br', 'ja'], type: 'free_report', count: 1, alsoQuote: ['ja'] };
  }
  if (hour === 20) {
    // UTC 20:00: EN/PT-BR quote + EN minimal（クラスター化）
    return { langs: ['en', 'pt-br'], type: 'quote', count: 4, alsoMinimal: ['en'] };
  }
  
  const peakMap = {
    0: { langs: ['ar'], type: 'quote', count: 2 },      // AR: UTC 0:00 (ME peak)
    1: { langs: ['ko'], type: 'quote', count: 2 },      // KO: UTC 1:00 (KR eve)
    8: { langs: ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'], type: 'minimal', count: 1 }, // Minimal Version: UTC 8:00 (Global)
    12: { langs: ['en'], type: 'free_report', count: 1 }, // EN: UTC 12:00 (US morn)
    15: { langs: ['es'], type: 'free_report', count: 1 }, // ES: UTC 15:00 (LATAM)
    18: { langs: ['ar'], type: 'free_report', count: 1 }, // AR: UTC 18:00 (ME)
    21: { langs: ['es'], type: 'quote', count: 2 },      // ES: UTC 21:00 (LATAM)
    22: { langs: ['pt-br', 'es'], type: 'quote', count: 2 }, // PT-BR/ES: UTC 22:00 (LATAM) - クラスター化
  };
  
  return peakMap[hour] || { langs: [], type: null, count: 0 };
}

/**
 * 現在時刻に処理すべき言語を取得
 * @param {number} hour - UTC時刻（0-23）
 * @returns {Object} { langs: Array<string>, type: 'quote'|'free_report'|'minimal', count: number }
 */
function getLanguagesForCurrentHour(hour) {
  return getPeakMapForHour(hour);
}

module.exports = {
  getLanguagePeakHours,
  isPeakHourForLang,
  isPeakTimeWindow,
  getPeakMapForHour,
  getLanguagesForCurrentHour,
  getThreadStrategy,
  checkHourlyPostLimit,
  getHourlyPostCount,
  incrementHourlyPostCount,
  generatePollOptions,
  getOptimizedHashtags,
  getContentFormat,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  getDailyPostCount,
  incrementDailyPostCount,
  generateEngagementCTA,
  getTrendyHashtags,
  getLanguageEmojiStyle,
  optimizeHookText,
  generateVelocitySelfQuestions,
};
