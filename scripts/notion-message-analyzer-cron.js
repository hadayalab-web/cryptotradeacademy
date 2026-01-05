// scripts/notion-message-analyzer-cron.js
// Notionメッセージ定期解析の自動化スクリプト

const { queryDatabase } = require('../../lib/notion/client');

// Notion Database ID
const TELEGRAM_MESSAGES_DB_ID = '2de7cb4e-6755-8199-af0b-e48e137f646b';

// サポートされている市場
const SUPPORTED_MARKETS = ['EN', 'AR', 'ES', 'JA', 'KO', 'PT-BR'];

/**
 * Notionから全言語の最新メッセージを取得
 */
async function fetchLatestMessagesFromNotion() {
  const messages = {};

  for (const market of SUPPORTED_MARKETS) {
    try {
      const results = await queryDatabase(TELEGRAM_MESSAGES_DB_ID, {
        filter: {
          property: 'market',
          select: {
            equals: market,
          },
        },
        sorts: [
          {
            property: 'date',
            direction: 'descending',
          },
        ],
        page_size: 1,
      });

      if (results.results && results.results.length > 0) {
        const message = results.results[0];
        messages[market] = {
          id: message.id,
          title: message.properties.title?.title?.[0]?.plain_text || '',
          market: message.properties.market?.select?.name || '',
          date: message.properties.date?.date?.start || '',
          message: message.properties.message?.rich_text?.[0]?.plain_text || '',
          btcPrice: message.properties.btcPrice?.number || null,
          signal: message.properties.signal?.select?.name || '',
          sentiment: message.properties.sentiment?.select?.name || '',
          marketScore: message.properties.marketScore?.number || null,
        };
      }
    } catch (error) {
      console.error(`Error fetching ${market} message:`, error.message);
    }
  }

  return messages;
}

/**
 * メッセージを解析して統計を生成
 */
function analyzeMessages(messages) {
  const analysis = {
    timestamp: new Date().toISOString(),
    totalMessages: Object.keys(messages).length,
    markets: {},
    summary: {
      averageBtcPrice: 0,
      signalCounts: {},
      sentimentCounts: {},
      averageMarketScore: 0,
    },
  };

  let totalBtcPrice = 0;
  let totalMarketScore = 0;
  let btcPriceCount = 0;
  let marketScoreCount = 0;

  for (const [market, message] of Object.entries(messages)) {
    analysis.markets[market] = {
      btcPrice: message.btcPrice,
      signal: message.signal,
      sentiment: message.sentiment,
      marketScore: message.marketScore,
      date: message.date,
    };

    if (message.btcPrice !== null) {
      totalBtcPrice += message.btcPrice;
      btcPriceCount++;
    }

    if (message.marketScore !== null) {
      totalMarketScore += message.marketScore;
      marketScoreCount++;
    }

    // シグナル集計
    if (message.signal) {
      analysis.summary.signalCounts[message.signal] = 
        (analysis.summary.signalCounts[message.signal] || 0) + 1;
    }

    // センチメント集計
    if (message.sentiment) {
      analysis.summary.sentimentCounts[message.sentiment] = 
        (analysis.summary.sentimentCounts[message.sentiment] || 0) + 1;
    }
  }

  analysis.summary.averageBtcPrice = btcPriceCount > 0 
    ? Number((totalBtcPrice / btcPriceCount).toFixed(2))
    : 0;
  analysis.summary.averageMarketScore = marketScoreCount > 0
    ? Number((totalMarketScore / marketScoreCount).toFixed(2))
    : 0;

  return analysis;
}

/**
 * 解析結果をNotionに保存
 */
async function saveAnalysisToNotion(analysis) {
  // TODO: Notion Databaseに解析結果を保存する実装
  // 現在はコンソールに出力
  console.log('📊 Message Analysis Results:');
  console.log(JSON.stringify(analysis, null, 2));
  
  // 異常検知
  const anomalies = [];
  
  // BTC価格の異常検知
  const btcPrices = Object.values(analysis.markets)
    .map(m => m.btcPrice)
    .filter(p => p !== null);
  
  if (btcPrices.length > 0) {
    const avgPrice = analysis.summary.averageBtcPrice;
    const priceVariance = btcPrices.some(p => Math.abs(p - avgPrice) > avgPrice * 0.1);
    if (priceVariance) {
      anomalies.push('BTC price variance detected (>10%)');
    }
  }

  // シグナルの異常検知
  const noneSignalCount = analysis.summary.signalCounts.NONE || 0;
  const totalSignals = Object.values(analysis.summary.signalCounts).reduce((a, b) => a + b, 0);
  if (totalSignals > 0 && noneSignalCount / totalSignals > 0.8) {
    anomalies.push('High NO TRADE rate detected (>80%)');
  }

  if (anomalies.length > 0) {
    console.log('⚠️ Anomalies detected:');
    anomalies.forEach(anomaly => console.log(`   - ${anomaly}`));
  }

  return { analysis, anomalies };
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    console.log('🔍 Fetching latest messages from Notion...');
    const messages = await fetchLatestMessagesFromNotion();
    
    console.log('📊 Analyzing messages...');
    const analysis = analyzeMessages(messages);
    
    console.log('💾 Saving analysis results...');
    await saveAnalysisToNotion(analysis);
    
    console.log('✅ Analysis completed successfully!');
  } catch (error) {
    console.error('❌ Error in message analysis:', error);
    throw error;
  }
}

// メイン実行
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  fetchLatestMessagesFromNotion,
  analyzeMessages,
  saveAnalysisToNotion,
  main,
};
