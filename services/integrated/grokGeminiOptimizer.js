// services/integrated/grokGeminiOptimizer.js
// Grok Xアルゴリズム解析とGemini深層心理解析を統合して最適化戦略を生成

const { analyzeXAlgorithmOptimization } = require('../grok/xAlgorithmAnalyzer');
const { analyzeDeepPsychology } = require('../gemini/deepPsychologicalAnalyzer');

/**
 * GrokとGeminiの解析結果を統合して最適化戦略を生成
 * @param {Object} options - 統合オプション
 * @param {Object} options.marketData - 市場データ
 * @param {Object} options.trapScore - トラップスコア
 * @param {Object} options.sentimentData - センチメントデータ
 * @param {Object} options.xSentiment - Xセンチメント（Grok解析結果）
 * @param {Object} options.trapDetection - トラップ検出結果
 * @param {Object} options.psychologicalSupport - 心理的サポート結果
 * @param {string} options.lang - 言語コード
 * @returns {Promise<Object>} 統合された最適化戦略
 */
async function integrateGrokGeminiOptimization(options = {}) {
  const {
    marketData = {},
    trapScore = null,
    sentimentData = null,
    xSentiment = null,
    trapDetection = null,
    psychologicalSupport = null,
    lang = 'en',
  } = options;

  try {
    // GrokとGeminiの解析を並列実行
    const [grokResult, geminiResult] = await Promise.allSettled([
      analyzeXAlgorithmOptimization({
        marketData,
        trapScore,
        sentimentData,
        lang,
      }),
      analyzeDeepPsychology({
        marketData,
        trapScore,
        sentimentData,
        xSentiment,
        lang,
      }),
    ]);

    const grokAnalysis = grokResult.status === 'fulfilled' ? grokResult.value : null;
    const geminiAnalysis = geminiResult.status === 'fulfilled' ? geminiResult.value : null;

    // エラーハンドリングとユーザー通知用エラーコード生成（多言語対応）
    const errorCodes = [];
    if (grokResult.status === 'rejected') {
      const errorMsg = grokResult.reason?.message || 'Unknown error';
      console.warn('[GrokGeminiOptimizer] Grok analysis failed:', errorMsg);
      errorCodes.push('GROK_UNAVAILABLE');
    } else if (grokAnalysis?.error) {
      console.warn('[GrokGeminiOptimizer] Grok analysis error:', grokAnalysis.error);
      errorCodes.push('GROK_ERROR');
    }
    
    if (geminiResult.status === 'rejected') {
      const errorMsg = geminiResult.reason?.message || 'Unknown error';
      console.warn('[GrokGeminiOptimizer] Gemini analysis failed:', errorMsg);
      errorCodes.push('GEMINI_UNAVAILABLE');
    } else if (geminiAnalysis?.error) {
      console.warn('[GrokGeminiOptimizer] Gemini analysis error:', geminiAnalysis.error);
      errorCodes.push('GEMINI_ERROR');
    }

    // 型正規化ヘルパー関数
    const normalizeArray = (value, defaultValue = []) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      return defaultValue;
    };
    
    const normalizeNumber = (value, defaultValue = 0) => {
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };
    
    const normalizeString = (value, defaultValue = '') => {
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        // オブジェクト/配列の場合は要約して文字列化
        if (Array.isArray(value)) return value.join(', ');
        return JSON.stringify(value).substring(0, 200);
      }
      return defaultValue;
    };

    // 統合された最適化戦略を生成（型正規化込み）
    const optimization = {
      // コンテンツ最適化
      content: {
        // GrokのXアルゴリズム最適化から取得（CTAと構造を分離）
        questionCTA: normalizeString(
          grokAnalysis?.engagementStrategy?.ctaOptimization,
          'Ask a direct question that invites replies.'
        ),
        
        structure: normalizeString(
          grokAnalysis?.contentOptimization?.structure,
          'Short hook + 1 insight + CTA.'
        ),
        
        linkPlacement: normalizeString(
          grokAnalysis?.contentOptimization?.linkPlacement || grokAnalysis?.contentOptimization?.links,
          'Place one link after value; avoid link-first.'
        ),
        
        hashtags: normalizeArray(
          grokAnalysis?.contentOptimization?.hashtags,
          ['#BTC', '#Crypto']
        ),
        
        visuals: normalizeString(
          grokAnalysis?.contentOptimization?.visualElements,
          'Use minimal emojis to highlight key points.'
        ),
        
        // Geminiの深層心理解析から取得
        psychologicalTriggers: normalizeArray(
          geminiAnalysis?.psychologicalProfile?.emotionalTriggers || geminiAnalysis?.emotionalPatterns?.patterns,
          []
        ),
        
        cognitiveBiases: normalizeArray(
          geminiAnalysis?.mentalBlocks?.blocks,
          []
        ),
        
        // ストーリーテリング（Geminiのコーチングアドバイスを優先）
        storytelling: normalizeString(
          geminiAnalysis?.personalizedCoaching?.advice,
          'Connect data to trader psychology.'
        ),
      },
      
      // タイミング最適化（型正規化）
      timing: normalizeArray(
        grokAnalysis?.optimalPostingTime?.recommendedTimes,
        ['09:00 UTC', '21:00 UTC']
      ),
      
      timingReasoning: normalizeString(
        grokAnalysis?.optimalPostingTime?.reasoning,
        'Standard posting times for maximum engagement.'
      ),
      
      // フォーマット最適化
      format: normalizeString(
        grokAnalysis?.engagementStrategy?.optimalFormat,
        'Short hook + 1 insight + CTA.'
      ),
      
      // ファネル最適化
      funnel: {
        telegramOptIn: normalizeString(
          geminiAnalysis?.cvrPsychologicalAlgorithm?.telegramOptIn?.strategy,
          'Offer a clear free benefit and a single next step.'
        ),
        
        whopConversion: normalizeString(
          geminiAnalysis?.cvrPsychologicalAlgorithm?.whopConversion?.strategy,
          'Use risk reversal + proof + urgency.'
        ),
        
        psychologicalTriggers: normalizeArray(
          geminiAnalysis?.cvrPsychologicalAlgorithm?.telegramOptIn?.psychologicalTriggers || 
          geminiAnalysis?.cvrPsychologicalAlgorithm?.whopConversion?.psychologicalTriggers,
          []
        ),
      },
      
      // 優先順位（固定だが、将来的に動的に変更可能）
      priorityOrder: [
        'Hook',
        'Single insight',
        'Question CTA',
        'One link',
      ],
      
      // バイラル可能性（型正規化）
      viralPotential: normalizeNumber(
        grokAnalysis?.viralPotential?.score,
        50
      ),
      
      viralFactors: normalizeArray(
        grokAnalysis?.viralPotential?.factors,
        []
      ),
      
      // エンゲージメント戦略（型正規化）
      engagementBoosters: normalizeArray(
        grokAnalysis?.algorithmInsights?.engagementBoosters,
        []
      ),
      
      // 心理的インサイト
      psychologicalInsights: {
        currentState: normalizeString(
          geminiAnalysis?.psychologicalProfile?.currentState || psychologicalSupport?.psychologicalState,
          'NEUTRAL'
        ),
        
        mentalBlocks: normalizeArray(
          geminiAnalysis?.mentalBlocks?.blocks || psychologicalSupport?.mentalBlocks,
          []
        ),
        
        breakthroughInsights: normalizeArray(
          geminiAnalysis?.breakthroughInsights?.insights,
          []
        ),
        
        personalizedCoaching: normalizeString(
          geminiAnalysis?.personalizedCoaching?.advice || psychologicalSupport?.psychologicalAdvice,
          ''
        ),
      },
    };

    return {
      optimization,
      sources: {
        grok: grokAnalysis,
        gemini: geminiAnalysis,
      },
      integrated: true,
      // エラーコードをユーザー通知用に含める（多言語対応）
      errorCodes: errorCodes.length > 0 ? errorCodes : null,
      // 部分的な統合かどうかを示すフラグ
      partialIntegration: (grokAnalysis && !geminiAnalysis) || (!grokAnalysis && geminiAnalysis),
    };
  } catch (error) {
    console.error('[GrokGeminiOptimizer] Integration error:', error.message);
    return {
      optimization: null,
      sources: {
        grok: null,
        gemini: null,
      },
      integrated: false,
      error: error.message,
    };
  }
}

module.exports = {
  integrateGrokGeminiOptimization,
};
