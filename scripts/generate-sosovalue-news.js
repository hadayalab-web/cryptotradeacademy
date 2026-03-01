// scripts/generate-sosovalue-news.js
// CryptoQuantデータをGeminiに渡して、類似過去データを参照させて24時間の市況を予測し、
// SoSoValue風のニュース記事を生成するスクリプト

const { fetchCryptoQuant } = require('../services/cryptoquant/client');
const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');

// 環境変数からAPIキーを取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';
const CRYPTOQUANT_API_KEY = process.env.CRYPTOQUANT_API_KEY || 'AqSfkCmyWnepP1JX3xnPvqeR3EYNQot38egiAICE2421tcYdIZAlnXcb99pyFkis08uN7Ln';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

// CryptoQuant APIキーを環境変数に設定（client.jsで使用される）
if (CRYPTOQUANT_API_KEY) {
  process.env.CRYPTOQUANT_API_KEY = CRYPTOQUANT_API_KEY;
}

/**
 * CryptoQuantから最新データと過去データを取得
 * 
 * 使用するエンドポイント:
 * 1. Exchange Netflow: /btc/exchange-flows/netflow (流入-流出の純額)
 * 2. Exchange Inflow: /btc/exchange-flows/inflow (流入量)
 * 3. Exchange Outflow: /btc/exchange-flows/outflow (流出量) - Netflowから計算可能
 * 4. MPI: /btc/flow-indicator/mpi (マイナーポジションインデックス)
 * 
 * 注意: SoSoValueの記事で使われている「取引所内流量（Exchange Internal Traffic）」は
 * CryptoQuant APIには存在しないため、Exchange Netflow/Inflow/Outflowの組み合わせで表現
 */
async function fetchOnchainDataWithHistory() {
  try {
    console.log('📊 CryptoQuantからオンチェーンデータを取得中...');
    console.log('   使用エンドポイント:');
    console.log('   - Exchange Netflow: /btc/exchange-flows/netflow');
    console.log('   - Exchange Inflow: /btc/exchange-flows/inflow');
    console.log('   - Exchange Outflow: /btc/exchange-flows/outflow');
    console.log('   - MPI: /btc/flow-indicator/mpi\n');
    
    // 最新データを取得
    const [exchangeNetflow, mpi, exchangeInflow, exchangeOutflow] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
      fetchCryptoQuant('/btc/exchange-flows/inflow', {
        exchange: 'all_exchange',
        window: 'day',
        limit: 1,
      }).catch(() => null),
      fetchCryptoQuant('/btc/exchange-flows/outflow', {
        exchange: 'all_exchange',
        window: 'day',
        limit: 1,
      }).catch(() => null),
    ]);
    
    // 過去30日分のデータを取得（類似パターン検出用）
    const [netflowHistory, mpiHistory, inflowHistory, outflowHistory] = await Promise.all([
      fetchCryptoQuant('/btc/exchange-flows/netflow', {
        exchange: 'all_exchange',
        window: 'day',
        limit: 30, // 過去30日分
      }).catch(() => null),
      fetchCryptoQuant('/btc/flow-indicator/mpi', {
        window: 'day',
        limit: 30, // 過去30日分
      }).catch(() => null),
      fetchCryptoQuant('/btc/exchange-flows/inflow', {
        exchange: 'all_exchange',
        window: 'day',
        limit: 30, // 過去30日分
      }).catch(() => null),
      fetchCryptoQuant('/btc/exchange-flows/outflow', {
        exchange: 'all_exchange',
        window: 'day',
        limit: 30, // 過去30日分
      }).catch(() => null),
    ]);
    
    // BTC価格データも取得（比較用）
    const btcPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      .then(res => res.json())
      .then(data => ({
        price: data.bitcoin?.usd || 0,
        change24h: data.bitcoin?.usd_24h_change || 0,
      }))
      .catch(() => ({ price: 0, change24h: 0 }));
    
    // Exchange Inflow/Outflowの値を抽出
    const currentInflow = exchangeInflow?.result?.data?.[0]?.inflow_total ?? 
                          exchangeInflow?.result?.data?.[0]?.inflow ?? 
                          exchangeInflow?.result?.data?.[0]?.value ?? null;
    const currentOutflow = exchangeOutflow?.result?.data?.[0]?.outflow_total ?? 
                           exchangeOutflow?.result?.data?.[0]?.outflow ?? 
                           exchangeOutflow?.result?.data?.[0]?.value ?? null;
    
    return {
      current: {
        exchangeNetflow: exchangeNetflow?.value || null,
        exchangeInflow: currentInflow,
        exchangeOutflow: currentOutflow,
        mpi: mpi?.value || null,
        price: btcPrice.price,
        change24h: btcPrice.change24h,
      },
      history: {
        netflow: netflowHistory?.result?.data || [],
        inflow: inflowHistory?.result?.data || [],
        outflow: outflowHistory?.result?.data || [],
        mpi: mpiHistory?.result?.data || [],
      },
    };
  } catch (error) {
    console.error('❌ CryptoQuantデータ取得エラー:', error.message);
    return null;
  }
}

