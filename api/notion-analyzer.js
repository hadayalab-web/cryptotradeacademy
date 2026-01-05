// api/notion-analyzer.js
// Notionメッセージ解析APIエンドポイント

const { main } = require('../scripts/notion-message-analyzer-cron');

module.exports = async (req, res) => {
  try {
    await main();
    
    return res.status(200).json({
      success: true,
      message: 'Notion message analysis completed successfully',
    });
  } catch (error) {
    console.error('Error analyzing Notion messages:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
