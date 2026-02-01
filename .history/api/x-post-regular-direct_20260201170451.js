// api/x-post-regular-direct.js
// 有料版（Regular Briefing）直接誘導のX投稿（ファネル3実装）
// WhopページにVSL3（https://youtu.be/rdMvxGs0ZaI）が埋め込まれているため、
// X投稿からWhop有料版ページへの直接導線を強化

const { postTweet, uploadMedia } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { getWhopProductUrl, getPromoCode } = require('../services/telegram/whop-links');
const { kv } = require('../utils/kv');

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

// 言語別ツイートテンプレート（有料版直接誘導）
// WhopページでVSL3が自動再生されることを前提に、「今すぐ見る」を強調
const DIRECT_REGULAR_TEMPLATES = {
  en: (trapScore, priceUsd, change24h, whopUrl) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const promoCode = getPromoCode().toUpperCase();
    
    return `🚨 TRAP ALERT: BTC ${priceStr} ${changeStr}

Are you trading blind? 95% miss whale traps.

🎬 Watch 2-Min Video → See How Pros Avoid Traps:
${whopUrl}

✅ ${trapScore}/100 Trap Score TODAY
✅ Real-time alerts BEFORE dumps
✅ 50% OFF (${promoCode}) – Limited Time

Don't be exit liquidity. Join the 5%.

#BTC #CryptoTrading #TrapDefence`;
  },
  ja: (trapScore, priceUsd, change24h, whopUrl) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const promoCode = getPromoCode().toUpperCase();
    
    return `🚨 トラップ警報: BTC ${priceStr} ${changeStr}

盲目トレードしてる？95%はクジラの罠を見逃す。

🎬 2分動画で見る→プロの罠回避法:
${whopUrl}

✅ 本日のTrap Score ${trapScore}/100
✅ ダンプ前のリアルタイム警報
✅ 50%OFF（${promoCode}）期間限定

出口流動性になるな。上位5%に参加。

#BTC #仮想通貨 #TrapDefence`;
  },
  es: (trapScore, priceUsd, change24h, whopUrl) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const promoCode = getPromoCode().toUpperCase();
    
    return `🚨 ALERTA TRAP: BTC ${priceStr} ${changeStr}

¿Trading a ciegas? 95% pierden trampas ballenas.

🎬 Video 2 Min → Cómo Pros Evitan Trampas:
${whopUrl}

✅ Trap Score HOY ${trapScore}/100
✅ Alertas tiempo real ANTES dumps
✅ 50% OFF (${promoCode}) – Tiempo Limitado

No seas liquidez salida. Únete al 5%.

#BTC #Cripto #TrapDefence`;
  },
  'pt-br': (trapScore, priceUsd, change24h, whopUrl) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const promoCode = getPromoCode().toUpperCase();
    
    return `🚨 ALERTA TRAP: BTC ${priceStr} ${changeStr}

Trading cego? 95% perdem armadilhas baleias.

🎬 Vídeo 2 Min → Como Pros Evitam Armadilhas:
${whopUrl}

✅ Trap Score HOJE ${trapScore}/100
✅ Alertas tempo real ANTES dumps
✅ 50% OFF (${promoCode}) – Tempo Limitado

Não seja liquidez de saída. Junte-se aos 5%.

#BTC #Cripto #TrapDefence`;
  },
  ar: (trapScore, priceUsd, change24h, whopUrl) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const promoCode = getPromoCode().toUpperCase();
    
    return `🚨 تنبيه فخ: BTC ${priceStr} ${changeStr}

تداول أعمى؟ 95% يفوتون فخاخ الحيتان.

🎬 فيديو دقيقتين → كيف يتجنب المحترفون الفخاخ:
${whopUrl}

✅ Trap Score اليوم ${trapScore}/100
✅ تنبيهات فورية قبل التراجع
✅ خصم 50% (${promoCode}) – وقت محدود

لا تكن سيولة خروج. انضم لـ5%.

#BTC #Crypto #TrapDefence`;
  },
  ko: (trapScore, priceUsd, change24h, whopUrl) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%/24h` : '';
    const promoCode = getPromoCode().toUpperCase();
    
    return `🚨 함정 경보: BTC ${priceStr} ${changeStr}

맹목 거래 중? 95%가 고래 함정 놓침.

🎬 2분 영상 → 프로의 함정 회피법:
${whopUrl}

✅ 오늘 Trap Score ${trapScore}/100
✅ 덤프 전 실시간 알림
✅ 50% 할인 (${promoCode}) – 제한 시간

출구 유동성 되지 마라. 상위 5% 참여.

#BTC #비트코인 #TrapDefence`;
  },
};

/**
 * 最新の市場データを取得
 */
