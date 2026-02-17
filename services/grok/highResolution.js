// services/grok/highResolution.js
// プロンプトに基づく Grok のセンチメント風出力（高解像度＝複数クエリ並列）。Grok は X に直接アクセスしない。

const { analyzeXSentimentLive } = require('./client');

/**
 * 高解像度Xセンチメント解析
 * 複数の専門クエリを並列実行し、大口とリテールの両方の動向を詳細に分析
 * @param {Object} options - 解析オプション
 * @returns {Promise<Object>} 高解像度センチメントデータ
 */
async function analyzeXSentimentHighResolution(options = {}) {
  const {
    lang = 'en',
    includeWhaleAnalysis = true,
    includeRetailAnalysis = true,
    includeFundingAnalysis = true,
    includeETFAnalysis = true,
    includeLiquidationAnalysis = true,
  } = options;
  
  try {
    // 複数の専門クエリを並列実行
    const queries = [];
    
    if (includeWhaleAnalysis) {
      queries.push({
        name: 'whaleActivity',
        query: 'BTC whale activity, large transactions, whale wallets movement, institutional selling on X',
        focus: 'whale',
      });
    }
    
    if (includeRetailAnalysis) {
      queries.push({
        name: 'retailFomo',
        query: 'BTC retail FOMO, small trader sentiment, retail buying pressure, retail trader discussions on X',
        focus: 'retail',
      });
    }
    
    if (includeFundingAnalysis) {
      queries.push({
        name: 'fundingRates',
        query: 'BTC funding rates, perpetual futures funding, derivatives sentiment, long/short ratio on X',
        focus: 'derivatives',
      });
    }
    
    if (includeETFAnalysis) {
      queries.push({
        name: 'etfFlows',
        query: 'BTC ETF flows, spot Bitcoin ETF, GBTC flows, institutional BTC accumulation on X',
        focus: 'institutional',
      });
    }
    
    if (includeLiquidationAnalysis) {
      queries.push({
        name: 'liquidations',
        query: 'BTC liquidations, cascading liquidations, margin calls, leverage positions on X',
        focus: 'risk',
      });
    }
    
    // 全クエリを並列実行
    const results = await Promise.allSettled(
      queries.map(async ({ name, query, focus }) => {
        try {
          const result = await analyzeXSentimentLive(query, lang);
          return { name, focus, result };
        } catch (error) {
          console.warn(`[highResolution Grok] Error in query ${name}:`, error.message);
          return { name, focus, error: error.message };
        }
      })
    );
    
    // 結果を統合
    const sentimentData = {
      whale: { bias: 0, confidence: 0, sources: [] },
      retail: { fomo: 50, confidence: 0, sources: [] },
      derivatives: { fundingSentiment: 0, confidence: 0, sources: [] },
      institutional: { etfFlowSentiment: 0, confidence: 0, sources: [] },
      risk: { liquidationRisk: 0, confidence: 0, sources: [] },
    };
    
    results.forEach((settled, index) => {
      if (settled.status === 'fulfilled' && settled.value && !settled.value.error) {
        const { name, focus, result } = settled.value;
        
        // 結果がオブジェクトの場合、構造化データとして処理
        if (typeof result === 'object' && result !== null) {
          switch (focus) {
            case 'whale':
              sentimentData.whale.bias = Number(result.whaleBias) || 0;
              sentimentData.whale.confidence = result.sources?.length > 0 ? 0.8 : 0.5;
              sentimentData.whale.sources = result.sources || [];
              sentimentData.whale.summary = result.summary || '';
              break;
              
            case 'retail':
              sentimentData.retail.fomo = Number(result.retailFomo) || 50;
              sentimentData.retail.confidence = result.sources?.length > 0 ? 0.8 : 0.5;
              sentimentData.retail.sources = result.sources || [];
              sentimentData.retail.summary = result.summary || '';
              break;
              
            case 'derivatives':
              // Funding Rate関連のセンチメントを抽出
              const fundingSentiment = extractDerivativesSentiment(result);
              sentimentData.derivatives.fundingSentiment = fundingSentiment;
              sentimentData.derivatives.confidence = result.sources?.length > 0 ? 0.75 : 0.5;
              sentimentData.derivatives.sources = result.sources || [];
              sentimentData.derivatives.summary = result.summary || '';
              break;
              
            case 'institutional':
              const etfSentiment = extractETFSentiment(result);
              sentimentData.institutional.etfFlowSentiment = etfSentiment;
              sentimentData.institutional.confidence = result.sources?.length > 0 ? 0.75 : 0.5;
              sentimentData.institutional.sources = result.sources || [];
              sentimentData.institutional.summary = result.summary || '';
              break;
              
            case 'risk':
              const liquidationRisk = extractLiquidationRisk(result);
              sentimentData.risk.liquidationRisk = liquidationRisk;
              sentimentData.risk.confidence = result.sources?.length > 0 ? 0.75 : 0.5;
              sentimentData.risk.sources = result.sources || [];
              sentimentData.risk.summary = result.summary || '';
              break;
          }
        }
      }
    });
    
    // 統合センチメントスコアを計算
    const integratedSentiment = calculateIntegratedSentiment(sentimentData);
    
    // 大口とリテールのダイバージェンスを検出
    const divergence = detectWhaleRetailDivergence(sentimentData);
    
    return {
      sentimentData,
      integratedSentiment,
      divergence,
      timestamp: Date.now(),
      resolution: 'high',
      queriesExecuted: queries.length,
      queriesSuccessful: results.filter(r => r.status === 'fulfilled' && !r.value?.error).length,
    };
  } catch (error) {
    console.error('[highResolution Grok] Error in high-resolution X analysis:', error);
    throw error;
  }
}

