// api/x-post-free-report.js
// 無料版レポートX投稿（6言語対応）
// 無料版レポート配信後に自動実行

const { postTweet, uploadMedia, replyToTweet } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { getTweetMetrics } = require('../services/x/metrics');
const {
  getThreadStrategy,
  generatePollOptions,
  getOptimizedHashtags,
  getContentFormat,
  generateEngagementCTA,
  isPeakHourForLang,
} = require('../services/x/optimization');
const fs = require('fs');
const path = require('path');

// Vercel KV（投稿履歴追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[X Post] @vercel/kv not available:', error.message);
}

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const normalizedBase = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(normalizedBase) ? normalizedBase : null;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalizedValue = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalizedValue)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalizedValue)) return false;
  return defaultValue;
}

function getTelegramDeepLinkWithSource(lang, source = 'telegram', options = {}) {
  let botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  botUsername = botUsername.replace(/^@/, '');
  const normalizedLang = normalizeLang(lang) || 'en';
  
  // ソース別のDeep Link
  const sourceMap = {
    'telegram': `minimal_${normalizedLang}`,
    'x_direct': `minimal_${normalizedLang}_x`,
    'x_quote': `minimal_${normalizedLang}_x_quote`
  };
  
  const startParam = sourceMap[source] || sourceMap['telegram'];
  let deepLink = `https://t.me/${botUsername}?start=${startParam}`;
  
  // Grok推奨: UTMパラメータ強化（ソース追跡強化）
  const utmParams = [];
  if (options.utm_source) {
    utmParams.push(`utm_source=${encodeURIComponent(options.utm_source)}`);
  } else {
    utmParams.push(`utm_source=x_${source}`);
  }
  
  if (options.utm_medium) {
    utmParams.push(`utm_medium=${encodeURIComponent(options.utm_medium)}`);
  } else {
    utmParams.push(`utm_medium=social`);
  }
  
  if (options.utm_campaign) {
    utmParams.push(`utm_campaign=${encodeURIComponent(options.utm_campaign)}`);
  } else {
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    utmParams.push(`utm_campaign=trap_defence_${normalizedLang}_${dateStr}`);
  }
  
  if (options.utm_content) {
    utmParams.push(`utm_content=${encodeURIComponent(options.utm_content)}`);
  }
  
  if (utmParams.length > 0) {
    deepLink += `&${utmParams.join('&')}`;
  }
  
  return deepLink;
}

// 言語別ハッシュタグ
const LANG_HASHTAGS = {
  en: '#BTC #CryptoTrading #TrapDefence',
  ja: '#BTC #仮想通貨 #トレード #TrapDefence',
  es: '#BTC #Cripto #Trading #TrapDefence',
  'pt-br': '#BTC #Cripto #Trading #TrapDefence',
  ar: '#BTC #Crypto #تداول #بيتكوين #TrapDefence',
  ko: '#BTC #비트코인 #코인 #트레이딩 #TrapDefence',
};

// Xアルゴリズム最適化: 引用リポスト用短縮版（140文字以内）
const QUOTE_REPOST_TEMPLATES = {
  en: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const netflowStr = exchangeNetflow ? `Inflow +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    
    // エンゲージメント最大化: 質問を含める
    const question = trapScore <= 25 ? 'You waiting or trading?' : 'Protecting capital or chasing?';
    
    return `🚨 Trap Score ${trapScore}/100: VERY LOW RISK! BTC ${priceStr} ${changeStr} ${netflowStr}. Patience wins! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  ja: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? '待機中？それとも取引中？' : '資本保護？それとも追いかけ中？';
    
    return `🚨 Trap Score ${trapScore}/100: 極低リスク！BTC ${priceStr} ${changeStr}。忍耐が勝利！${question} #BTC #TrapDefence ${deepLink}`;
  },
  es: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? '¿Esperando o operando?' : '¿Protegiendo capital o persiguiendo?';
    
    return `🚨 Trap Score ${trapScore}/100: ¡RIESGO MUY BAJO! BTC ${priceStr} ${changeStr}. ¡La paciencia gana! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  'pt-br': (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? 'Esperando ou operando?' : 'Protegendo capital ou perseguindo?';
    
    return `🚨 Trap Score ${trapScore}/100: RISCO MUITO BAIXO! BTC ${priceStr} ${changeStr}. Paciência vence! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  ar: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? 'هل تنتظر أم تتداول؟' : 'هل تحمي رأس المال أم تطارد؟';
    
    return `🚨 Trap Score ${trapScore}/100: مخاطر منخفضة جداً! BTC ${priceStr} ${changeStr}. الصبر يفوز! ${question} #BTC #TrapDefence ${deepLink}`;
  },
  ko: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const question = trapScore <= 25 ? '대기 중인가요? 거래 중인가요?' : '자본 보호 중인가요? 추격 중인가요?';
    
    return `🚨 Trap Score ${trapScore}/100: 매우 낮은 리스크! BTC ${priceStr} ${changeStr}. 인내가 승리! ${question} #BTC #TrapDefence ${deepLink}`;
  },
};

