// scripts/gemini-market-prediction-24h.js
// Gemini APIを使ってCQデータを解析し、JST 21時から24時間の市況を予測

require('dotenv').config({ path: '.env.local' });
const { getCQSnapshot } = require('../services/cryptoquant/snapshot');

/**
 * BTC価格を取得
 */
async function fetchBtcPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const data = await response.json();
    return {
      priceUsd: data.bitcoin.usd,
      change24h: data.bitcoin.usd_24h_change || 0,
    };
  } catch (error) {
    console.warn('価格取得エラー:', error.message);
    return { priceUsd: 0, change24h: 0 };
  }
}

/**
 * Fear & Greed Indexを取得
 */
async function fetchFearGreed() {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    const data = await response.json();
    const fng = data.data[0];
    return {
      value: parseInt(fng.value),
      label: fng.value_classification,
    };
  } catch (error) {
    console.warn('Fear & Greed取得エラー:', error.message);
    return { value: 50, label: 'Neutral' };
  }
}

// Gemini APIキー
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

/**
 * CQデータを取得（現在 + 過去データ）
 */
async function getCQDataWithHistory() {
  console.log('📊 CryptoQuantデータを取得中...');
  
  try {
    // 現在のデータを取得
    const currentSnapshot = await getCQSnapshot({
      includeDeep: false, // エラー回避のため一旦false
      includeHighRes: false, // エラー回避のため一旦false
      market: 'EN',
    });
    
    // 過去24時間のデータ（高解像度データから取得）
    const historical24h = currentSnapshot.highResCQ || {};
    
    // 価格データも取得
    const priceData = await fetchBtcPrice();
    const fearGreedData = await fetchFearGreed();
    
    return {
      current: {
        ...currentSnapshot,
        price: priceData?.priceUsd || 0,
        change24h: priceData?.change24h || 0,
        fearGreed: fearGreedData?.value || 0,
        fearGreedLabel: fearGreedData?.label || 'Neutral',
      },
      historical24h,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('⚠️ CQデータ取得エラー（続行します）:', error.message);
    // エラー時も価格データだけは取得して続行
    const priceData = await fetchBtcPrice();
    const fearGreedData = await fetchFearGreed();
    return {
      current: {
        inflow: 0,
        mpi: 0,
        price: priceData?.priceUsd || 0,
        change24h: priceData?.change24h || 0,
        fearGreed: fearGreedData?.value || 0,
        fearGreedLabel: fearGreedData?.label || 'Neutral',
      },
      historical24h: {},
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * データをGemini用のプロンプトに整形
 */
function formatDataForGemini(cqData) {
  const { current, historical24h } = cqData;
  
  // 現在のデータ
  const currentData = {
    timestamp: new Date(current.timestamp).toISOString(),
    exchangeInflow: current.inflow,
    minerPositionIndex: current.mpi,
    price: current.price,
    change24h: current.change24h,
    fearGreed: current.fearGreed,
    fearGreedLabel: current.fearGreedLabel,
  };
  
  // 深掘りデータ
  const deepData = {
    whaleRatio: current.whaleRatio || null,
    exchangeReserve: current.exchangeReserve || null,
    stablecoinSupply: current.stablecoinSupply || null,
    fundingRate: current.fundingRate || null,
  };
  
  // 高解像度データ（過去24時間）
  const historicalData = {
    netflow: historical24h.netflow?.timeframes || {},
    mpi: historical24h.mpi?.timeframes || {},
    whaleRatio: historical24h.whaleRatio?.timeframes || {},
  };
  
  return {
    current: currentData,
    deep: deepData,
    historical: historicalData,
  };
}

/**
 * Geminiに予測を依頼
 */
async function predictMarketWithGemini(formattedData) {
  console.log('🤖 Gemini APIで市況予測を実行中...');
  
  const prompt = `
あなたは暗号通貨市場の専門アナリストです。CryptoQuantのオンチェーンデータを分析し、過去の似たようなパターンを基に、JST 21時から24時間後までのビットコイン市場の動きを予測してください。

## 現在の市場データ（${new Date().toISOString()}）

### 基本指標
- Exchange Inflow: ${formattedData.current.exchangeInflow}
- Miner Position Index (MPI): ${formattedData.current.minerPositionIndex}
- BTC価格: $${formattedData.current.price.toLocaleString()}
- 24時間変動率: ${formattedData.current.change24h.toFixed(2)}%
- Fear & Greed Index: ${formattedData.current.fearGreed} (${formattedData.current.fearGreedLabel})

### 深掘り指標
- Whale Ratio: ${formattedData.deep.whaleRatio || 'N/A'}
- Exchange Reserve: ${formattedData.deep.exchangeReserve || 'N/A'}
- Stablecoin Supply: ${formattedData.deep.stablecoinSupply || 'N/A'}
- Funding Rate: ${formattedData.deep.fundingRate || 'N/A'}

### 過去24時間のトレンド
${JSON.stringify(formattedData.historical, null, 2)}

## 予測タスク

過去の似たようなデータパターンを分析し、以下の情報を提供してください：

1. **類似パターンの特定**: 過去のデータから、現在の市場状況と似たパターンを3-5個特定してください
2. **24時間予測（JST 21:00から24時間後まで）**:
   - 価格の動き（上昇/下降/横ばい、予想レンジ）
   - Exchange Inflowの予想トレンド
   - MPIの予想トレンド
   - リスク要因と機会要因
   - 重要な時間帯（特に注意すべき時間）

3. **根拠**: なぜその予測になったのか、データのどの部分が根拠になっているか

4. **推奨アクション**: トレーダー向けの推奨アクション（リスク管理、エントリーポイントなど）

出力形式はJSONで、以下の構造で返してください：
{
  "similarPatterns": [
    {
      "date": "過去の日付",
      "description": "パターンの説明",
      "similarity": "類似度の説明"
    }
  ],
  "prediction24h": {
    "priceDirection": "up/down/sideways",
    "priceRange": {
      "min": 価格の最小値,
      "max": 価格の最大値
    },
    "exchangeInflowTrend": "トレンドの説明",
    "mpiTrend": "トレンドの説明",
    "riskFactors": ["リスク要因1", "リスク要因2"],
    "opportunityFactors": ["機会要因1", "機会要因2"],
    "keyTimeWindows": [
      {
        "time": "JST時刻",
        "description": "なぜ重要なのか"
      }
    ]
  },
  "reasoning": "予測の根拠",
  "recommendedActions": ["アクション1", "アクション2"]
}
`;

  try {
    console.log('🤖 Gemini APIにリクエストを送信中...');
    console.log(`📡 API URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent`);
    console.log(`🔑 API Key: ${GEMINI_API_KEY.substring(0, 20)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 10)}`);
    console.log(`📝 プロンプト長: ${prompt.length}文字`);
    
    // REST APIを直接呼び出し
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,
      }
    };

    console.log('📤 リクエスト送信開始...');
    const startTime = Date.now();
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️ レスポンス受信: ${responseTime}ms`);
    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini APIエラーレスポンス:', errorText);
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gemini APIレスポンス受信完了');
    console.log(`📦 レスポンス構造:`, {
      hasCandidates: !!data.candidates,
      candidatesCount: data.candidates?.length || 0,
      finishReason: data.candidates?.[0]?.finishReason,
      usageMetadata: data.usageMetadata,
    });
    
    const text = data.candidates[0].content.parts[0].text;
    console.log(`📄 生成テキスト長: ${text.length}文字`);
    console.log(`📄 生成テキスト先頭100文字: ${text.substring(0, 100)}...`);
    
    // JSONを抽出（マークダウンコードブロックから）
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0].trim();
    }
    
    try {
      const prediction = JSON.parse(jsonText);
      return prediction;
    } catch (parseError) {
      console.warn('⚠️ JSONパースエラー。生のレスポンスを返します。');
      return { rawResponse: text, error: parseError.message };
    }
  } catch (error) {
    console.error('❌ Gemini APIエラー:', error);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 JST 21時から24時間の市況予測を開始...\n');
  
  try {
    // 1. CQデータを取得
    const cqData = await getCQDataWithHistory();
    console.log('✅ CQデータ取得完了\n');
    
    // 2. データを整形
    const formattedData = formatDataForGemini(cqData);
    console.log('✅ データ整形完了\n');
    
    // 3. Geminiで予測
    const prediction = await predictMarketWithGemini(formattedData);
    console.log('✅ 予測完了\n');
    
    // 4. 結果を表示
    console.log('='.repeat(80));
    console.log('📈 JST 21時から24時間の市況予測結果');
    console.log('='.repeat(80));
    console.log('\n');
    
    if (prediction.similarPatterns) {
      console.log('🔍 類似パターン:');
      prediction.similarPatterns.forEach((pattern, i) => {
        console.log(`  ${i + 1}. ${pattern.date}: ${pattern.description}`);
        console.log(`     類似度: ${pattern.similarity}\n`);
      });
    }
    
    if (prediction.prediction24h) {
      const pred = prediction.prediction24h;
      console.log('📊 24時間予測:');
      console.log(`  価格方向: ${pred.priceDirection}`);
      if (pred.priceRange) {
        console.log(`  価格レンジ: $${pred.priceRange.min.toLocaleString()} - $${pred.priceRange.max.toLocaleString()}`);
      }
      console.log(`  Exchange Inflowトレンド: ${pred.exchangeInflowTrend}`);
      console.log(`  MPIトレンド: ${pred.mpiTrend}`);
      
      if (pred.riskFactors && pred.riskFactors.length > 0) {
        console.log('\n  ⚠️ リスク要因:');
        pred.riskFactors.forEach((risk, i) => {
          console.log(`    ${i + 1}. ${risk}`);
        });
      }
      
      if (pred.opportunityFactors && pred.opportunityFactors.length > 0) {
        console.log('\n  💡 機会要因:');
        pred.opportunityFactors.forEach((opp, i) => {
          console.log(`    ${i + 1}. ${opp}`);
        });
      }
      
      if (pred.keyTimeWindows && pred.keyTimeWindows.length > 0) {
        console.log('\n  ⏰ 重要な時間帯:');
        pred.keyTimeWindows.forEach((window, i) => {
          console.log(`    ${i + 1}. ${window.time}: ${window.description}`);
        });
      }
    }
    
    if (prediction.reasoning) {
      console.log('\n📐 予測の根拠:');
      console.log(`  ${prediction.reasoning}\n`);
    }
    
    if (prediction.recommendedActions && prediction.recommendedActions.length > 0) {
      console.log('💼 推奨アクション:');
      prediction.recommendedActions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`);
      });
    }
    
    // 5. 結果をJSONファイルに保存
    const fs = require('fs');
    const outputPath = `docs/gemini-market-prediction-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      currentData: formattedData,
      prediction,
    }, null, 2));
    console.log(`\n💾 結果を保存しました: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = {
  getCQDataWithHistory,
  formatDataForGemini,
  predictMarketWithGemini,
};