/**
 * デリバティブ（Funding Rate）関連のセンチメントを抽出
 * @param {Object} result - Grok解析結果
 * @returns {number} -100〜100のセンチメントスコア
 */
function extractDerivativesSentiment(result) {
  // newsImpactをFunding Rate関連のセンチメントとして使用
  // または、summaryからキーワードを抽出してスコア化
  if (typeof result.newsImpact === 'number') {
    return result.newsImpact;
  }
  
  // summaryからキーワードベースで推定
  const summary = (result.summary || '').toLowerCase();
  let score = 0;
  
  if (summary.includes('high funding') || summary.includes('extreme funding')) {
    score += 30; // 高Funding = 強気過多 = 弱気シグナル
  }
  if (summary.includes('long squeeze') || summary.includes('liquidations')) {
    score += 20; // ロングスクイーズ = 弱気シグナル
  }
  if (summary.includes('short squeeze')) {
    score -= 20; // ショートスクイーズ = 強気シグナル
  }
  if (summary.includes('funding reset') || summary.includes('funding normalized')) {
    score -= 10; // Funding正常化 = 強気シグナル
  }
  
  return Math.max(-100, Math.min(100, score));
}

/**
 * ETFフロー関連のセンチメントを抽出
 * @param {Object} result - Grok解析結果
 * @returns {number} -100〜100のセンチメントスコア
 */
function extractETFSentiment(result) {
  // whaleBiasをETFフロー関連として使用（機関投資家の動向）
  if (typeof result.whaleBias === 'number') {
    return result.whaleBias;
  }
  
  // summaryからキーワードベースで推定
  const summary = (result.summary || '').toLowerCase();
  let score = 0;
  
  if (summary.includes('etf inflow') || summary.includes('accumulation')) {
    score -= 30; // ETF流入 = 強気シグナル
  }
  if (summary.includes('etf outflow') || summary.includes('gbtc selling')) {
    score += 30; // ETF流出 = 弱気シグナル
  }
  if (summary.includes('institutional buying')) {
    score -= 20;
  }
  if (summary.includes('institutional selling')) {
    score += 20;
  }
  
  return Math.max(-100, Math.min(100, score));
}

