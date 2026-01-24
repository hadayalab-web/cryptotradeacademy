// api/x-quote-repost.js
// 引用リポスト自動化（Grokがインフルエンサー発掘 + 引用リポスト）
// 24投稿/日（6言語 × 2人 × 2投稿）

const { postQuoteTweet } = require('../services/x/client');
const { getXConfigStatus } = require('../services/x/config');
const { discoverInfluencersForQuoteRepost, generateQuoteRepostText } = require('../services/grok/client');
const {
  isPeakTimeWindow,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  getOptimizedHashtags,
} = require('../services/x/optimization');
const { QUOTE_REPOST_TEMPLATES } = require('./x-post-free-report');
const { getTweetMetrics } = require('../services/x/metrics');

const {
  getInfluencerCountForLang,
  getImpressionTargetForLang,
  selectInfluencersForImpressionTarget,
} = require('../config/influencerStrategy');

// Vercel KV（投稿履歴追跡用）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Quote Repost] @vercel/kv not available:', error.message);
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

function getTelegramDeepLinkWithSource(lang, source = 'x_quote', options = {}) {
  let botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  botUsername = botUsername.replace(/^@/, '');
  const normalizedLang = normalizeLang(lang) || 'en';
  
  const startParam = `minimal_${normalizedLang}_${source}`;
  let deepLink = `https://t.me/${botUsername}?start=${startParam}`;
  
  // Grok推奨: UTMパラメータ強化（ソース追跡強化）
  const utmParams = [];
  if (options.utm_source) {
    utmParams.push(`utm_source=${encodeURIComponent(options.utm_source)}`);
  } else {
    utmParams.push(`utm_source=x_quote_${normalizedLang}`);
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
    utmParams.push(`utm_campaign=quote_repost_${normalizedLang}_${dateStr}`);
  }
  
  if (options.utm_content) {
    utmParams.push(`utm_content=${encodeURIComponent(options.utm_content)}`);
  } else if (options.influencerUsername) {
    utmParams.push(`utm_content=influencer_${options.influencerUsername}`);
  }
  
  if (utmParams.length > 0) {
    deepLink += `&${utmParams.join('&')}`;
  }
  
  return deepLink;
}

