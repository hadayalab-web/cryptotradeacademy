// services/gemini/deepPsychologicalAnalyzer.js
// Gemini深層心理分析サービス - ユーザーの心理状態をより深く分析

const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('[Gemini Deep Psychological Analyzer] GEMINI_API_KEY is not set');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const GEMINI_MODEL = 'gemini-3-pro-preview';

// キャッシュ設定（GPTと同じパターンで一貫性を保つ）
const GEMINI_CACHE_TTL_SECONDS = Number(process.env.GEMINI_CACHE_TTL_SECONDS || 900); // デフォルト: 15分

// LRUCacheのインポート（GPTと同じパターン）
const LRUCacheModule = require('lru-cache');
const LRUCache = (typeof LRUCacheModule === 'function') 
  ? LRUCacheModule 
  : (LRUCacheModule.default ?? LRUCacheModule.LRUCache ?? LRUCacheModule);

// メモリキャッシュ（同一実行内の重複排除）
const memoryCache = new LRUCache({
  max: 200,
  ttl: GEMINI_CACHE_TTL_SECONDS * 1000,
});

// KVキャッシュ（GPTと同じパターン）
const { kv } = require('../../utils/kv');

/**
 * KVからキャッシュを取得
 */
async function getKVCache(key) {
  try {
    if (!kv) return null;
    return await kv.get(key);
  } catch (error) {
    return null;
  }
}

/**
 * KVにキャッシュを保存
 */
