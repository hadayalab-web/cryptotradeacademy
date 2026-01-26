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
  getLanguageEmojiStyle,
  optimizeHookText,
  generateVelocitySelfQuestions,
  getDailyPostCount,
  incrementDailyPostCount,
} = require('../services/x/optimization');
const { getWhopProductUrl } = require('../services/telegram/whop-links');
const fs = require('fs');
const path = require('path');

/**
 * Data URLをBufferに変換（Grok推奨: 動画・画像アップロード用）
 * @param {string} dataUrl - Data URL (data:image/png;base64,... または data:video/mp4;base64,...)
 * @returns {Promise<Buffer|null>} Bufferまたはnull
 */
async function convertDataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }
  
  // HTTP URLの場合はfetchで取得
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        console.warn(`[X Post] Failed to fetch media from URL: ${response.status}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.warn(`[X Post] Error fetching media from URL:`, error.message);
      return null;
    }
  }
  
  // Data URLの場合はBase64をデコード
  if (dataUrl.startsWith('data:')) {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.warn(`[X Post] Invalid Data URL format`);
      return null;
    }
    
    const base64Data = matches[2];
    try {
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.warn(`[X Post] Failed to decode base64 data:`, error.message);
      return null;
    }
  }
  
  return null;
}

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

/**
 * スレッドリプライを生成（Grok推奨: 深掘りコンテンツ）
 * @param {string} lang - 言語コード
 * @param {number} index - リプライインデックス（0始まり）
 * @param {number} total - 総リプライ数
 * @param {number} trapScore - Trap Score
 * @param {number} priceUsd - BTC価格
 * @param {number} change24h - 24時間変動率
 * @param {number} exchangeNetflow - 取引所流入
 * @param {number} whaleRatio - クジラ比率
 * @returns {string} スレッドリプライテキスト
 */
function generateThreadReply(lang, index, total, trapScore, priceUsd, change24h, exchangeNetflow, whaleRatio) {
  const normalizedLang = normalizeLang(lang) || 'en';
  const deepLink = getTelegramDeepLinkWithSource(normalizedLang, 'x_direct');
  
  // Grok推奨: スレッド内容を深掘り（データポイント、インサイト、CTA）
  const threadTemplates = {
    en: [
      `📊 Data Deep Dive:\n• Exchange Netflow: ${exchangeNetflow ? `+${exchangeNetflow} BTC` : 'Monitoring'}\n• Whale Ratio: ${whaleRatio ? `${whaleRatio}%` : 'Analyzing'}\n• Risk Level: ${trapScore <= 25 ? 'Low' : trapScore <= 50 ? 'Moderate' : 'High'}\n\n${deepLink}`,
      `💡 Key Insight:\n${trapScore <= 25 ? 'Market looks safe BUT whales positioning. Watch for sudden dumps.' : 'Strong trap signals detected. Defense mode ON.'}\n\n🛡️ Full members get real-time alerts BEFORE traps hit.\n\n${deepLink}`,
      `🚀 What's Your Move?\n• Reply with your price target\n• Share your biggest fear\n• Get free Trap Score daily\n\n${deepLink}\n\n#BTC #TrapDefence`,
    ],
    ja: [
      `📊 データ深掘り:\n• 取引所流入: ${exchangeNetflow ? `+${exchangeNetflow} BTC` : '監視中'}\n• クジラ比率: ${whaleRatio ? `${whaleRatio}%` : '分析中'}\n• リスクレベル: ${trapScore <= 25 ? '低' : trapScore <= 50 ? '中' : '高'}\n\n${deepLink}`,
      `💡 重要インサイト:\n${trapScore <= 25 ? '市場は安全に見えるがクジラがポジショニング中。突然のダンプに注意。' : '強いトラップシグナル検出。防御モードON。'}\n\n🛡️ フルメンバーはトラップ発生前にリアルタイムアラートを受信。\n\n${deepLink}`,
      `🚀 あなたの動きは？\n• 価格目標をリプライ\n• 最大の恐怖を共有\n• 無料Trap Scoreを毎日取得\n\n${deepLink}\n\n#BTC #TrapDefence`,
    ],
  };
  
  const templates = threadTemplates[normalizedLang] || threadTemplates.en;
  return templates[index % templates.length];
}

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