// 言語別ツイートテンプレート（Xアルゴリズム最適化版: 280文字以内、エンゲージメント最大化）
const TWEET_TEMPLATES = {
  en: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'VERY LOW RISK ✅' : 
                     trapScore <= 50 ? 'LOW RISK ⚠️' : 
                     trapScore <= 75 ? 'HIGH RISK 🚨' : 
                     'VERY HIGH RISK 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `(${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)` : '';
    const netflowStr = exchangeNetflow ? `| Netflow: +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `| Whale: ${(whaleRatio * 100).toFixed(0)}%` : '';
    
    // エンゲージメント最大化: 質問を含める
    const question = trapScore <= 25 ? 'You protecting capital? Or chasing? Reply below!' : 'Your biggest trap fear? Share below!';
    
    return `🌤️ Trap Defence BTC Free Report 🚨 ${scoreText}!

🎯 Trap Score: ${trapScore}/100 - BTC ${priceStr} ${changeStr}
📊 ${netflowStr} ${whaleStr}

💡 Stable now, but traps lurk. Dr. Grok: "Patience is strength."

${question}

✅ Free: Score only | Full: Real-time alerts + AI insights
🚀 Upgrade: ${deepLink} #BTC #TrapDefence #CryptoTrading

(Education only. Not advice)`;
  },
  ja: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? '極低リスク ✅' : 
                     trapScore <= 50 ? '低リスク ⚠️' : 
                     trapScore <= 75 ? '高リスク 🚨' : 
                     '極高リスク 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `(${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)` : '';
    const netflowStr = exchangeNetflow ? `| ネットフロー: +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `| クジラ: ${(whaleRatio * 100).toFixed(0)}%` : '';
    
    const question = trapScore <= 25 ? '資本保護中？それとも追いかけ中？下にリプライ！' : '最大のトラップ恐怖は？下に共有！';
    
    return `🌤️ Trap Defence BTC 無料レポート 🚨 ${scoreText}！

🎯 Trap Score: ${trapScore}/100 - BTC ${priceStr} ${changeStr}
📊 ${netflowStr} ${whaleStr}

💡 今は安定、でもトラップは潜む。Dr. Grok: 「忍耐は強さ」

${question}

✅ 無料: スコアのみ | 完全: リアルタイムアラート + AI分析
🚀 アップグレード: ${deepLink} #BTC #TrapDefence #仮想通貨

(教育目的のみ。アドバイスではありません)`;
  },
  es: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'RIESGO MUY BAJO ✅' : 
                     trapScore <= 50 ? 'RIESGO BAJO ⚠️' : 
                     trapScore <= 75 ? 'RIESGO ALTO 🚨' : 
                     'RIESGO MUY ALTO 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `(${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)` : '';
    const netflowStr = exchangeNetflow ? `| Flujo: +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `| Ballenas: ${(whaleRatio * 100).toFixed(0)}%` : '';
    
    const question = trapScore <= 25 ? '¿Protegiendo capital? ¿O persiguiendo? ¡Responde abajo!' : '¿Tu mayor miedo de trampa? ¡Comparte abajo!';
    
    return `🌤️ Trap Defence BTC Informe Gratuito 🚨 ¡${scoreText}!

🎯 Trap Score: ${trapScore}/100 - BTC ${priceStr} ${changeStr}
📊 ${netflowStr} ${whaleStr}

💡 Estable ahora, pero trampas acechan. Dr. Grok: "La paciencia es fuerza."

${question}

✅ Gratis: Solo puntuación | Completo: Alertas + análisis IA
🚀 Actualiza: ${deepLink} #BTC #TrapDefence #Cripto

(Solo educación. No es consejo)`;
  },
  'pt-br': (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'RISCO MUITO BAIXO ✅' : 
                     trapScore <= 50 ? 'RISCO BAIXO ⚠️' : 
                     trapScore <= 75 ? 'RISCO ALTO 🚨' : 
                     'RISCO MUITO ALTO 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `(${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)` : '';
    const netflowStr = exchangeNetflow ? `| Fluxo: +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `| Baleias: ${(whaleRatio * 100).toFixed(0)}%` : '';
    
    const question = trapScore <= 25 ? 'Protegendo capital? Ou perseguindo? Responda abaixo!' : 'Seu maior medo de armadilha? Compartilhe abaixo!';
    
    return `🌤️ Trap Defence BTC Relatório Gratuito 🚨 ${scoreText}!

🎯 Trap Score: ${trapScore}/100 - BTC ${priceStr} ${changeStr}
📊 ${netflowStr} ${whaleStr}

💡 Estável agora, mas armadilhas espreitam. Dr. Grok: "Paciência é força."

${question}

✅ Grátis: Apenas pontuação | Completo: Alertas + insights IA
🚀 Atualize: ${deepLink} #BTC #TrapDefence #Cripto

(Apenas educação. Não é conselho)`;
  },
  ar: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'مخاطر منخفضة جداً ✅' : 
                     trapScore <= 50 ? 'مخاطر منخفضة ⚠️' : 
                     trapScore <= 75 ? 'مخاطر عالية 🚨' : 
                     'مخاطر عالية جداً 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `(${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)` : '';
    const netflowStr = exchangeNetflow ? `| التدفق: +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `| الحيتان: ${(whaleRatio * 100).toFixed(0)}%` : '';
    
    const question = trapScore <= 25 ? 'هل تحمي رأس المال؟ أم تطارد؟ أجب أدناه!' : 'أكبر خوفك من الفخاخ؟ شارك أدناه!';
    
    return `🌤️ Trap Defence BTC تقرير مجاني 🚨 ${scoreText}!

🎯 Trap Score: ${trapScore}/100 - BTC ${priceStr} ${changeStr}
📊 ${netflowStr} ${whaleStr}

💡 مستقر الآن، لكن الفخاخ تكمن. Dr. Grok: "الصبر قوة."

${question}

✅ مجاني: النقاط فقط | كامل: تنبيهات + تحليل ذكي
🚀 ترقية: ${deepLink} #BTC #TrapDefence #Crypto

(للتثقيف فقط. ليس نصيحة)`;
  },
  ko: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? '매우 낮은 리스크 ✅' : 
                     trapScore <= 50 ? '낮은 리스크 ⚠️' : 
                     trapScore <= 75 ? '높은 리스크 🚨' : 
                     '매우 높은 리스크 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `(${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)` : '';
    const netflowStr = exchangeNetflow ? `| 순유입: +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `| 고래: ${(whaleRatio * 100).toFixed(0)}%` : '';
    
    const question = trapScore <= 25 ? '자본 보호 중인가요? 추격 중인가요? 아래에 답글!' : '가장 큰 함정 공포는? 아래에 공유!';
    
    return `🌤️ Trap Defence BTC 무료 리포트 🚨 ${scoreText}!

🎯 Trap Score: ${trapScore}/100 - BTC ${priceStr} ${changeStr}
📊 ${netflowStr} ${whaleStr}

💡 지금은 안정적이지만 함정이 도사리고 있습니다. Dr. Grok: "인내는 힘"

${question}

✅ 무료: 점수만 | 완전: 실시간 알림 + AI 분석
🚀 업그레이드: ${deepLink} #BTC #TrapDefence #비트코인

(교육 목적만. 조언 아님)`;
  },
};

