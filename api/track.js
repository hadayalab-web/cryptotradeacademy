// api/track.js
// イベントトラッキングAPI（CTAリンククリック、登録、ブロックなどのイベントを記録）

const messageLogger = require('../services/core/messageLogger');

/**
 * イベントトラッキングAPI
 * CTAリンククリック、登録、ブロックなどのイベントを記録
 */
module.exports = async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message_id, event_type, metadata } = req.body;

    if (!message_id || !event_type) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'message_id and event_type are required',
      });
    }

    // イベントタイプの検証
    const validEventTypes = ['click', 'start', 'subscribe', 'block', 'mute'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        error: 'Bad request',
        message: `event_type must be one of: ${validEventTypes.join(', ')}`,
      });
    }

    // イベントログを記録
    messageLogger.logEvent({
      message_id,
      event_type,
      event_at: new Date().toISOString(),
      metadata: metadata || {},
    });

    return res.status(200).json({
      success: true,
      message_id,
      event_type,
      recorded_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Track API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
