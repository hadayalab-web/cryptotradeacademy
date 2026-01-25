// api/x-post-minimal-version.js
// 無料版（Minimal Version）のX投稿（スレッド形式、6言語対応）
// 無料版レポート配信後に自動実行

const { postTweet, replyToTweet } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { getTweetMetrics } = require('../services/x/metrics');
const { getOptimizedHashtags, getDailyPostCount, incrementDailyPostCount } = require('../services/x/optimization');
const { getWhopProductUrl } = require('../services/telegram/whop-links');

// 無料版（Minimal Version）メッセージ生成関数をインポート
const { formatMinimalHighQualityBriefing } = require('../services/telegram/messages/user/en/minimal-high-quality.en');

// 他の言語の無料版メッセージ生成関数をインポート
const loadUserTemplates = (lang) => {
  try {
    const normalizedLang = lang.toLowerCase().replace('-', '');
    const templatePath = `../services/telegram/messages/user/${normalizedLang}/minimal-high-quality.${normalizedLang}`;
    return require(templatePath);
  } catch (error) {
    console.warn(`[X Post Minimal] Template not found for ${lang}, using EN fallback`);
    return require('../services/telegram/messages/user/en/minimal-high-quality.en');
  }
};

// Vercel KV（投稿履歴追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[X Post Minimal] @vercel/kv not available:', error.message);
}

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function normalizeLang(value) {
  if (!value) return null;
  const normalizedBase = String(value).trim().toLowerCase().split('.')[0].replace('_', '-');
  return SUPPORTED_LANGS.includes(normalizedBase) ? normalizedBase : null;
}

function getTelegramDeepLinkWithSource(lang, source = 'x_minimal', options = {}) {
  let botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  botUsername = botUsername.replace(/^@/, '');
  const normalizedLang = normalizeLang(lang) || 'en';
  
  const startParam = `minimal_${normalizedLang}_${source}`;
  let deepLink = `https://t.me/${botUsername}?start=${startParam}`;
  
  // UTMパラメータ
  const utmParams = [];
  if (options.utm_source) {
    utmParams.push(`utm_source=${encodeURIComponent(options.utm_source)}`);
  } else {
    utmParams.push(`utm_source=x_minimal_${normalizedLang}`);
  }
  
  if (options.utm_medium) {
    utmParams.push(`utm_medium=${encodeURIComponent(options.utm_medium)}`);
  } else {
    utmParams.push(`utm_medium=social`);
  }
  
  if (options.utm_campaign) {
    utmParams.push(`utm_campaign=${encodeURIComponent(options.utm_campaign)}`);
  } else {
    const dateStr = new Date().toISOString().split('T')[0];
    utmParams.push(`utm_campaign=minimal_version_${normalizedLang}_${dateStr}`);
  }
  
  if (utmParams.length > 0) {
    deepLink += `&${utmParams.join('&')}`;
  }
  
  return deepLink;
}

/**
 * 長文テキストを280文字ずつに分割（スレッド用）
 * @param {string} text - 分割するテキスト
 * @param {number} maxLength - 最大文字数（デフォルト: 280）
 * @returns {string[]} 分割されたテキスト配列
 */