/**
 * 1日の投稿数を取得（Vercel KV）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<number>} 投稿数
 */
async function getDailyPostCount(dateString) {
  if (!kv) return 0;
  try {
    const count = await kv.get(`x:posts:${dateString}`) || 0;
    return typeof count === 'number' ? count : parseInt(count) || 0;
  } catch (error) {
    console.warn('[X Post] Failed to get daily post count:', error.message);
    return 0;
  }
}

/**
 * 1日の投稿数をインクリメント（Vercel KV）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @param {number} count - インクリメント数（デフォルト: 1）
 * @returns {Promise<number>} 更新後の投稿数
 */
async function incrementDailyPostCount(dateString, count = 1) {
  if (!kv) return 0;
  try {
    const key = `x:posts:${dateString}`;
    const current = await getDailyPostCount(dateString);
    const newCount = current + count;
    await kv.set(key, newCount, { ex: 86400 * 2 }); // 2日間保持
    return newCount;
  } catch (error) {
    console.warn('[X Post] Failed to increment daily post count:', error.message);
    return 0;
  }
}

/**
 * 今日の無料版レポート投稿が既に実行されたかチェック（KVストレージ）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<boolean>} 既に実行済みの場合true
 */
async function hasPostedFreeReportToday(dateString) {
  if (!kv) return false;
  try {
    const key = `x:free-report:${dateString}`;
    const posted = await kv.get(key);
    return posted === true || posted === 'true';
  } catch (error) {
    console.warn('[X Post] Failed to check free report post status:', error.message);
    return false;
  }
}