// 言語別ツイートテンプレート（Xアルゴリズム最適化版: Grok最適化済み、エンゲージメント最大化）
const TWEET_TEMPLATES = {
  en: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'VERY LOW RISK ✅' : 
                     trapScore <= 50 ? 'LOW RISK ⚠️' : 
                     trapScore <= 75 ? 'HIGH RISK 🚨' : 
                     'VERY HIGH RISK 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const netflowStr = exchangeNetflow ? `+${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}%` : '';
    const whaleDollarStr = whaleRatio && priceUsd ? `$${Math.floor((whaleRatio / 100) * priceUsd * 1000)}M+ ready` : '';
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
    
    // Grok最適化: 矛盾の提示（低リスクなのに売り圧力）
    const contradictionText = (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) 
      ? `\n🤔 Market stable NOW, but ${netflowStr} inflow & ${whaleStr} Whale Ratio scream SELLING PRESSURE. Calm before storm?`
      : `\n💡 Market stable NOW, but traps lurk. Stay alert!`;
    
    // Grok + Gemini統合: 質問CTA（アルゴリズム評価UP）
    // オープンエンド質問でリプライ誘導、投稿の20-30%を占めず自然配置
    // 質問CTAはツイートの最後に配置（Gemini推奨）
    const question = trapScore <= 25 
      ? (exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50 
        ? "What's YOUR move if whales dump? Reply below! 👇"
        : "What's your biggest fear in this market? Reply below! 👇")
      : "Protecting capital or chasing? Reply below! 👇";
    
    return `⚠️ URGENT ALERT: Trap Score ${trapScore}/100 – SAFE? Or Whale Trap Brewing?

🌤️ Trap Defence BTC - Free Report
🚨 EMERGENCY BRIEFING
📅 ${dateStr} ${timeStr}

━━━━━━━━━━━━━━━━━━━━
🎯 Today's Trap Score
━━━━━━━━━━━━━━━━━━━━
${trapScore}/100
✅ ${scoreText}: ${trapScore <= 25 ? 'Few traps spotted. But story changes FAST.' : 'Traps detected. Stay alert!'}

💰 BTC: ${priceStr} ${changeStr}${contradictionText}

━━━━━━━━━━━━━━━━━━━━
📊 Why Watch Closely
━━━━━━━━━━━━━━━━━━━━
${exchangeNetflow ? `• Exchanges flooded: ${netflowStr} IN – Sellers loading up\n` : ''}${whaleRatio ? `• Whales control ${whaleStr}: Dump risk ${whaleRatio > 50 ? 'moderate-high' : 'low-moderate'}\n` : ''}
💡 Pro Strategy:
✅ ${trapScore}/100 = Prep time! Pros wait for edge.
🛡️ One surprise sell = 10-20% wipeout. Defend now!

💊 Dr. Grok: "${trapScore <= 25 ? 'Low risk? Complacency kills. Prep or perish.' : 'High risk? Defense wins. Protect capital first.'}"

✅ Mindset: "Defense wins wars. Protect capital first."

━━━━━━━━━━━━━━━━━━━━
🚀 FULL REPORT UNLOCK

━━━━━━━━━━━━━━━━━━━━
🔥 UPGRADE NOW: PRO ACCESS (50% OFF DEFEND50)
━━━━━━━━━━━━━━━━━━━━
💎 Unlock Full Access + Alerts: ${getWhopProductUrl('en')}?promo=DEFEND50
🚨 Limited Time: DEFEND50 code expires soon!

(Or free daily score: ${deepLink})

Full: On-chain deep dive, AI alerts (AVOID LONG/SHORT), Exit Maps, Sentiment scan, Dr. Grok therapy.

🛡️ Miss one signal? Lose 10%+. Upgrade for bulletproof defense.

${question} #BTC

Educational only. Not advice.`;
  },
  ja: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? '非常に低いリスク ✅' : 
                     trapScore <= 50 ? '低リスク ⚠️' : 
                     trapScore <= 75 ? '高リスク 🚨' : 
                     '極高リスク 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const netflowStr = exchangeNetflow ? `+${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}%` : '';
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
    
    const contradictionText = (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) 
      ? `\n🤔 市場安定中、だが${netflowStr}流入 & ${whaleStr}クジラ比率が売り圧力叫ぶ。嵐前の静けさ？`
      : `\n💡 市場安定中、だがトラップは潜む。警戒せよ！`;
    
    const question = trapScore <= 25 
      ? (exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50 
        ? "クジラダンプ時のお前の策は？下にリプ！ 👇"
        : "この市場で最も大きな恐怖は何ですか？下にリプライ！ 👇")
      : "資本保護？それとも追いかけ中？下にリプライ！ 👇";
    
    return `⚠️ 緊急警報: Trap Score ${trapScore}/100 – 安全？それともクジラの罠が迫る？

🌤️ Trap Defence BTC - 無料レポート
🚨 緊急ブリーフィング
📅 ${dateStr} ${timeStr}

━━━━━━━━━━━━━━━━━━━━
🎯 本日のTrap Score
━━━━━━━━━━━━━━━━━━━━
${trapScore}/100
✅ ${scoreText}: ${trapScore <= 25 ? '罠少なく。だが急変！' : '罠検知。警戒せよ！'}

💰 BTC: ${priceStr} ${changeStr}${contradictionText}

━━━━━━━━━━━━━━━━━━━━
📊 データ裏付け
━━━━━━━━━━━━━━━━━━━━
${exchangeNetflow ? `• 取引所流入: ${netflowStr} – 売り手蓄積\n` : ''}${whaleRatio ? `• クジラ${whaleStr}: ダンプリスク${whaleRatio > 50 ? '中～高' : '低～中'}\n` : ''}
💡 プロ戦略:
✅ ${trapScore}/100 = 準備タイム！プロは優位待つ。
🛡️ 突然売りで-10-20%。今守れ！

💊 Dr. Grok: 「${trapScore <= 25 ? '低リスク？油断が死。備えよか滅びよ。' : '高リスク？守りが至高の攻め。資本保護第一。'}」

✅ マインド: 「守りが至高の攻め。資本保護第一。」

━━━━━━━━━━━━━━━━━━━━
🚀 フルレポート解禁

━━━━━━━━━━━━━━━━━━━━
🔥 今すぐアップグレード: PRO版アクセス（50%OFF DEFEND50）
━━━━━━━━━━━━━━━━━━━━
💎 フルアクセス+アラート解除: ${getWhopProductUrl('ja')}?promo=DEFEND50
🚨 期間限定: DEFEND50コードはまもなく期限切れ！

（または無料日次スコア: ${deepLink}）

フル: オン-chain全分析、AIアラート(LONG/SHORT回避)、出口マップ、センチメント、Dr. Grokメンタル支援。

🛡️ 1信号ミスで-10%+。アップグレードで鉄壁防御。

${question} #BTC

教育目的のみ。投資助言非也。`;
  },
  es: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'RIESGO MUY BAJO ✅' : 
                     trapScore <= 50 ? 'RIESGO BAJO ⚠️' : 
                     trapScore <= 75 ? 'RIESGO ALTO 🚨' : 
                     'RIESGO MUY ALTO 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const netflowStr = exchangeNetflow ? `+${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}%` : '';
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
    
    const contradictionText = (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) 
      ? `\n🤔 Mercado estable AHORA, pero ${netflowStr} inflow & ${whaleStr} Whale Ratio gritan PRESIÓN VENDEDORA. ¿Calma antes tormenta?`
      : `\n💡 Mercado estable AHORA, pero trampas acechan. ¡Mantente alerta!`;
    
    const question = trapScore <= 25 
      ? (exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50 
        ? "¿Cuál es TU jugada si ballenas venden? ¡Responde abajo! 👇"
        : "¿Cuál es tu mayor miedo en este mercado? ¡Responde abajo! 👇")
      : "¿Protegiendo capital o persiguiendo? ¡Responde abajo! 👇";
    
    return `⚠️ ALERTA URGENTE: Trap Score ${trapScore}/100 – ¿SEGURO? ¿O trampa de ballenas en marcha?

🌤️ Trap Defence BTC - Reporte Gratis
🚨 BRIEFING DE EMERGENCIA
📅 ${dateStr} ${timeStr}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score de Hoy
━━━━━━━━━━━━━━━━━━━━
${trapScore}/100
✅ ${scoreText}: ${trapScore <= 25 ? 'Pocos traps. Pero cambia RÁPIDO.' : 'Traps detectados. ¡Mantente alerta!'}

💰 BTC: ${priceStr} ${changeStr}${contradictionText}

━━━━━━━━━━━━━━━━━━━━
📊 Razones Datos
━━━━━━━━━━━━━━━━━━━━
${exchangeNetflow ? `• Exchanges inundados: ${netflowStr} EN – Vendedores cargando\n` : ''}${whaleRatio ? `• Ballenas ${whaleStr}: Riesgo dump ${whaleRatio > 50 ? 'medio-alto' : 'bajo-medio'}\n` : ''}
💡 Estrategia Pro:
✅ ${trapScore}/100 = ¡Tiempo prep! Pros esperan ventaja.
🛡️ Una venta sorpresa = -10-20%. ¡Defiende ya!

💊 Dr. Grok: "${trapScore <= 25 ? 'Bajo riesgo? Complacencia mata. Prepárate o perece.' : 'Alto riesgo? Defensa gana. Protege capital primero.'}"

✅ Mentalidad: "Defensa gana guerras. Protege capital primero."

━━━━━━━━━━━━━━━━━━━━
🚀 DESBLOQUEA REPORTE COMPLETO

Gratis: Solo score.
Full: Análisis on-chain, alertas AI (EVITA LONG/SHORT), Mapas salida, Escaneo sentimiento, Terapia Dr. Grok.

🛡️ ¿Perdiste señal? -10%+. Upgrade para defensa a prueba balas.

${question} #BTC

Solo educativo. No consejo financiero.`;
  },
  'pt-br': (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'RISCO MUITO BAIXO ✅' : 
                     trapScore <= 50 ? 'RISCO BAIXO ⚠️' : 
                     trapScore <= 75 ? 'RISCO ALTO 🚨' : 
                     'RISCO MUITO ALTO 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const netflowStr = exchangeNetflow ? `+${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}%` : '';
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
    
    const contradictionText = (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) 
      ? `\n🤔 Mercado estável AGORA, mas ${netflowStr} inflow & ${whaleStr} Whale Ratio gritam PRESSÃO DE VENDA. Calma antes da tempestade?`
      : `\n💡 Mercado estável AGORA, mas armadilhas espreitam. Fique alerta!`;
    
    const question = trapScore <= 25 
      ? (exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50 
        ? "Qual é o SEU plano se baleias dumparem? Responda abaixo! 👇"
        : "Qual é o seu maior medo neste mercado? Responda abaixo! 👇")
      : "Protegendo capital ou perseguindo? Responda abaixo! 👇";
    
    return `⚠️ ALERTA URGENTE: Trap Score ${trapScore}/100 – SEGURO? Ou armadilha de baleias se formando?

🌤️ Trap Defence BTC - Relatório Grátis
🚨 BRIEFING DE EMERGÊNCIA
📅 ${dateStr} ${timeStr}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score de Hoje
━━━━━━━━━━━━━━━━━━━━
${trapScore}/100
✅ ${scoreText}: ${trapScore <= 25 ? 'Poucos traps. Mas muda RÁPIDO.' : 'Traps detectados. Fique alerta!'}

💰 BTC: ${priceStr} ${changeStr}${contradictionText}

━━━━━━━━━━━━━━━━━━━━
📊 Por Que Ficar Atento
━━━━━━━━━━━━━━━━━━━━
${exchangeNetflow ? `• Exchanges lotados: ${netflowStr} ENTRADA – Vendedores carregando\n` : ''}${whaleRatio ? `• Baleias ${whaleStr}: Risco de dump ${whaleRatio > 50 ? 'médio-alto' : 'baixo-médio'}\n` : ''}
💡 Estratégia Pro:
✅ ${trapScore}/100 = Hora de prep! Pros esperam pela vantagem.
🛡️ Uma venda surpresa = -10-20%. Defenda agora!

💊 Dr. Grok: "${trapScore <= 25 ? 'Baixo risco? Complacência mata. Prepare-se ou pereça.' : 'Alto risco? Defesa vence. Proteja capital primeiro.'}"

✅ Mentalidade: "Defesa vence guerras. Proteja capital primeiro."

━━━━━━━━━━━━━━━━━━━━
🚀 DESTRAVE RELATÓRIO COMPLETO

━━━━━━━━━━━━━━━━━━━━
🔥 UPGRADE AGORA: ACESSO PRO (50% OFF DEFEND50)
━━━━━━━━━━━━━━━━━━━━
💎 Desbloqueie Acesso Completo + Alertas: ${getWhopProductUrl('pt-br')}?promo=DEFEND50
🚨 Tempo Limitado: Código DEFEND50 expira em breve!

(Ou score diário grátis: ${deepLink})

Full: Análise on-chain, alertas AI (EVITE LONG/SHORT), Mapas de saída, Análise sentimento, Terapia Dr. Grok.

🛡️ Perdeu sinal? -10%+. Upgrade para defesa à prova de balas.

${question} #BTC

Educacional apenas. Não é conselho financeiro.`;
  },
  ar: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? 'مخاطر منخفضة جداً ✅' : 
                     trapScore <= 50 ? 'مخاطر منخفضة ⚠️' : 
                     trapScore <= 75 ? 'مخاطر عالية 🚨' : 
                     'مخاطر عالية جداً 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const netflowStr = exchangeNetflow ? `+${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}%` : '';
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
    
    const contradictionText = (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) 
      ? `\n🤔 السوق مستقر الآن، لكن تدفق ${netflowStr} & نسبة الحيتان ${whaleStr} تصرخان ضغط بيع. هدوء قبل العاصفة؟`
      : `\n💡 السوق مستقر الآن، لكن الفخاخ تكمن. كن حذراً!`;
    
    const question = trapScore <= 25 
      ? (exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50 
        ? "ما خطتك إذا باعت الحيتان؟ رد أسفل! 👇"
        : "ما هو أكبر خوفك في هذا السوق؟ رد أسفل! 👇")
      : "هل تحمي رأس المال أم تطارد؟ رد أسفل! 👇";
    
    return `⚠️ تنبيه عاجل: Trap Score ${trapScore}/100 – آمن؟ أم فخ حيتان يتكون؟

🌤️ Trap Defence BTC - تقرير مجاني
🚨 نشرة طوارئ
📅 ${dateStr} ${timeStr}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score اليوم
━━━━━━━━━━━━━━━━━━━━
${trapScore}/100
✅ ${scoreText}: ${trapScore <= 25 ? 'قليل من الفخاخ. لكنها تتغير سريعاً.' : 'فخاخ مكتشفة. كن حذراً!'}

💰 BTC: ${priceStr} ${changeStr}${contradictionText}

━━━━━━━━━━━━━━━━━━━━
📊 أسباب مدعومة ببيانات
━━━━━━━━━━━━━━━━━━━━
${exchangeNetflow ? `• المنصات مغمورة: ${netflowStr} داخل – البائعون يحملون\n` : ''}${whaleRatio ? `• الحيتان ${whaleStr}: خطر إغراق ${whaleRatio > 50 ? 'متوسط-عالي' : 'منخفض-متوسط'}\n` : ''}
💡 استراتيجية محترفين:
✅ ${trapScore}/100 = وقت التحضير! المحترفون ينتظرون الميزة.
🛡️ بيع مفاجئ واحد = -10-20%. ادافع الآن!

💊 د. غروك: "${trapScore <= 25 ? 'مخاطر منخفضة؟ الغفلة تقتل. حضّر أو هلك.' : 'مخاطر عالية؟ الدفاع أعلى أشكال الهجوم. احمِ رأس المال أولاً.'}"

✅ عقلية: "الدفاع أعلى أشكال الهجوم. احمِ رأس المال أولاً."

━━━━━━━━━━━━━━━━━━━━
🚀 فك قفل التقرير الكامل

━━━━━━━━━━━━━━━━━━━━
🔥 ترقية الآن: الوصول PRO (50% خصم DEFEND50)
━━━━━━━━━━━━━━━━━━━━
💎 فك قفل الوصول الكامل + التنبيهات: ${getWhopProductUrl('ar')}?promo=DEFEND50
🚨 وقت محدود: كود DEFEND50 ينتهي قريباً!

(أو النتيجة اليومية المجانية: ${deepLink})

كامل: تحليل on-chain، تنبيهات AI (تجنب LONG/SHORT)، خرائط خروج، تحليل المشاعر، دعم د. غروك النفسي.

🛡️ تفويت إشارة واحدة؟ -10%+. ترقية لدفاع مضاد للرصاص.

${question} #BTC

تعليمي فقط. ليس نصيحة مالية.`;
  },
  ko: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const scoreText = trapScore <= 25 ? '매우 낮은 위험 ✅' : 
                     trapScore <= 50 ? '낮은 위험 ⚠️' : 
                     trapScore <= 75 ? '높은 위험 🚨' : 
                     '매우 높은 위험 🔴';
    
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const netflowStr = exchangeNetflow ? `+${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}%` : '';
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
    
    const contradictionText = (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) 
      ? `\n🤔 시장 안정적 지금, 하지만 ${netflowStr} 유입 & ${whaleStr} 고래 비율이 매도 압력 외침. 폭풍 전 고요?`
      : `\n💡 시장 안정적 지금, 하지만 함정 도사림. 경계하라!`;
    
    const question = trapScore <= 25 
      ? (exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50 
        ? "고래 덤프 시 네 계획은? 아래 답변! 👇"
        : "이 시장에서 가장 큰 두려움은 무엇인가요? 아래 답변! 👇")
      : "자본 보호 중인가요? 추격 중인가요? 아래 답변! 👇";
    
    return `⚠️ 긴급 경보: Trap Score ${trapScore}/100 – 안전? 아니면 고래 함정 형성 중?

🌤️ Trap Defence BTC - 무료 보고서
🚨 비상 브리핑
📅 ${dateStr} ${timeStr}

━━━━━━━━━━━━━━━━━━━━
🎯 오늘의 Trap Score
━━━━━━━━━━━━━━━━━━━━
${trapScore}/100
✅ ${scoreText}: ${trapScore <= 25 ? '함정 적음. 하지만 빠르게 변함.' : '함정 감지. 경계하라!'}

💰 BTC: ${priceStr} ${changeStr}${contradictionText}

━━━━━━━━━━━━━━━━━━━━
📊 데이터 기반 이유
━━━━━━━━━━━━━━━━━━━━
${exchangeNetflow ? `• 거래소 유입: ${netflowStr} – 매도자 로딩\n` : ''}${whaleRatio ? `• 고래 ${whaleStr}: 덤프 위험 ${whaleRatio > 50 ? '중간-높음' : '낮음-중간'}\n` : ''}
💡 프로 전략:
✅ ${trapScore}/100 = 준비 시간! 프로들은 이점 기다림.
🛡️ 깜짝 매도 = -10-20%. 지금 방어!

💊 Dr. Grok: "${trapScore <= 25 ? '낮은 위험? 안일함이 죽음. 준비하거나 망함.' : '높은 위험? 방어가 최고 공격. 자본 보호부터.'}"

✅ 마인드셋: "방어가 최고 공격. 자본 보호부터."

━━━━━━━━━━━━━━━━━━━━
🚀 전체 보고서 해제

━━━━━━━━━━━━━━━━━━━━
🔥 지금 업그레이드: PRO 액세스 (50% 할인 DEFEND50)
━━━━━━━━━━━━━━━━━━━━
💎 전체 액세스+알림 잠금 해제: ${getWhopProductUrl('ko')}?promo=DEFEND50
🚨 제한 시간: DEFEND50 코드 곧 만료!

(또는 무료 일일 스코어: ${deepLink})

풀: 온체인 분석, AI 알림 (LONG/SHORT 피함), 출구 맵, 감정 분석, Dr. Grok 심리 지원.

🛡️ 신호 하나 놓침? -10%+. 업그레이드해 방어막.

${question} #BTC

교육 목적. 투자 조언 아님.`;
  },
};

