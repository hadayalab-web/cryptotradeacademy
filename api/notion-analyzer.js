// api/notion-analyzer.js
// Notionメッセージ解析APIエンドポイント

module.exports = async (req, res) => {
  try {
    // モジュールの存在確認
    let notionMessageAnalyzer;
    try {
      notionMessageAnalyzer = require('../scripts/notion-message-analyzer-cron');
    } catch (requireError) {
      console.error('Failed to load notion-message-analyzer-cron:', requireError.message);
      return res.status(503).json({
        success: false,
        error: 'Notion analyzer module not available',
        message: requireError.message,
      });
    }

    if (!notionMessageAnalyzer || !notionMessageAnalyzer.main) {
      return res.status(503).json({
        success: false,
        error: 'Notion analyzer main function not found',
      });
    }

    await notionMessageAnalyzer.main();
    
    return res.status(200).json({
      success: true,
      message: 'Notion message analysis completed successfully',
    });
  } catch (error) {
    console.error('Error analyzing Notion messages:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};