/**
 * リキデーションリスクを抽出
 * @param {Object} result - Grok解析結果
 * @returns {number} 0〜100のリスクスコア
 */
function extractLiquidationRisk(result) {
  // retailFomoが高い = リキデーションリスクも高い可能性
  if (typeof result.retailFomo === 'number') {
    return Math.min(100, result.retailFomo * 0.8); // FOMOの80%をリスクスコアに
  }
  
  // summaryからキーワードベースで推定
  const summary = (result.summary || '').toLowerCase();
  let risk = 50; // デフォルト
  
  if (summary.includes('cascading') || summary.includes('mass liquidation')) {
    risk += 30;
  }
  if (summary.includes('margin call') || summary.includes('high leverage')) {
    risk += 20;
  }
  if (summary.includes('liquidations') && summary.includes('long')) {
    risk += 15; // ロングリキデーション = 下落リスク
  }
  
  return Math.max(0, Math.min(100, risk));
}

/**
 * 統合センチメントスコアを計算
 * @param {Object} sentimentData - 各カテゴリのセンチメントデータ
 * @returns {Object} 統合スコア
 */
function calculateIntegratedSentiment(sentimentData) {
  // 大口バイアス（Whale + Institutional）
  const whaleBias = (
    sentimentData.whale.bias * 0.6 + 
    sentimentData.institutional.etfFlowSentiment * -0.4 // ETF流入は強気なので反転
  );
  
  // リテールFOMO
  const retailFomo = sentimentData.retail.fomo;
  
  // ニュース影響（Derivatives + Riskから算出）
  const newsImpact = (
    sentimentData.derivatives.fundingSentiment * 0.5 +
    (sentimentData.risk.liquidationRisk - 50) * 0.5 // リキデーションリスクを-50〜50に変換
  );
  
  // 信頼度（全カテゴリの平均）
  const confidence = (
    sentimentData.whale.confidence +
    sentimentData.retail.confidence +
    sentimentData.derivatives.confidence +
    sentimentData.institutional.confidence +
    sentimentData.risk.confidence
  ) / 5;
  
  return {
    whaleBias: Math.max(-100, Math.min(100, whaleBias)),
    retailFomo: Math.max(0, Math.min(100, retailFomo)),
    newsImpact: Math.max(-100, Math.min(100, newsImpact)),
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * 大口とリテールのダイバージェンスを検出
 * @param {Object} sentimentData - センチメントデータ
 * @returns {Object} ダイバージェンス情報
 */
function detectWhaleRetailDivergence(sentimentData) {
  // 大口バイアス（統合センチメントから取得、後で計算）
  // ここでは簡易的にwhale.biasを使用
  const whaleBias = sentimentData.whale.bias;
  const retailFomo = sentimentData.retail.fomo;
  
  // ダイバージェンス: 大口が売っている（負のバイアス）のに、リテールが買っている（高いFOMO）
  const divergence = retailFomo - (whaleBias + 100) / 2; // whaleBiasを0-100スケールに変換してから計算
  
  // ダイバージェンスが大きい = 市場の「バグ」（大口とリテールが逆方向）
  const isSignificantDivergence = Math.abs(divergence) > 40; // 40ポイント以上のズレ
  
  return {
    value: divergence,
    isSignificant: isSignificantDivergence,
    type: divergence > 0 ? 'retail_buying_while_whales_selling' : 'whales_buying_while_retail_selling',
    whaleBias,
    retailFomo,
    confidence: (sentimentData.whale.confidence + sentimentData.retail.confidence) / 2,
  };
}

/**
 * Trap Defence X Engine フォーマットで表示用テキストを生成
 * @param {Object} highResData - 高解像度解析結果
 * @returns {string}
 */
function buildXEngineReport(highResData) {
  const { integratedSentiment, sentimentData, divergence } = highResData;
  const whaleBias = integratedSentiment?.whaleBias ?? 0;
  const retailFomo = integratedSentiment?.retailFomo ?? 50;
  const newsImpact = integratedSentiment?.newsImpact ?? 0;

  // sentiment_state
  let sentimentState = 'Neutral';
  if (retailFomo >= 70) sentimentState = 'Retail FOMO elevated';
  else if (retailFomo <= 30) sentimentState = 'Retail fear dominant';
  else if (whaleBias < -50) sentimentState = 'Whale selling bias';
  else if (whaleBias > 50) sentimentState = 'Whale accumulation bias';

  // emotional_bias
  const emotionalBias = retailFomo >= 60 ? 'FOMO' : retailFomo <= 40 ? 'FEAR' : Math.abs(newsImpact) > 50 ? 'News-driven' : 'Neutral';

  // retail_behavior
  const retailSummary = sentimentData?.retail?.summary || sentimentData?.whale?.summary || '';
  const retailBehavior = retailSummary || (retailFomo >= 60 ? 'Chasing price, herd buying' : retailFomo <= 40 ? 'Panic selling, capitulation' : 'Wait-and-see, low conviction');

  // psychological_traps
  let psychologicalTraps = '';
  if (divergence?.isSignificant) {
    psychologicalTraps = `Whale-retail divergence: ${divergence.type}. Classic trap setup—retail often wrong at extremes.`;
  } else if (retailFomo >= 70) {
    psychologicalTraps = 'FOMO trap: Retail chasing while whales may distribute. Herd behavior detected.';
  } else if (retailFomo <= 30) {
    psychologicalTraps = 'Fear trap: Capitulation often marks bottoms. Avoid panic selling.';
  } else {
    psychologicalTraps = 'Low conviction. Patience recommended—no clear psychological trap.';
  }

  return `Sentiment state: ${sentimentState}. Emotional bias: ${emotionalBias}. Retail behavior: ${retailBehavior}. Psychological traps: ${psychologicalTraps}`;
}

/**
 * 後方互換性のための統合関数
 * 既存のanalyzeXSentimentLiveのインターフェースと互換性を保ちつつ、高解像度解析を実行
 * Trap Defence OS: xEngineReport（表示用テキスト）を追加
 * @param {string} prompt - 基本プロンプト（オプション、使用されない場合もある）
 * @param {string} lang - 言語コード
 * @returns {Promise<Object>} 統合センチメント（既存フォーマット + Trap Defence xEngineReport）
 */
async function analyzeXSentimentHighResolutionCompat(prompt, lang = 'en') {
  const highResData = await analyzeXSentimentHighResolution({ lang });

  // Trap Defence X Engine フォーマットで表示用テキストを生成
  const xEngineReport = buildXEngineReport(highResData);

  // 既存フォーマットとの互換性を保つ + xEngineReport（Regular Briefing表示用）
  return {
    whaleBias: highResData.integratedSentiment.whaleBias,
    retailFomo: highResData.integratedSentiment.retailFomo,
    newsImpact: highResData.integratedSentiment.newsImpact,
    summary: `High-resolution X analysis completed. ${highResData.queriesSuccessful}/${highResData.queriesExecuted} queries successful.`,
    xEngineReport, // Trap Defence OS: Regular Briefing 表示用
    sources: [
      ...highResData.sentimentData.whale.sources,
      ...highResData.sentimentData.retail.sources,
    ],
    _highResolution: {
      sentimentData: highResData.sentimentData,
      divergence: highResData.divergence,
      confidence: highResData.integratedSentiment.confidence,
    },
  };
}

module.exports = {
  analyzeXSentimentHighResolution,
  analyzeXSentimentHighResolutionCompat,
  calculateIntegratedSentiment,
  detectWhaleRetailDivergence,
  extractDerivativesSentiment,
  extractETFSentiment,
  extractLiquidationRisk,
};