/**
 * 1日の投稿数を取得（Vercel KV）
 * @param {string} dateString - 日付文字列（YYYY-MM-DD）
 * @returns {Promise<number>} 投稿数
 */
// getDailyPostCount と incrementDailyPostCount は services/x/optimization.js から統一実装を使用

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
  
  // Grok推奨: 1日6言語すべてを時間帯別で回す（targetLangsは複数言語の可能性あり）
  // UTC 14:00にはENとPT-BRの2言語を同時に処理
  const mainLang = targetLangs[0] || 'en';
  
  console.log('[X Post Free Report] postFreeReportAsThread called with:', {
    trapScore,
    priceUsd,
    change24h,
    targetLangs: targetLangs.length,
    mainLang,
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
  
  // 1日の投稿上限チェック（35投稿/日に増加 - インプレッション最大化のため）
  const dailyPostCount = await getDailyPostCount(dateString);
  const maxDailyPosts = 35; // インプレッション最大化: 25→35に増加（スパム判定回避しつつ最大化）
  console.log(`[X Post Free Report] Daily post count: ${dailyPostCount}/${maxDailyPosts}`);
  if (dailyPostCount >= maxDailyPosts) {
    console.log(`[X Post Free Report] ⏰ Daily post limit reached (${dailyPostCount}/${maxDailyPosts}), skipping free report post`);
    return { success: false, skipped: true, reason: 'daily_limit_reached', dailyPostCount };
  }
  
  // コンテンツ形式を決定（シーケンスベース + リアルタイム最適化）
  const sequence = Math.floor(Date.now() / (1000 * 60 * 60)) % 10; // 時間ベースのシーケンス
  
  // 最適化案: リアルタイム最適化（メトリクスに基づく動的調整）
  let contentFormat;
  try {
    const { getOptimizedContentFormat } = require('../services/x/realTimeOptimizer');
    contentFormat = await getOptimizedContentFormat(mainLang, sequence);
  } catch (error) {
    console.warn('[X Post Free Report] Failed to get optimized content format, using default:', error.message);
    contentFormat = getContentFormat(sequence);
  }
  
  // Grok推奨: 1日6言語すべてを時間帯別で回す（各言語で個別に投稿）
  // UTC 14:00にはENとPT-BRの2言語を同時に処理（各1回）
  // スレッド戦略: 各言語で1メイン + 3リプライ（深掘り）
  const replyCount = 3; // Grok推奨: 3リプライで滞在時間延長
  const langsToPost = targetLangs; // 複数言語を処理（例: UTC 14:00で['en', 'pt-br']）
  
  // インプレッション最大化: 1時間あたりの投稿数制限を緩和（5-6/時間に増加）
  const hourKey = `${dateString}T${String(currentHour).padStart(2, '0')}`;
  const { checkHourlyPostLimit, getHourlyPostCount, incrementHourlyPostCount, getThreadStrategy } = require('../services/x/optimization');
  const currentHourlyPostCount = await getHourlyPostCount(hourKey);
  const maxPostsPerHour = 6; // インプレッション最大化: 4→6に増加（スパム判定回避しつつ最大化）
  console.log(`[X Post Free Report] Hourly post count: ${currentHourlyPostCount}/${maxPostsPerHour}`);
  
  // インプレッション最大化: 複数言語を個別に処理（ピーク時間チェックを緩和）
  for (const lang of langsToPost) {
    // ピーク時間チェックを緩和（ピーク時間外でも投稿可能にする）
    // ただし、ピーク時間の場合は優先的に投稿
    const isPeakHour = isPeakHourForLang(lang, currentHour);
    if (!isPeakHour) {
      // ピーク時間外でも、1時間あたりの投稿数が少ない場合は投稿を許可
      const currentHourlyCount = await getHourlyPostCount(hourKey);
      // 🔴 CRITICAL FIX: ピーク時間外の制限を明確化（maxPostsPerHour - 2ではなく、maxPostsPerHourを使用）
      const peakHourLimit = maxPostsPerHour - 2; // ピーク時間外は制限を2減らす
      if (currentHourlyCount >= peakHourLimit) {
        console.log(`⏰ Skipping ${lang} (not peak hour and hourly limit near: ${currentHourlyCount}/${peakHourLimit})`);
        continue;
      }
      console.log(`ℹ️ Posting ${lang} outside peak hour (${currentHour} UTC) for impression maximization`);
    }
    
    // 1時間あたりの投稿数制限をチェック
    // 🔴 CRITICAL FIX: maxPostsPerHourを明示的に渡す
    const currentHourlyCount = await getHourlyPostCount(hourKey);
    if (!checkHourlyPostLimit(currentHourlyCount, maxPostsPerHour)) {
      console.log(`⏰ Skipping ${lang} (hourly post limit reached: ${currentHourlyCount}/${maxPostsPerHour})`);
      continue;
    }
    
    // Grok推奨: AR/JAは単一投稿をテスト（短いフォームを好む）
    const threadStrategy = getThreadStrategy(lang);
    const actualReplyCount = threadStrategy.preferSinglePost ? 0 : replyCount;
    
    // メイン投稿（各言語で個別に投稿）
    let langMainTweetId = null;
    try {
      console.log(`[X Post Free Report] Preparing main tweet for ${lang}...`);
      const tweetTemplate = TWEET_TEMPLATES[lang] || TWEET_TEMPLATES.en;
      let langMainTweet = tweetTemplate(trapScore, priceUsd, change24h, getTelegramDeepLinkWithSource(lang, 'x_direct'), exchangeNetflow, whaleRatio);
      
      // Grok推奨: ハッシュタグを動的取得（最大2個）
      const { getTrendyHashtags } = require('../services/x/optimization');
      const optimizedHashtags = await getTrendyHashtags(lang, 'BTC').catch(() => getOptimizedHashtags(lang));
      const langHashtags = LANG_HASHTAGS[lang] || LANG_HASHTAGS.en;
      // Grok推奨: 2ハッシュタグ最大
      const hashtagsArray = Array.isArray(optimizedHashtags) ? optimizedHashtags.slice(0, 2) : [optimizedHashtags].slice(0, 2);
      langMainTweet = langMainTweet.replace(new RegExp(langHashtags.replace(/#/g, '\\#').replace(/\s+/g, '.*'), 'g'), hashtagsArray.join(' '));
      
      // Grok推奨: フック戦略（最初の280文字を最適化）
      langMainTweet = optimizeHookText(langMainTweet, lang, trapScore);
      
      // Grok推奨: エンゲージメントCTAを追加（2質問/投稿）
      const cta = generateEngagementCTA(lang);
      const selfQuestions = generateVelocitySelfQuestions(lang, trapScore);
      // 最初の2つの質問を追加
      langMainTweet = `${langMainTweet}\n\n${cta}\n${selfQuestions[0]}\n${selfQuestions[1]}`;
      
      // Grok推奨: 言語別絵文字スタイル（3-5絵文字）
      const emojis = getLanguageEmojiStyle(lang);
      if (emojis.length > 0 && !langMainTweet.includes(emojis[0])) {
        // 絵文字が不足している場合は追加（最大5個）
        const currentEmojiCount = (langMainTweet.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
        if (currentEmojiCount < 3) {
          const emojisToAdd = emojis.slice(0, Math.min(5 - currentEmojiCount, emojis.length));
          langMainTweet = `${emojisToAdd.join('')} ${langMainTweet}`;
        }
      }
      
      // Phase 1: ソーシャルプルーフを追加（インプレッション最大化）
      try {
        const { getSocialProofText } = require('../services/telegram/reaction-counter');
        const socialProofText = await getSocialProofText(lang);
        // 280文字制限を考慮して追加（末尾に追加）
        const tweetWithSocialProof = `${langMainTweet}\n\n${socialProofText}`;
        if (tweetWithSocialProof.length <= 280) {
          langMainTweet = tweetWithSocialProof;
          console.log(`[X Post Free Report] ✅ Added social proof: ${socialProofText}`);
        } else {
          // 文字数制限を超える場合は、CTAを短縮してソーシャルプルーフを優先
          const shortenedTweet = langMainTweet.substring(0, 280 - socialProofText.length - 2);
          langMainTweet = `${shortenedTweet}\n\n${socialProofText}`;
          console.log(`[X Post Free Report] ✅ Added social proof (shortened): ${socialProofText}`);
        }
      } catch (error) {
        console.warn(`[X Post Free Report] Failed to add social proof for ${lang}:`, error.message);
        // エラー時はソーシャルプルーフなしで続行
      }
      
      // Grok推奨: フォーマット比率制御（動画優先、ポール強化、画像維持）
      const usePoll = contentFormat === 'thread_with_poll' || contentFormat === 'thread_with_image' || contentFormat === 'thread_with_video';
      const pollOptions = usePoll ? {
        options: generatePollOptions(lang, trapScore),
        duration_minutes: 1440,
      } : null;
      
      // Grok推奨: 動画・画像のアップロード（KVから取得）
      let mediaIds = [];
      try {
        const { getContent } = require('../services/core/contentStorage');
        const marketCode = lang.toUpperCase() === 'PT-BR' ? 'PT-BR' : lang.toUpperCase();
        const content = await getContent(marketCode);
        
        if (content) {
          // 動画優先（10xエンゲージメント）
          if (contentFormat === 'thread_with_video' && content.videoUrl) {
            try {
              const videoBuffer = await convertDataUrlToBuffer(content.videoUrl);
              if (videoBuffer) {
                const videoMediaId = await uploadMedia(videoBuffer, { mediaType: 'video' });
                if (videoMediaId) {
                  mediaIds.push(videoMediaId);
                  console.log(`[X Post Free Report] ✅ Video uploaded for ${lang}: ${videoMediaId}`);
                }
              }
            } catch (error) {
              console.warn(`[X Post Free Report] Failed to upload video for ${lang}:`, error.message);
            }
          }
          
          // 画像（2xエンゲージメント）
          if ((contentFormat === 'thread_with_image' || (contentFormat === 'thread_with_video' && mediaIds.length === 0)) && content.imageUrl) {
            try {
              const imageBuffer = await convertDataUrlToBuffer(content.imageUrl);
              if (imageBuffer) {
                const imageMediaId = await uploadMedia(imageBuffer, { mediaType: 'image' });
                if (imageMediaId) {
                  mediaIds.push(imageMediaId);
                  console.log(`[X Post Free Report] ✅ Image uploaded for ${lang}: ${imageMediaId}`);
                }
              }
            } catch (error) {
              console.warn(`[X Post Free Report] Failed to upload image for ${lang}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.warn(`[X Post Free Report] Failed to get content from KV for ${lang}:`, error.message);
      }
      
      // メイン投稿を実行（メディアIDを添付）
      const langMainResult = await postTweet(langMainTweet.substring(0, 280), mediaIds.length > 0 ? mediaIds : null, pollOptions);
      langMainTweetId = langMainResult.id;
      results.push({ lang, success: true, tweetId: langMainTweetId, isMain: true });
      console.log(`✅ Main tweet posted for ${lang}: ${langMainTweetId}`);
      
      // CRITICAL: KVストレージに構造化ログを記録
      try {
        const { logPostSuccess } = require('../services/core/postLogger');
        await logPostSuccess({
          postType: 'free_report',
          tweetId: langMainTweetId,
          lang,
          contentFormat,
          trapScore: reportData?.trapScore,
          hasMedia: mediaIds.length > 0,
          hasPoll: !!pollOptions,
          dateString,
        });
      } catch (logError) {
        console.warn(`[X Post Free Report] ⚠️ Failed to log post success to KV:`, logError.message);
      }
      
      // 投稿IDをKVに保存（メトリクス追跡用）
      // CRITICAL FIX: savePostIdが失敗した場合は致命的エラーとして処理
      const { savePostId } = require('../services/x/postTracker');
      try {
        await savePostId(langMainTweetId, 'free_report', lang, {
          contentFormat,
          trapScore: reportData?.trapScore,
        });
        
        // 保存に成功した場合のみ投稿数をインクリメント（メイン投稿のみカウント）
        await incrementDailyPostCount(dateString, 1);
        await incrementHourlyPostCount(hourKey); // 1時間あたりの投稿数をインクリメント
        console.log(`[X Post Free Report] ✅ Post count incremented after successful save (main tweet)`);
      } catch (saveError) {
        // CRITICAL: 保存に失敗した場合は致命的エラー
        console.error(`[X Post Free Report] ❌ CRITICAL: Failed to save main post ID:`, saveError.message);
        throw new Error(`CRITICAL: Failed to save main post ID to KV: ${langMainTweetId}. Original error: ${saveError.message}`);
      }
      
      // メイン投稿IDを設定（最初の言語の場合）
      if (!mainTweetId) {
        mainTweetId = langMainTweetId;
      }
      
      // Grok推奨: ベロシティ戦術（投稿直後のポール追加と自己質問）
      try {
        const selfQuestions = generateVelocitySelfQuestions(lang, trapScore);
        // 最初の5分以内に自己質問をリプライとして投稿（エンゲージメント速度最大化）
        const currentMainTweetId = langMainTweetId; // setTimeout内で使用するためにコピー
        setTimeout(async () => {
          try {
            if (!currentMainTweetId) {
              throw new Error(`langMainTweetId is null or undefined for ${lang}`);
            }
            const velocityReply = `${selfQuestions[2]}\n\n${generateEngagementCTA(lang)}`;
            // 🔴 CRITICAL FIX: 引数の順序を修正（textが先、inReplyToTweetIdが後）
            await replyToTweet(velocityReply.substring(0, 280), currentMainTweetId);
            console.log(`[X Post Free Report] ✅ Velocity self-question posted for ${lang}: ${currentMainTweetId}`);
          } catch (error) {
            console.error(`[X Post Free Report] ❌ CRITICAL: Failed to post velocity self-question for ${lang}:`, {
              error: error.message,
              stack: error.stack,
              tweetId: currentMainTweetId,
              lang,
              timestamp: new Date().toISOString(),
            });
          }
        }, 30000); // 30秒後に投稿（5分以内）
      } catch (error) {
        console.warn(`[X Post Free Report] Failed to schedule velocity self-question for ${lang}:`, error.message);
      }
      
      // Grok推奨: ユーザーリプライへの自動返信（最初の10リプライ）
      try {
        const { handleUserReplies } = require('../services/x/userReplyHandler');
        handleUserReplies(langMainTweetId, lang, reportData, 10).catch(error => {
          console.warn(`[X Post Free Report] Failed to handle user replies for ${lang}:`, error.message);
        });
        console.log(`[X Post Free Report] 🚀 User reply handler scheduled for tweet ${langMainTweetId} (${lang})`);
      } catch (error) {
        console.warn(`[X Post Free Report] Failed to schedule user reply handler for ${lang}:`, error.message);
      }
      
      // レート制限対策（2秒待機）
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to post main tweet for ${lang}:`, error.message);
      results.push({ lang, success: false, error: error.message });
      continue;
    }
    
    // スレッドリプライを生成（各言語で深掘り、AR/JAは単一投稿のためスキップ）
    if (threadStrategy.preferSinglePost) {
      console.log(`[X Post Free Report] Skipping thread replies for ${lang} (single post mode)`);
      continue;
    }
    
    for (let i = 0; i < actualReplyCount; i++) {
      // 1時間あたりの投稿数制限をチェック
      const currentHourlyCount = await getHourlyPostCount(hourKey);
      if (!checkHourlyPostLimit(currentHourlyCount, maxPostsPerHour)) {
        console.log(`⏰ Hourly post limit reached during thread replies (${currentHourlyCount}/${maxPostsPerHour}), stopping`);
        break;
      }
      try {
        // Grok推奨: スレッド内容を深掘り（データポイント、インサイト、CTA）
        const threadContent = generateThreadReply(lang, i, replyCount, trapScore, priceUsd, change24h, exchangeNetflow, whaleRatio);
        const threadText = `${i + 2}/${replyCount + 1} ${threadContent}`;
        
        // Grok推奨: ハッシュタグを動的取得（トレンド1+ニッチ2）
        const { getTrendyHashtags } = require('../services/x/optimization');
        const langHashtags = await getTrendyHashtags(lang, 'BTC').catch(() => getOptimizedHashtags(lang));
        const optimizedThreadText = threadText.replace(/#BTC.*#TrapDefence/g, Array.isArray(langHashtags) ? langHashtags.join(' ') : langHashtags);
        
        // スレッドはリプライとして投稿（各言語のメイン投稿にリプライ）
        if (!langMainTweetId) {
          console.error(`[X Post Free Report] ❌ CRITICAL: langMainTweetId is null for ${lang}, skipping thread reply`);
          break;
        }
        const threadResult = await replyToTweet(optimizedThreadText.substring(0, 280), langMainTweetId);
        results.push({ lang, success: true, tweetId: threadResult.id, isThread: true, threadIndex: i + 2 });
        console.log(`✅ Thread ${i + 2}/${actualReplyCount + 1} posted for ${lang}: ${threadResult.id}`);
        
        // スレッドの投稿IDもKVに保存（メトリクス追跡用）
        // CRITICAL FIX: スレッドリプライはカウントしない（メイン投稿のみカウント）
        // ただし、メトリクス追跡のためには保存する
        const { savePostId } = require('../services/x/postTracker');
        const threadSaveSuccess = await savePostId(threadResult.id, 'free_report', lang, {
          contentFormat,
          isThread: true,
          threadIndex: i + 2,
          mainTweetId: langMainTweetId,
        });
        
        if (!threadSaveSuccess) {
          console.warn(`[X Post Free Report] ⚠️ Failed to save thread post ID: ${threadResult.id} (non-critical, continuing)`);
        }
        
        // スレッドリプライは投稿数にカウントしない（メイン投稿のみカウント）
        // incrementDailyPostCountは呼ばない
        await incrementHourlyPostCount(hourKey); // 1時間あたりの投稿数のみインクリメント（レート制限管理用）
        
        // レート制限対策（2秒待機）
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to post thread ${i + 2} for ${lang}:`, error.message);
        results.push({ lang, success: false, threadIndex: i + 2, error: error.message });
      }
    }
    
    // 言語間の待機時間（1-2分）
    if (lang !== langsToPost[langsToPost.length - 1]) {
      const delayMs = 1 * 60 * 1000; // 1分待機
      console.log(`[X Post Free Report] Waiting ${delayMs / 1000} seconds before next language...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
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
 * @param {Object} reportData - レポートデータ
 * @param {Array<string>} targetLangsOverride - 処理する言語リスト（オプション）
 */
async function postFreeReportToX(reportData = null, targetLangsOverride = null) {
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
    
    // Grok推奨: 1日6言語すべてを時間帯別で回す（targetLangsOverrideが指定されている場合）
    const targetLangs = targetLangsOverride || SUPPORTED_LANGS;
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
    
    // Grok推奨: UTC時刻に基づいて処理する言語を決定（1日6言語すべてを時間帯別で回す）
    const currentHour = new Date().getUTCHours();
    const dateString = new Date().toISOString().split('T')[0];
    
    // Grok推奨: peakMapから現在時刻に処理すべき言語を取得
    const { getLanguagesForCurrentHour } = require('../services/x/optimization');
    const { langs: targetLangs, type, count } = getLanguagesForCurrentHour(currentHour);
    
    // 無料版レポートのピーク時間でない場合はスキップ
    if (!targetLangs || targetLangs.length === 0 || type !== 'free_report') {
      console.log(`[X Post Free Report] ⏰ Skipping free report post (not free report peak time: ${currentHour} UTC, type: ${type || 'none'})`);
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'not_free_report_peak_time',
        currentHour,
        type,
        results: [],
      });
    }
    
    console.log(`[X Post Free Report] Processing ${targetLangs.join(', ')} at peak time (${currentHour}:00 UTC, type: ${type}, count: ${count})`);
    console.log('[X Post Free Report] Starting postFreeReportToX...');
    
    // Grok推奨: 1日6言語すべてを時間帯別で回す（各言語1回）
    const result = await postFreeReportToX(reportData, targetLangs);
    
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