function splitTextForThread(text, maxLength = 280) {
  if (!text || text.length <= maxLength) {
    return [text];
  }
  
  const chunks = [];
  const lines = text.split('\n');
  let currentChunk = '';
  
  for (const line of lines) {
    // 行が長すぎる場合は、行内で分割
    if (line.length > maxLength) {
      // 現在のチャンクを保存
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // 長い行を分割
      let remainingLine = line;
      while (remainingLine.length > maxLength) {
        // 文の終わりを探す（ピリオド、感嘆符、疑問符）
        const sentenceEnds = [
          remainingLine.lastIndexOf('. ', maxLength),
          remainingLine.lastIndexOf('! ', maxLength),
          remainingLine.lastIndexOf('? ', maxLength),
        ].filter(pos => pos !== -1);
        
        const cutPoint = sentenceEnds.length > 0 ? Math.max(...sentenceEnds) + 1 : maxLength;
        chunks.push(remainingLine.substring(0, cutPoint).trim());
        remainingLine = remainingLine.substring(cutPoint).trim();
      }
      
      if (remainingLine.trim()) {
        currentChunk = remainingLine;
      }
    } else {
      // 行を追加しても280文字を超えない場合
      const testChunk = currentChunk ? `${currentChunk}\n${line}` : line;
      
      if (testChunk.length <= maxLength) {
        currentChunk = testChunk;
      } else {
        // 現在のチャンクを保存して、新しいチャンクを開始
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = line;
      }
    }
  }
  
  // 最後のチャンクを追加
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * 1日の投稿数を取得（Vercel KV）
 */
// getDailyPostCount と incrementDailyPostCount は services/x/optimization.js から統一実装を使用

/**
 * 今日の無料版（Minimal Version）X投稿が既に実行されたかチェック
 */
async function hasPostedMinimalVersionToday(dateString, lang) {
  if (!kv) return false;
  try {
    const key = `x:minimal-version:${lang}:${dateString}`;
    const posted = await kv.get(key);
    return posted === true || posted === 'true';
  } catch (error) {
    console.warn('[X Post Minimal] Failed to check minimal version post status:', error.message);
    return false;
  }
}

/**
 * 今日の無料版（Minimal Version）X投稿をマーク
 */
async function markMinimalVersionPostedToday(dateString, lang) {
  if (!kv) return;
  try {
    const key = `x:minimal-version:${lang}:${dateString}`;
    await kv.set(key, true, { ex: 86400 * 2 }); // 2日間保持
  } catch (error) {
    console.warn('[X Post Minimal] Failed to mark minimal version post status:', error.message);
  }
}

/**
 * 無料版（Minimal Version）のX投稿をスレッド形式で実行
 * @param {string[]} targetLangs - 投稿する言語の配列
 * @param {Object} reportData - レポートデータ
 * @returns {Promise<Object>} 投稿結果
 */
async function postMinimalVersionToX(targetLangs, reportData) {
  const {
    trapScore,
    priceUsd,
    change24h,
    trapData = null,
    marketData = null,
    sentimentData = null,
  } = reportData;
  
  const xStatus = getXConfigStatus();
  
  console.log('[X Post Minimal] postMinimalVersionToX called with:', {
    trapScore,
    priceUsd,
    change24h,
    targetLangs: targetLangs.length,
  });
  
  if (!xStatus.postingEnabled || !xStatus.configured) {
    console.error('[X Post Minimal] ❌ X posting disabled or not configured');
    return { success: false, skipped: true, reason: 'not_configured' };
  }
  
  if (xStatus.dryRun) {
    console.log('[X Post Minimal] 🧪 X dry-run enabled, skipping post');
    return { success: true, dryRun: true };
  }
  
  const results = [];
  const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 各言語ごとに投稿
  for (const lang of targetLangs) {
    try {
      const normalizedLang = normalizeLang(lang) || 'en';
      
      // 今日既に投稿済みかチェック
      const alreadyPosted = await hasPostedMinimalVersionToday(dateString, normalizedLang);
      if (alreadyPosted) {
        console.log(`[X Post Minimal] ⏰ Minimal version already posted today for ${normalizedLang} (${dateString}), skipping`);
        results.push({ lang: normalizedLang, success: false, skipped: true, reason: 'already_posted_today' });
        continue;
      }
      
      // 🔴 CRITICAL FIX: 1日の投稿上限を35に統一（Free Reportと同じ上限を使用）
      // 注意: 投稿タイプごとに異なる上限を設定する場合は、カウンターも分離する必要がある
      const maxDailyPosts = 35; // Free Reportと同じ上限に統一（インプレッション最大化）
      const dailyPostCount = await getDailyPostCount(dateString);
      if (dailyPostCount >= maxDailyPosts) {
        console.log(`[X Post Minimal] ⏰ Daily post limit reached (${dailyPostCount}/${maxDailyPosts}), skipping minimal version post for ${normalizedLang}`);
        results.push({ lang: normalizedLang, success: false, skipped: true, reason: 'daily_limit_reached' });
        continue;
      }
      
      // Grok推奨: 最初のツイートを強力なフックにする
      const trapScoreRounded = Math.round(trapScore || 0);
      const riskLevel = trapScoreRounded >= 70 ? 'HIGH RISK' : 
                       trapScoreRounded >= 50 ? 'MODERATE RISK' : 
                       trapScoreRounded >= 30 ? 'LOW RISK' : 'VERY LOW RISK';
      
      // 言語別フックメッセージ（Grok推奨: 緊急性とFOMOを強調）
      const hookMessages = {
        en: `🚨 BREAKING: Trap Score ${trapScoreRounded}/100 - ${riskLevel}! Protect your BTC now. Details below 👇`,
        ja: `🚨 緊急: Trap Score ${trapScoreRounded}/100 - ${riskLevel === 'HIGH RISK' ? '高リスク' : riskLevel === 'MODERATE RISK' ? '中リスク' : '低リスク'}！BTCを守れ。詳細は下記 👇`,
        es: `🚨 URGENTE: Trap Score ${trapScoreRounded}/100 - ${riskLevel === 'HIGH RISK' ? 'ALTO RIESGO' : riskLevel === 'MODERATE RISK' ? 'RIESGO MODERADO' : 'BAJO RIESGO'}! Protege tu BTC ahora. Detalles abajo 👇`,
        'pt-br': `🚨 URGENTE: Trap Score ${trapScoreRounded}/100 - ${riskLevel === 'HIGH RISK' ? 'ALTO RISCO' : riskLevel === 'MODERATE RISK' ? 'RISCO MODERADO' : 'BAIXO RISCO'}! Proteja seu BTC agora. Detalhes abaixo 👇`,
        ar: `🚨 عاجل: Trap Score ${trapScoreRounded}/100 - ${riskLevel === 'HIGH RISK' ? 'خطر عالي' : riskLevel === 'MODERATE RISK' ? 'خطر متوسط' : 'خطر منخفض'}! احمِ بيتكوينك الآن. التفاصيل أدناه 👇`,
        ko: `🚨 긴급: Trap Score ${trapScoreRounded}/100 - ${riskLevel === 'HIGH RISK' ? '높은 위험' : riskLevel === 'MODERATE RISK' ? '중간 위험' : '낮은 위험'}! BTC를 지금 보호하세요. 자세한 내용은 아래 👇`,
      };
      
      const hookMessage = hookMessages[normalizedLang] || hookMessages.en;
      
      // 無料版（Minimal Version）メッセージを生成
      const langTemplates = loadUserTemplates(normalizedLang);
      const formatMinimalBriefing = langTemplates.formatMinimalHighQualityBriefing || formatMinimalHighQualityBriefing;
      
      const minimalMessage = formatMinimalBriefing({
        now: new Date(),
        trapScore,
        priceUsd,
        change24h,
        trapData,
        marketData,
        sentimentData,
        lang: normalizedLang,
      });
      
      // Deep Linkを追加
      const deepLink = getTelegramDeepLinkWithSource(normalizedLang, 'x_minimal');
      
      // Grok推奨: エンゲージメントCTAを追加
      const engagementCTAs = {
        en: 'Retweet if you\'re staying defensive! Reply with your BTC strategy. 👇',
        ja: '防御的ならリツイート！BTC戦略をリプライで共有 👇',
        es: '¡Retuitea si te mantienes defensivo! Responde con tu estrategia BTC. 👇',
        'pt-br': 'Retuíte se você está se mantendo defensivo! Responda com sua estratégia BTC. 👇',
        ar: 'أعد التغريد إذا كنت دفاعيًا! رد باستراتيجيتك BTC. 👇',
        ko: '방어적이라면 리트윗! BTC 전략을 답글로 공유 👇',
      };
      
      const engagementCTA = engagementCTAs[normalizedLang] || engagementCTAs.en;
      
      // Grok推奨: スレッド構造を最適化（Trap Score、Key Data、Strategic Insight、CTA）
      // Whop直リン導線を最優先に（Grok推奨: Whop first, free as afterthought）
      const whopLink = getWhopProductUrl(normalizedLang);
      const whopLinkWithPromo = `${whopLink}?promo=DEFEND50`;
      
      // Whop CTAを最優先に配置（緊急性とソーシャルプルーフを強調）
      const whopCTAs = {
        en: `🔥 UPGRADE NOW: PRO Access (50% OFF DEFEND50)\n💎 Unlock Full Access + Alerts: ${whopLinkWithPromo}\n🚨 Limited Time: DEFEND50 code expires soon!\n\n(Or free daily score: ${deepLink})`,
        ja: `🔥 今すぐアップグレード: PRO版アクセス（50%OFF DEFEND50）\n💎 フルアクセス+アラート解除: ${whopLinkWithPromo}\n🚨 期間限定: DEFEND50コードはまもなく期限切れ！\n\n（または無料日次スコア: ${deepLink}）`,
        es: `🔥 ACTUALIZA AHORA: Acceso PRO (50% OFF DEFEND50)\n💎 Desbloquea Acceso Completo + Alertas: ${whopLinkWithPromo}\n🚨 Tiempo Limitado: ¡Código DEFEND50 expira pronto!\n\n(O score diario gratis: ${deepLink})`,
        'pt-br': `🔥 UPGRADE AGORA: Acesso PRO (50% OFF DEFEND50)\n💎 Desbloqueie Acesso Completo + Alertas: ${whopLinkWithPromo}\n🚨 Tempo Limitado: Código DEFEND50 expira em breve!\n\n(Ou score diário grátis: ${deepLink})`,
        ar: `🔥 ترقية الآن: الوصول PRO (50% خصم DEFEND50)\n💎 فك قفل الوصول الكامل + التنبيهات: ${whopLinkWithPromo}\n🚨 وقت محدود: كود DEFEND50 ينتهي قريباً!\n\n(أو النتيجة اليومية المجانية: ${deepLink})`,
        ko: `🔥 지금 업그레이드: PRO 액세스 (50% 할인 DEFEND50)\n💎 전체 액세스+알림 잠금 해제: ${whopLinkWithPromo}\n🚨 제한 시간: DEFEND50 코드 곧 만료!\n\n(또는 무료 일일 스코어: ${deepLink})`,
      };
      
      const whopCTA = whopCTAs[normalizedLang] || whopCTAs.en;
      
      const structuredMessage = `${minimalMessage}\n\n${whopCTA}\n\n${engagementCTA}`;
      
      // ハッシュタグを追加
      let hashtags;
      try {
        hashtags = getOptimizedHashtags(normalizedLang);
      } catch (error) {
        console.warn(`[X Post Minimal] Failed to get optimized hashtags for ${normalizedLang}, using defaults:`, error.message);
        const defaultHashtags = {
          en: '#BTC #TrapDefence',
          ja: '#BTC #仮想通貨 #TrapDefence',
          es: '#BTC #Cripto #TrapDefence',
          'pt-br': '#BTC #Cripto #TrapDefence',
          ar: '#BTC #بيتكوين #TrapDefence',
          ko: '#BTC #비트코인 #TrapDefence',
        };
        hashtags = defaultHashtags[normalizedLang] || defaultHashtags.en;
      }
      
      // Grok推奨: 最初のツイートを強力なフック + Deep Link + ハッシュタグ
      // 重要: 最初のツイートにDeep Linkを含めてオプトインを最大化
      const firstTweetDeepLinkCTAs = {
        en: `Get FREE Report: ${deepLink}`,
        ja: `無料レポートを取得: ${deepLink}`,
        es: `Obtén Reporte GRATIS: ${deepLink}`,
        'pt-br': `Obtenha Relatório GRÁTIS: ${deepLink}`,
        ar: `احصل على تقرير مجاني: ${deepLink}`,
        ko: `무료 리포트 받기: ${deepLink}`,
      };
      const firstTweetDeepLinkCTA = firstTweetDeepLinkCTAs[normalizedLang] || firstTweetDeepLinkCTAs.en;
      const firstTweet = `${hookMessage}\n\n${firstTweetDeepLinkCTA}\n\n${hashtags}`;
      
      // 残りのメッセージをスレッド形式に分割
      const threadChunks = splitTextForThread(structuredMessage, 280);
      
      // 最初のツイートを先頭に追加
      threadChunks.unshift(firstTweet);
      
      if (threadChunks.length === 0) {
        console.warn(`[X Post Minimal] No chunks generated for ${normalizedLang}`);
        results.push({ lang: normalizedLang, success: false, reason: 'no_chunks' });
        continue;
      }
      
      // Grok推奨: メイン投稿（強力なフック）
      console.log(`[X Post Minimal] Posting main tweet (hook) for ${normalizedLang}...`);
      const mainTweet = threadChunks[0];
      const mainResult = await postTweet(mainTweet);
      const mainTweetId = mainResult.id;
      
      console.log(`[X Post Minimal] ✅ Main tweet posted: ${mainTweetId}`);
      await incrementDailyPostCount(dateString, 1);
      
      // 投稿IDをKVに保存（メトリクス追跡用）
      try {
        const { savePostId } = require('../services/x/postTracker');
        await savePostId(mainTweetId, 'minimal_version', normalizedLang, {
          threadLength: threadChunks.length,
        });
      } catch (error) {
        console.warn('[X Post Minimal] Failed to save main post ID:', error.message);
      }
      
      // リプライ（残りのチャンク）
      let lastReplyId = mainTweetId;
      if (!lastReplyId) {
        console.error(`[X Post Minimal] ❌ CRITICAL: mainTweetId is null for ${normalizedLang}, skipping thread replies`);
        continue;
      }
      for (let i = 1; i < threadChunks.length; i++) {
        const replyText = threadChunks[i];
        console.log(`[X Post Minimal] Posting reply ${i + 1}/${threadChunks.length - 1} for ${normalizedLang}...`);
        
        // リプライ間隔を空ける（レート制限対策）
        if (i > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
        }
        
        if (!lastReplyId) {
          console.error(`[X Post Minimal] ❌ CRITICAL: lastReplyId is null for ${normalizedLang} at reply ${i}, stopping thread`);
          break;
        }
        const replyResult = await replyToTweet(replyText, lastReplyId);
        lastReplyId = replyResult.id;
        console.log(`[X Post Minimal] ✅ Reply ${i} posted: ${replyResult.id}`);
        await incrementDailyPostCount(dateString, 1);
        
        // スレッドのリプライIDもKVに保存（メトリクス追跡用）
        try {
          const { savePostId } = require('../services/x/postTracker');
          await savePostId(replyResult.id, 'minimal_version', normalizedLang, {
            isThread: true,
            threadIndex: i + 1,
            mainTweetId,
          });
        } catch (error) {
          console.warn('[X Post Minimal] Failed to save thread reply ID:', error.message);
        }
      }
      
      // 投稿をマーク
      await markMinimalVersionPostedToday(dateString, normalizedLang);
      
      // 無料版（Minimal Version）ポストのURLを保存（引用リポストで使用）
      const minimalVersionPostUrl = `https://x.com/trapdefence/status/${mainTweetId}`;
      if (kv) {
        try {
          const urlKey = `x:minimal-version:url:${normalizedLang}:${dateString}`;
          await kv.set(urlKey, minimalVersionPostUrl, { ex: 86400 * 2 }); // 2日間保持
          console.log(`[X Post Minimal] ✅ Minimal version post URL saved: ${minimalVersionPostUrl}`);
        } catch (error) {
          console.warn('[X Post Minimal] Failed to save minimal version post URL:', error.message);
        }
      }
      
      results.push({
        lang: normalizedLang,
        success: true,
        mainTweetId,
        threadLength: threadChunks.length,
        postUrl: minimalVersionPostUrl,
      });
      
      console.log(`[X Post Minimal] ✅ Minimal version posted successfully for ${normalizedLang} (${threadChunks.length} tweets)`);
      
    } catch (error) {
      console.error(`[X Post Minimal] ❌ Failed to post minimal version for ${lang}:`, error.message);
      results.push({ lang: normalizeLang(lang) || lang, success: false, error: error.message });
    }
  }
  
  return {
    success: results.some(r => r.success),
    results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { targetLangs = ['en'], reportData } = req.body;
    
    if (!reportData) {
      return res.status(400).json({ error: 'reportData is required' });
    }
    
    const result = await postMinimalVersionToX(targetLangs, reportData);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[X Post Minimal] Handler error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// 直接実行用（テスト用）
if (require.main === module) {
  const testReportData = {
    trapScore: 70,
    priceUsd: 90493,
    change24h: 1.23,
    trapData: {
      exchangeNetflow: 1252,
      whaleRatio: 0.56,
    },
    marketData: {
      mpi: 0.5,
      priceUsd: 90493,
      change24h: 1.23,
    },
    sentimentData: {
      sentiment: 'FOMO',
    },
  };
  
  postMinimalVersionToX(['en'], testReportData)
    .then(result => {
      console.log('Test result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
}

module.exports.postMinimalVersionToX = postMinimalVersionToX;