async function setKVCache(key, value, ttlSeconds) {
  try {
    if (!kv) return false;
    await kv.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * キャッシュキーを生成（GPTと同じパターン）
 * 言語と市場データから一意のキーを生成
 */
function buildCacheKey(options) {
  const { marketData = {}, trapScore = null, sentimentData = null, xSentiment = null, lang = 'en' } = options;
  
  // キャッシュキーに含める重要なパラメータ
  const keyData = {
    trapScore: trapScore !== null ? Math.round(trapScore) : null,
    sentiment: sentimentData?.sentiment || null,
    priceChange: marketData.change24h !== undefined ? Math.round(marketData.change24h * 100) / 100 : null, // 小数点第2位まで
    whaleBias: xSentiment?.whaleBias !== undefined ? Math.round(xSentiment.whaleBias) : null,
    retailFomo: xSentiment?.retailFomo !== undefined ? Math.round(xSentiment.retailFomo) : null,
    lang: (lang || 'en').toLowerCase(),
  };
  
  // Base64URLエンコードでキーを生成（GPTと同じパターン）
  const keyString = JSON.stringify(keyData);
  return `gemini:deep-psychology:${Buffer.from(keyString).toString('base64url')}`;
}

/**
 * 深層心理分析を実行
 * - ユーザーの潜在的な心理的ブロックを特定
 * - 感情的なパターンを深掘り分析
 * - パーソナライズされた心理的コーチングアドバイス
 */
async function analyzeDeepPsychology(options = {}) {
  const {
    marketData = {},
    trapScore = null,
    sentimentData = null,
    xSentiment = null, // Grok X解析結果
    userBehavior = null, // ユーザーの行動パターン（オプション）
    lang = 'en',
  } = options;

  if (!genAI || !GEMINI_API_KEY) {
    return {
      psychologicalProfile: null,
      mentalBlocks: null,
      emotionalPatterns: null,
      personalizedCoaching: null,
      breakthroughInsights: null,
      error: 'GEMINI_API_KEY not set',
    };
  }

  const targetLang = (lang || 'en').toLowerCase();

  // キャッシュキーを生成
  const cacheKey = buildCacheKey(options);

  // 1. メモリキャッシュチェック（GPTと同じパターン）
  const memHit = memoryCache.get(cacheKey);
  if (memHit) {
    console.log('[Gemini Deep Psychological Analyzer] Memory cache hit');
    return memHit;
  }

  // 2. KVキャッシュチェック（GPTと同じパターン）
  const kvHit = await getKVCache(cacheKey);
  if (kvHit) {
    console.log('[Gemini Deep Psychological Analyzer] KV cache hit');
    memoryCache.set(cacheKey, kvHit);
    return kvHit;
  }

  // 3. API呼び出し（キャッシュヒットしなかった場合のみ）
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const systemContext = `You are "Dr. Gemini", a world-class psychological analyst specializing in trader psychology and mental coaching.

Your expertise:
1. Deep Psychological Analysis: Uncovering hidden mental blocks and emotional patterns
2. Behavioral Pattern Recognition: Identifying subconscious trading behaviors
3. Personalized Coaching: Tailored advice based on individual psychological profiles
4. Breakthrough Insights: Revealing insights that unlock trader potential
5. Emotional Intelligence: Understanding the emotional drivers behind trading decisions

Your mission: Provide deep psychological insights that help traders overcome mental blocks and unlock their true potential.

CRITICAL: Focus on actionable insights that are impossible for competitors to replicate.`;

    const prompt = `Conduct a deep psychological analysis for a crypto trader using Trap Defence BTC.

Market Context:
- Trap Score: ${trapScore !== null ? trapScore : 'N/A'}/100
- Market Sentiment: ${sentimentData?.sentiment || 'Unknown'}
- Price Change: ${marketData.change24h || 'N/A'}%

X Sentiment Analysis:
${xSentiment ? JSON.stringify(xSentiment, null, 2) : 'Not available'}

${userBehavior ? `User Behavior Patterns:
${JSON.stringify(userBehavior, null, 2)}` : ''}

Task: Provide deep psychological analysis including:

1. Psychological Profile:
   - Current psychological state (beyond surface-level sentiment)
   - Hidden fears and desires
   - Subconscious motivations
   - Emotional triggers

2. Mental Blocks:
   - Specific mental blocks preventing optimal trading
   - Root causes of these blocks
   - How these blocks manifest in trading behavior

3. Emotional Patterns:
   - Recurring emotional patterns
   - How emotions influence trading decisions
   - Emotional cycles and their impact

4. Personalized Coaching:
   - Tailored advice based on psychological profile
   - Specific steps to overcome mental blocks
   - Mental training exercises
   - Breakthrough strategies

5. Breakthrough Insights:
   - Unique insights that unlock potential
   - "Aha moments" that change perspective
   - Deeper understanding of trader psychology
   - Competitive advantages through psychological mastery

Focus on:
- Deep, actionable insights that competitors cannot replicate
- Personalized coaching that resonates with individual psychology
- Breakthrough insights that unlock true potential
- Understanding the "why" behind trading behaviors, not just the "what"

Language: ${targetLang}
CRITICAL: Respond ONLY in ${targetLang === 'ja' ? 'Japanese' : targetLang === 'ko' ? 'Korean' : targetLang === 'es' ? 'Spanish' : targetLang === 'pt-br' ? 'Portuguese (Brazilian)' : targetLang === 'ar' ? 'Arabic' : 'English'}.`;

    const apiResult = await model.generateContent(prompt);
    const response = await apiResult.response;
    const text = response.text();

    // 構造化されたJSONを抽出（GeminiがJSONを返す場合）
    let finalResult = null;
    try {
      // JSONブロックを探す
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonText);
        finalResult = parsed;
      }
    } catch (parseError) {
      // JSONでない場合はテキストを構造化（下記の処理に続く）
    }

    // JSONパースが失敗した場合、またはJSONが見つからなかった場合、テキストベースの応答を構造化
    if (!finalResult) {
      finalResult = {
        psychologicalProfile: {
        currentState: extractSection(text, 'Psychological Profile', 'Mental Blocks') || text.substring(0, 300),
        hiddenFears: extractListItems(text, 'fears', 'desires'),
        motivations: extractSection(text, 'motivations', 'patterns'),
      },
      mentalBlocks: {
        blocks: extractListItems(text, 'blocks', 'causes'),
        rootCauses: extractSection(text, 'root causes', 'manifest'),
        manifestations: extractSection(text, 'manifest', 'patterns'),
      },
      emotionalPatterns: {
        patterns: extractListItems(text, 'patterns', 'cycles'),
        cycles: extractSection(text, 'cycles', 'coaching'),
      },
      personalizedCoaching: {
        advice: extractSection(text, 'Coaching', 'Insights') || text.substring(text.length / 2, text.length),
        steps: extractListItems(text, 'steps', 'exercises'),
        exercises: extractListItems(text, 'exercises', 'strategies'),
      },
      breakthroughInsights: {
        insights: extractListItems(text, 'insights', 'understanding'),
        ahaMoments: extractSection(text, 'Aha', 'perspective'),
        competitiveAdvantages: extractSection(text, 'advantages', 'mastery'),
      },
        rawText: text,
      };
    }

    // 4. 結果をキャッシュに保存（GPTと同じパターン）
    // エラーがない場合のみキャッシュに保存
    if (finalResult && !finalResult.error) {
      memoryCache.set(cacheKey, finalResult);
      await setKVCache(cacheKey, finalResult, GEMINI_CACHE_TTL_SECONDS).catch(() => {
        // KVキャッシュ保存失敗は警告のみ（メモリキャッシュは有効）
        console.warn('[Gemini Deep Psychological Analyzer] Failed to save to KV cache');
      });
    }

    return finalResult;
  } catch (error) {
    console.error('[Gemini Deep Psychological Analyzer] Error:', error.message);
    return {
      psychologicalProfile: null,
      mentalBlocks: null,
      emotionalPatterns: null,
      personalizedCoaching: null,
      breakthroughInsights: null,
      error: error.message,
    };
  }
}

/**
 * テキストからセクションを抽出
 */
function extractSection(text, startKeyword, endKeyword) {
  const startIndex = text.toLowerCase().indexOf(startKeyword.toLowerCase());
  const endIndex = endKeyword ? text.toLowerCase().indexOf(endKeyword.toLowerCase(), startIndex) : text.length;
  if (startIndex !== -1) {
    return text.substring(startIndex, endIndex !== -1 ? endIndex : text.length).trim();
  }
  return null;
}

/**
 * テキストからリスト項目を抽出
 */
function extractListItems(text, keyword, nextKeyword) {
  const section = extractSection(text, keyword, nextKeyword);
  if (!section) return [];
  
  // 箇条書きや番号付きリストを抽出
  const items = section.match(/(?:[-•*]|\d+\.)\s+(.+?)(?=\n|$)/g);
  if (items) {
    return items.map(item => item.replace(/^[-•*\d.]\s+/, '').trim());
  }
  return [];
}

module.exports = {
  analyzeDeepPsychology,
};