// 言語別引用リポストテンプレート（Xアルゴリズム最適化版: 140文字以内）
// x-post-free-report.jsからインポート、またはフォールバック用に定義
const FALLBACK_QUOTE_REPOST_TEMPLATES = {
  en: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const netflowStr = exchangeNetflow ? `Inflow +${Math.abs(exchangeNetflow).toFixed(0)} BTC` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}% whales = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ ready` : '';
    
    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) {
      // 矛盾を強調: 低リスクなのに売り圧力が存在
      const question = '🚨 CONTRADICTION: Low risk BUT whales positioning. What\'s your move? Reply!';
      return `Agree! Trap Score 0/100 BUT ${whaleStr} to sell. ${question} ${deepLink} #BTC #TrapDefence`;
    }
    
    // Grok推奨: 質問CTA必須（アルゴリズム評価UP）
    const question = trapScore <= 25 ? '🚀 What\'s your biggest fear in this market? Reply!' : '💥 Protecting capital or chasing? Reply!';
    
    return `Agree! TrapDefence detected this 🚀 ${question} ${deepLink} #Bitcoin #BTCAnalysis #TrapDefence`;
  },
  ja: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}%クジラ = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ 準備完了` : '';
    
    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) {
      const question = '🚨 矛盾: 低リスクなのにクジラがポジショニング中。どうする？リプライ！';
      return `同意！Trap Score 0/100 なのに ${whaleStr} 売却準備中。${question} ${deepLink} #BTC #TrapDefence`;
    }
    
    // Grok推奨: 質問CTA必須
    const question = trapScore <= 25 ? '🚀 この市場で最も大きな恐怖は何ですか？リプライ！' : '💥 資本保護？それとも追いかけ中？リプライ！';
    
    return `同意！TrapDefenceで検知済み 🚀 ${question} ${deepLink} #ビットコイン #ビットコイン分析 #TrapDefence`;
  },
  es: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}% ballenas = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ listas` : '';
    
    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) {
      const question = '🚨 CONTRADICCIÓN: Bajo riesgo PERO ballenas posicionándose. ¿Cuál es tu movimiento? ¡Responde!';
      return `¡De acuerdo! Trap Score 0/100 PERO ${whaleStr} para vender. ${question} ${deepLink} #BTC #TrapDefence`;
    }
    
    // Grok推奨: 質問CTA必須
    const question = trapScore <= 25 ? '🚀 ¿Cuál es tu mayor miedo en este mercado? ¡Responde!' : '💥 ¿Protegiendo capital o persiguiendo? ¡Responde!';
    
    return `¡De acuerdo! TrapDefence detectó esto 🚀 ${question} ${deepLink} #Bitcoin #AnálisisBTC #TrapDefence`;
  },
  'pt-br': (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}% baleias = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ prontas` : '';
    
    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) {
      const question = '🚨 CONTRADIÇÃO: Baixo risco MAS baleias se posicionando. Qual é sua jogada? Responda!';
      return `Concordo! Trap Score 0/100 MAS ${whaleStr} para vender. ${question} ${deepLink} #BTC #TrapDefence`;
    }
    
    // Grok推奨: 質問CTA必須
    const question = trapScore <= 25 ? '🚀 Qual é o seu maior medo neste mercado? Responda!' : '💥 Protegendo capital ou perseguindo? Responda!';
    
    return `Concordo! TrapDefence detectou isso 🚀 ${question} ${deepLink} #Bitcoin #AnáliseBTC #TrapDefence`;
  },
  ar: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}% حيتان = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ جاهزة` : '';
    
    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) {
      const question = '🚨 تناقض: مخاطر منخفضة لكن الحيتان تتجهز. ما خطوتك؟ أجب!';
      return `موافق! Trap Score 0/100 لكن ${whaleStr} للبيع. ${question} ${deepLink} #BTC #TrapDefence`;
    }
    
    // Grok推奨: 質問CTA必須
    const question = trapScore <= 25 ? '🚀 ما هو أكبر خوفك في هذا السوق؟ أجب!' : '💥 هل تحمي رأس المال أم تطارد؟ أجب!';
    
    return `موافق! TrapDefence اكتشف هذا 🚀 ${question} ${deepLink} #Bitcoin #تحليل_بيتكوين #TrapDefence`;
  },
  ko: (trapScore, priceUsd, change24h, deepLink, exchangeNetflow = null, whaleRatio = null) => {
    const priceStr = priceUsd ? `$${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '$N/A';
    const changeStr = change24h != null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '';
    const whaleStr = whaleRatio ? `${whaleRatio}% 고래 = $${Math.floor((whaleRatio / 100) * 89000 * 1000)}M+ 준비됨` : '';
    
    // 現在の市況を考慮: 低リスクなのに売り圧力がある矛盾を強調
    if (trapScore <= 25 && exchangeNetflow && exchangeNetflow > 0 && whaleRatio && whaleRatio > 50) {
      const question = '🚨 모순: 낮은 리스크인데 고래가 포지셔닝 중. 어떻게 하시겠습니까? 답글!';
      return `동의! Trap Score 0/100 인데 ${whaleStr} 매도 준비 중. ${question} ${deepLink} #BTC #TrapDefence`;
    }
    
    // Grok推奨: 質問CTA必須
    const question = trapScore <= 25 ? '🚀 이 시장에서 가장 큰 두려움은 무엇인가요? 답글!' : '💥 자본 보호 중인가요? 추격 중인가요? 답글!';
    
    return `동의! TrapDefence가 이것을 감지했습니다 🚀 ${question} ${deepLink} #비트코인 #비트코인분석 #TrapDefence`;
  },
};

/**
 * 無料版（Minimal Version）ポストのURLを取得（Vercel KV）
 */
async function getMinimalVersionPostUrl(lang, dateString) {
  if (!kv) return null;
  try {
    const key = `x:minimal-version:url:${lang}:${dateString}`;
    const url = await kv.get(key);
    return url || null;
  } catch (error) {
    console.warn('[Quote Repost] Failed to get minimal version post URL:', error.message);
    return null;
  }
}

/**
 * 無料版メッセージのキーポイントを抽出（引用リポスト生成用）
 */
