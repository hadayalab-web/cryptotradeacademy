// api/x-post-free-report.js
// 無料版レポートX投稿（6言語対応）
// 無料版レポート配信後に自動実行

const { postTweet, uploadMedia, replyToTweet } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { discoverLeadsOnX } = require('../services/grok/client');
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

function getTelegramDeepLinkWithSource(lang, source = 'telegram') {
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
  return `https://t.me/${botUsername}?start=${startParam}`;
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
 * 無料版レポートX投稿をスレッド化で実行（最適化版）
 * Grok推奨: 1メイン + 2-3リプライに短縮、50%にポール追加
 */
async function postFreeReportAsThread(targetLangs, reportData) {
  const { trapScore, priceUsd, change24h, exchangeNetflow = null, whaleRatio = null } = reportData;
  const xStatus = getXConfigStatus();
  
  if (!xStatus.postingEnabled || !xStatus.configured) {
    console.log('ℹ️ X posting disabled or not configured');
    return { success: false, skipped: true };
  }
  
  if (xStatus.dryRun) {
    console.log('🧪 X dry-run enabled, skipping post');
    return { success: true, dryRun: true };
  }
  
  const results = [];
  let mainTweetId = null;
  const currentHour = new Date().getUTCHours();
  const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 1日の投稿上限チェック（25投稿/日）
  const dailyPostCount = await getDailyPostCount(dateString);
  if (dailyPostCount >= 25) {
    console.log(`⏰ Daily post limit reached (${dailyPostCount}/25), skipping free report post`);
    return { success: false, skipped: true, reason: 'daily_limit_reached', dailyPostCount };
  }
  
  // コンテンツ形式を決定（シーケンスベース）
  const sequence = Math.floor(Date.now() / (1000 * 60 * 60)) % 10; // 時間ベースのシーケンス
  const contentFormat = getContentFormat(sequence);
  const usePoll = contentFormat === 'thread_with_poll';
  
    // メイン投稿（英語）- Xアルゴリズム最適化版
    try {
      let mainTweet = TWEET_TEMPLATES.en(trapScore, priceUsd, change24h, getTelegramDeepLinkWithSource('en', 'x_direct'), exchangeNetflow, whaleRatio);
    
    // ハッシュタグを最適化（2-3個のニッチ）
    const optimizedHashtags = getOptimizedHashtags('en');
    mainTweet = mainTweet.replace(/#BTC #CryptoTrading #TrapDefence/g, optimizedHashtags.join(' '));
    
    // エンゲージメントCTAを追加（50%の確率）
    if (Math.random() < 0.5) {
      const cta = generateEngagementCTA('en');
      mainTweet = `${mainTweet}\n\n${cta}`;
    }
    
    // ポールオプションを準備（50%の確率）
    let pollOptions = null;
    if (usePoll) {
      pollOptions = {
        options: generatePollOptions('en', trapScore),
        duration_minutes: 1440, // 24時間
      };
    }
    
    const mainResult = await postTweet(mainTweet.substring(0, 280), [], pollOptions);
    mainTweetId = mainResult.id;
    await incrementDailyPostCount(dateString, 1); // 投稿数をインクリメント
    results.push({ lang: 'en', success: true, tweetId: mainTweetId, isMain: true, hasPoll: !!pollOptions });
    console.log(`✅ Main tweet posted: ${mainTweetId}${pollOptions ? ' (with poll)' : ''}`);
  } catch (error) {
    console.error(`❌ Failed to post main tweet:`, error.message);
    results.push({ lang: 'en', success: false, error: error.message });
    return { success: false, results };
  }
  
  // スレッド戦略を取得（最適化版: 1メイン + 2-3リプライ）
  const threadStrategy = getThreadStrategy('en');
  const replyCount = threadStrategy.replyCount || 3;
  
  // スレッド投稿（残り言語から最適な数を選択）
  const remainingLangs = targetLangs.filter(lang => lang !== 'en');
  const langsToPost = remainingLangs.slice(0, replyCount); // 最適化: 2-3言語のみ
  
  for (let i = 0; i < langsToPost.length; i++) {
    const lang = langsToPost[i];
    
    // ピーク時間チェック（オプション: ピーク時間外はスキップ可能）
    if (!isPeakHourForLang(lang, currentHour)) {
      console.log(`⏰ Skipping ${lang} (not peak hour: ${currentHour} UTC)`);
      continue;
    }
    
    try {
      const threadText = `${i + 2}/${replyCount + 1} [${lang.toUpperCase()}] ${TWEET_TEMPLATES[lang](trapScore, priceUsd, change24h, getTelegramDeepLinkWithSource(lang, 'x_direct'), exchangeNetflow, whaleRatio)}`;
      
      // ハッシュタグを最適化
      const langHashtags = getOptimizedHashtags(lang);
      const optimizedThreadText = threadText.replace(/#BTC.*#TrapDefence/g, langHashtags.join(' '));
      
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
    
    // デフォルトのレポートデータ（実際の実装では、cron.jsから渡される）
    const defaultReportData = {
      trapScore: reportData?.trapScore || 25,
      priceUsd: reportData?.priceUsd || 89859,
      change24h: reportData?.change24h || -0.02,
      exchangeNetflow: reportData?.exchangeNetflow || null,
      whaleRatio: reportData?.whaleRatio || null,
    };
    
    const targetLangs = SUPPORTED_LANGS;
    const useThread = parseBoolean(process.env.X_FREE_REPORT_USE_THREAD, true);
    
    let result;
    if (useThread) {
      result = await postFreeReportAsThread(targetLangs, defaultReportData);
    } else {
      result = await postFreeReportTimeDispersed(targetLangs, defaultReportData);
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
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // リクエストボディからレポートデータを取得（cron.jsから呼び出される場合）
    const reportData = req.body?.reportData || null;
    const result = await postFreeReportToX(reportData);
    
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = handler;
module.exports.postFreeReportToX = postFreeReportToX;
module.exports.QUOTE_REPOST_TEMPLATES = QUOTE_REPOST_TEMPLATES;
module.exports.TWEET_TEMPLATES = TWEET_TEMPLATES;
