// scripts/ask-gemini-onchain-news-analysis.js
// CryptoQuantのオンチェーンデータとGeminiの分析力を組み合わせて、
// SoSoValueのようなニュース記事を生成できるかGeminiに質問するスクリプト

const { fetchCryptoQuant } = require('../services/cryptoquant/client');

// 環境変数からAPIキーを取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}

/**
 * CryptoQuantから最新のオンチェーンデータを取得
 */
async function fetchLatestOnchainData() {
  try {
    console.log('📊 CryptoQuantからオンチェーンデータを取得中...');
    
    const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
    
    // 取引所ネットフロー（Exchange Netflow）を取得
    const exchangeNetflow = await getExchangeInflow();
    
    // マイナーポジションインデックス（MPI）を取得
    const mpi = await getMinerPositionIndex();
    
    return {
      exchangeNetflow: exchangeNetflow || null,
      mpi: mpi || null,
    };
  } catch (error) {
    console.error('❌ CryptoQuantデータ取得エラー:', error.message);
    return null;
  }
}

/**
 * Geminiに質問を投げかける（REST API直接呼び出し）
 */
async function askGeminiAboutOnchainNewsAnalysis(onchainData) {
  try {
    // オンチェーンデータをフォーマット
    const dataSummary = onchainData ? `
## 現在のオンチェーンデータ（CryptoQuant）

### 取引所ネットフロー（Exchange Netflow）
- 値: ${onchainData.exchangeNetflow?.value || 'N/A'} BTC
- 正の値は取引所への流入、負の値は流出を示します
- 生データ: ${JSON.stringify(onchainData.exchangeNetflow?.raw || {})}

### マイナーポジションインデックス（MPI）
- 値: ${onchainData.mpi?.value || 'N/A'}
- MPI > 0 はマイナーが売却していることを示し、MPI < 0 は買い増しを示します
- 生データ: ${JSON.stringify(onchainData.mpi?.raw || {})}
` : 'データ取得に失敗しました。';

    const prompt = `あなたは暗号通貨市場のオンチェーン分析の専門家です。以下の質問に答えてください。

## 質問

CryptoQuantのオンチェーンデータとGeminiの横断分析力を組み合わせることで、SoSoValueやOdailyのような暗号通貨ニュース記事を自前で配信できると思いますか？

具体的には、以下のようなニュース記事を生成できるでしょうか？

**例: SoSoValueのニュース記事**
「データ：ビットコインの取引所内流量が約1.4万枚に低下し、2022年以来の最低水準を記録

CryptoOnchainのデータによると、ビットコイン取引所内の総トラフィックは2022年以来の最低水準まで低下し、約1.4万$BTCとなっています。

この指標は、取引所内部の$BTCの流動性、運営活動、および短期的な分配準備状況を追跡しています。

その継続的な低下は、取引所内部の$BTCの流動が大幅に減少していることを示しており、市場のマーケットメイク活動の弱まりと流動性の逼迫を示唆しています。

内部トラフィックの低下は通常、保有行動の増加、裁定取引活動の減少、オーダーブックの薄さ、およびショックに対する感受性の増加と一致します。

**現在、ビットコイン市場は「流動性の一時停止」段階にあるように見えます。歴史的に、この段階は市場が再び活発になった後に劇的な方向転換が起こる前兆です。**」

${dataSummary}

## 回答してほしい内容

1. **技術的可能性**: CryptoQuantのオンチェーンデータとGeminiの分析力を組み合わせることで、このようなニュース記事を生成できるか？

2. **過去データとの照合**: 「過去に照らし合わせると、、」のような高視聴率を獲得できるニュース記事を書けるか？Geminiは過去のオンチェーンデータと現在のデータを比較分析できるか？

3. **分析の深さ**: 単なるデータの羅列ではなく、SoSoValueのような「流動性の一時停止」のような洞察のある分析ができるか？

4. **実装方法**: このようなニュース記事を生成するための具体的な実装方法やプロンプト設計の提案

5. **制約と限界**: このアプローチの制約や限界、注意すべき点

6. **実際の記事例**: 上記のオンチェーンデータ（もしあれば）を使って、実際にSoSoValue風のニュース記事を1つ生成してみてください。

日本語で回答してください。`;

    console.log('🤖 Geminiに質問を送信中...');
    
    // REST APIを直接呼び出し
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '回答が取得できませんでした。';
    const usage = data.usageMetadata || {};

    return {
      text,
      usage: {
        promptTokenCount: usage.promptTokenCount || 0,
        candidatesTokenCount: usage.candidatesTokenCount || 0,
        totalTokenCount: usage.totalTokenCount || 0
      }
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
  console.log('🚀 CryptoQuant × Gemini ニュース分析可能性検証スクリプト\n');
  
  try {
    // 1. CryptoQuantから最新のオンチェーンデータを取得
    const onchainData = await fetchLatestOnchainData();
    
    if (onchainData) {
      console.log('✅ オンチェーンデータ取得完了\n');
    } else {
      console.log('⚠️ オンチェーンデータ取得に失敗しましたが、Geminiの分析は続行します\n');
    }
    
    // 2. Geminiに質問
    const result = await askGeminiAboutOnchainNewsAnalysis(onchainData);
    
    // 3. 結果を表示
    console.log('\n' + '='.repeat(80));
    console.log('📝 Geminiの回答');
    console.log('='.repeat(80) + '\n');
    console.log(result.text);
    console.log('\n' + '='.repeat(80));
    console.log('📊 トークン使用量');
    console.log('='.repeat(80));
    console.log(`プロンプトトークン: ${result.usage.promptTokenCount}`);
    console.log(`レスポンストークン: ${result.usage.candidatesTokenCount}`);
    console.log(`合計トークン: ${result.usage.totalTokenCount}`);
    console.log('='.repeat(80) + '\n');
    
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
  fetchLatestOnchainData,
  askGeminiAboutOnchainNewsAnalysis,
};