/**
 * 今日の無料版レポート投稿をマーク（KVストレージ）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 */
async function markFreeReportPostedToday(dateString) {
  if (!kv) return;
  try {
    const key = `x:free-report:${dateString}`;
    await kv.set(key, true, { ex: 86400 * 2 }); // 2日間保持
  } catch (error) {
    console.warn('[X Post] Failed to mark free report post status:', error.message);
  }
}

/**
 * 無料版レポートX投稿をスレッド化で実行（最適化版）
 * Grok推奨: 1メイン + 2-3リプライに短縮、50%にポール追加
 */
async function postFreeReportAsThread(targetLangs, reportData) {
  const { trapScore, priceUsd, change24h, exchangeNetflow = null, whaleRatio = null } = reportData;
  const xStatus = getXConfigStatus();
  
  console.log('[X Post Free Report] postFreeReportAsThread called with:', {
    trapScore,
    priceUsd,
    change24h,
    targetLangs: targetLangs.length,
  });
  
  if (!xStatus.postingEnabled || !xStatus.configured) {
    console.error('[X Post Free Report] ❌ X posting disabled or not configured');
    return { success: false, skipped: true, reason: 'not_configured' };
  }
  
  if (xStatus.dryRun) {
    console.log('[X Post Free Report] 🧪 X dry-run enabled, skipping post');
    return { success: true, dryRun: true };
  }
  
  const results = [];
  let mainTweetId = null;
  const currentHour = new Date().getUTCHours();
  const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  console.log('[X Post Free Report] Checking duplicate prevention...');
  // 今日既に投稿済みかチェック（二重実行防止）
  const alreadyPosted = await hasPostedFreeReportToday(dateString);
  if (alreadyPosted) {
    console.log(`[X Post Free Report] ⏰ Free report already posted today (${dateString}), skipping to avoid duplicate`);
    return { success: false, skipped: true, reason: 'already_posted_today', dateString };
  }
  console.log('[X Post Free Report] ✅ No duplicate found, proceeding...');
  
  // 1日の投稿上限チェック（35投稿/日 - Grok推奨）
  const dailyPostCount = await getDailyPostCount(dateString);
  console.log(`[X Post Free Report] Daily post count: ${dailyPostCount}/35`);
  if (dailyPostCount >= 35) {
    console.log(`[X Post Free Report] ⏰ Daily post limit reached (${dailyPostCount}/35), skipping free report post`);
    return { success: false, skipped: true, reason: 'daily_limit_reached', dailyPostCount };
  }
  
  // コンテンツ形式を決定（シーケンスベース + リアルタイム最適化）
  const sequence = Math.floor(Date.now() / (1000 * 60 * 60)) % 10; // 時間ベースのシーケンス
  
  // 最適化案: リアルタイム最適化（メトリクスに基づく動的調整）
  let contentFormat;
  try {
    const { getOptimizedContentFormat } = require('../services/x/realTimeOptimizer');
    contentFormat = await getOptimizedContentFormat('en', sequence);
  } catch (error) {
    console.warn('[X Post Free Report] Failed to get optimized content format, using default:', error.message);
    contentFormat = getContentFormat(sequence);
  }
  
  const usePoll = true; // Grok推奨: 100%ポール追加
  const useVideo = contentFormat === 'thread_with_video'; // Grok推奨: 50%動画（リアルタイム最適化対応）
  
    // メイン投稿（英語）- Xアルゴリズム最適化版
    try {
      console.log('[X Post Free Report] Preparing main tweet...');
      let mainTweet = TWEET_TEMPLATES.en(trapScore, priceUsd, change24h, getTelegramDeepLinkWithSource('en', 'x_direct'), exchangeNetflow, whaleRatio);
    
      // Grok推奨: ハッシュタグを動的取得（トレンド1+ニッチ2）
      const { getTrendyHashtags } = require('../services/x/optimization');
      const optimizedHashtags = await getTrendyHashtags('en', 'BTC').catch(() => getOptimizedHashtags('en'));
      mainTweet = mainTweet.replace(/#BTC #CryptoTrading #TrapDefence/g, Array.isArray(optimizedHashtags) ? optimizedHashtags.join(' ') : optimizedHashtags);
      
      // Grok推奨: エンゲージメントCTAを100%追加（質問+リンク+絵文字）
      const cta = generateEngagementCTA('en');
      mainTweet = `${mainTweet}\n\n${cta}`;
      
      // Grok推奨: ポールオプションを100%追加（EN誘導）
      const pollOptions = {
        options: generatePollOptions('en', trapScore),
        duration_minutes: 1440, // 24時間
      };
      
      // Grok推奨: 絵文字2-3+緊急語を追加（🚀警戒！）
      const urgencyEmojis = ['🚀', '💥', '⚡'];
      const randomEmoji = urgencyEmojis[Math.floor(Math.random() * urgencyEmojis.length)];
      const urgencyText = trapScore >= 50 ? `${randomEmoji} HIGH RISK ALERT!` : `${randomEmoji} LOW RISK - Patience wins!`;
      mainTweet = `${urgencyText}\n\n${mainTweet}`;
      
      // Grok推奨: Carousel Media Stacking（動画+画像カルーセル、最大4枚）
      // 50%以上の投稿に適用（リアルタイム最適化で動的調整）
      let mediaIds = [];
      let videoGenerated = false;
      let carouselGenerated = false;
      
      // リアルタイム最適化でカルーセル比率を決定
      let useCarousel = false;
      try {
        const { getRealTimeOptimization } = require('../services/x/realTimeOptimizer');
        const optimization = await getRealTimeOptimization('en');
        useCarousel = optimization?.videoRatio >= 0.5 || Math.random() < 0.5; // 50%の確率または最適化結果に基づく
      } catch (error) {
        console.warn('[X Post Free Report] Failed to get optimization, using default carousel ratio:', error.message);
        useCarousel = Math.random() < 0.5; // デフォルト50%の確率
      }
      
      if (useCarousel) {
        try {
          console.log('[X Post Free Report] 🎠 Generating carousel media (video + images)...');
          const { generateAndUploadCarousel } = require('../services/x/carouselGenerator');
          const carouselMediaIds = await generateAndUploadCarousel(reportData, 'en', {
            maxItems: 4,
            includeVideo: useVideo,
          });
          
          if (carouselMediaIds.length > 0) {
            mediaIds = carouselMediaIds;
            carouselGenerated = true;
            videoGenerated = carouselMediaIds.length > 0; // 最初のメディアが動画の可能性
            console.log(`[X Post Free Report] ✅ Carousel media attached: ${carouselMediaIds.length} items`);
          }
        } catch (error) {
          console.warn('[X Post Free Report] Failed to generate carousel, falling back to single video:', error.message);
        }
      }
      
      // フォールバック: カルーセル生成失敗時は単一動画を試行
      if (!carouselGenerated && useVideo) {
        try {
          const { generateBTCChartVideo, uploadVideoForTweet } = require('../services/x/videoGenerator');
          const videoBuffer = await generateBTCChartVideo(reportData, 'en');
          if (videoBuffer) {
            const videoMediaId = await uploadVideoForTweet(videoBuffer);
            if (videoMediaId) {
              mediaIds.push(videoMediaId);
              videoGenerated = true;
              console.log(`[X Post Free Report] ✅ Video attached: ${videoMediaId}`);
            }
          }
        } catch (error) {
          console.warn('[X Post Free Report] Failed to generate/upload video, continuing without video:', error.message);
          // フォールバック: 動画生成失敗時はポールを追加（エンゲージメント維持）
          if (!pollOptions) {
            pollOptions = generatePollOptions('en', trapScore);
            console.log('[X Post Free Report] Fallback: Added poll due to video generation failure');
          }
        }
      }
      
      // 最適化案: リアルタイム最適化（メトリクスに基づく動的調整）
      try {
        const { getOptimizedCTA } = require('../services/x/realTimeOptimizer');
        const optimizedCTA = await getOptimizedCTA('en');
        if (optimizedCTA && optimizedCTA !== mainTweet) {
          // CTAを最適化（既存のCTAを置き換え）
          mainTweet = mainTweet.replace(/🚀.*👇/g, optimizedCTA);
          console.log('[X Post Free Report] ✅ CTA optimized based on real-time metrics');
        }
      } catch (error) {
        console.warn('[X Post Free Report] Failed to optimize CTA:', error.message);
      }
      
      console.log('[X Post Free Report] Posting main tweet to X API...');
      console.log('[X Post Free Report] Tweet preview:', mainTweet.substring(0, 100) + '...');
      const mainResult = await postTweet(mainTweet.substring(0, 280), mediaIds, pollOptions);
      mainTweetId = mainResult.id;
      console.log(`[X Post Free Report] ✅ Main tweet posted successfully: ${mainTweetId}`);
      
      await incrementDailyPostCount(dateString, 1); // 投稿数をインクリメント
      await markFreeReportPostedToday(dateString); // 今日の投稿をマーク
      
      // Grok推奨: Velocity Boost（初期エンゲージメント爆速化）
      // 投稿直後5分以内に子アカウントから高品質リプライを自動投入
      try {
        const { boostVelocity } = require('../services/x/velocityBooster');
        const velocityContext = {
          contentType: useVideo ? 'video' : usePoll ? 'poll' : 'thread',
          trapScore,
          priceUsd,
          change24h,
        };
        await boostVelocity(mainTweetId, 'en', velocityContext);
        console.log(`[X Post Free Report] ✅ Velocity Boost scheduled for ${mainTweetId}`);
      } catch (error) {
        console.warn('[X Post Free Report] Failed to schedule velocity boost:', error.message);
      }
      
      // 最適化案: A/Bテスト結果を記録
      try {
        const { recordABTestResult } = require('../services/x/abTesting');
        const tweetMetrics = await getTweetMetrics(mainTweetId, true).catch(() => null);
        if (tweetMetrics) {
          await recordABTestResult('content_format', contentFormat, {
            impressions: tweetMetrics.nonPublicMetrics?.impression_count || tweetMetrics.organicMetrics?.impression_count || 0,
            engagements: (tweetMetrics.publicMetrics?.like_count || 0) +
                        (tweetMetrics.publicMetrics?.retweet_count || 0) +
                        (tweetMetrics.publicMetrics?.reply_count || 0) +
                        (tweetMetrics.publicMetrics?.quote_count || 0),
            clicks: tweetMetrics.nonPublicMetrics?.url_link_clicks || tweetMetrics.organicMetrics?.url_link_clicks || 0,
          });
        }
      } catch (error) {
        console.warn('[X Post Free Report] Failed to record A/B test result:', error.message);
      }
      
      results.push({ lang: 'en', success: true, tweetId: mainTweetId, isMain: true, hasPoll: !!pollOptions, hasVideo: videoGenerated });
      console.log(`[X Post Free Report] ✅ Main tweet posted: ${mainTweetId}${pollOptions ? ' (with poll)' : ''}${videoGenerated ? ' (with video)' : ''}`);
      
      // Grok推奨: EN実測ダッシュボード用メトリクス記録
      try {
        const { recordEngagementMetrics } = require('./x-engagement-metrics');
        const { getTweetMetrics } = require('../services/x/metrics');
        const tweetMetrics = await getTweetMetrics(mainTweetId, true); // 自分のツイートなのでnon_public_metrics取得可能
        if (tweetMetrics) {
          await recordEngagementMetrics(mainTweetId, {
            impressions: tweetMetrics.nonPublicMetrics?.impression_count || tweetMetrics.publicMetrics?.impression_count || 0,
            engagements: (tweetMetrics.publicMetrics?.like_count || 0) +
                        (tweetMetrics.publicMetrics?.retweet_count || 0) +
                        (tweetMetrics.publicMetrics?.reply_count || 0) +
                        (tweetMetrics.publicMetrics?.quote_count || 0),
            clicks: tweetMetrics.nonPublicMetrics?.url_link_clicks || 0,
            replies: tweetMetrics.publicMetrics?.reply_count || 0,
            retweets: tweetMetrics.publicMetrics?.retweet_count || 0,
            likes: tweetMetrics.publicMetrics?.like_count || 0,
            quoteTweets: tweetMetrics.publicMetrics?.quote_count || 0,
            lang: 'en',
            source: 'free_report',
            hasPoll: !!pollOptions,
          });
        }
      } catch (error) {
        console.warn('[X Post Free Report] Failed to record engagement metrics:', error.message);
      }
      
      // Grok推奨: エンゲージメントループ実行（子アカウント3で自リプループ）
      try {
        const { executeEngagementLoop } = require('../services/x/engagementLoop');
        executeEngagementLoop(mainTweetId, 'en', reportData).catch(error => {
          console.warn('[X Post Free Report] Failed to execute engagement loop:', error.message);
        });
        console.log(`[X Post Free Report] 🚀 Engagement loop scheduled for tweet ${mainTweetId}`);
      } catch (error) {
        console.warn('[X Post Free Report] Failed to schedule engagement loop:', error.message);
      }
    } catch (error) {
      console.error(`[X Post Free Report] ❌ Failed to post main tweet:`, error.message);
      console.error(`[X Post Free Report] Error stack:`, error.stack);
      results.push({ lang: 'en', success: false, error: error.message });
      return { success: false, results, error: error.message };
    }
  
  // Grok推奨: スレッド戦略（1メイン + 3リプライ）
  const threadStrategy = getThreadStrategy('en');
  const replyCount = 3; // Grok推奨: 3リプライで滞在時間延長
  
  // スレッド投稿（残り言語から最適な数を選択）
  const remainingLangs = targetLangs.filter(lang => lang !== 'en');
  const langsToPost = remainingLangs.slice(0, replyCount); // Grok推奨: 3言語
  
  for (let i = 0; i < langsToPost.length; i++) {
    const lang = langsToPost[i];
    
    // ピーク時間チェック（オプション: ピーク時間外はスキップ可能）
    if (!isPeakHourForLang(lang, currentHour)) {
      console.log(`⏰ Skipping ${lang} (not peak hour: ${currentHour} UTC)`);
      continue;
    }
    
    try {
      const threadText = `${i + 2}/${replyCount + 1} [${lang.toUpperCase()}] ${TWEET_TEMPLATES[lang](trapScore, priceUsd, change24h, getTelegramDeepLinkWithSource(lang, 'x_direct'), exchangeNetflow, whaleRatio)}`;
      
      // Grok推奨: ハッシュタグを動的取得（トレンド1+ニッチ2）
      const { getTrendyHashtags } = require('../services/x/optimization');
      const langHashtags = await getTrendyHashtags(lang, 'BTC').catch(() => getOptimizedHashtags(lang));
      const optimizedThreadText = threadText.replace(/#BTC.*#TrapDefence/g, Array.isArray(langHashtags) ? langHashtags.join(' ') : langHashtags);
      
      // スレッドはリプライとして投稿
      const threadResult = await replyToTweet(optimizedThreadText.substring(0, 280), mainTweetId);
      await incrementDailyPostCount(dateString, 1); // 投稿数をインクリメント
      results.push({ lang, success: true, tweetId: threadResult.id, isThread: true });
      console.log(`✅ Thread ${i + 2}/${replyCount + 1} posted for ${lang}: ${threadResult.id}`);
      
      // レート制限対策（2秒待機）
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to post thread for ${lang}:`, error.message);
      results.push({ lang, success: false, error: error.message });
    }
  }
  
  return { success: true, results, mainTweetId, optimized: true };
}

/**
 * 無料版レポートX投稿を時間分散で実行
 */
async function postFreeReportTimeDispersed(targetLangs, reportData) {
  // 時間分散は後で実装（Grokが各言語のピーク時間帯を判断）
  // 現時点ではスレッド化を推奨
  return postFreeReportAsThread(targetLangs, reportData);
}

/**
 * 最新の市場データを取得（CryptoQuant APIから）
 */
async function fetchLatestMarketData() {
  try {
    // CryptoQuant APIから最新データを取得
    const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
    const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');
    
    // 価格データを取得
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const priceData = await priceRes.json();
    const priceUsd = priceData?.bitcoin?.usd || 0;
    const change24h = priceData?.bitcoin?.usd_24h_change || 0;
    
    // CryptoQuantデータを取得
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow().catch(() => null),
      getMinerPositionIndex().catch(() => null),
    ]);
    
    const exchangeNetflow = inflowData?.value || null;
    const mpi = mpiData?.value || null;
    
    // 深掘りデータを取得（Trap Score用）
    let trapScore = 25; // デフォルト
    let whaleRatio = null;
    
    try {
      const deepData = await getCQDeepMetrics('EN', {
        upbitPrice: priceUsd,
        usdKrwRate: 1300,
      });
      
      if (deepData?.trapScore != null) {
        trapScore = deepData.trapScore;
      }
      if (deepData?.whaleFlows?.whaleRatio != null) {
        whaleRatio = deepData.whaleFlows.whaleRatio;
      }
    } catch (error) {
      console.warn('[X Post] Failed to fetch deep metrics, using defaults:', error.message);
    }
    
    return {
      trapScore,
      priceUsd,
      change24h,
      exchangeNetflow,
      whaleRatio,
    };
  } catch (error) {
    console.error('[X Post] Failed to fetch latest market data:', error.message);
    // フォールバック: デフォルト値を使用
    return {
      trapScore: 25,
      priceUsd: 89859,
      change24h: -0.02,
      exchangeNetflow: null,
      whaleRatio: null,
    };
  }
}

/**
 * 無料版レポートX投稿を実行
 */
async function postFreeReportToX(reportData = null) {
  try {
    const xStatus = getXConfigStatus();
    
    if (!xStatus.postingEnabled) {
      console.log('ℹ️ X posting disabled by X_POSTING_ENABLED');
      return { success: false, skipped: true, error: 'X posting disabled' };
    }
    
    if (!xStatus.configured) {
      console.log(`ℹ️ X API not configured, missing: ${xStatus.missing.join(', ')}`);
      return { success: false, error: 'X API credentials missing', missing: xStatus.missing };
    }
    
    // レポートデータが提供されていない場合、最新の市場データを取得
    let finalReportData = reportData;
    if (!finalReportData || !finalReportData.trapScore || !finalReportData.priceUsd) {
      console.log('[X Post] Fetching latest market data...');
      const latestData = await fetchLatestMarketData();
      finalReportData = {
        ...latestData,
        ...reportData, // 提供されたデータで上書き
      };
    }
    
    const targetLangs = SUPPORTED_LANGS;
    const useThread = parseBoolean(process.env.X_FREE_REPORT_USE_THREAD, true);
    
    let result;
    if (useThread) {
      result = await postFreeReportAsThread(targetLangs, finalReportData);
    } else {
      result = await postFreeReportTimeDispersed(targetLangs, finalReportData);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Free report X post failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時
const handler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  console.log('[X Post Free Report] ========================================');
  console.log('[X Post Free Report] Cron job triggered at', new Date().toISOString());
  console.log('[X Post Free Report] ========================================');
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[X Post Free Report] ❌ Unauthorized: Invalid CRON_SECRET');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // KVストレージ接続確認
    if (!kv) {
      console.warn('[X Post Free Report] ⚠️ KV storage not available - duplicate prevention may not work');
    } else {
      console.log('[X Post Free Report] ✅ KV storage available');
    }
    
    // リクエストボディからレポートデータを取得（cron.jsから呼び出される場合）
    const reportData = req.body?.reportData || null;
    console.log('[X Post Free Report] Report data provided:', !!reportData);
    
    // X API設定状況を確認
    const xStatus = getXConfigStatus();
    console.log('[X Post Free Report] X API Status:', {
      configured: xStatus.configured,
      postingEnabled: xStatus.postingEnabled,
      dryRun: xStatus.dryRun,
      missing: xStatus.missing,
    });
    
    if (!xStatus.postingEnabled) {
      console.log('[X Post Free Report] ❌ X posting disabled by X_POSTING_ENABLED');
      return res.status(200).json({ success: false, skipped: true, error: 'X posting disabled' });
    }
    
    if (!xStatus.configured) {
      console.error(`[X Post Free Report] ❌ X API not configured, missing: ${xStatus.missing.join(', ')}`);
      return res.status(200).json({ 
        success: false, 
        error: 'X API credentials missing', 
        missing: xStatus.missing 
      });
    }
    
    if (xStatus.dryRun) {
      console.log('[X Post Free Report] 🧪 DRY RUN MODE - No actual posts will be made');
    }
    
    console.log('[X Post Free Report] Starting postFreeReportToX...');
    const result = await postFreeReportToX(reportData);
    
    console.log('[X Post Free Report] ========================================');
    console.log('[X Post Free Report] Result:', JSON.stringify(result, null, 2));
    console.log('[X Post Free Report] ========================================');
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[X Post Free Report] ========================================');
    console.error('[X Post Free Report] ❌ Handler error:', error.message);
    console.error('[X Post Free Report] Stack:', error.stack);
    console.error('[X Post Free Report] ========================================');
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};

module.exports = handler;
module.exports.postFreeReportToX = postFreeReportToX;
module.exports.fetchLatestMarketData = fetchLatestMarketData;
module.exports.QUOTE_REPOST_TEMPLATES = QUOTE_REPOST_TEMPLATES;
module.exports.TWEET_TEMPLATES = TWEET_TEMPLATES;