async function fetchLatestMarketData() {
  try {
    // 価格データを取得
    const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const priceData = await priceRes.json();
    const priceUsd = priceData?.bitcoin?.usd || 0;
    const change24h = priceData?.bitcoin?.usd_24h_change || 0;
    
    // Trap Scoreを取得（簡易版）
    let trapScore = 25; // デフォルト
    
    try {
      const { getCQDeepMetrics } = require('../services/cryptoquant/deepMetrics');
      const deepData = await getCQDeepMetrics('EN', {
        upbitPrice: priceUsd,
        usdKrwRate: 1300,
      });
      
      if (deepData?.trapScore != null) {
        trapScore = deepData.trapScore;
      }
    } catch (error) {
      console.warn('[X Post Regular Direct] Failed to fetch trap score, using default:', error.message);
    }
    
    return {
      trapScore,
      priceUsd,
      change24h,
    };
  } catch (error) {
    console.error('[X Post Regular Direct] Failed to fetch market data:', error.message);
    return {
      trapScore: 25,
      priceUsd: 89859,
      change24h: -0.02,
    };
  }
}

/**
 * 有料版直接誘導のX投稿を実行
 */
async function postRegularDirectToX(targetLangs = SUPPORTED_LANGS) {
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
    
    // 最新の市場データを取得
    const marketData = await fetchLatestMarketData();
    
    const results = [];
    const dateString = new Date().toISOString().split('T')[0];
    
    // 今日既に投稿済みかチェック（二重実行防止）
    if (kv) {
      const key = `x:regular-direct:${dateString}`;
      const alreadyPosted = await kv.get(key);
      if (alreadyPosted === true || alreadyPosted === 'true') {
        console.log(`[X Post Regular Direct] ⏰ Regular direct post already sent today (${dateString}), skipping`);
        return { success: false, skipped: true, reason: 'already_posted_today', dateString };
      }
    }
    
    // P0: 言語間ウェイト用のユーティリティをインポート
    const { applyLanguageWait } = require('../utils/scheduler');
    
    // 各言語で投稿
    for (let i = 0; i < targetLangs.length; i++) {
      const lang = targetLangs[i];
      const normalizedLang = normalizeLang(lang);
      if (!normalizedLang) continue;
      
      try {
        const whopUrl = getWhopProductUrl(normalizedLang);
        const promoCode = getPromoCode();
        const whopUrlWithPromo = `${whopUrl}?promo=${promoCode}`;
        
        const tweetTemplate = DIRECT_REGULAR_TEMPLATES[normalizedLang] || DIRECT_REGULAR_TEMPLATES.en;
        const tweetText = tweetTemplate(
          marketData.trapScore,
          marketData.priceUsd,
          marketData.change24h,
          whopUrlWithPromo
        );
        
        if (xStatus.dryRun) {
          console.log(`🧪 X dry-run enabled (${normalizedLang}), skipping post`);
          results.push({
            lang: normalizedLang,
            success: true,
            dryRun: true,
            tweet: tweetText,
          });
          continue;
        }
        
        // 投稿実行
        const tweetResult = await postTweet(tweetText);
        results.push({
          lang: normalizedLang,
          success: true,
          tweetId: tweetResult.id,
        });
        console.log(`✅ Regular direct tweet posted for ${normalizedLang}: ${tweetResult.id}`);
        
        // X APIコストを記録
        try {
          const { recordCost } = require('../services/x/costTracker');
          await recordCost('post', 1, {
            lang: normalizedLang,
            jobId: 'x-post-regular-direct',
            tweetId: tweetResult.id,
          });
        } catch (costError) {
          console.warn(`[X Post Regular Direct] ⚠️ Failed to record cost:`, costError.message);
        }
        
        // P0: 言語間ウェイト（最後の言語では待たない）
        if (i < targetLangs.length - 1) {
          await applyLanguageWait({ label: `x-post-regular-direct ${normalizedLang} -> next` });
        }
        
        // レート制限対策（2秒待機）
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to post regular direct tweet for ${lang}:`, error.message);
        results.push({ lang, success: false, error: error.message });
      }
    }
    
    // 投稿完了後、今日の投稿をマーク
    if (kv && results.some(r => r.success && !r.dryRun)) {
      const key = `x:regular-direct:${dateString}`;
      await kv.set(key, true, { ex: 86400 * 2 }); // 2日間保持
    }
    
    return {
      success: true,
      results,
      marketData,
    };
  } catch (error) {
    console.error('❌ Regular direct X post failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時
const handler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  console.log('[X Post Regular Direct] ========================================');
  console.log('[X Post Regular Direct] Cron job triggered at', new Date().toISOString());
  console.log('[X Post Regular Direct] ========================================');
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[X Post Regular Direct] ❌ Unauthorized: Invalid CRON_SECRET');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // P0: ジッター（揺らぎ）を適用
    const { applyJitter } = require('../utils/scheduler');
    await applyJitter({ label: 'x-post-regular-direct-handler', minMs: 5000, maxMs: 20000 });
    
    const result = await postRegularDirectToX();
    
    console.log('[X Post Regular Direct] ========================================');
    console.log('[X Post Regular Direct] Result:', JSON.stringify(result, null, 2));
    console.log('[X Post Regular Direct] ========================================');
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[X Post Regular Direct] ========================================');
    console.error('[X Post Regular Direct] ❌ Handler error:', error.message);
    console.error('[X Post Regular Direct] Stack:', error.stack);
    console.error('[X Post Regular Direct] ========================================');
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};

module.exports = handler;
module.exports.postRegularDirectToX = postRegularDirectToX;
module.exports.DIRECT_REGULAR_TEMPLATES = DIRECT_REGULAR_TEMPLATES;