/**
 * 過去データから類似パターンを分析
 */
function analyzeHistoricalPatterns(currentData, historyData) {
  const patterns = {
    netflow: {
      current: currentData.exchangeNetflow,
      average: null,
      min: null,
      max: null,
      similarPeriods: [],
    },
    mpi: {
      current: currentData.mpi,
      average: null,
      min: null,
      max: null,
      similarPeriods: [],
    },
  };
  
  // Netflowの統計を計算
  if (historyData.netflow && historyData.netflow.length > 0) {
    const netflowValues = historyData.netflow
      .map(d => d.netflow_total ?? d.netflow ?? d.value ?? 0)
      .filter(v => typeof v === 'number' && !isNaN(v));
    
    if (netflowValues.length > 0) {
      patterns.netflow.average = netflowValues.reduce((a, b) => a + b, 0) / netflowValues.length;
      patterns.netflow.min = Math.min(...netflowValues);
      patterns.netflow.max = Math.max(...netflowValues);
      
      // 類似パターンを検出（現在値の±20%以内）
      const threshold = Math.abs(currentData.exchangeNetflow) * 0.2;
      patterns.netflow.similarPeriods = historyData.netflow
        .filter(d => {
          const value = d.netflow_total ?? d.netflow ?? d.value ?? 0;
          return Math.abs(value - currentData.exchangeNetflow) <= threshold;
        })
        .slice(0, 5); // 最大5件
    }
  }
  
  // MPIの統計を計算
  if (historyData.mpi && historyData.mpi.length > 0) {
    const mpiValues = historyData.mpi
      .map(d => d.mpi ?? d.value ?? 0)
      .filter(v => typeof v === 'number' && !isNaN(v));
    
    if (mpiValues.length > 0) {
      patterns.mpi.average = mpiValues.reduce((a, b) => a + b, 0) / mpiValues.length;
      patterns.mpi.min = Math.min(...mpiValues);
      patterns.mpi.max = Math.max(...mpiValues);
      
      // 類似パターンを検出（現在値の±20%以内）
      const threshold = Math.abs(currentData.mpi) * 0.2;
      patterns.mpi.similarPeriods = historyData.mpi
        .filter(d => {
          const value = d.mpi ?? d.value ?? 0;
          return Math.abs(value - currentData.mpi) <= threshold;
        })
        .slice(0, 5); // 最大5件
    }
  }
  
  return patterns;
}

/**
 * Geminiに24時間の市況予測を依頼し、SoSoValue風のニュース記事を生成
 */