async function getMinimalVersionContent(lang, reportData = null) {
  try {
    // 無料版メッセージ生成関数を読み込む
    const loadUserTemplates = (lang) => {
      try {
        const normalizedLang = lang.toLowerCase().replace('-', '');
        const templatePath = `../services/telegram/messages/user/${normalizedLang}/minimal-high-quality.${normalizedLang}`;
        return require(templatePath);
      } catch (error) {
        return require('../services/telegram/messages/user/en/minimal-high-quality.en');
      }
    };
    
    const langTemplates = loadUserTemplates(lang);
    const formatMinimalBriefing = langTemplates.formatMinimalHighQualityBriefing || langTemplates.formatMinimalBriefing;
    
    if (!formatMinimalBriefing) {
      return null;
    }
    
    // reportDataから必要なデータを構築
    const trapData = reportData?.trapData || {
      trapAlert: null,
      exchangeNetflow: reportData?.exchangeNetflow || null,
      whaleRatio: reportData?.whaleRatio || null,
    };
    
    const marketData = reportData?.marketData || {
      mpi: reportData?.mpi || null,
      priceUsd: reportData?.priceUsd || null,
      change24h: reportData?.change24h || null,
    };
    
    const sentimentData = reportData?.sentimentData || {
      sentiment: reportData?.sentiment || null,
      risk: reportData?.risk || null,
    };
    
    // 無料版メッセージを生成
    const minimalText = formatMinimalBriefing({
      now: new Date(),
      trapScore: reportData?.trapScore || null,
      priceUsd: reportData?.priceUsd || null,
      change24h: reportData?.change24h || null,
      trapData: trapData,
      marketData: marketData,
      sentimentData: sentimentData,
      lang: lang,
    });
    
    if (!minimalText) return null;
    
    // キーポイントを抽出
    const keyPoints = {
      hook: null,
      trapScore: null,
      dataPoints: [],
      drGrokInsight: null,
      mentalNote: null,
      whatToAvoid: [],
    };
    
    // フックメッセージを抽出（BREAKING: TRAP DEFENCE BRIEFING）
    const hookMatch = minimalText.match(/🚨\s*BREAKING[^\n]*/i) || minimalText.match(/🚨[^\n]*/);
    if (hookMatch) {
      keyPoints.hook = hookMatch[0].trim();
    }
    
    // Trap Scoreを抽出
    const trapScoreMatch = minimalText.match(/Trap Score[:\s]*(\d+)\/100/i);
    if (trapScoreMatch) {
      keyPoints.trapScore = parseInt(trapScoreMatch[1]);
    }
    
    // データポイントを抽出（Exchange Netflow, Whale Ratioなど）
    const dataMatch = minimalText.match(/Exchange Netflow[^\n]*/i);
    if (dataMatch) {
      keyPoints.dataPoints.push(dataMatch[0].trim());
    }
    const whaleMatch = minimalText.match(/Whale Ratio[^\n]*/i);
    if (whaleMatch) {
      keyPoints.dataPoints.push(whaleMatch[0].trim());
    }
    
    // Dr. Grok's Quick Insightを抽出
    const insightMatch = minimalText.match(/Dr\. Grok['"]?s Quick Insight[^\n]*\n([^\n]+(?:\n[^\n]+)*?)(?=\n━━|$)/is);
    if (insightMatch) {
      keyPoints.drGrokInsight = insightMatch[1].trim().replace(/^["']|["']$/g, '');
    }
    
    // Mental Noteを抽出
    const mentalNoteMatch = minimalText.match(/Mental Note[^\n]*\n([^\n]+(?:\n[^\n]+)*?)(?=\n━━|$)/is);
    if (mentalNoteMatch) {
      keyPoints.mentalNote = mentalNoteMatch[1].trim().replace(/^["']|["']$/g, '');
    }
    
    // What to Avoidを抽出
    const whatToAvoidMatch = minimalText.match(/What to Avoid[^\n]*\n((?:•[^\n]+\n?)+)/i);
    if (whatToAvoidMatch) {
      const items = whatToAvoidMatch[1].split('\n').filter(line => line.trim().startsWith('•'));
      keyPoints.whatToAvoid = items.map(item => item.replace(/^•\s*/, '').trim());
    }
    
    return keyPoints;
  } catch (error) {
    console.warn(`[Quote Repost] Failed to get minimal version content for ${lang}:`, error.message);
    return null;
  }
}

/**
 * Grokが引用リポスト用のテキストを生成（Grok APIを使用）
 */
async function generateQuoteRepostTextWithGrok(lang, influencerTweet, reportData = null) {
  try {
    // Grok推奨: UTMパラメータ強化（インフルエンサー追跡）
    const deepLink = getTelegramDeepLinkWithSource(lang, 'x_quote', {
      influencerUsername: influencerTweet.username,
      utm_content: `influencer_${influencerTweet.username}`,
    });
    
    // 無料版（Minimal Version）ポストのURLを取得
    const dateString = new Date().toISOString().split('T')[0];
    const minimalVersionPostUrl = await getMinimalVersionPostUrl(lang, dateString);
    
    // 無料版メッセージのキーポイントを取得（引用リポスト生成用）
    const minimalContent = await getMinimalVersionContent(lang, reportData);
    
    const quoteText = await generateQuoteRepostText(lang, influencerTweet, reportData, deepLink, minimalVersionPostUrl, minimalContent);
    return quoteText;
  } catch (error) {
    console.error(`[Quote Repost] Failed to generate text with Grok for ${lang}:`, error.message);
    // フォールバック: テンプレートを使用（FALLBACK_QUOTE_REPOST_TEMPLATESを使用）
    // 重要: Minimal Version URLも取得してフォールバックテンプレートに渡す
    const dateString = new Date().toISOString().split('T')[0];
    const minimalVersionPostUrl = await getMinimalVersionPostUrl(lang, dateString).catch(() => null);
    
    const template = QUOTE_REPOST_TEMPLATES?.[lang] || FALLBACK_QUOTE_REPOST_TEMPLATES[lang] || FALLBACK_QUOTE_REPOST_TEMPLATES.en;
    const baseText = template(
      reportData?.trapScore || 25,
      reportData?.priceUsd || null,
      reportData?.change24h || null,
      getTelegramDeepLinkWithSource(lang, 'x_quote', {
        influencerUsername: influencerTweet.username,
      }),
      reportData?.exchangeNetflow || null,
      reportData?.whaleRatio || null
    );
    
    // Minimal Version URLが存在する場合は追加（クロスポリネーション）
    if (minimalVersionPostUrl && baseText.length + minimalVersionPostUrl.length + 30 <= 280) {
      const minimalLinkTexts = {
        en: ` See full analysis: ${minimalVersionPostUrl}`,
        ja: ` 詳細分析: ${minimalVersionPostUrl}`,
        es: ` Ver análisis completo: ${minimalVersionPostUrl}`,
        'pt-br': ` Ver análise completa: ${minimalVersionPostUrl}`,
        ar: ` راجع التحليل الكامل: ${minimalVersionPostUrl}`,
        ko: ` 전체 분석 보기: ${minimalVersionPostUrl}`,
      };
      const minimalLinkText = minimalLinkTexts[lang] || minimalLinkTexts.en;
      return baseText + minimalLinkText;
    }
    
    return baseText;
  }
}

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
    console.warn('[Quote Repost] Failed to get daily post count:', error.message);
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
    console.warn('[Quote Repost] Failed to increment daily post count:', error.message);
    return 0;
  }
}

/**
 * インフルエンサーを発掘して引用リポスト（最適化版）
 * Grok推奨: 12投稿/日、ピーク時間のみ、投稿後15-60分以内
 */
async function postQuoteRepostsForLang(lang, reportData = null, dailyPostCount = null) {
  try {
    const currentHour = new Date().getUTCHours();
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 1日の投稿数を取得（Vercel KV）
    if (dailyPostCount === null) {
      dailyPostCount = await getDailyPostCount(dateString);
    }
    
    // ピーク時間チェック（UTC 12-22のみ）
    if (!isPeakTimeWindow(currentHour)) {
      console.log(`⏰ Skipping quote reposts for ${lang} (not peak time: ${currentHour} UTC)`);
      return [];
    }
    
    // 1日の投稿上限チェック（35投稿/日 - Grok推奨）
    if (!checkDailyPostLimit(dailyPostCount, 35)) {
      console.log(`⏰ Daily post limit reached (${dailyPostCount}/35), skipping ${lang}`);
      return [];
    }
    
    // 言語別のインフルエンサー数を取得（10万～20万インプレッション規模を目指す）
    const targetCount = getInfluencerCountForLang(lang);
    const impressionTarget = getImpressionTargetForLang(lang);
    
    console.log(`[Quote Repost] Discovering influencers for ${lang}...`);
    console.log(`[Quote Repost] Target: ${targetCount} influencers, ${impressionTarget.min.toLocaleString()}-${impressionTarget.max.toLocaleString()} impressions`);
    
    let influencers = [];
    try {
      // より多くの候補を取得してからフィルタリング（目標インプレッション規模を達成するため）
      const candidateCount = Math.max(targetCount * 3, 5); // 候補は目標数の3倍、最低5人
      influencers = await discoverInfluencersForQuoteRepost(lang, { maxResults: candidateCount });
      console.log(`[Quote Repost] Grok API returned ${influencers?.length || 0} candidate influencers for ${lang}`);
    } catch (error) {
      console.error(`[Quote Repost] ❌ Failed to discover influencers for ${lang}:`, error.message);
      console.error(`[Quote Repost] Error stack:`, error.stack);
      return [];
    }
    
    if (!influencers || influencers.length === 0) {
      console.warn(`[Quote Repost] ⚠️ No influencers found for ${lang} - skipping quote reposts`);
      return [];
    }
    
    // インプレッション規模を考慮してインフルエンサーを選択
    const selectedInfluencers = selectInfluencersForImpressionTarget(influencers, lang);
    
    console.log(`[Quote Repost] ✅ Selected ${selectedInfluencers.length} influencers for ${lang} (target: ${targetCount})`);
    const totalImpressions = selectedInfluencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0);
    console.log(`[Quote Repost] 📊 Total estimated impressions: ${totalImpressions.toLocaleString()} (target: ${impressionTarget.min.toLocaleString()}-${impressionTarget.max.toLocaleString()})`);
    
    selectedInfluencers.forEach((inf, idx) => {
      console.log(`[Quote Repost]   [${idx + 1}] @${inf.username} - tweetId: ${inf.tweetId || 'MISSING'}, impressions: ${(inf.recentImpressions || 0).toLocaleString()}, engagement: ${((inf.engagementRate || 0) * 100).toFixed(2)}%`);
    });
    
    // 選択されたインフルエンサーを使用
    influencers = selectedInfluencers;
    
    // インフルエンサーをリストに追加（リスト管理）
    for (const influencer of influencers) {
      // 注意: influencerList機能は削除されました（エンドユーザー追跡機能の削除のため）
      // try {
      //   await addInfluencerToList({
      //     ...influencer,
      //     lang,
      //   });
      // } catch (error) {
      //   console.warn(`[Quote Repost] Failed to add influencer to list:`, error.message);
      // }
    }
    
    const results = [];
    
    // Grok推奨: ENは4本/日、その他は2本/日（言語別インフルエンサー数に基づく）
    const maxInfluencers = targetCount; // EN: 4, その他: 2
    for (const influencer of influencers.slice(0, maxInfluencers)) {
      try {
        // tweetIdが必須
        if (!influencer.tweetId) {
          console.warn(`[Quote Repost] Skipping influencer @${influencer.username}: no tweetId`);
          continue;
        }
        
        // インフルエンサーの投稿時刻を取得（tweetTextから推測、またはAPIから取得）
        // 実際の実装では、influencerオブジェクトにcreated_atが含まれる想定
        const influencerTweetTime = influencer.createdAt || new Date().toISOString();
        
        // 最適なタイミングかチェック（投稿後15-60分以内）
        if (!shouldPostQuoteRepost(influencerTweetTime)) {
          console.log(`⏰ Skipping quote repost for @${influencer.username} (not optimal timing: ${influencerTweetTime})`);
          continue;
        }
        
        // インプレッション規模チェック（言語別の目標を考慮）
        const impressions = influencer.recentImpressions || 0;
        const minImpressions = impressionTarget.min * 0.5; // 目標の50%以上
        
        if (impressions < minImpressions) {
          console.log(`⏰ Skipping quote repost for @${influencer.username} (low impressions: ${impressions.toLocaleString()}, min: ${minImpressions.toLocaleString()})`);
          continue;
        }
        
        console.log(`[Quote Repost] ✅ @${influencer.username} meets impression target: ${impressions.toLocaleString()} (target: ${impressionTarget.min.toLocaleString()}-${impressionTarget.max.toLocaleString()})`);
        
        // Grokが引用リポスト用のテキストを生成（Xアルゴリズム最適化版）
        let quoteText;
        try {
          quoteText = await generateQuoteRepostTextWithGrok(lang, influencer, reportData);
        } catch (error) {
          // フォールバック: Xアルゴリズム最適化版テンプレートを使用
          // 重要: Minimal Version URLも取得してフォールバックテンプレートに渡す
          const dateString = new Date().toISOString().split('T')[0];
          const minimalVersionPostUrl = await getMinimalVersionPostUrl(lang, dateString).catch(() => null);
          
          const template = QUOTE_REPOST_TEMPLATES?.[lang] || FALLBACK_QUOTE_REPOST_TEMPLATES[lang] || FALLBACK_QUOTE_REPOST_TEMPLATES.en;
          const { trapScore = 25, priceUsd = null, change24h = null, exchangeNetflow = null, whaleRatio = null } = reportData || {};
          const baseText = template(
            trapScore,
            priceUsd,
            change24h,
            getTelegramDeepLinkWithSource(lang, 'x_quote', {
              influencerUsername: influencer.username,
              utm_content: `influencer_${influencer.username}`,
            }),
            exchangeNetflow,
            whaleRatio
          );
          
          // Minimal Version URLが存在する場合は追加（クロスポリネーション）
          if (minimalVersionPostUrl && baseText.length + minimalVersionPostUrl.length + 30 <= 280) {
            const minimalLinkTexts = {
              en: ` See full analysis: ${minimalVersionPostUrl}`,
              ja: ` 詳細分析: ${minimalVersionPostUrl}`,
              es: ` Ver análisis completo: ${minimalVersionPostUrl}`,
              'pt-br': ` Ver análise completa: ${minimalVersionPostUrl}`,
              ar: ` راجع التحليل الكامل: ${minimalVersionPostUrl}`,
              ko: ` 전체 분석 보기: ${minimalVersionPostUrl}`,
            };
            const minimalLinkText = minimalLinkTexts[lang] || minimalLinkTexts.en;
            quoteText = baseText + minimalLinkText;
          } else {
            quoteText = baseText;
          }
        }
        
        // Grok推奨: ハッシュタグを動的取得（トレンド1+ニッチ2）
        const { getTrendyHashtags } = require('../services/x/optimization');
        const optimizedHashtags = await getTrendyHashtags(lang, 'BTC').catch(() => getOptimizedHashtags(lang));
        if (quoteText.includes('#BTC') || quoteText.includes('#Bitcoin')) {
          // 動的ハッシュタグで置換
          const hashtagStr = Array.isArray(optimizedHashtags) ? optimizedHashtags.join(' ') : optimizedHashtags;
          quoteText = quoteText.replace(/#(?:BTC|Bitcoin).*#TrapDefence/g, hashtagStr);
        }
        
        // 140文字以内に制限（引用リポスト用）
        if (quoteText.length > 140) {
          quoteText = quoteText.substring(0, 137) + '...';
        }
        
        // 引用リポストを投稿
        console.log(`[Quote Repost] Posting quote repost for @${influencer.username} (tweetId: ${influencer.tweetId})...`);
        console.log(`[Quote Repost] Quote text preview: ${quoteText.substring(0, 100)}...`);
        const result = await postQuoteTweet(quoteText.substring(0, 280), influencer.tweetId);
        
        // 投稿数をインクリメント
        await incrementDailyPostCount(dateString, 1);
        
        // 注意: influencerList機能は削除されました（エンドユーザー追跡機能の削除のため）
        // 引用リポストをリストに記録（メトリクスは後でCron Jobで追跡）
        // const influencerId = generateInfluencerId(influencer);
        // await recordQuoteRepost(influencerId, result.id);
        
        // Grok推奨: EN実測ダッシュボード用メトリクス記録
        let engagementMetrics = null;
        try {
          const { recordEngagementMetrics } = require('./x-engagement-metrics');
          const quoteMetrics = await getTweetMetrics(result.id, true); // 自分のツイートなのでnon_public_metrics取得可能
          if (quoteMetrics) {
            engagementMetrics = {
              impressions: quoteMetrics.nonPublicMetrics?.impression_count || quoteMetrics.organicMetrics?.impression_count || 0,
              engagements: (quoteMetrics.publicMetrics?.like_count || 0) +
                          (quoteMetrics.publicMetrics?.retweet_count || 0) +
                          (quoteMetrics.publicMetrics?.reply_count || 0) +
                          (quoteMetrics.publicMetrics?.quote_count || 0),
              clicks: quoteMetrics.nonPublicMetrics?.url_link_clicks || quoteMetrics.organicMetrics?.url_link_clicks || 0,
              replies: quoteMetrics.publicMetrics?.reply_count || 0,
              retweets: quoteMetrics.publicMetrics?.retweet_count || 0,
              likes: quoteMetrics.publicMetrics?.like_count || 0,
              quoteTweets: quoteMetrics.publicMetrics?.quote_count || 0,
            };
            
            await recordEngagementMetrics(result.id, {
              ...engagementMetrics,
              lang,
              source: 'quote_repost',
              influencerUsername: influencer.username,
            });
            
            // 最適化案: インフルエンサー別メトリクスを記録（インフルエンサー分析）
            try {
              const { recordInfluencerMetrics } = require('../services/x/influencerAnalyzer');
              await recordInfluencerMetrics(influencer.username, result.id, engagementMetrics);
            } catch (error) {
              console.warn('[Quote Repost] Failed to record influencer metrics:', error.message);
            }
          }
        } catch (error) {
          console.warn(`[Quote Repost] Failed to record engagement metrics:`, error.message);
        }
        
        // インフルエンサーのツイートのpublic_metricsを取得（正確なエンゲージメント数）
        let influencerMetrics = null;
        try {
          const metrics = await getTweetMetrics(influencer.tweetId, false); // 他人のツイートなのでnon_public_metricsは取得不可
          if (metrics) {
            influencerMetrics = {
              likes: metrics.publicMetrics.like_count || 0,
              retweets: metrics.publicMetrics.retweet_count || 0,
              replies: metrics.publicMetrics.reply_count || 0,
              quotes: metrics.publicMetrics.quote_count || 0,
              // 注意: インプレッション数は取得不可能（プライバシー保護）
              // Grokの推定値（recentImpressions）を使用
            };
          }
        } catch (error) {
          console.warn(`[Quote Repost] Failed to get influencer metrics:`, error.message);
        }
        
        // エンゲージメント数を計算（自分の引用リポスト用）
        const quoteEngagement = engagementMetrics?.engagements || 0;
        const quoteImpressions = engagementMetrics?.impressions || 0;
        
        // 注意: 自分の投稿した引用リポスト（result.id）のメトリクスは、
        // Cron Job（api/x-quote-repost-metrics.js）で定期的に追跡される
        // インプレッション数とエンゲージメント数は正確に取得可能
        
        results.push({
          lang,
          influencer: influencer.username,
          tweetId: influencer.tweetId,
          quoteTweetId: result.id,
          success: true,
          engagement: quoteEngagement,
          impressions: quoteImpressions,
          // Grokの推定値（正確ではない - インフルエンサーのツイート用）
          estimatedImpressions: influencer.recentImpressions || 0,
          // 正確なエンゲージメント数（インフルエンサーのツイート - X APIから取得）
          influencerMetrics: influencerMetrics,
          // 自分の引用リポストのメトリクスはCron Jobで追跡（正確なインプレッション数 + エンゲージメント数）
        });
        console.log(`[Quote Repost] ✅ Quote repost posted for ${lang} (@${influencer.username}): ${result.id}`);
        console.log(`[Quote Repost] 📊 Metrics tracking: Quote repost ${result.id} will be tracked by Cron Job (accurate impressions + engagement)`);
        
        // レート制限対策（1時間あたり3-4投稿まで）
        await new Promise(resolve => setTimeout(resolve, 900000)); // 15分待機（1時間4投稿まで）
      } catch (error) {
        console.error(`❌ Failed to post quote repost for ${lang} (@${influencer.username}):`, error.message);
        results.push({
          lang,
          influencer: influencer.username,
          tweetId: influencer.tweetId,
          success: false,
          error: error.message,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error(`❌ Failed to post quote reposts for ${lang}:`, error.message);
    return [];
  }
}

/**
 * 引用リポストを実行（全言語）
 */
async function postQuoteReposts(reportData = null) {
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
    
    if (xStatus.dryRun) {
      console.log('🧪 X dry-run enabled, skipping quote reposts');
      return { success: true, dryRun: true };
    }
    
    const targetLangs = SUPPORTED_LANGS;
    const allResults = [];
    
    // 各言語ごとに引用リポスト（1時間に1言語 = 6時間で完了）
    // 実際の実装では、スケジューラーで1時間ごとに1言語ずつ実行
    for (const lang of targetLangs) {
      const langResults = await postQuoteRepostsForLang(lang, reportData);
      allResults.push(...langResults);
    }
    
    const successCount = allResults.filter(r => r.success).length;
    const totalCount = allResults.length;
    
    return {
      success: successCount > 0,
      sent: successCount,
      total: totalCount,
      byLang: allResults,
    };
  } catch (error) {
    console.error('❌ Quote repost failed:', error.message);
    throw error;
  }
}

// Vercel Cron実行時（1時間ごと）
const handler = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  console.log('[Quote Repost] ========================================');
  console.log('[Quote Repost] Cron job triggered at', new Date().toISOString());
  console.log('[Quote Repost] ========================================');
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Quote Repost] ❌ Unauthorized: Invalid CRON_SECRET');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // KVストレージ接続確認
    if (!kv) {
      console.warn('[Quote Repost] ⚠️ KV storage not available - post count tracking may not work');
    } else {
      console.log('[Quote Repost] ✅ KV storage available');
    }
    
    // X API設定状況を確認
    const xStatus = getXConfigStatus();
    console.log('[Quote Repost] X API Status:', {
      configured: xStatus.configured,
      postingEnabled: xStatus.postingEnabled,
      dryRun: xStatus.dryRun,
      missing: xStatus.missing,
    });
    
    if (!xStatus.postingEnabled) {
      console.log('[Quote Repost] ❌ X posting disabled by X_POSTING_ENABLED');
      return res.status(200).json({ success: false, skipped: true, error: 'X posting disabled' });
    }
    
    if (!xStatus.configured) {
      console.error(`[Quote Repost] ❌ X API not configured, missing: ${xStatus.missing.join(', ')}`);
      return res.status(200).json({ 
        success: false, 
        error: 'X API credentials missing', 
        missing: xStatus.missing 
      });
    }
    
    if (xStatus.dryRun) {
      console.log('[Quote Repost] 🧪 DRY RUN MODE - No actual posts will be made');
    }
    
    // Grok API設定確認
    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      console.warn('[Quote Repost] ⚠️ XAI_API_KEY not set - influencer discovery may fail');
    } else {
      console.log('[Quote Repost] ✅ XAI_API_KEY configured');
    }
    
    // リクエストボディからレポートデータを取得
    let reportData = req.body?.reportData || null;
    
    // レポートデータが提供されていない場合、最新の市場データを取得
    if (!reportData || !reportData.trapScore || !reportData.priceUsd) {
      console.log('[Quote Repost] Fetching latest market data...');
      try {
        // モジュールを動的にrequire（循環依存を避けるため）
        const xPostFreeReportModule = require('./x-post-free-report');
        // 複数のエクスポート方法に対応
        let fetchLatestMarketData = null;
        if (typeof xPostFreeReportModule === 'function') {
          // デフォルトエクスポートが関数の場合
          fetchLatestMarketData = xPostFreeReportModule.fetchLatestMarketData;
        } else if (xPostFreeReportModule.fetchLatestMarketData) {
          // 名前付きエクスポート
          fetchLatestMarketData = xPostFreeReportModule.fetchLatestMarketData;
        } else if (xPostFreeReportModule.default?.fetchLatestMarketData) {
          // デフォルトオブジェクトのプロパティ
          fetchLatestMarketData = xPostFreeReportModule.default.fetchLatestMarketData;
        }
        
        if (!fetchLatestMarketData || typeof fetchLatestMarketData !== 'function') {
          console.error('[Quote Repost] ❌ fetchLatestMarketData is not available');
          console.error('[Quote Repost] Module exports:', Object.keys(xPostFreeReportModule || {}));
          // フォールバック: marketSnapshotServiceから最新スナップショットを取得
          const marketSnapshotService = require('../services/core/marketSnapshot');
          const snapshot = marketSnapshotService.getLatestSnapshot();
          if (snapshot) {
            reportData = {
              trapScore: snapshot.trap_score || 0,
              priceUsd: snapshot.price_usd_raw || 0,
              change24h: snapshot.change_24h || 0,
              exchangeNetflow: snapshot.exchange_netflow || snapshot.inflow || null,
              whaleRatio: snapshot.whale_ratio || snapshot.whaleRatio || null,
            };
            console.log('[Quote Repost] Using fallback market data from marketSnapshotService');
          } else {
            // 最後のフォールバック: デフォルト値を使用（現在の市況を反映）
            console.warn('[Quote Repost] ⚠️ No snapshot available, using default values');
            reportData = {
              trapScore: 0,
              priceUsd: 89077,
              change24h: -0.84,
              exchangeNetflow: 1252, // 現在の市況を反映
              whaleRatio: 56, // 現在の市況を反映
            };
          }
        } else {
          reportData = await fetchLatestMarketData();
        }
      } catch (fetchError) {
        console.error('[Quote Repost] ❌ Error fetching market data:', fetchError.message);
        // フォールバック: marketSnapshotServiceから最新スナップショットを取得
        try {
          const marketSnapshotService = require('../services/core/marketSnapshot');
          const snapshot = marketSnapshotService.getLatestSnapshot();
          if (snapshot) {
            reportData = {
              trapScore: snapshot.trap_score || 0,
              priceUsd: snapshot.price_usd_raw || 0,
              change24h: snapshot.change_24h || 0,
              exchangeNetflow: snapshot.exchange_netflow || snapshot.inflow || null,
              whaleRatio: snapshot.whale_ratio || snapshot.whaleRatio || null,
            };
            console.log('[Quote Repost] Using fallback market data from marketSnapshotService');
          } else {
            // 最後のフォールバック: デフォルト値を使用（現在の市況を反映）
            console.warn('[Quote Repost] ⚠️ No snapshot available, using default values');
            reportData = {
              trapScore: 0,
              priceUsd: 89077,
              change24h: -0.84,
              exchangeNetflow: 1252, // 現在の市況を反映
              whaleRatio: 56, // 現在の市況を反映
            };
          }
        } catch (fallbackError) {
          console.error('[Quote Repost] ❌ Fallback also failed:', fallbackError.message);
          // デフォルト値を使用して続行（完全に失敗させない、現在の市況を反映）
          reportData = {
            trapScore: 0,
            priceUsd: 89077,
            change24h: -0.84,
            exchangeNetflow: 1252, // 現在の市況を反映
            whaleRatio: 56, // 現在の市況を反映
          };
          console.warn('[Quote Repost] ⚠️ Using default values due to all fallbacks failing');
        }
      }
      console.log('[Quote Repost] Market data fetched:', {
        trapScore: reportData.trapScore,
        priceUsd: reportData.priceUsd,
        change24h: reportData.change24h,
      });
    }
    
    // 1時間ごとに1言語ずつ実行（6時間で全言語完了）
    const targetLangs = SUPPORTED_LANGS;
    const currentHour = new Date().getUTCHours();
    const langIndex = currentHour % targetLangs.length;
    const targetLang = targetLangs[langIndex];
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 1日の投稿数を取得（Vercel KV）- 変数名を明確に（重複回避）
    const currentDailyPostCount = await getDailyPostCount(dateString);
    
    console.log(`[Quote Repost] Processing ${targetLang} (hour ${currentHour}, daily count: ${currentDailyPostCount})`);
    
    // ピーク時間チェック
    if (!isPeakTimeWindow(currentHour)) {
      console.log(`[Quote Repost] ⏰ Skipping quote reposts (not peak time: ${currentHour} UTC)`);
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'not_peak_time',
        lang: targetLang,
        results: [],
        dailyPostCount: currentDailyPostCount,
      });
    }
    
    console.log(`[Quote Repost] Starting influencer discovery for ${targetLang}...`);
    const langResults = await postQuoteRepostsForLang(targetLang, reportData, currentDailyPostCount);
    
    // 更新後の投稿数を取得
    const updatedDailyPostCount = await getDailyPostCount(dateString);
    
    const successCount = langResults.filter(r => r.success).length;
    console.log(`[Quote Repost] ========================================`);
    console.log(`[Quote Repost] Completed for ${targetLang}: ${successCount}/${langResults.length} successful`);
    console.log(`[Quote Repost] Results:`, JSON.stringify(langResults, null, 2));
    console.log(`[Quote Repost] ========================================`);
    
    return res.status(200).json({
      success: true,
      lang: targetLang,
      results: langResults,
      dailyPostCount: updatedDailyPostCount,
    });
  } catch (error) {
    console.error('[Quote Repost] ========================================');
    console.error('[Quote Repost] ❌ Handler error:', error.message);
    console.error('[Quote Repost] Stack:', error.stack);
    console.error('[Quote Repost] ========================================');
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};

module.exports = handler;
module.exports.postQuoteReposts = postQuoteReposts;
module.exports.postQuoteRepostsForLang = postQuoteRepostsForLang;