async function generateSoSoValueNews(onchainData, patterns) {
  try {
    // データをフォーマット
    const dataSummary = `
## 現在のオンチェーンデータ（CryptoQuant）

### 取引所ネットフロー（Exchange Netflow）
- 現在値: ${onchainData.current.exchangeNetflow || 'N/A'} BTC
- 過去30日平均: ${patterns.netflow.average?.toFixed(2) || 'N/A'} BTC
- 過去30日最小値: ${patterns.netflow.min?.toFixed(2) || 'N/A'} BTC
- 過去30日最大値: ${patterns.netflow.max?.toFixed(2) || 'N/A'} BTC
- 類似パターン数: ${patterns.netflow.similarPeriods.length}件

### 取引所流入量（Exchange Inflow）
- 現在値: ${onchainData.current.exchangeInflow || 'N/A'} BTC

### 取引所流出量（Exchange Outflow）
- 現在値: ${onchainData.current.exchangeOutflow || 'N/A'} BTC

### マイナーポジションインデックス（MPI）
- 現在値: ${onchainData.current.mpi || 'N/A'}
- 過去30日平均: ${patterns.mpi.average?.toFixed(2) || 'N/A'}
- 過去30日最小値: ${patterns.mpi.min?.toFixed(2) || 'N/A'}
- 過去30日最大値: ${patterns.mpi.max?.toFixed(2) || 'N/A'}
- 類似パターン数: ${patterns.mpi.similarPeriods.length}件

### BTC価格
- 現在価格: $${onchainData.current.price.toLocaleString()}
- 24時間変動: ${onchainData.current.change24h > 0 ? '+' : ''}${onchainData.current.change24h.toFixed(2)}%
`;

    const prompt = `あなたはSoSoValueやOdailyのような暗号通貨ニュースメディアのプロフェッショナルなアナリスト兼ジャーナリストです。

以下のオンチェーンデータと過去データの分析に基づき、**24時間の市況予測**を含むSoSoValue風のニュース記事を作成してください。

${dataSummary}

## 過去データとの比較分析

### 類似パターンの検出結果
- 取引所ネットフロー: 過去30日間で${patterns.netflow.similarPeriods.length}件の類似パターンを検出
- マイナーポジションインデックス: 過去30日間で${patterns.mpi.similarPeriods.length}件の類似パターンを検出

## 記事作成の要件

### 1. 見出し（タイトル）
- 「データ：～」で始める
- 現在のデータの特徴を強調（例：「2022年以来の最低水準」「過去30日で最大の流入」など）
- キャッチーでクリックしたくなる表現

### 2. 本文の構成
1. **データの提示**: CryptoQuantのデータに基づく事実を提示
2. **過去データとの比較**: 「過去に照らし合わせると、、」のような歴史比較を含める
3. **市場の解釈**: このデータが市場に与える影響を分析
4. **24時間の市況予測**: 類似過去パターンに基づく24時間の市況予測を含める
5. **結論**: 市場が現在どのフェーズにあるかを定義（例：「流動性の一時停止」「利益確定の分配フェーズ」など）

### 3. スタイルとトーン
- SoSoValueやOdailyのような、簡潔だが専門的なスタイル
- データ駆動の客観的な分析
- 「示唆している」「可能性がある」などの適切な表現を使用
- 断定的な表現は避ける（「必ず暴騰する」などはNG）

### 4. 24時間の市況予測
- 類似過去パターンに基づく予測を含める
- 価格動向、ボラティリティ、流動性の変化を予測
- リスク要因も明記

### 5. Trap Defence独自要素（オプション）
- 可能であれば、トラップ検出の観点も含める
- 心理的コーチング要素（例：「FOMOを抑えろ」「忍耐を武器に」）

## 出力形式

以下の形式で出力してください：

**見出し（タイトル）**

本文（800-1200文字程度、完全な記事として完結させること）

**重要**: 記事は必ず完結させてください。途中で切れないように、結論まで含めて完全な記事として出力してください。

日本語で出力してください。`;

    console.log('🤖 Geminiに24時間市況予測とSoSoValue風ニュース記事生成を依頼中...');
    
    // REST APIを直接呼び出し
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000, // 完全な記事生成のため増加
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // レスポンスからテキストを取得
    let text = '記事が生成できませんでした。';
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text || '記事が生成できませんでした。';
      }
    }
    
    // エラーの場合は詳細を表示
    if (data.error) {
      console.error('Gemini API Error:', JSON.stringify(data.error, null, 2));
    }
    
    const usage = data.usageMetadata || {};

    return {
      article: text,
      usage: {
        promptTokenCount: usage.promptTokenCount || 0,
        candidatesTokenCount: usage.candidatesTokenCount || 0,
        totalTokenCount: usage.totalTokenCount || 0
      },
      rawResponse: data // デバッグ用
    };
  } catch (error) {
    console.error('❌ Gemini API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 CryptoQuant × Gemini SoSoValue風ニュース記事生成スクリプト\n');
  
  try {
    // 1. CryptoQuantから最新データと過去データを取得
    const onchainData = await fetchOnchainDataWithHistory();
    
    if (!onchainData) {
      console.error('❌ オンチェーンデータの取得に失敗しました');
      console.log('⚠️ CryptoQuant APIキーが設定されていない可能性があります');
      console.log('⚠️ 仮データで記事生成を試みます...\n');
      
      // 仮データを使用
      onchainData = {
        current: {
          exchangeNetflow: -1200, // 仮の値（流出）
          mpi: 1.5, // 仮の値（マイナー売却傾向）
          price: 88578,
          change24h: 2.5,
        },
        history: {
          netflow: [],
          mpi: [],
        },
      };
    }
    
    console.log('✅ オンチェーンデータ取得完了');
    console.log(`   取引所ネットフロー: ${onchainData.current.exchangeNetflow || 'N/A'} BTC`);
    console.log(`   取引所流入量: ${onchainData.current.exchangeInflow || 'N/A'} BTC`);
    console.log(`   取引所流出量: ${onchainData.current.exchangeOutflow || 'N/A'} BTC`);
    console.log(`   MPI: ${onchainData.current.mpi || 'N/A'}`);
    console.log(`   BTC価格: $${onchainData.current.price.toLocaleString()}\n`);
    
    // 2. 過去データから類似パターンを分析
    const patterns = analyzeHistoricalPatterns(onchainData.current, onchainData.history);
    console.log('✅ 過去データ分析完了');
    console.log(`   類似パターン（Netflow）: ${patterns.netflow.similarPeriods.length}件`);
    console.log(`   類似パターン（MPI）: ${patterns.mpi.similarPeriods.length}件\n`);
    
    // 3. Geminiで24時間市況予測とSoSoValue風ニュース記事を生成
    const result = await generateSoSoValueNews(onchainData, patterns);
    
    // 4. 結果を表示
    console.log('\n' + '='.repeat(80));
    console.log('📰 SoSoValue風ニュース記事（24時間市況予測付き）');
    console.log('='.repeat(80) + '\n');
    console.log(result.article);
    console.log('\n' + '='.repeat(80));
    console.log('📊 トークン使用量');
    console.log('='.repeat(80));
    console.log(`プロンプトトークン: ${result.usage.promptTokenCount}`);
    console.log(`レスポンストークン: ${result.usage.candidatesTokenCount}`);
    console.log(`合計トークン: ${result.usage.totalTokenCount}`);
    console.log('='.repeat(80) + '\n');
    
    // デバッグ情報（エラー時）
    if (result.article === '記事が生成できませんでした。' && result.rawResponse) {
      console.log('⚠️ デバッグ情報:');
      console.log(JSON.stringify(result.rawResponse, null, 2));
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  fetchOnchainDataWithHistory,
  analyzeHistoricalPatterns,
  generateSoSoValueNews,
};
